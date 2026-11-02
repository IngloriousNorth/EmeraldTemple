/**
 * Webtorrent Drag-and-Drop Hook using Ferooss drag-drop package & table targeting
 */
import MVC from '../MAINFRAME/MAINFRAME.js';

const WebtorrentHook = {
    initialize(selector = 'table') {
        if (!window.dragDrop) {
            console.error("[MVC.Hook.Webtorrent] Ferooss drag-drop is not attached to window.dragDrop");
            return;
        }

        // Bind using Ferooss drag-drop globally on body, filter by table selector via hit-testing
        window.dragDrop(document.body, (files, pos, fileList, directories) => {
            const targetElement = document.elementFromPoint(pos.x, pos.y);
            const tableMatch = targetElement ? targetElement.closest(selector) : null;

            if (!tableMatch) return;
            if (!files || files.length === 0) return;

            const droppedFile = files[0];
            console.info(`[MVC.Hook.Webtorrent] File dropped on ${selector}: ${droppedFile.name}`);

            if (!MVC.Control || !MVC.Control.webtorrent) {
                console.error("[MVC.Hook.Webtorrent] MVC.Control.webtorrent controller not found.");
                return;
            }

            // 1. Seed local file and generate local torrent handle
            MVC.Control.webtorrent.addTorrentOrFile(droppedFile, (torrent) => {
                console.info(`[MVC.Hook.Webtorrent] Torrent mounted successfully. Prompting for webseed URL...`);
                
                // 2. Prompt user for webseed URL
                const webseedUrl = prompt("Enter the accredited webseed URL for this file (must match whitelist policy):", "https://archive.org/download/");
                
                if (webseedUrl) {
                    // 3. Attach webseed in-place to the active torrent without duplicate errors
                    MVC.Control.webtorrent.addWebseed(torrent, webseedUrl, (webseedTorrent) => {
                        console.info("[MVC.Hook.Webtorrent] Webseed successfully added via addWebseed()");
                    });
                }
            });
        });

        console.info(`[MVC.Hook.Webtorrent] Ferooss drag-drop hook initialized for selector: ${selector}`);
    }
};

module.exports = WebtorrentHook;