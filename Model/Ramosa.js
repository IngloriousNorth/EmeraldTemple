/**
 * Ramosa Protocol Base (IndexedDB Storage & GraphDB Identifier Manager)
 * Enforces strict transport-layer-neutral Open Protocol architecture with unique constraints.
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

    async ensureDB() {
        if (!this.db) {
            return await this.init();
        }
        return this.db;
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
        return records[0];
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
     * Puts a record into IndexedDB and anchors it to memory state.
     * Enforces strict uniqueness constraints on:
     * 1. source_name (Sphere.source.name)
     * 2. edition_apa (Sphere.edition.APA)
     * 3. torrent_infoHash / RAy (index / Doc.RAy)
     */
    async put(RAy, rayPayload) {
        try {
            // Ensure memory store is fully hydrated before checking constraints
            if (!this.isLoaded) {
                await this.loadAll();
            }

            const db = await this.ensureDB();
            const transaction = db.transaction([this.storeName], "readwrite");
            const store = transaction.objectStore(this.storeName);
            
            const record = Object.assign({}, rayPayload, { 
                index: RAy,
                RAy: RAy
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

            // Extract unique identifiers from incoming payload for strict enforcement
            const incomingSourceName = record.Sphere?.source?.name?.trim().toLowerCase();
            const incomingApa = record.Sphere?.edition?.APA?.trim();
            const incomingRay = RAy;

            // Check against existing records in memory for duplicates across all three constraints
            const duplicateRecord = this.Base.find(r => {
                const existingSourceName = r.Sphere?.source?.name?.trim().toLowerCase();
                const existingApa = r.Sphere?.edition?.APA?.trim();
                const existingRay = r.index || r.RAy || r.Doc?.RAy;

                const matchRay = incomingRay && existingRay === incomingRay;
                const matchSource = incomingSourceName && existingSourceName === incomingSourceName;
                const matchApa = incomingApa && existingApa === incomingApa;

                return matchRay || matchSource || matchApa;
            });

            if (duplicateRecord) {
                console.warn(`[RAMOSA BASE] Strict uniqueness constraint violated. Duplicate detected for Source Name ("${incomingSourceName}"), APA ("${incomingApa}"), or RAy ("${incomingRay}"). Skipping insertion.`);
                return duplicateRecord;
            }

            const request = store.put(record);

            request.onsuccess = () => {
                console.info(`[RAMOSA BASE] Successfully stored new unique record with index/RAy: ${RAy}`);
                this.Base.push(record);
                
                if (window.MVC?.Control?.Table) {
                    if (typeof window.MVC.Control.Table.refresh === 'function') {
                        window.MVC.Control.Table.refresh();
                    }
                    if (typeof window.MVC.Control.Table.unfold === 'function') {
                        window.MVC.Control.Table.unfold("#table");
                    }
                }
            };

            request.onerror = (event) => {
                console.error("[RAMOSA BASE ERROR] Failed to put record:", event.target.error);
            };
        } catch (err) {
            console.error("[RAMOSA BASE ERROR] Cannot put record due to database state:", err);
            this.db = null;
        }
    }
};

export default RamosaBase;