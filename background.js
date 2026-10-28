import WebTorrent from './lib/webtorrent.min.js';

chrome.action.onClicked.addListener((tab) => {
    chrome.tabs.create({ url: chrome.runtime.getURL("Mu.html") });
});

import WebTorrent from './lib/webtorrent.min.js';

console.info("[BACKGROUND] EmeraldTemple PEX Service Worker active.");

const client = new WebTorrent({
    dht: false,
    tracker: false,
    pex: true
});

self.client = client;
window.client = client;
// Immediately seed the base foobar container/torrent on startup
// This ensures client.torrents[0] is always available and acts as the universal harbor base
// inside background.js
self.infoHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4"; // Default fallback before gate unlocks

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "UPDATE_BACKGROUND_SEED_INFOHASH" && request.infoHash) {
        self.infoHash = request.infoHash;
        console.info(`[BACKGROUND] Gate unlocked! Swarm infoHash updated to: ${self.infoHash}`);

        // Optional: Dynamically add or restart the seed torrent with the new institutional infoHash
        const institutionalMagnet = `magnet:?xt=urn:btih:${self.infoHash}&dn=EmeraldTemple_PEX_seed`;
        
        client.add(institutionalMagnet, { announce: [], pex: true }, (torrent) => {
            console.info(`[BACKGROUND] Institutional PEX seed swarm mounted: ${torrent.infoHash}`);
        });

        window.infoHash = null;
        self.infoHash = null;

        sendResponse({ success: true });
        return true;
    }

    if (request.type === "GET_SEED_INFOHASH") {
        sendResponse({ success: true, infoHash: self.infoHash });
        return true;
    }
});


// Message listener for scripts requesting the active seed infoHash
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "GET_SEED_INFOHASH") {
        // Fallback to client.torrents[0]?.infoHash if initialized, or default
        const seedInfoHash = (client.torrents && client.torrents.length > 0) 
            ? client.torrents[0].infoHash 
            : "e3b0c44298fc1c149afbf4c8996fb92427ae41e4";

        sendResponse({ success: true, infoHash: seedInfoHash });
        return true;
    }
});