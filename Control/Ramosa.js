// src/Control/Ramosa.js
import MVC from '../MAINFRAME/MAINFRAME.js';
import RamosaModel from '../Base/Ramosa.js';
import WebTorrentControl from './WebTorrent.js'; // Adjust path if lowercase webtorrent.js

const Ramosa = {
    async process(pdfFile, fileText, webSeedUrl = null, sourceDate = null, userClasses = "Public Domain") {
        console.info("[RAMOSA CONTROL] Processing extracted PDF text...");

        // 1. Parse metadata and generate Universal Ramosa Protocol payload (RAyPayload)
        const parsed = this.parseMetadata(fileText, userClasses, pdfFile.name, sourceDate);
        const rayPayload = this.parseSpheres(parsed.apaString, userClasses, sourceDate || parsed.metadata.year, parsed.metadata.title);

        const resolvedWebSeed = webSeedUrl || `https://archive.org/download/ray_archive/${encodeURIComponent(pdfFile.name)}`;
        rayPayload.Sphere.edition.webSeed = resolvedWebSeed;

        let fileExtension = '.pdf';
        if (pdfFile && typeof pdfFile.name === 'string' && pdfFile.name.includes('.')) {
            fileExtension = pdfFile.name.substring(pdfFile.name.lastIndexOf('.'));
        }

        const cleanTorrentName = `${parsed.dn.replace(/[*_]/g, '').trim()}${fileExtension}`;

        const seedOptions = {
            name: cleanTorrentName,
            comment: JSON.stringify(rayPayload),
            urlList: [resolvedWebSeed],
            dht: false,
            tracker: false,
            pex: true
        };

        const client = window.client || (WebTorrentControl.init ? WebTorrentControl.init() : null);
        if (!client) {
            console.error("[RAMOSA CONTROL ERROR] WebTorrent client instance not found.");
            return rayPayload;
        }

        // 2. Delegate transport to client.seed() / WebTorrentControl
        client.seed(pdfFile, seedOptions, (torrent) => {
            console.info(`[RAMOSA CONTROL] Seeded successfully! InfoHash: ${torrent.infoHash}`);
            
            torrent.RAy = torrent.infoHash;

            if (!rayPayload.Sphere.edition.torrents) {
                rayPayload.Sphere.edition.torrents = [];
            }

            rayPayload.Sphere.edition.torrents.push({
                format: "PDF",
                res: "Pre-1931 Archive Scan",
                infoHash: torrent.infoHash,
                size: pdfFile.size,
                release: `${rayPayload.Sphere.institution.name}-${rayPayload.Sphere.source.date}-${rayPayload.Sphere.source.name.replace(/\s+/g, '-')}`
            });

            // 3. Bind wire listener to broadcast and sync via wire.ramosa
            torrent.on('wire', (wire, addr) => {
                console.info(`[PEX IP GRAPH] Connected to peer at ${addr}. Registering wire.ramosa protocol extension...`);

                // Register the Ramosa BitTorrent protocol extension if available
                if (MVC.Base?.WebTorrent && typeof MVC.Base.WebTorrent.RamosaWireExtension === 'function') {
                    wire.use(MVC.Base.WebTorrent.RamosaWireExtension);
                }

                // Send the RAy payload over wire.ramosa after extended handshake completes
                setTimeout(() => {
                    if (wire.ramosa && typeof wire.ramosa.send === 'function') {
                        console.info("[RAMOSA CONTROL] Broadcasting RAyPayload via wire.ramosa...");
                        wire.ramosa.send(rayPayload);
                    }
                }, 500);

                wire.on('close', () => {
                    console.info(`[PEX IP GRAPH] Peer disconnected: ${addr}`);
                });
            });

            // 4. Commit payload to local IndexedDB Base model
            if (MVC.Base && MVC.Base.Ramosa && typeof MVC.Base.Ramosa.put === "function") {
                MVC.Base.Ramosa.put(torrent.infoHash, rayPayload);
            } else {
                RamosaModel.put(torrent.infoHash, rayPayload);
            }

            // 5. Optional local .torrent metafile blob download trigger
            try {
                if (torrent.torrentFile) {
                    const blob = new Blob([torrent.torrentFile], { type: 'application/x-bittorrent' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${pdfFile.name}.torrent`;
                    document.body.appendChild(a);
                    a.click();
                    URL.revokeObjectURL(url);
                    a.remove();
                    console.info("[RAMOSA CONTROL] .torrent metafile blob downloaded successfully.");
                }
            } catch (err) {
                console.error("[RAMOSA CONTROL] Failed to generate .torrent blob:", err);
            }

            // 6. Refresh Table / View Controller
            setTimeout(TEMPEST.route("#table"), 0);
        });

        return rayPayload;
    },

    parseMetadata(rawText, userClasses, fileName, sourceDate) {
        return RamosaModel.parseMetadata ? RamosaModel.parseMetadata(rawText, userClasses, fileName, sourceDate) : {
            detectedCategory: "Public Domain",
            apaString: `${fileName} (${sourceDate || 'n.d.'})`,
            dn: fileName,
            metadata: { title: fileName, author: "Unknown", year: sourceDate || 'n.d.' }
        };
    },

    parseSpheres(apaString, commaSeparatedClasses, sourceDate, forcedTitle) {
        return RamosaModel.parseSpheres ? RamosaModel.parseSpheres(apaString, commaSeparatedClasses, sourceDate, forcedTitle) : {
            rayVersion: "1.0",
            categoryType: "Archive",
            Sphere: {
                source: { name: forcedTitle || "Work", date: sourceDate || "n.d." },
                persons: [],
                classes: [],
                institution: { name: "Archive", genus: "Repository" },
                edition: { title: forcedTitle || "Work", torrents: [] },
                Doc: []
            }
        };
    }
};

if (!MVC.Control) MVC.Control = {};
MVC.Control.Ramosa = Ramosa;

export default Ramosa;