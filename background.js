// background.js[cite: 1]
import WebTorrent from './lib/webtorrent.min.js';

chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.create({ url: chrome.runtime.getURL("Mu.html") });
});

console.info("[BACKGROUND] EmeraldTemple PEX Service Worker active.");

const client = new WebTorrent({
    dht: false,
    tracker: false,
    pex: true
});

self.client = client;
self.infoHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4"; // Default fallback before gate unlocks[cite: 1]

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "UPDATE_BACKGROUND_SEED_INFOHASH" && request.infoHash) {
        self.infoHash = request.infoHash;
        console.info(`[BACKGROUND] Gate unlocked! Swarm infoHash updated to: ${self.infoHash}`);

        const institutionalMagnet = `magnet:?xt=urn:btih:${self.infoHash}&dn=EmeraldTemple_PEX_seed`;
        
        client.add(institutionalMagnet, { announce: [], pex: true }, (torrent) => {
            console.info(`[BACKGROUND] Institutional PEX seed swarm mounted: ${torrent.infoHash}`);
        });

        sendResponse({ success: true });
        return true;
    }

    if (request.type === "GET_SEED_INFOHASH") {
        const seedInfoHash = (client.torrents && client.torrents.length > 0) 
            ? client.torrents[0].infoHash 
            : self.infoHash;

        sendResponse({ success: true, infoHash: seedInfoHash });
        return true;
    }
});