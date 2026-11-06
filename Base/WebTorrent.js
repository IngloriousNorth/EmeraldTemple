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
        const payload = JSON.parse(buf.toString());
        if (payload && payload.Sphere) {
            console.info("[RAMOSA PROTOCOL] Received upload send message from uploader peer:", payload.Sphere.source?.name);
            
            const torrents = payload.Sphere.edition.torrents || payload.Sphere.Doc;
            const infoHash = torrents[0].RAy || torrents[0].infoHash;

            window.MVC.Base.Ramosa.put(infoHash, payload);
            console.info("[RAMOSA BASE] Successfully ingested peer torrent metadata into IndexedDB:", infoHash);

            window.MVC.Control.Table.unfold("table");
            console.info("[TABLE CONTROLLER] Table unfolded and hydrated with ingested peer records.");
        }
    } catch (err) {
        console.warn("[RAMOSA PROTOCOL] Failed to parse incoming upload message from peer:", err);
    }
};

RamosaWireExtension.prototype.onHandshake = function (handshake) {
    console.info("[RAMOSA PROTOCOL EXTENSION] Handshake completed successfully with peer.");
    
    // Broadcast payload if attached directly to the wire or its parent torrent
    if (this.wire.rayPayload) {
        this.send(this.wire.rayPayload);
    } else if (this.wire.torrent && this.wire.torrent.comment) {
        try {
            const payload = JSON.parse(this.wire.torrent.comment);
            this.send(payload);
        } catch (e) {
            // Ignore if comment is not JSON
        }
    }
};

RamosaWireExtension.prototype.send = function (rayPayload) {
    const jsonBuf = new TextEncoder().encode(JSON.stringify(rayPayload));
    this.wire.extended('ramosa', jsonBuf);
    console.info("[RAMOSA PROTOCOL] Broadcasted RAyPayload over wire.ramosa.");
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

        const handleWire = (wire) => {
            wire.use(this.RamosaWireExtension);
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