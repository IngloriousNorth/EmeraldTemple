// src/Base/WebTorrent.js
import MVC from '../MAINFRAME/MAINFRAME.js';
import RamosaBase from './Ramosa.js';

function RamosaWireExtension(wire) {
    this.wire = wire;
}

Object.defineProperty(RamosaWireExtension.prototype, 'name', {
    value: 'ramosa',
    writable: false,
    configurable: true,
    enumerable: true
});

RamosaWireExtension.prototype.onHandshake = function (handshake) {
    console.info("[RAMOSA PROTOCOL EXTENSION] Handshake completed successfully with peer.");
};

RamosaWireExtension.prototype.onExtended = function (buf) {
    try {
        const decoded = JSON.parse(buf.toString());
        if (decoded && decoded.Sphere) {
            console.info("[RAMOSA PROTOCOL] Received payload from peer wire.ramosa:", decoded.Sphere.source?.name);

            const torrents = decoded.Sphere.edition.torrents || decoded.Sphere.Doc;
            const infoHash = torrents && torrents[0] ? (torrents[0].RAy || torrents[0].infoHash) : 'ray_sync_' + Date.now();

            MVC.Base.Ramosa.put(infoHash, decoded);
            console.info("[RAMOSA BASE] Successfully persisted peer Sphere into IndexedDB:", infoHash);

            MVC.Control.Table.unfold("table");
            console.info("[TABLE CONTROLLER] Table unfolded and hydrated with peer Sphere.");
        }
    } catch (err) {
        // Ignore non-JSON or protocol control messages
    }
};

RamosaWireExtension.prototype.send = function (rayPayload) {
    if (this.wire.extendedMapping && this.wire.extendedMapping.ramosa !== undefined) {
        const jsonBuf = new TextEncoder().encode(JSON.stringify(rayPayload));
        this.wire.extended('ramosa', jsonBuf);
        console.info("[RAMOSA PROTOCOL] Broadcasted RAyPayload over wire.ramosa.");
    }
};

const WebTorrentBase = {
    SWARM : null,
    RamosaWireExtension,

    initialize(cb) {
        if (this.client) return this.client;
        
        this.client = window.client || new window.WebTorrent();
        if (!window.client) {
            window.client = this.client;
        }

        this.client.on('torrent', (torrent) => {
            this.bindTorrentWires(torrent);
        });
        
        this.SWARM = window.client.torrents.find(t => t.name === 'Gate.enc.js' || t === window.client.torrents[0]);

        this.bindPEX(cb);
        return this.client;
    },

    bindTorrentWires(torrent) {
        if (torrent._ramosaWiresBound) return;
        torrent._ramosaWiresBound = true;

        const handleWire = async (wire, addr) => {
            console.info(`[PEX IP GRAPH] Connected to peer at ${addr || 'unknown'}.`);

            // Register wire.ramosa protocol extension
            wire.use(this.RamosaWireExtension);
            console.info("[RAMOSA PROTOCOL SUCCESS] wire.ramosa protocol extension active.");

            // 1. UPLOADER SIDE: Send local IndexedDB Spheres to the connecting peer via wire.ramosa
            setTimeout(async () => {
                try {
                    const ALL = await RamosaBase.getAll();
                    ALL.forEach(Sphere => {
                        if (wire.ramosa && typeof wire.ramosa.send === 'function') {
                            wire.ramosa.send(Sphere);
                            console.info("[RAMOSA SYNC] Sent local catalog Sphere to peer over wire.ramosa.");
                        }
                    });
                } catch (err) {
                    console.warn("[RAMOSA SYNC] Failed to send local Spheres on wire connection:", err);
                }
            }, 600);

            wire.on('close', () => {
                console.info("[PEX IP GRAPH] Peer disconnected.");
            });
        };

        torrent.on('wire', handleWire);
        if (torrent.wires && Array.isArray(torrent.wires)) {
            torrent.wires.forEach(wire => handleWire(wire));
        }
    },

    bindPEX: function(cb){
        const swarm = this.SWARM || window.client.torrents.find(t => t.name === 'Gate.enc.js' || t === window.client.torrents[0]);
        if (!swarm) {
            setTimeout(() => this.bindPEX(cb), 1000);
            return;
        }

        if (swarm._pexWired) return;
        swarm._pexWired = true;

        this.SWARM = swarm;
        this.bindTorrentWires(swarm);

        if (typeof cb === 'function') {
            cb();
        }
        
        console.info(`[PEX CATALOG SYNC] Bound successfully to swarm: ${swarm.infoHash}`);
    }
};

export default WebTorrentBase;