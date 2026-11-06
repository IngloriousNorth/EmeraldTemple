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
                this.db = null;
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.initPromise = null;

                // Listen for unexpected connection drops or closes
                this.db.onclose = () => {
                    console.warn("[RAMOSA BASE] IndexedDB connection closed unexpectedly.");
                    this.db = null;
                    this.isLoaded = false;
                };

                this.db.onversionchange = () => {
                    console.warn("[RAMOSA BASE] IndexedDB version change requested by another tab. Closing connection.");
                    this.db.close();
                    this.db = null;
                    this.isLoaded = false;
                };

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

    // Helper to ensure we have an active, non-closing database handle
    async ensureDB() {
        if (!this.db) {
            return await this.init();
        }
        return this.db;
    },

    async loadAll() {
        if (this.isLoaded) return this.Base;

        try {
            await this.ensureDB();
            return await this._executeLoadAll();
        } catch (err) {
            console.error("[RAMOSA BASE ERROR] loadAll failed:", err);
            return [];
        }
    },

    _executeLoadAll() {
        return new Promise(async (resolve, reject) => {
            try {
                const db = await this.ensureDB();
                const transaction = db.transaction([this.storeName], "readonly");
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
            } catch (err) {
                reject(err);
            }
        });
    },

    async put(RAy, rayPayload) {
        try {
            const db = await this.ensureDB();
            const transaction = db.transaction([this.storeName], "readwrite");
            const store = transaction.objectStore(this.storeName);
            
            const record = Object.assign({}, rayPayload, { 
                index: RAy
            });

            if (record.Sphere && record.Sphere.Doc) {
                if (Array.isArray(record.Sphere.Doc)) {
                    record.Sphere.Doc.forEach(d => {
                        d.RAy = d.RAy || RAy;
                        d.infoHash = d.infoHash || RAy;
                    });
                } else {
                    record.Sphere.Doc.RAy = record.Sphere.Doc.RAy || RAy;
                    record.Sphere.Doc.infoHash = record.Sphere.Doc.infoHash || RAy;
                }
            }

            const request = store.put(record);

            request.onsuccess = () => {
                console.info(`[RAMOSA BASE] Successfully stored record and binary buffer with index: ${RAy}`);
                
                const existingIdx = this.Base.findIndex(r => 
                    r.index === RAy || 
                    r.RAy === RAy || 
                    r.infoHash === RAy ||
                    r.Doc?.RAy === RAy ||
                    r.Doc?.infoHash === RAy
                );

                if (existingIdx >= 0) {
                    this.Base[existingIdx] = record;
                } else {
                    this.Base.push(record);
                }
                
                if (window.MVC?.Control?.Table?.unfold) {
                    MVC.Control.Table.unfold("#table");
                }
            };

            request.onerror = (event) => {
                console.error("[RAMOSA BASE ERROR] Failed to put record:", event.target.error);
            };
        } catch (err) {
            console.error("[RAMOSA BASE ERROR] Cannot put record due to database state:", err);
            // If connection was closing, clear it out so next attempt reopens cleanly
            this.db = null;
        }
    }
};

export default RamosaBase;