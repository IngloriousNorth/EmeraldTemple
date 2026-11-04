/**
 * Ramosa Protocol Base (IndexedDB Storage & GraphDB Identifier Manager)
 * Enforces strict transport-layer-neutral Open Protocol architecture.
 */

const RamosaBase = {
    dbName: 'RamosaProtocol',
    storeName: 'records',
    db: null,
    initPromise: null, 
    data: { Sources: new Map(), Persons: new Map(), Classes: new Map(), Institutions: new Map() },
    Base: [],
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

    get(RAy = null) {
        const records = this.Base || [];
        if (RAy) {
            const found = records.find(r => 
                r.index === RAy ||
                r.Doc?.RAy === RAy ||
                (Array.isArray(r.Sphere?.Doc) && r.Sphere.Doc.some(d => d.RAy === RAy)) ||
                (r.Sphere?.edition?.torrents && r.Sphere.edition.torrents.some(t => t.infoHash === RAy))
            );
            if (!found && !this.isLoaded) {
                console.warn("[RAMOSA BASE] get() called before Base was fully hydrated. Triggering background loadAll...");
                this.loadAll();
            }
            return found || null;
        }
        return records;
    },

    getAll() {
        return this.Base || [];
    },

    async loadAll() {
        if (this.isLoaded) return this.Base;

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
                return resolve(this.Base);
            }

            if (!this.db) {
                return reject(new Error("IndexedDB instance (this.db) is null during transaction."));
            }

            const transaction = this.db.transaction([this.storeName], "readonly");
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = (event) => {
                const records = event.target.result || [];
                this.Base = records;
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

    /**
     * Puts a record into IndexedDB and anchors it to memory state
     */
    async put(indexKey, rayPayload) {
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
        
        const record = Object.assign({}, rayPayload, { 
            index: indexKey,
            Doc: Object.assign({}, rayPayload.Doc || {}, { RAy: indexKey })
        });

        const request = store.put(record);

        request.onsuccess = () => {
            console.info(`[RAMOSA BASE] Successfully stored record with index: ${indexKey}`);
            if (!this.Base.some(r => r.Doc.RAy === indexKey)) {
                this.Base.push(record);
            }
            MVC.Control.Table.unfold("table");
        };

        request.onerror = (event) => {
            console.error("[RAMOSA BASE ERROR] Failed to put record:", event.target.error);
        };
    }
};

export default RamosaBase;