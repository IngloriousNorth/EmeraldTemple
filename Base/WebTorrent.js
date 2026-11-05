// src/Base/WebTorrent.js
import MVC from '../MAINFRAME/MAINFRAME.js';

const WebTorrentBase = {
    SWARM : null,

    initialize() {
        if (this.client) return this.client;
        
        if (typeof window !== 'undefined') {
            this.client = window.client || (window.WebTorrent ? new window.WebTorrent() : null);
            if (this.client && !window.client) {
                window.client = this.client;
            }
        }
        
        // Use client.torrents.find to reliably match the active Gate.enc.js swarm
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

        this.SWARM = swarm; // Keep reference updated

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
    },

    RamosaWireExtension(wire) {
        // Return an extension instance object
        const extension = {
            name: 'ramosa', // <-- Must be present on the returned object instance
            onHandshake: function (handshake) {
                // Handshake complete with peer over BitTorrent protocol
            },
            onExtended: function (buf) {
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
            },
            send: function (rayPayload) {
                if (wire.extendedMapping && wire.extendedMapping.ramosa !== undefined) {
                    const jsonBuf = typeof TextEncoder !== 'undefined' 
                        ? new TextEncoder().encode(JSON.stringify(rayPayload))
                        : Buffer.from(JSON.stringify(rayPayload));
                    
                    wire.extended('ramosa', jsonBuf);
                    console.info("[RAMOSA PROTOCOL] Broadcasted RAyPayload over wire.ramosa.");
                }
            }
        };
        return extension;
    }
};

export default WebTorrentBase;