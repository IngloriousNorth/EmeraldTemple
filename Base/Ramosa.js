// root/Base/Ramosa.js
const RamosaBase = {
    dbName: 'RamosaUniversalDB',
    storeName: 'records',
    db: null,
    initPromise: null, 
    data: { Sources: new Map(), Persons: new Map(), Classes: new Map(), Institutions: new Map() },
    RAy: [],
    isLoaded: false,

    init() {
        if (this.db) return Promise.resolve(this.db);
        if (this.initPromise) return this.initPromise;

        this.initPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, 1);

            request.onerror = (event) => {
                console.error("[RAMOSA BASE ERROR] IndexedDB error:", event.target.error);
                this.initPromise = null;
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.info("[RAMOSA BASE] IndexedDB storage initialized successfully.");
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'index' });
                    console.info(`[RAMOSA BASE] Created object store "${this.storeName}" with keyPath "index"`);
                }
            };
        });

        return this.initPromise;
    },

    get(i = null) {
        if (i) {
            return (this.RAy || []).find(r => 
                r.index === i || 
                r.infoHash === i || 
                (r.entity?.edition?.torrents && r.entity.edition.torrents.some(t => t.index === i || t.infoHash === i))
            ) || null;
        }
        return this.RAy || [];
    },

    getAll() {
        return this.RAy || [];
    },

    async loadAll() {
        if (this.isLoaded) return this.RAy;

        try {
            if (!this.db) {
                this.db = await this.init();
            }
            return await this._executeLoadAll();
        } catch (err) {
            console.error("[RAMOSA BASE ERROR] loadAll failed:", err);
            return [];
        }
    },

    _executeLoadAll() {
        return new Promise((resolve, reject) => {
            if (this.isLoaded) {
                return resolve(this.RAy);
            }

            if (!this.db) {
                return reject(new Error("IndexedDB instance (this.db) is null during transaction."));
            }

            const transaction = this.db.transaction([this.storeName], "readonly");
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = (event) => {
                const records = event.target.result || [];
                this.RAy = records;
                this.isLoaded = true;
                console.info(`[RAMOSA BASE] Loaded and hydrated ${records.length} records from local IndexedDB.`);
                resolve(records);
            };

            request.onerror = (event) => {
                console.error("[RAMOSA BASE ERROR] Failed to load records from IndexedDB:", event.target.error);
                reject(event.target.error);
            };
        });
    },

    async put(infoHash, rayPayload) {
        if (!this.db) {
            try {
                this.db = await this.init();
            } catch (err) {
                console.error("[RAMOSA BASE ERROR] Cannot put record, DB init failed:", err);
                return;
            }
        }

        const transaction = this.db.transaction([this.storeName], "readwrite");
        const store = transaction.objectStore(this.storeName);
        
        const record = Object.assign({}, rayPayload, { infoHash });
        const request = store.put(record);

        request.onsuccess = () => {
            console.info(`[RAMOSA BASE] Successfully stored entity with InfoHash: ${infoHash}`);
            if (!this.RAy.some(r => r.infoHash === infoHash)) {
                MVC.Base.Ramosa.RAy.push(record);
                MVC.Control.Torrents.table("torrents");
            }
        };

        request.onerror = (event) => {
            console.error("[RAMOSA BASE ERROR] Failed to put record:", event.target.error);
        };
    }
};

export default RamosaBase;