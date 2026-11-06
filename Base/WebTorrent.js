// src/Base/WebTorrent.js
import MVC from '../MAINFRAME/MAINFRAME.js';
import RamosaBase from './Ramosa.js';

const WebTorrentBase = {
    SWARM : null,

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

        const handleWire = (wire, addr) => {
            console.info(`[PEX IP GRAPH] Connected to peer at ${addr || 'unknown'}. Listening for messages...`);

            // SIMPLE MESSAGE RECEIVER ON THE WIRE
            wire.on('message', (data) => {
                try {
                    // Parse incoming message buffer
                    const decoded = JSON.parse(data.toString());
                    if (decoded && decoded.Sphere) {
                        console.info("[RAMOSA PROTOCOL] Received payload from peer wire:", decoded.Sphere.source?.name);

                        const torrents = decoded.Sphere.edition.torrents || decoded.Sphere.Doc;
                        const infoHash = torrents && torrents[0] ? (torrents[0].RAy || torrents[0].infoHash) : torrent.infoHash;

                        // 1. Save into IndexedDB via Ramosa Base
                        window.MVC.Base.Ramosa.put(infoHash, decoded);
                        console.info("[RAMOSA BASE] Successfully persisted peer record into IndexedDB:", infoHash);

                        // 2. Unfold and hydrate table
                        window.MVC.Control.Table.unfold("table");
                        console.info("[TABLE CONTROLLER] Table unfolded and hydrated with peer record.");
                    }
                } catch (err) {
                    // Ignore non-JSON or standard BitTorrent protocol control messages
                }
            });

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