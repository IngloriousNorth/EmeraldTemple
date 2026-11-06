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
    // Inside src/Base/Ramosa.js

    put(infoHash, payload) {
        if (!infoHash || !payload) return;

        // Check if a master record for this source/edition already exists in memory
        const existingKey = Object.keys(this.data).find(k => {
            const existing = this.data[k];
            return existing.entity?.source?.name === payload.entity?.source?.name &&
                   existing.entity?.institution?.name === payload.entity?.institution?.name;
        });

        if (existingKey && existingKey !== infoHash) {
            // Merge new torrents into the existing master record's edition array instead of duplicating the whole record
            const masterRecord = this.data[existingKey];
            const newTorrents = payload.entity?.edition?.torrents || [];
            
            masterRecord.entity.edition.torrents = masterRecord.entity.edition.torrents || [];
            
            newTorrents.forEach(newT => {
                if (!masterRecord.entity.edition.torrents.some(t => t.infoHash === newT.infoHash)) {
                    masterRecord.entity.edition.torrents.push(newT);
                }
            });

            // Persist the updated master record back to storage under its primary key
            if (this.db) {
                const tx = this.db.transaction([this.storeName], 'readwrite');
                tx.objectStore(this.storeName).put(masterRecord, existingKey);
            }
            console.info(`[RAMOSA BASE] Merged new torrent (${infoHash}) into existing master edition: ${existingKey}`);
            return;
        }

        // Otherwise, store as a new record normally
        this.data[infoHash] = payload;
        if (!this.RAy.some(item => item.entity?.edition?.torrents?.some(t => t.infoHash === infoHash))) {
            this.RAy.push(payload);
        }

        if (this.db) {
            try {
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                store.put(payload, infoHash);
                console.info(`[RAMOSA BASE] Successfully stored entity "${payload.entity?.source?.name || 'Unknown'}" with InfoHash: ${infoHash}`);
            } catch (err) {
                console.error("[RAMOSA BASE] Error persisting to IndexedDB:", err);
            }
        }
    }
};

export default RamosaBase;