// Gate.js
import { ripemd160 } from '@noble/hashes/ripemd160'; // or your local helper
import { bytesToHex } from '@noble/hashes/utils';

// Your hard-coded zero-trust token built into the software
const INSTITUTIONAL_PRIVATE_TOKEN = "Academic_Harbor";

export const Gate = {
    initialized: false,
    authTriggered: false,

    init() {
        if (this.initialized) {
            console.warn("[GATE] Gate.init() already executed.");
            return;
        }

        this.initialized = true;

        console.info("[GATE] Initializing Emerald Temple Institutional Enclave...");
        this.authenticateWithKey();
    },

    async authenticateWithKey() {
        if (this.authTriggered) return;
        this.authTriggered = true;

        this.loadSovereignBundle();        
    },

    async loadSovereignBundle() {
        console.info("[TEMPLE] Awaiting sovereign bundle ingestion...");
        
        anchorPexSwarm();
        MVC.Control.Index.initialize();
        
        console.info("[TEMPLE SUCCESS] Sovereign bundle loaded and executed successfully.");

        // 3. Fade out the overlay
        if (typeof $ !== 'undefined' && $(".crossRoad").length) {
            $(".crossRoad").fadeOut(777);
        }

       
    }
}

async function anchorPexSwarm() {
    try {
        const encoder = new TextEncoder();
        const tokenBytes = encoder.encode(INSTITUTIONAL_PRIVATE_TOKEN);
        
        // Derive the 40-character hex infoHash via RIPEMD-160
        const hashDigest = ripemd160(tokenBytes);
        const institutionalInfoHash = bytesToHex(hashDigest);

        console.info(`[PEX ANCHOR] Derived institutional infoHash: ${institutionalInfoHash}`);

        // Send to nano.js Service Worker to mount the WebTorrent seed swarm
        navigator.serviceWorker.controller.postMessage({
            type: "SYNC_INSTITUTIONAL_INFOHASH",
            infoHash: institutionalInfoHash
        });
    } catch (err) {
        console.error("[PEX ERROR] Failed to anchor institutional swarm:", err);
    }
}

Gate.init();


export default Gate;