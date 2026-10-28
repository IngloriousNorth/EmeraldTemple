import WebTorrent from './lib/webtorrent.min.js';

console.info("[BACKGROUND] EmeraldTemple PEX Service Worker active.");

// Reasonable Whitelist Guidelines by Google / Extension Store Standards:
const ALLOWED_DOMAINS = [
    ".edu",
    "arxiv.org",
    "jstor.org",
    "gutenberg.org",
    "archive.org",
    "doaj.org",
    "plato.stanford.edu",
    "zenodo.org",
    "osf.io"
];

function isWhitelistedUrl(urlStr) {
    try {
        const parsed = new URL(urlStr);
        const hostname = parsed.hostname.toLowerCase();
        
        return ALLOWED_DOMAINS.some(domain => {
            if (domain.startsWith('.')) {
                return hostname.endsWith(domain);
            }
            return hostname === domain || hostname.endsWith('.' + domain);
        });
    } catch (err) {
        console.warn("[SECURITY] Malformed URL rejected:", urlStr);
        return false;
    }
}

// Initialize WebTorrent client in the background worker scope
const client = new WebTorrent({
    dht: false,
    tracker: false,
    pex: true
});

self.client = client;

// Listen for ingestion messages from popup UI
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "ADD_WEBSEED") {
        const targetUrl = request.url;

        if (!isWhitelistedUrl(targetUrl)) {
            console.warn(`[REJECTED] URL failed safety/whitelist policy: ${targetUrl}`);
            sendResponse({ 
                success: false, 
                error: "Policy Violation: URL domain must be an accredited educational (.edu) or verified public research archive." 
            });
            return true;
        }

        console.info(`[APPROVED] Whitelist check passed. Mounting webseed: ${targetUrl}`);
        
        client.add(targetUrl, { announce: [] }, (torrent) => {
            console.info(`[WEBTORRENT] Webseed active in background. InfoHash: ${torrent.infoHash}`);
            sendResponse({ success: true, infoHash: torrent.infoHash });
        });

        return true;
    }
});

chrome.runtime.onInstalled.addListener(() => {
    console.info("[BACKGROUND] EmeraldTemple extension initialized with academic whitelist.");
});