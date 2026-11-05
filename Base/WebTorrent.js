import WebTorrentControl from '../Control/WebTorrent.js';
// src/Base/WebTorrent.js
import MVC from '../MAINFRAME/MAINFRAME.js';

const WebTorrentBase = {
    //so annoying, Gemini
    SWARM : null,

    initialize() {
        if (this.client) return this.client;
        
        if (typeof window !== 'undefined') {
            this.client = window.client || (window.WebTorrent ? new window.WebTorrent() : null);
            if (this.client && !window.client) {
                window.client = this.client;
            }
        }
        this.SWARM = client.torrents[0];
        this.bindPEX();
        return this.client;
    },

    bindPEX: function(){
        const swarm = this.SWARM || (client && client.torrents && client.torrents[0]);
        if (!swarm) {
            setTimeout(() => this.bindPEX(), 1000);
            return;
        }

        swarm.on('wire', (wire, addr) => {
            console.info(`[PEX IP GRAPH] Connected to peer at ${addr}. Registering wire.ramosa protocol extension...`);

            wire.use(this.RamosaWireExtension);

            wire.on('close', () => {
                console.info(`[PEX IP GRAPH] Peer disconnected: ${addr}`);
            });
        });

        console.info(`[PEX CATALOG SYNC] Bound successfully to swarm: ${swarm.infoHash}`);
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
                        const infoHash = payload.entity.edition?.torrents?.[0]?.infoHash || 'ray_sync_' + Date.now();
                        window.MVC.Base.Ramosa.put(infoHash, payload);

                        // Refresh UI / DataTables if active
                        TEMPEST.route("#table");
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