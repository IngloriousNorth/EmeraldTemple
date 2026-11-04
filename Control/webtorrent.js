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

    seed(fileOrSource, RayPayLoad, seedOptions, cb) {        
        if (seedOptions.urlList.length === 0) {
            console.info("[MVC.Control.webtorrent] Torrent creation canceled by user.");
            return;
        }

        const that = this;

        seedOptions.urlList.forEach(function(URL){
            if(!that.isWhitelisted(URL)){
                console.error(`[SECURITY REJECTED] Domain not allowed by whitelist policy: ${URL}`);
                alert(`[REJECTED] Webseed domain is not whitelisted: ${URL}`);
                return;
            }
        });

        const client = window.client || window.webtorrentClient;
        if (!client) {
            console.error("[MVC.Control.webtorrent] window.client WebTorrent instance not found.");
            return;
        }

        client.seed(fileOrSource, seedOptions, (torrent) => {
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

            torrent.RAy = torrent.infoHash;
            if (typeof cb === 'function') cb(torrent);
        });
    },

    propagate: function(info) {
        if (!info || Object.keys(info).length === 0) return;

        if (!client) {
            console.error("[MVC.Control.webtorrent] WebTorrent client not found during propagate()");
            return;
        }

        // Extract infoHash / RAy from Ramosa record structure (record root index, Doc array, or edition metadata)
        let infoHash = info.index || info.RAy || info.infoHash;
        if (!infoHash && info.Sphere) {
            if (Array.isArray(info.Sphere.Doc) && info.Sphere.Doc.length > 0) {
                infoHash = info.Sphere.Doc[0].RAy || info.Sphere.Doc[0].infoHash;
            }
        }

        if (!infoHash) {
            console.error("[MVC.Control.webtorrent] Could not resolve infoHash from record:", info);
            return;
        }

        if (window.MVC?.Hook?.Hero && typeof window.MVC.Hook.Hero.assertProgress === 'function') {
            MVC.Hook.Hero.assertProgress(infoHash);
        }

        let activeTorrent = client.get(infoHash);

        const onTorrentReady = (torrent) => {
            torrent.on("progress", () => {
                if (window.MVC?.Hook?.Hero && typeof window.MVC.Hook.Hero.assertProgress === 'function') {
                    window.MVC.Hook.Hero.assertProgress(torrent.infoHash);
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
                // Extract webseeds from Sphere.Doc array or edition webSeed
                if (info.Sphere) {
                    if (Array.isArray(info.Sphere.Doc)) {
                        info.Sphere.Doc.forEach(d => {
                            if (Array.isArray(d.webseeds)) webseeds.push(...d.webseeds);
                            if (d.webseed) webseeds.push(d.webseed);
                        });
                    }
                    if (info.Sphere.edition?.webSeed) {
                        webseeds.push(info.Sphere.edition.webSeed);
                    }
                }
            } catch (e) { console.warn(e); }

            client.add(`magnet:?xt=urn:btih:${infoHash}`, { urlList: webseeds, dht: false, tracker: false, pex: true }, (torrent) => {
                onTorrentReady(torrent);
            });
        }
    }
};

export default WebTorrentControl;