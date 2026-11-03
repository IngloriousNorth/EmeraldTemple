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
    "localhost",
    "buddhanet.net"
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

    addTorrentOrFile(fileOrSource, callback) {
        // 1. Prompt for webseed URL before mounting or seeding
        const webseedUrl = prompt("Enter the accredited webseed URL for this file (must match whitelist policy):", "https://archive.org/download/");
        
        if (!webseedUrl) {
            console.info("[MVC.Control.Webtorrent] Torrent creation canceled by user.");
            return;
        }

        // 2. Validate against whitelist policy
        if (!this.isWhitelisted(webseedUrl)) {
            console.error(`[SECURITY REJECTED] Domain not allowed by whitelist policy: ${webseedUrl}`);
            alert(`[REJECTED] Webseed domain is not whitelisted: ${webseedUrl}`);
            return;
        }

        const client = window.client;
        if (!client) {
            console.error("[MVC.Control.Webtorrent] window.client WebTorrent instance not found.");
            return;
        }

        const isFile = fileOrSource instanceof File || fileOrSource instanceof Blob;

        // 3. Mount with webseed included in options
        client.seed(fileOrSource, { dht: false, tracker: false, pex: true, urlList: [webseedUrl] }, (torrent) => {
            console.info(`[MVC.Control.Webtorrent] Torrent active. InfoHash: ${torrent.infoHash}`);

            // Automatically trigger genuine browser-level .torrent file download
            console.log("GOT SEED METADATA");
                        
                        MVC.Hook.Hero.assertProgress(torrent.infoHash);

                        // Create a true binary blob with bittorrent MIME type
                        const torrentBlob = new Blob([torrent.torrentFile], { type: 'application/x-bittorrent' });
                        const blobUrl = URL.createObjectURL(torrentBlob);
                        const fileName = `${torrent.name || 'archive'}.torrent`;

                        // Create literal anchor element for browser download delegation
                        const downloadLink = document.createElement('a');
                        downloadLink.style.display = 'none';
                        downloadLink.href = blobUrl;
                        downloadLink.download = fileName;
                        
                        // Append to DOM, fire click to engage browser native download manager, then cleanup
                        document.body.appendChild(downloadLink);
                        downloadLink.click();
                        
                        // Clean up object URL after brief timeout to let browser handle stream initialization
                        setTimeout(() => {
                            document.body.removeChild(downloadLink);
                            window.URL.revokeObjectURL(blobUrl);
                        }, 1000);

                        console.info(`[MVC.Control.Webtorrent] Successfully dispatched literal browser download for: ${fileName}`);

            if (typeof callback === 'function') {
                callback(torrent);
            }
        });
    },

    DL: function(torrent) {
        if (!torrent) return;
        const client = window.client;
        if (!client) return;

        MVC.Hook.Hero.assertProgress(torrent.infoHash);
        const infoHash = torrent.infoHash;
        const webseeds = torrent.webseeds || torrent.urlList || [];

        const options = {
            urlList: webseeds,
            maxConns: 0,
            announce: [],
            private: true
        };

        client.add(infoHash, options, function(activeTorrent) {
            activeTorrent.on('done', function() {
                console.log('Download finished successfully from webseed!');
                const file = activeTorrent.files[0];
                if (!file) return;

                torrent.on("progress", ()=>{
                    MVC.Hook.Hero.onProgress(torrent);
                });
                
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