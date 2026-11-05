import WebTorrentControl from '../Control/WebTorrent.js';
// src/Base/WebTorrent.js
import MVC from '../MAINFRAME/MAINFRAME.js';

const WebTorrentBase = {
    client: null,
    
    get SWARM() {
        return (this.client && this.client.torrents && this.client.torrents.length > 0) 
            ? this.client.torrents[0] 
            : null;
    },

    init() {
        if (this.client) return this.client;
        
        if (typeof window !== 'undefined') {
            this.client = window.client || (window.WebTorrent ? new window.WebTorrent() : null);
            if (this.client && !window.client) {
                window.client = this.client;
            }
        }
        return this.client;
    },

    bindPEX: function(){
        const swarm = this.SWARM;
        if (!swarm) {
            console.warn("[PEX CATALOG SYNC] Swarm not ready yet for bindPEX. Retrying...");
            setTimeout(() => this.bindPEX(), 1000);
            return;
        }

        swarm.on('wire', (wire, addr) => {
            console.info(`[PEX CATALOG SYNC] Connected to peer wire: ${addr}`);

            // Register our custom BitTorrent protocol extension
            if (typeof wire.use === 'function') {
                wire.use(this.RamosaWireExtension);
            }

            wire.on('download', () => {
                // Check all active torrents in the client for embedded comments / metadata
                this.syncClientTorrentsToIndexedDB();
            });
        });

        swarm.on('metadata', () => {
            this.syncClientTorrentsToIndexedDB();
        });

        console.info(`[PEX CATALOG SYNC] Bound successfully to swarm: ${swarm.infoHash}`);
    },

    syncClientTorrentsToIndexedDB() {
        const client = this.init();
        if (!client || !client.torrents) return;

        client.torrents.forEach(torrent => {
            if (torrent.comment) {
                try {
                    const payload = JSON.parse(torrent.comment);
                    if (payload && (payload.entity || payload.Sphere)) {
                        const entityData = payload.entity || payload.Sphere;
                        const infoHash = torrent.infoHash;
                        
                        if (MVC.Base?.Ramosa && typeof MVC.Base.Ramosa.put === 'function') {
                            MVC.Base.Ramosa.put(infoHash, payload);
                        }

                        console.info(`[INDEXEDDB] Synced torrent comment metadata: ${entityData.source?.name || infoHash}`);
                    }
                } catch (e) {
                    // Not a Ramosa JSON comment payload
                }
            }
        });

        if (typeof TEMPEST !== 'undefined' && typeof TEMPEST.refresh === 'function') {
            TEMPEST.refresh();
        }
    },

    RamosaWireExtension(wire) {
        return {
            name: 'ramosa',
            onHandshake: function (handshake) {
                // Handshake complete with peer over BitTorrent protocol
            },
            onExtended: function (buf) {
                try {
                    const payload = JSON.parse(buf.toString());
                    if (payload && payload.entity) {
                        console.info("[RAMOSA PROTOCOL] Received RAy payload from peer wire:", payload.entity.source?.name);
                        
                        // Ingest directly into local IndexedDB / Base.Ramosa registry
                        if (window.MVC?.Base?.Ramosa && typeof window.MVC.Base.Ramosa.put === 'function') {
                            const infoHash = payload.entity.edition?.torrents?.[0]?.infoHash || 'ray_sync_' + Date.now();
                            window.MVC.Base.Ramosa.put(infoHash, payload);
                        }

                        // Refresh UI / DataTables if active
                        if (typeof TEMPEST !== 'undefined' && typeof TEMPEST.refresh === 'function') {
                            TEMPEST.refresh();
                        }
                    }
                } catch (err) {
                    console.warn("[RAMOSA PROTOCOL] Failed to parse incoming extended message:", err);
                }
            },
            send: function (rayPayload) {
                if (wire.extendedMapping && wire.extendedMapping.ramosa !== undefined) {
                    const jsonBuf = typeof TextEncoder !== 'undefined' 
                        ? new TextEncoder().encode(JSON.stringify(rayPayload))
                        : Buffer.from(JSON.stringify(rayPayload));
                    
                    wire.extended(this.name, jsonBuf);
                    console.info("[RAMOSA PROTOCOL] Broadcasted RAyPayload over wire.ramosa.");
                }
            }
        };
    }
};

export default WebTorrentBase;