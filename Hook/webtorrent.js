/**
 * Webtorrent Drag-and-Drop Hook (webtorrent.hook.js)
 * Detects .torrent file drops, adds to WebTorrent client, and triggers browser downloads folder save.
 */
import MVC from '../MAINFRAME/MAINFRAME.js';

const WebtorrentHook = {
    initialize(selector = 'table') {
        if (!window.dragDrop) {
            console.error("[MVC.Hook.Webtorrent] Ferooss drag-drop library is not attached to window.dragDrop");
            return;
        }

        window.dragDrop(document.body, (files, pos, fileList, directories) => {
            const targetElement = document.elementFromPoint(pos.x, pos.y);
            const tableMatch = targetElement ? targetElement.closest(selector) : null;

            if (!tableMatch) return;
            if (!files || files.length === 0) return;

            const droppedFile = files[0];
            console.info(`[MVC.Hook.Webtorrent] File dropped on ${selector}: ${droppedFile.name}`);

            const client = window.client || window.webtorrentClient;
            if (!client) {
                console.error("[MVC.Hook.Webtorrent] WebTorrent client instance not found.");
                return;
            }

            const isTorrentFile = droppedFile.name.endsWith('.torrent') || droppedFile.type === 'application/x-bittorrent';

            if (isTorrentFile) {
                console.info("[MVC.Hook.Webtorrent] Detected .torrent file drop. Adding to WebTorrent client...");

                client.add(droppedFile, (torrent) => {
                    console.info(`[MVC.Hook.Webtorrent] Torrent active: ${torrent.name} (${torrent.infoHash})`);

                    torrent.on('done', () => {
                        console.info(`[MVC.Hook.Webtorrent] Download complete for torrent: ${torrent.name}`);
                        const file = torrent.files[0];
                        if (!file) {
                            console.warn("[MVC.Hook.Webtorrent] No files found in torrent archive.");
                            return;
                        }

                        // Stream file chunks into memory and dispatch browser download
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

                            console.info(`[MVC.Hook.Webtorrent] File successfully dispatched to browser downloads folder: ${file.name}`);
                        });

                        stream.on('error', (err) => {
                            console.error("[MVC.Hook.Webtorrent] Stream error while reading torrent file:", err);
                        });
                    });
                });
            } else {
                console.warn("[MVC.Hook.Webtorrent] Dropped file is not a valid .torrent metafile.");
            }
        });

        console.info(`[MVC.Hook.Webtorrent] Drag-and-drop hook initialized successfully on selector: ${selector}`);
    }
};

export default WebtorrentHook;