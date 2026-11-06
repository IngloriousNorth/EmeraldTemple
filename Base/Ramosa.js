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
    // Helper to ensure we have an active, non-closing database handle
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
        //RAy is a unique index;
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
     * Enforces unique RAy (isomorphic to duplicate infoHash check in WebTorrent.js).
     */
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

            // Deduplicate Sphere.Doc array by RAy/infoHash if it exists
            if (record.Sphere && Array.isArray(record.Sphere.Doc)) {
                const seen = new Set();
                record.Sphere.Doc = record.Sphere.Doc.filter(doc => {
                    const key = doc.RAy || doc.infoHash;
                    if (!key) return true;
                    if (seen.has(key)) return false;
                    seen.add(key);
                    return true;
                });
            }

            // Enforce unique RAy / duplicate check (isomorphic to duplicate infoHash check)
            const existingIdx = this.Base.findIndex(r => 
                r.index === RAy || 
                r.RAy === RAy || 
                r.infoHash === RAy ||
                r.Doc?.RAy === RAy ||
                r.Doc?.infoHash === RAy ||
                (Array.isArray(r.Sphere?.Doc) && r.Sphere.Doc.some(d => d.RAy === RAy || d.infoHash === RAy)) ||
                (r.Sphere?.edition?.torrents && r.Sphere.edition.torrents.some(t => t.infoHash === RAy))
            );

            if (existingIdx >= 0) {
                console.warn(`[RAMOSA BASE] Duplicate RAy/infoHash detected (${RAy}). Updating existing record in-place (isomorphic to WebTorrent infoHash guard).`);
                
                // Merge or update cleanly instead of creating a duplicate row/entry
                const existingRecord = this.Base[existingIdx];
                
                // If there are torrent arrays or doc arrays, merge them to preserve multi-torrent editions without duplicating
                if (existingRecord.Sphere && record.Sphere) {
                    if (Array.isArray(existingRecord.Sphere.Doc) && Array.isArray(record.Sphere.Doc)) {
                        record.Sphere.Doc.forEach(newDoc => {
                            const match = existingRecord.Sphere.Doc.find(d => (d.RAy === newDoc.RAy || d.infoHash === newDoc.infoHash));
                            if (!match) {
                                existingRecord.Sphere.Doc.push(newDoc);
                            }
                        });
                    }
                    if (existingRecord.Sphere.edition?.torrents && record.Sphere.edition?.torrents) {
                        record.Sphere.edition.torrents.forEach(newT => {
                            if (!existingRecord.Sphere.edition.torrents.some(t => t.infoHash === newT.infoHash)) {
                                existingRecord.Sphere.edition.torrents.push(newT);
                            }
                        });
                    }
                }
                
                // Overwrite with merged/updated record properties while keeping index intact
                const mergedRecord = Object.assign({}, existingRecord, record, { index: existingRecord.index || RAy });
                this.Base[existingIdx] = mergedRecord;
                
                const request = store.put(mergedRecord);
                request.onsuccess = () => {
                    console.info(`[RAMOSA BASE] Successfully updated existing record for unique RAy: ${RAy}`);
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
                    console.error("[RAMOSA BASE ERROR] Failed to update duplicate RAy record:", event.target.error);
                };
                return;
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