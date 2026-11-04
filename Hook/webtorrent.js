/**
 * Webtorrent Drag-and-Drop Hook (webtorrent.hook.js)
 * Detects .torrent file drops, parses them via WebTorrent, and stores them into Ramosa Base.
 */
import MVC from '../MAINFRAME/MAINFRAME.js';
import WebTorrentControl from '../Control/webtorrent.js';

const WebtorrentHook = {
    unfurl: function(selector = 'table') {
        if (!window.dragDrop) {
            console.error("[WEBTORRENT HOOK ERROR] window.dragDrop is not attached to window.");
            return;
        }

        window.dragDrop(document.body, (files, pos, fileList, directories) => {
            const targetElement = document.elementFromPoint(pos.x, pos.y);
            const dropMatch = targetElement ? targetElement.closest(selector) : null;

            if (!dropMatch) return;
            if (!files || files.length === 0) return;

            const droppedFile = files[0];
            if (!droppedFile.name.toLowerCase().endsWith('.torrent')) {
                console.warn("[WEBTORRENT HOOK] Dropped file is not a valid .torrent file.");
                return;
            }

            console.info(`[WEBTORRENT HOOK] .torrent file dropped: "${droppedFile.name}". Parsing via WebTorrent client...`);

            const client = window.client || window.webtorrentClient;
            if (!client) {
                console.error("[WEBTORRENT HOOK ERROR] WebTorrent client not found on window.");
                return;
            }

            droppedFile.arrayBuffer().then(arrayBuffer => {
                const uint8Array = new Uint8Array(arrayBuffer);
                const torrentByteArray = Array.from(uint8Array);

                client.add(uint8Array, { dht: false, tracker: false, pex: true }, async (torrent) => {
                    console.info(`[WEBTORRENT HOOK] Torrent successfully parsed. InfoHash: ${torrent.infoHash}`);

                    const docTitle = prompt("[RAMOSA INGEST] Enter document title for this .torrent:", droppedFile.name.replace(/\.torrent$/i, '')) || droppedFile.name;
                    const webseedUrl = prompt("[RAMOSA INGEST] Enter primary webseed URL:", "https://archive.org/download/");

                    if (webseedUrl && !WebTorrentControl.isWhitelisted(webseedUrl)) {
                        alert(`[SECURITY REJECTED] Webseed domain is not whitelisted: ${webseedUrl}`);
                        return;
                    }

                    const rayPayload = {
                        rayVersion: "1.0",
                        categoryType: "TYPE_1_MODERN_SCAN",
                        Sphere: {
                            source: {
                                uuid: `src_${torrent.infoHash.substring(0, 8)}`,
                                name: docTitle,
                                genus: "Document / Archive",
                                date: new Date().toISOString().split('T')[0],
                                cover: "https://via.placeholder.com/222x300?text=Torrent"
                            },
                            edition: {
                                uuid: `ed_${Math.random().toString(36).substring(2, 9)}`,
                                title: docTitle,
                                date: new Date().toISOString().split('T')[0],
                                created_at: Date.now(),
                                webSeed: webseedUrl || ""
                            },
                            Doc: {
                                format: "PDF",
                                size: torrent.length || 0,
                                snatches: 1,
                                RAy: torrent.infoHash,
                                infoHash: torrent.infoHash,
                                webseeds: webseedUrl ? [webseedUrl] : [],
                                torrentBuffer: torrentByteArray // Stored binary buffer for offline propagation
                            }
                        }
                    };

                    const ramosaBase = window.MVC?.Base?.Ramosa;
                    if (ramosaBase && typeof ramosaBase.put === 'function') {
                        await ramosaBase.put(torrent.infoHash, rayPayload);
                        console.info(`[RAMOSA BASE] Successfully anchored dropped .torrent into IndexedDB: ${torrent.infoHash}`);
                    } else {
                        console.warn("[RAMOSA BASE] MVC.Base.Ramosa.put not found.");
                    }
                });
            }).catch(err => {
                console.error("[WEBTORRENT HOOK ERROR] Failed to read dropped .torrent file arrayBuffer:", err);
            });
        });

        console.info(`[WEBTORRENT HOOK] unfurl() bound successfully to drag zone selector: ${selector}`);
    }
};

export default WebtorrentHook;