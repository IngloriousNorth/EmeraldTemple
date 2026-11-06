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

// UPLOADER SIDE: Broadcast local IndexedDB records the exact instant handshake completes
RamosaWireExtension.prototype.onHandshake = async function (handshake) {
    console.info(`[RAMOSA PROTOCOL EXTENSION] Handshake completed successfully with peer at ${new Date().toISOString()}.`);
    try {
        const localRecords = await RamosaBase.loadAll();
        if (Array.isArray(localRecords) && localRecords.length > 0) {
            localRecords.forEach(record => {
                if (typeof this.send === 'function') {
                    this.send(record);
                }
            });
        } else {
            console.warn("[RAMOSA SYNC] No local records found in IndexedDB to send on handshake.");
        }
    } catch (err) {
        console.warn("[RAMOSA SYNC] Failed to load/send local records on handshake:", err);
    }
};

// IDLE CLIENT SIDE: Receive extension messages from peers
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

            if (typeof TEMPEST !== 'undefined' && typeof TEMPEST.route === 'function') {
                TEMPEST.route("#table");
            } else if (window.MVC?.Control?.Table?.unfold) {
                window.MVC.Control.Table.unfold("table");
            }
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
        console.info(`[WebTorrentBase:] Sent RAyPayload at ${new Date().toISOString()}.`);
    } else {
        console.warn("[RAMOSA PROTOCOL] Failed to send: wire.extendedMapping.ramosa is unassigned.");
    }
};

const WebTorrentBase = {
    PEX : null,
    RamosaWireExtension,

    initialize(cb) {
        if (this.client) return this.client;
        
        this.client = window.client || new window.WebTorrent({
            dht: false,
            tracker: false
        });
        if (!window.client) {
            window.client = this.client;
        }

        this.client.on('torrent', (torrent) => {
            this.bindPEX(cb);
        });
        
        this.PEX = window.client.torrents[0];
        if (this.PEX) {
            this.bindPEX(cb);
        }

        return this.client;
    },

    bindPEX(cb) {
        const swarm = this.PEX || window.client.torrents[0];
        if (!swarm) {
            setTimeout(() => this.bindPEX(cb), 1000);
            return;
        }

        if (swarm._pexWired) return;
        swarm._pexWired = true;
        this.PEX = swarm;

        const handleWire = (wire, addr) => {
            console.info(`[PEX IP GRAPH] Connected to peer at ${addr || 'unknown'}.`);
            console.info(`[RAMOSA LISTENING] Listening for wire.ramosa messages at ${new Date().toISOString()}`);

            // Register wire.ramosa protocol extension
            wire.use(this.RamosaWireExtension);
            console.info("[RAMOSA PROTOCOL SUCCESS] wire.ramosa protocol extension active.");

            wire.on('close', () => {
                console.info("[PEX IP GRAPH] Peer disconnected.");
            });
        };

        swarm.on('wire', handleWire);
        if (swarm.wires && Array.isArray(swarm.wires)) {
            swarm.wires.forEach(wire => handleWire(wire));
        }

        if (typeof cb === 'function') {
            cb();
        }
        
        console.info(`[PEX CATALOG SYNC] Bound successfully to swarm: ${swarm.infoHash}`);
    }
};

export default WebTorrentBase;