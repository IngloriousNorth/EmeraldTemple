/**
 * Webtorrent Drag-and-Drop Hook using Ferooss drag-drop package & table targeting
 */
const WebtorrentHook = {
    //for DL testing purposes.
    initialize(selector = 'table') {
        if (!window.dragDrop) {
            console.error("[MVC.Hook.Webtorrent] Ferooss drag-drop is not attached to window.dragDrop");
            return;
        }

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

                        const stream = file.createReadStream();
                        const chunks = [];

                        stream.on('data', (chunk) => {
                            chunks.push(chunk);
                        });

                        stream.on('end', () => {
                            // Native browser-safe concatenation without Node's Buffer
                            const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
                            const result = new Uint8Array(totalLength);
                            let offset = 0;
                            for (let chunk of chunks) {
                                result.set(chunk, offset);
                                offset += chunk.length;
                            }

                            const blob = new Blob([result]);
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
            }
        });

        console.info(`[MVC.Hook.Webtorrent] Drag-and-drop hook initialized for selector: ${selector}`);
    }
};

window.MVC = window.MVC || {};
window.MVC.Hook = window.MVC.Hook || {};
window.MVC.Hook.webtorrent = WebtorrentHook;

export default WebtorrentHook;