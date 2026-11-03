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

            if (!window.client) {
                console.error("[MVC.Hook.Webtorrent] window.client WebTorrent instance not found.");
                return;
            }

            // Test requirement: Check if dropped file is a .torrent file or fallback
            const isTorrentFile = droppedFile.name.endsWith('.torrent') || droppedFile.type === 'application/x-bittorrent';

            if (isTorrentFile) {
                console.info("[MVC.Hook.Webtorrent] Detected .torrent file drop. Adding to WebTorrent client...");
                
                window.client.add(droppedFile, (torrent) => {
                    console.info(`[MVC.Hook.Webtorrent] Torrent added successfully: ${torrent.name} (${torrent.infoHash})`);

                    torrent.on('done', () => {
                        console.log(`[MVC.Hook.Webtorrent] Torrent is complete: ${torrent.name}`);
                    const file = torrent.files[0];
if (!file) {
    console.warn("[MVC.Hook.Webtorrent] No files found in torrent archive.");
    return;
}

// Stream the file chunks into memory safely across all WebTorrent versions
const stream = file.createReadStream();
const chunks = [];

stream.on('data', (chunk) => {
    chunks.push(chunk);
});

stream.on('end', () => {
    const buffer = Buffer.concat(chunks);
    const blob = new Blob([buffer]);
    const blobURL = URL.createObjectURL(blob);

    const downloadAnchor = document.createElement('a');
    downloadAnchor.style.display = 'none';
    downloadAnchor.href = blobURL;
    downloadAnchor.download = file.name;
    
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    
    setTimeout(() => {
        window.URL.revokeObjectURL(blobURL);
        downloadAnchor.remove();
    }, 1000);

    console.info(`[MVC.Hook.Webtorrent] Triggered browser download via stream for: ${file.name}`);
});

stream.on('error', (err) => {
    console.error("[MVC.Hook.Webtorrent] Stream error while reading torrent file:", err);
});
                    });
                });
            } else {
                // Default fallback to controller pipeline if not a direct .torrent file
                if (!MVC.Control || !MVC.Control.webtorrent) {
                    console.error("[MVC.Hook.Webtorrent] MVC.Control.webtorrent controller not found.");
                    return;
                }

                MVC.Control.webtorrent.addTorrentOrFile(droppedFile, (torrent) => {
                    console.info(`[MVC.Hook.Webtorrent] Torrent mounted successfully. Prompting for webseed URL...`);
                    
                    const webseedUrl = prompt("Enter the accredited webseed URL for this file (must match whitelist policy):", "https://archive.org/download/");
                    
                    if (webseedUrl) {
                        MVC.Control.webtorrent.addWebseed(torrent, webseedUrl, (webseedTorrent) => {
                            console.info("[MVC.Hook.Webtorrent] Webseed successfully added via addWebseed()");
                        });
                    }
                });
            }
        });

        console.info(`[MVC.Hook.Webtorrent] Drag-and-drop hook initialized for selector: ${selector}`);
    }
};

module.exports = WebtorrentHook;