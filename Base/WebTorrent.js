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

// STEP 2 & 3: Ingest peer data into IndexedDB and refresh Table upon receipt
RamosaWireExtension.prototype.onExtended = function (buf) {
    try {
        const payload = JSON.parse(buf.toString());
        if (payload && payload.Sphere) {
            console.info("[RAMOSA PROTOCOL] Received RAy payload from peer wire:", payload.Sphere.source?.name);
            
            // Extract infoHash / RAy ID from torrents or generate fallback key
            const torrents = payload.Sphere.edition?.torrents || payload.Sphere.Doc || [];
            const infoHash = torrents[0]?.RAy || torrents[0]?.infoHash || ('ray_sync_' + Date.now());

            // 1. Save peer torrent record into IndexedDB via Ramosa Base model
            window.MVC.Base.Ramosa.put(infoHash, payload);
            console.info("[RAMOSA BASE] Successfully persisted peer record into IndexedDB:", infoHash);

            // 2. Call Table.unfold("table") to render the newly added torrents
            window.MVC.Control.Table.unfold("table");
            console.info("[TABLE CONTROLLER] Table unfolded and hydrated with peer record.");
        }
    } catch (err) {
        console.warn("[RAMOSA PROTOCOL] Failed to parse incoming extended message from peer:", err);
    }
};

RamosaWireExtension.prototype.send = function (rayPayload) {
    if (this.wire.extendedMapping && this.wire.extendedMapping.ramosa !== undefined) {
        const jsonBuf = typeof TextEncoder !== 'undefined' 
            ? new TextEncoder().encode(JSON.stringify(rayPayload))
            : Buffer.from(JSON.stringify(rayPayload));
        
        this.wire.extended('ramosa', jsonBuf);
        console.info("[RAMOSA PROTOCOL] Broadcasted RAyPayload over wire.ramosa.");
    }
};

const WebTorrentBase = {
    SWARM : null,
    RamosaWireExtension,

    initialize(cb) {
        if (this.client) return this.client;
        
        if (typeof window !== 'undefined') {
            this.client = window.client || (window.WebTorrent ? new window.WebTorrent() : null);
            if (this.client && !window.client) {
                window.client = this.client;
            }
        }
        
        this.SWARM = (window.client && window.client.torrents) 
            ? window.client.torrents.find(t => t.name === 'Gate.enc.js' || t === window.client.torrents[0]) 
            : null;

        this.bindPEX(cb);
        return this.client;
    },

    bindPEX: function(cb){
        const swarm = this.SWARM || (window.client && window.client.torrents && window.client.torrents.find(t => t.name === 'Gate.enc.js' || t === window.client.torrents[0]));
        if (!swarm) {
            setTimeout(() => this.bindPEX(), 1000);
            return;
        }

        if (swarm._pexWired) return;
        swarm._pexWired = true;

        this.SWARM = swarm;

        const handleWire = (wire, addr) => {
            const peerAddr = addr || wire.remoteAddress || (wire._socket && wire._socket.remoteAddress) || 'unknown';
            console.info(`[PEX IP GRAPH] Connected to peer at ${peerAddr}. Registering wire.ramosa protocol extension...`);

            if (typeof wire.use === 'function') {
                wire.use(this.RamosaWireExtension);
            }

            wire.on('close', () => {
                console.info(`[PEX IP GRAPH] Peer disconnected: ${peerAddr}`);
            });

            cb();
        };

        swarm.on('wire', handleWire);

        if (swarm.wires && Array.isArray(swarm.wires)) {
            swarm.wires.forEach(wire => handleWire(wire));
        }
        
        console.info(`[PEX CATALOG SYNC] Bound successfully to swarm: ${swarm.infoHash}`);
    }
};

export default WebTorrentBase;