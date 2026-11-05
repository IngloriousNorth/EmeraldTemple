/**
 * Webtorrent Drag-and-Drop Hook (webtorrent.hook.js)
 * Intercepts dropped files/torrents, executes metadata prompts, validates whitelist, 
 * and delegates to WebTorrentControl.seed().
 */
import MVC from '../MAINFRAME/MAINFRAME.js';
import WebTorrentControl from '../Control/WebTorrent.js';

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
            console.info(`[WEBTORRENT HOOK] File dropped: "${droppedFile.name}". Initiating prompt sequence...`);

            // 2. Prompt 2: Get the accredited webseed URL
            const webseedUrl = prompt("[RAMOSA SEED] Enter the accredited webseed URL (must match whitelist policy):", "https://archive.org/download/");
            if (!webseedUrl) {
                console.info("[WEBTORRENT HOOK] Seeding canceled by user (Webseed prompt dismissed).");
                return;
            }

            // Validate webseed against security policy
            if (!WebTorrentControl.isWhitelisted(webseedUrl)) {
                console.error(`[SECURITY REJECTED] Domain not allowed by whitelist policy: ${webseedUrl}`);
                alert(`[REJECTED] Webseed domain is not whitelisted: ${webseedUrl}`);
                return;
            }

            // 3. Prompt 3: Get optional institution or classification tag
            const institutionName = prompt("[RAMOSA SEED] Enter Institution / Source tag:", "Emerald Temple Archives");
            if (institutionName === null) {
                console.info("[WEBTORRENT HOOK] Seeding canceled by user.");
                return;
            }

            // Construct the Ramosa Protocol seed options and payload framework
            const seedOptions = {
                urlList: [webseedUrl],
                dht: false,
                tracker: false,
                pex: true
            };

            const rayPayload = {
                rayVersion: "1.0",
                categoryType: "TYPE_1_MODERN_SCAN",
                Sphere: {
                    source: {
                        uuid: `src_${Math.random().toString(36).substring(2, 9)}`,
                        name: institutionName || "Emerald Temple Archives",
                        genus: "Document / Archive",
                        date: new Date().toISOString().split('T')[0],
                        cover: "https://via.placeholder.com/222x300?text=Torrent"
                    },
                    edition: {
                        uuid: `ed_${Math.random().toString(36).substring(2, 9)}`,
                        title: docTitle,
                        date: new Date().toISOString().split('T')[0],
                        created_at: Date.now(),
                        webSeed: webseedUrl
                    }
                }
            };

            console.info("[WEBTORRENT HOOK] Handing over file and payload to WebTorrentControl.seed()...");

            // Delegate directly to WebTorrentControl.seed()
            if (typeof WebTorrentControl.seed === 'function') {
                WebTorrentControl.seed(droppedFile, rayPayload, seedOptions, (torrent) => {
                    console.info(`[WEBTORRENT HOOK] Seeding complete via control module. InfoHash: ${torrent.infoHash}`);
                });
            } else {
                console.error("[WEBTORRENT HOOK ERROR] WebTorrentControl.seed is not defined.");
            }
        });

        console.info(`[WEBTORRENT HOOK] unfurl() bound successfully to drag zone selector: ${selector}`);
    }
};

export default WebtorrentHook;