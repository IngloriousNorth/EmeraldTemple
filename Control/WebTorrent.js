import WebTorrentBase from '../Base/WebTorrent.js';

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
        if (!seedOptions || !seedOptions.urlList || seedOptions.urlList.length === 0) {
            console.info("[MVC.Control.webtorrent] Torrent creation canceled: empty urlList.");
            return;
        }

        const that = this;

        console.info(seedOptions.urlList);
        seedOptions.urlList.forEach(function(URL){
            if(!that.isWhitelisted(URL)){
                console.error(`[SECURITY REJECTED] Domain not allowed by whitelist policy: ${URL}`);
                alert(`[REJECTED] Webseed domain is not whitelisted: ${URL}`);
                return;
            }
        });

        console.info("null?:", seedOptions.announce);

        const client = window.client || window.webtorrentClient;
        if (!client) {
            console.error("[MVC.Control.webtorrent] window.client WebTorrent instance not found.");
            return;
        }

        client.seed(fileOrSource, seedOptions, async (torrent) => {
            MVC.Hook.Hero.assertProgress(torrent.infoHash);
            setInterval(MVC.Hook.Hero.onProgress(torrent), 500);
            torrent.on('done', ()=>{
                MVC.Hook.Hero.onProgress(torrent);
            })
            console.info(`[MVC.Control.webtorrent] Torrent active. InfoHash: ${torrent.infoHash}`);

            window.MVC.Hook.Hero.assertProgress(torrent.infoHash);

            // 4. Trigger download of the .torrent file to browser
            // 4. Trigger download of the .torrent file to browser
            const torrentBlob = new Blob([torrent.torrentBuffer], { type: 'application/x-bittorrent' });
            const blobUrl = URL.createObjectURL(torrentBlob);
            const rawTitle = torrent.name || 'archive';
            const fileName = rawTitle.endsWith('.torrent') ? rawTitle : `${rawTitle}.torrent`;

            const downloadLink = document.createElement('a');
            downloadLink.style.display = 'none';
            downloadLink.href = blobUrl;
            downloadLink.download = fileName;
            
            document.body.appendChild(downloadLink);
            downloadLink.click();
            
            setTimeout(() => {
                document.body.removeChild(downloadLink);
                window.URL.revokeObjectURL(blobUrl);
            }, 1000);``

            torrent.RAy = torrent.infoHash;
            if (typeof cb === 'function') cb(torrent);
        });
    },

    propagate: function(info) {
        try {
            console.info("[WebTorrentControl] propagate() invoked with torrent info:", info);
            
            if (!info) {
                console.warn("[WebTorrentControl] propagate() aborted: info object is null or empty.");
                return;
            }

            const client = window.client || window.webtorrentClient;
            if (!client) {
                console.error("[WebTorrentControl] WebTorrent client (window.client) not found during propagate()");
                return;
            }

            let torrent = info.Sphere.Doc

            let infoHash = torrent.RAy;/* . */
            let torrentBuffer = torrent.torrentBuffer;
            let webseeds = torrent.webseeds;

            console.info("[WebTorrentControl] Resolved target infoHash:", infoHash);

            MVC.Hook.Hero.assertProgress(infoHash);

            console.info("[WebTorrentControl] Asserted HeroProgress().");

            console.info("[WebTorrentControl] Adding torrent source directly with webseeds:", webseeds);

            const opts = {
                urlList: webseeds,
                dht: false,
                tracker: false,
                pex: true,
                announce : []
            };

            client.add(torrentBuffer, opts, (torrent) => {

                setInterval(MVC.Hook.Hero.onProgress(torrent), 500)
                
                downloadFile(torrent);
                
            });

            const downloadFile = (torrent) => {
                if (!torrent || !torrent.files || torrent.files.length === 0) {
                    console.warn("[MVC.Control.webtorrent] Torrent has no files available to download.");
                    return;
                }
                const file = torrent.files[0];
                if (!file) return;

                console.info("[MVC.Control.webtorrent] Fetching file via read stream:", file.name);
                
                const stream = file.createReadStream();
                const chunks = [];

                stream.on('data', (chunk) => {
                    chunks.push(chunk);
                });

                stream.on('end', () => {
                    const blob = new Blob(chunks);
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

                stream.on('error', (err) => {
                    console.error("[MVC.Control.webtorrent] Error reading file stream:", err);
                });
            };
        
        } catch (err) {
            console.error("[MVC.Control.webtorrent ERROR] Uncaught exception inside propagate():", err);
        }
    }
};

export default WebTorrentControl;