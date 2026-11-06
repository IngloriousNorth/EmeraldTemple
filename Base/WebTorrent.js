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

// 1. UPLOADER SIDE: Automatically broadcast local IndexedDB records the exact instant handshake completes
RamosaWireExtension.prototype.onHandshake = async function (handshake) {
    console.info(`[RAMOSA PROTOCOL EXTENSION] Handshake completed successfully with peer at ${new Date().toISOString()}.`);
    try {
        const ALL = await RamosaBase.getAll();
        if (Array.isArray(ALL)) {
            ALL.forEach(Sphere => {
                if (typeof this.send === 'function') {
                    this.send(Sphere);
                }
            });
        }
    } catch (err) {
        console.warn("[RAMOSA SYNC] Failed to send local Spheres on handshake:", err);
    }
};

// 2. IDLE CLIENT SIDE: Receive extension messages from peers
RamosaWireExtension.prototype.onExtended = function (buf) {
    console.info(`[RAMOSA LISTENING] Message received on wire.ramosa at ${new Date().toISOString()}`);
    try {
        const decoded = JSON.parse(buf.toString());
        if (decoded && decoded.Sphere) {
            console.info("[RAMOSA PROTOCOL] Received payload from peer wire.ramosa:", decoded.Sphere.source?.name);

            const torrents = decoded.Sphere.edition.torrents || decoded.Sphere.Doc;
            const infoHash = torrents && torrents[0] ? (torrents[0].RAy || torrents[0].infoHash) : 'ray_sync_' + Date.now();

            window.MVC.Base.Ramosa.put(infoHash, decoded);
            console.info("[RAMOSA BASE] Successfully persisted peer Sphere into IndexedDB:", infoHash);

            window.MVC.Control.Table.unfold("table");
            console.info("[TABLE CONTROLLER] Table unfolded and hydrated with peer Sphere.");
        }
    } catch (err) {
        console.warn("[RAMOSA PROTOCOL] Failed to parse incoming extended message:", err);
    }
};

RamosaWireExtension.prototype.send = function (rayPayload) {
    if (this.wire.extendedMapping && this.wire.extendedMapping.ramosa !== undefined) {
        const jsonBuf = new TextEncoder().encode(JSON.stringify(rayPayload));
        this.wire.extended('ramosa', jsonBuf);
        console.info(`[RAMOSA PROTOCOL] Broadcasted RAyPayload over wire.ramosa at ${new Date().toISOString()}.`);
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
            console.info(`[RAMOSA LISTENING] Listening for wire.ramosa messages at ${new Date().toISOString()}`);

            // Register wire.ramosa protocol extension
            wire.use(this.RamosaWireExtension);
            const All = await WebTorrentBase.getAll();
            All.forEach(Sphere => {
                wire.send(new TextEncoder().encode(JSON.stringify(Sphere)));;
                
            }) 
            console.info("[RAMOSA PROTOCOL SUCCESS] wire.ramosa protocol extension active.");

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