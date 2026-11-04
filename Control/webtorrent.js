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

const WebtorrentControl = {
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
        const webseedUrl = prompt("Enter the accredited webseed URL for this file (must match whitelist policy):", "https://archive.org/download/");
        
        if (!webseedUrl) {
            console.info("[MVC.Control.webtorrent] Torrent creation canceled by user.");
            return;
        }

        if (!this.isWhitelisted(webseedUrl)) {
            console.error(`[SECURITY REJECTED] Domain not allowed by whitelist policy: ${webseedUrl}`);
            alert(`[REJECTED] Webseed domain is not whitelisted: ${webseedUrl}`);
            return;
        }

        const client = window.client;
        if (!client) {
            console.error("[MVC.Control.webtorrent] window.client WebTorrent instance not found.");
            return;
        }

        client.seed(fileOrSource, { dht: false, tracker: false, pex: true, urlList: [webseedUrl] }, (torrent) => {
            console.info(`[MVC.Control.webtorrent] Torrent active. InfoHash: ${torrent.infoHash}`);

            console.log("GOT SEED METADATA");
                        
            if (window.MVC && window.MVC.Hook && window.MVC.Hook.Hero && typeof window.MVC.Hook.Hero.assertProgress === 'function') {
                window.MVC.Hook.Hero.assertProgress(torrent.infoHash);
            }

            const torrentBlob = new Blob([torrent.torrentFile], { type: 'application/x-bittorrent' });
            const blobUrl = URL.createObjectURL(torrentBlob);
            const fileName = `${torrent.name || 'archive'}.torrent`;

            const downloadLink = document.createElement('a');
            downloadLink.style.display = 'none';
            downloadLink.href = blobUrl;
            downloadLink.download = fileName;
            
            document.body.appendChild(downloadLink);
            downloadLink.click();
            
            setTimeout(() => {
                document.body.removeChild(downloadLink);
                window.URL.revokeObjectURL(blobUrl);
            }, 1000);

            console.info(`[MVC.Control.webtorrent] Successfully dispatched literal browser download for: ${fileName}`);

            if (typeof callback === 'function') {
                callback(torrent);
            }
        });
    },

    propagate: function(info) {
        if (!torrent) return;
        const client = window.client;
        if (!client) return;

        if (window.MVC && window.MVC.Hook && window.MVC.Hook.Hero && typeof window.MVC.Hook.Hero.assertProgress === 'function') {
            window.MVC.Hook.Hero.assertProgress(torrent.infoHash);
        }

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

                torrent.on("progress", () => {
                    if (window.MVC && window.MVC.Hook && window.MVC.Hook.Hero && typeof window.MVC.Hook.Hero.onProgress === 'function') {
                        window.MVC.Hook.Hero.onProgress(torrent);
                    }
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

export default WebtorrentControl;