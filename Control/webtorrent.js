//IA
import MVC from '../MAINFRAME/MAINFRAME';

const APPROVED_DOMAINS = [
    ".edu",
    "arxiv.org",
    "jstor.org",
    "gutenberg.org",
    "archive.org",
    "doaj.org",
    "plato.stanford.edu",
    "zenodo.org",
    "osf.io",
    "localhost"
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
                
                if (typeof callback === 'function') {
                    callback(torrent);
                }
            });
        } catch (err) {
            console.error("[MVC.Control.Webtorrent] Failed to add webseed to client:", err);
        }
    },
    propagate : function(infoHash) {
        $.get(`/torrent/${infoHash}`, function(data) {
            if (!data || !data.torrent) {
                console.error("Invalid torrent data returned from server.");
                return;
            }

            // 1. Save data.torrent from API call to const torrent
            const torrent = data.torrent;

            // 2. Use hexStr.split(',') to get the torrentBuffer
            const hexArr = typeof torrent === 'object' ? torrent.hex : torrent;
            const hexStr = hexArr.split(',');
            const torrentUint8Array = new Uint8Array(hexStr);
            const torrentBuffer = window.Buffer.from(torrentUint8Array);

            // 3. Add webseeds from torrent.webseeds as urlList
            const webseeds = torrent.webseeds || [];

            // 4. Configure strict options for webseed-only downloading with zero P2P seeding/uploading
            const options = {
                urlList: webseeds,
                maxConns: 0,
                announce: [],
                private: true
            };

            // 5. Pass buffer and options to client.add using function(torrent) closure
            client.add(torrentBuffer, options, function(torrent) {
                console.log('Torrent added successfully. InfoHash:', torrent.infoHash);

                if (typeof torrent.throttle === 'function') {
                    torrent.throttle({ upload: 0 });
                }

                torrent.on('download', function(bytes) {
                    console.log(`Downloaded ${bytes} bytes from webseed. Progress: ${(torrent.progress * 100).toFixed(2)}%`);
                });

                // 6. Auto-download file to the browser upon completion
                torrent.on('done', function() {
                    console.log('Download finished successfully from webseed!');
                    
                    const file = torrent.files[0];
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

                        // Destroy instance immediately to ensure zero background seeding
                        torrent.destroy({ destroyStore: true }, () => {
                            console.log('Torrent instance destroyed. Zero background activity.');
                        });
                    });
                });
            });
        });
    }
};