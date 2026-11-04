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

const WebTorrentControl = {
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

    seed(fileOrSource, callback) {
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

        const client = window.client || window.webtorrentClient;
        if (!client) {
            console.error("[MVC.Control.webtorrent] window.client WebTorrent instance not found.");
            return;
        }

        client.seed(fileOrSource, { dht: false, tracker: false, pex: true, urlList: [webseedUrl] }, (torrent) => {
            console.info(`[MVC.Control.webtorrent] Torrent active. InfoHash: ${torrent.infoHash}`);

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

            if (typeof callback === 'function') {
                callback(torrent);
            }
        });
    },

    propagate: function(info) {
        if (!info || isEmptyObject(info)) return;
        const client = window.client || window.webtorrentClient;
        if (!client) return;

        window.MVC.Hook.Hero.assertProgress(infoHash);

        const onTorrentReady = (torrent) => {
            torrent.on("progress", () => {
                if (window.MVC && window.MVC.Hook && window.MVC.Hook.Hero && typeof window.MVC.Hook.Hero.onProgress === 'function') {
                    window.MVC.Hook.Hero.onProgress(torrent);
                }
            });

            if (torrent.done) {
                downloadFile(torrent);
            } else {
                torrent.on('done', () => {
                    downloadFile(torrent);
                });
            }
        };

        const downloadFile = (torrent) => {
            const file = torrent.files[0];
            if (!file) return;

            file.getBlob(function(err, blob) {
                if (err) return;
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = file.name;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
            });
        };

        if (activeTorrent) {
            onTorrentReady(activeTorrent);
        } else {
            let webseeds = [];
            try {
                const record = window.MVC?.Base?.Ramosa?.get(infoHash);
                if (record && record.Sphere && record.Sphere.edition && record.Sphere.edition.webSeed) {
                    webseeds = [record.Sphere.edition.webSeed];
                }
            } catch (e) {}

            client.add(`magnet:?xt=urn:btih:${info.RAy}`, { urlList: webseeds, dht: false, tracker: false, pex: true }, (torrent) => {
                onTorrentReady(torrent);
            });
        }
    }
};

export default WebTorrentControl;