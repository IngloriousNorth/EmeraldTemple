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
        try {
            console.info("[MVC.Control.webtorrent] propagate() invoked with info:", info);
            
            if (!info || Object.keys(info).length === 0) {
                console.warn("[MVC.Control.webtorrent] propagate() aborted: info object is empty.");
                return;
            }

            const client = window.client || window.webtorrentClient;
            if (!client) {
                console.error("[MVC.Control.webtorrent] WebTorrent client (window.client) not found during propagate()");
                return;
            }

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

            console.info("[MVC.Control.webtorrent] Resolved target infoHash:", infoHash);

            if (window.MVC?.Hook?.Hero && typeof window.MVC.Hook.Hero.assertProgress === 'function') {
                window.MVC.Hook.Hero.assertProgress(infoHash);
            }

            let activeTorrent = client.get(infoHash);

            const downloadFile = (torrent) => {
                if (!torrent || !torrent.files || torrent.files.length === 0) {
                    console.warn("[MVC.Control.webtorrent] Torrent has no files available to download.");
                    return;
                }
                const file = torrent.files[0];
                if (!file) return;

                console.info("[MVC.Control.webtorrent] Fetching blob for file:", file.name);
                file.getBlob(function(err, blob) {
                    if (err) {
                        console.error("[MVC.Control.webtorrent] Error getting file blob:", err);
                        return;
                    }
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = file.name;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    a.remove();
                    console.info("[MVC.Control.webtorrent] File successfully dispatched to browser downloads folder:", file.name);
                });
            };

            const onTorrentReady = (torrent) => {
                if (!torrent) return;

                if (typeof torrent.on === 'function') {
                    torrent.on("progress", () => {
                        if (window.MVC?.Hook?.Hero && typeof window.MVC.Hook.Hero.assertProgress === 'function') {
                            window.MVC.Hook.Hero.assertProgress(torrent.infoHash);
                        }
                    });
                }

                if (torrent.done || (torrent.files && torrent.files.length > 0 && torrent.progress === 1)) {
                    downloadFile(torrent);
                } else if (typeof torrent.on === 'function') {
                    torrent.on('done', () => {
                        downloadFile(torrent);
                    });
                } else {
                    const checkInterval = setInterval(() => {
                        if (torrent.done || (torrent.files && torrent.files.length > 0)) {
                            clearInterval(checkInterval);
                            downloadFile(torrent);
                        }
                    }, 1000);
                }
            };

            let webseeds = [];
            try {
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

            console.info("[MVC.Control.webtorrent] Adding magnet via client.add with webseeds:", webseeds);

            client.add(`magnet:?xt=urn:btih:${infoHash}`, { urlList: webseeds, dht: false, tracker: false, pex: true }, (torrent) => {
                if (!torrent) return;
                
                if (torrent.ready || (torrent.files && torrent.files.length > 0)) {
                    onTorrentReady(torrent);
                } else if (typeof torrent.on === 'function') {
                    torrent.on('ready', () => onTorrentReady(torrent));
                } else {
                    const poll = setInterval(() => {
                        if (torrent.files && torrent.files.length > 0) {
                            clearInterval(poll);
                            onTorrentReady(torrent);
                        }
                    }, 500);
                }
            });
        
        } catch (err) {
            console.error("[MVC.Control.webtorrent ERROR] Uncaught exception inside propagate():", err);
        }
    }
};

export default WebTorrentControl;