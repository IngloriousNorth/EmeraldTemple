// src/Base/WebTorrent.js
import MVC from '../MAINFRAME/MAINFRAME.js';
import RamosaBase from './Ramosa.js';

function RamosaWireExtension(wire) {
    this.wire = wire;
    
    // CRITICAL: Attach this extension instance to the wire object so wire.ramosa works!
    wire.ramosa = this;
}

Object.defineProperty(RamosaWireExtension.prototype, 'name', {
    value: 'ramosa',
    writable: false,
    configurable: true,
    enumerable: true
});

RamosaWireExtension.prototype.send = function (rayPayload) {
    // If payload is already a Uint8Array, use it; otherwise encode it
    const jsonBuf = rayPayload instanceof Uint8Array 
        ? rayPayload 
        : new TextEncoder().encode(JSON.stringify(rayPayload));
    
    if (typeof this.wire.extended === 'function') {
        try {
            // WebTorrent extended messaging takes (extensionName, buffer)
            this.wire.extended('ramosa', jsonBuf);
            console.info(`[WebTorrentBase:] Sent RAyPayload at ${new Date().toISOString()}.`);
            return;
        } catch (e) {
            console.warn("[RAMOSA PROTOCOL] Initial send failed, retrying...", e);
        }
    }

    // Retry once mapping is fully established
    setTimeout(() => {
        try {
            if (typeof this.wire.extended === 'function') {
                this.wire.extended('ramosa', jsonBuf);
                console.info(`[WebTorrentBase:] Sent RAyPayload (on retry) at ${new Date().toISOString()}.`);
            }
        } catch (err) {
            console.warn("[RAMOSA PROTOCOL] Failed to send RAyPayload on retry:", err);
        }
    }, 400);
};

const RamosaProtocol = {
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

        //TODO: duplicate wire
        const handleWire = (wire, addr) => {
            console.info(`[PEX IP GRAPH] Connected to peer at ${addr || 'unknown'}.`);
            console.info(`[RAMOSA LISTENING] Listening for wire.ramosa messages at ${new Date().toISOString()}`);

            // Register wire.ramosa protocol extension
            wire.use(this.RamosaWireExtension);
            console.info("[RAMOSA PROTOCOL SUCCESS] wire.ramosa protocol extension active.");

            // Inside your torrent.on('wire', (wire, addr) => { ... }) handler:

            console.info(`[RAMOSA LISTENING] Listening for wire.ramosa messages at ${new Date().toISOString()}`);

            wire.on('extended', (extName, buf) => {
                if (extName === 'ramosa') {
                    console.info(`[RAMOSA PROTOCOL] Message received on wire.ramosa at ${new Date().toISOString()}`);
                    try {
                        // Browser-native buffer-to-string conversion using TextDecoder
                        let rawStr = '';
                        if (buf instanceof Uint8Array || buf instanceof ArrayBuffer) {
                            rawStr = new TextDecoder().decode(buf);
                        } else if (Array.isArray(buf)) {
                            rawStr = new TextDecoder().decode(new Uint8Array(buf));
                        } else if (typeof buf === 'string') {
                            rawStr = buf;
                        } else {
                            // Fallback for array-like objects or uint arrays
                            rawStr = new TextDecoder().decode(new Uint8Array(Object.values(buf)));
                        }

                        const jsonStart = rawStr.indexOf('{');
                        const jsonEnd = rawStr.lastIndexOf('}');
                        
                        if (jsonStart === -1 || jsonEnd === -1) {
                            throw new Error("No valid JSON object bounds found in buffer");
                        }

                        const cleanJsonStr = rawStr.substring(jsonStart, jsonEnd + 1);
                        const decoded = JSON.parse(cleanJsonStr);

                        console.log(decoded);
                        const torrents = decoded.Sphere.Doc;
                        const infoHash = torrents && torrents[0] ? (torrents[0].RAy || torrents[0].infoHash) : 'ray_sync_' + Date.now();

                        window.MVC.Base.Ramosa.put(infoHash, decoded);
                        //setTimeout(MVC.Control.Table.unfold("#table"), 222);
                        console.info("[RAMOSA BASE] Successfully persisted peer Sphere into IndexedDB:", infoHash);

                        console.info("[TABLE CONTROLLER] Table unfolded and hydrated with peer Sphere.");
                    } catch (err) {
                        console.warn("[RAMOSA PROTOCOL] Failed to parse incoming extended message:", err);
                    }
                }
            });

            wire.on('close', () => {
                console.info("[PEX IP GRAPH] Peer disconnected.");
            });
        };

        swarm.on('wire', handleWire);
        /*if (swarm.wires && Array.isArray(swarm.wires)) {
            swarm.wires.forEach(wire => handleWire(wire));
        }*/

        if (typeof cb === 'function') {
            cb();
        }
        
        console.info(`[PEX CATALOG SYNC] Bound successfully to swarm: ${swarm.infoHash}`);
    }
};

export default RamosaProtocol;