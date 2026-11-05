// src/Base/WebTorrent.js
import MVC from '../MAINFRAME/MAINFRAME.js';

// 1. Define the constructor function
function RamosaWireExtension(wire) {
    this.wire = wire;
}

// 2. Safely define 'name' on the prototype using Object.defineProperty to bypass read-only restrictions
Object.defineProperty(RamosaWireExtension.prototype, 'name', {
    value: 'ramosa',
    writable: false,
    configurable: true,
    enumerable: true
});

// 3. Define protocol methods on the prototype
RamosaWireExtension.prototype.onHandshake = function (handshake) {
    // Handshake complete with peer over BitTorrent protocol
};

RamosaWireExtension.prototype.onExtended = function (buf) {
    try {
        const payload = JSON.parse(buf.toString());
        if (payload && payload.entity) {
            console.info("[RAMOSA PROTOCOL] Received RAy payload from peer wire:", payload.entity.source?.name);
            
            const infoHash = payload.entity.edition?.torrents?.[0]?.infoHash || 'ray_sync_' + Date.now();
            window.MVC.Base.Ramosa.put(infoHash, payload);

            TEMPEST.route("#table");
        }
    } catch (err) {
        console.warn("[RAMOSA PROTOCOL] Failed to parse incoming extended message:", err);
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

    initialize() {
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

        this.bindPEX();
        return this.client;
    },

    bindPEX: function(){
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
            console.info(`[PEX IP GRAPH] Connected to peer. Registering wire.ramosa protocol extension...`);

            if (typeof wire.use === 'function') {
                wire.use(this.RamosaWireExtension);
            }

            wire.on('close', () => {
                console.info(`[PEX IP GRAPH] Peer disconnected: ${peerAddr}`);
            });
        };

        swarm.on('wire', handleWire);

        if (swarm.wires && Array.isArray(swarm.wires)) {
            swarm.wires.forEach(wire => handleWire(wire));
        }

        console.info(`[PEX CATALOG SYNC] Bound successfully to swarm: ${swarm.infoHash}`);
    }
};

export default WebTorrentBase;