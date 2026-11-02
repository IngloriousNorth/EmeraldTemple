//IA
import MVC from '../MAINFRAME/MAINFRAME';

const APPROVED_DOMAINS = [
    ".edu",
    "arxiv.org",
    "jstor.org",
    "gutenberg.org",
    "archive.org",
    "plato.stanford.edu",
];

module.exports = {
    isWhitelisted(urlStr) {
        try {
            const parsed = new URL(urlStr);
            const hostname = parsed.hostname.toLowerCase();
            
            return APPROVED_DOMAINS.some(domain => {
                if (domain.startsWith('.')) {
                    return hostname.endsWith(domain);
                }
                return hostname === domain || hostname.endsWith('.' + domain);
            });
        } catch (err) {
            console.warn("[SECURITY] Malformed webseed URL rejected:", urlStr);
            return false;
        }
    },

    addWebseed(webseedUrl, callback) {
        if (!this.isWhitelisted(webseedUrl)) {
            console.error(`[SECURITY REJECTED] Domain not allowed by whitelist policy: ${webseedUrl}`);
            alert(`[REJECTED] Webseed domain is not whitelisted: ${new URL(webseedUrl).hostname}`);
            return;
        }

        const client = window.client;
        if (!client) {
            console.error("[MVC.Control.Webtorrent] window.client WebTorrent instance not found.");
            return;
        }

        console.info(`[MVC.Control.Webtorrent] Whitelist check passed. Adding webseed: ${webseedUrl}`);

        try {
            client.add(webseedUrl, { dht: false, tracker: false, pex: true }, (torrent) => {
                console.info(`[MVC.Control.Webtorrent] Webseed torrent active! InfoHash: ${torrent.infoHash}`);

                // Automatically trigger .torrent metafile blob download upon metadata parsing
                torrent.on('metadata', () => {
                    try {
                        if (torrent.torrentFile) {
                            const torrentBlob = new Blob([torrent.torrentFile], { type: 'application/x-bittorrent' });
                            const blobUrl = URL.createObjectURL(torrentBlob);
                            const fileName = `${torrent.name || 'archive'}.torrent`;

                            const downloadLink = document.createElement('a');
                            downloadLink.href = blobUrl;
                            downloadLink.download = fileName;
                            document.body.appendChild(downloadLink);
                            downloadLink.click();
                            window.URL.revokeObjectURL(blobUrl);
                            downloadLink.remove();

                            console.info(`[MVC.Control.Webtorrent] Successfully triggered .torrent metafile download: ${fileName}`);
                        }
                    } catch (blobErr) {
                        console.error("[MVC.Control.Webtorrent] Failed to generate .torrent file blob:", blobErr);
                    }
                });

                // Trigger your custom DL file download pipeline
                this.DL(torrent);

                if (typeof callback === 'function') {
                    callback(torrent);
                }
            });
        } catch (err) {
            console.error("[MVC.Control.Webtorrent] Failed to add webseed to client:", err);
        }
    },

    DL: function(torrent) {
        if (!torrent) {
            console.error("Invalid torrent object provided to DL().");
            return;
        }

        const client = window.client;
        if (!client) {
            console.error("window.client not found for DL().");
            return;
        }

        const infoHash = torrent.infoHash;

        // Add webseeds from torrent.webseeds or fallback to torrent.urlList/original source
        const webseeds = torrent.webseeds || torrent.urlList || [];

        // Configure strict options for webseed-only downloading with zero P2P seeding/uploading
        const options = {
            urlList: webseeds,
            maxConns: 0,
            announce: [],
            private: true
        };

        // Pass infoHash and options to client.add using function(torrent) closure
        client.add(infoHash, options, function(activeTorrent) {
            console.log('Torrent added successfully for DL stream. InfoHash:', activeTorrent.infoHash);

            activeTorrent.on('download', function(bytes) {
                console.log(`Downloaded ${bytes} bytes from webseed. Progress: ${(activeTorrent.progress * 100).toFixed(2)}%`);
            });

            // Auto-download file to the browser upon completion
            activeTorrent.on('done', function() {
                console.log('Download finished successfully from webseed!');
                
                const file = activeTorrent.files[0];
                if (!file) {
                    console.error("No files found in torrent to download.");
                    return;
                }

                file.getBlob(function(err, blob) {
                    if (err) throw err;
                    
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = file.name;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    a.remove();
                });
            });
        });
    }
};