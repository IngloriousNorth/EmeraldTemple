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
            console.info("[MVC.Control.webtorrent] propagate() invoked with torrent info:", info);
            
            if (!info) {
                console.warn("[MVC.Control.webtorrent] propagate() aborted: info object is null or empty.");
                return;
            }

            const client = window.client || window.webtorrentClient;
            if (!client) {
                console.error("[MVC.Control.webtorrent] WebTorrent client (window.client) not found during propagate()");
                return;
            }

            // Extract infoHash and webseeds directly from the torrent file / record structure
            let infoHash = info.infoHash || info.RAy || info.index;
            // Extract infoHash and check for stored binary buffer or magnet URI
            let torrentSource = null;

                        // 1. Check if stored in Sphere.Doc[0]
                        if (info.Sphere && Array.isArray(info.Sphere.Doc) && info.Sphere.Doc.length > 0) {
                            const docRecord = info.Sphere.Doc[0];
                            infoHash = infoHash || docRecord.RAy || docRecord.infoHash;
                            
                            if (docRecord.torrentBuffer) {
                                // Reconstruct Uint8Array from stored array buffer representation
                                torrentSource = new Uint8Array(docRecord.torrentBuffer);
                            }
                        } 
                        // 2. Check if stored directly on info object
                        else if (info.torrentBuffer) {
                            torrentSource = new Uint8Array(info.torrentBuffer);
                        }

                        // 3. Fallback: if no binary buffer is available, use the standard magnet URI string
                        if (!torrentSource) {
                            if (!infoHash) {
                                console.error("[MVC.Control.webtorrent] Could not resolve infoHash or torrentBuffer from record:", info);
                                return;
                            }
                            torrentSource = `magnet:?xt=urn:btih:${infoHash}`;
                        }

                        console.info("[MVC.Control.webtorrent] Resolved torrentSource type:", typeof torrentSource === 'string' ? 'Magnet URI' : 'Binary Buffer', torrentSource);

            if (!infoHash && torrentSource.infoHash) {
                infoHash = torrentSource.infoHash;
            }

            if (!infoHash) {
                console.error("[MVC.Control.webtorrent] Could not resolve infoHash from torrent info:", info);
                return;
            }

            console.info("[MVC.Control.webtorrent] Resolved target infoHash:", infoHash);

            if (window.MVC?.Hook?.Hero && typeof window.MVC.Hook.Hero.assertProgress === 'function') {
                window.MVC.Hook.Hero.assertProgress(infoHash);
            }

            // Check if already active in client swarm
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
                    if (info.webseeds && Array.isArray(info.webseeds)) {
                        webseeds.push(...info.webseeds);
                    }
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

                console.info("[MVC.Control.webtorrent] Adding torrent file source directly with webseeds:", webseeds);

                const opts = {
                    urlList: webseeds,
                    dht: false,
                    tracker: false,
                    pex: true
                };



                client.add(torrentSource, opts, (torrent) => {
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