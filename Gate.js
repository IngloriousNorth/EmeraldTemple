// Gate.js
import { ripemd160 } from '@noble/hashes/ripemd160';
import { bytesToHex } from '@noble/hashes/utils';

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

        try {
            // Check local storage for a cached key, or prompt with the requested phrase
            let token = localStorage.getItem('emeraldRipemdToken');

            if (!token) {
                token = prompt("Enter key to Enter Temple.");
                
                if (!token || !token.trim()) {
                    console.warn("[ACCESS RESTRICTED] Token entry cancelled or empty.");
                    this.authTriggered = false;
                    return;
                }

                token = token.trim();
                localStorage.setItem('emeraldRipemdToken', token);
            }

            console.info("[AUTH] Processing institutional key payload...");

            const encoder = new TextEncoder();
            const keyBytes = encoder.encode(token);
            
            // Compute RIPEMD-160 hash via local build path
            const hashDigest = ripemd160(keyBytes);
            const institutionalHash = bytesToHex(hashDigest);

            console.info(`[HARBOR LOCKED] Derived Institutional InfoHash: ${institutionalHash}`);

            window.infoHash = institutionalHash;
            self.infoHash = institutionalHash;
            window.seedInfoHash = institutionalHash;

            if (window.client) {
                window.client.lockedPexHash = institutionalHash;
            }

            await this.loadSovereignBundle();

        } catch (err) {
            console.error("[AUTH ERROR] Key derivation failed:", err);
            this.authTriggered = false;
        }
    },

    async loadSovereignBundle() {
        try {
            console.info("[TEMPLE] Awaiting sovereign bundle ingestion...");
            
            // Dynamically import your compiled bundle as an ES module
            const bundle = await import('./src/bundle.min.js');
            
            console.info("[TEMPLE SUCCESS] bundle.min.js loaded and executed successfully.", bundle);

            $(".crossRoad").fadeOut(777);

            
        } catch (err) {
            console.error("[TEMPLE FATAL ERROR] Failed to load bundle.min.js:", err);
        }
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Gate.init(), { once: true });
} else {
    Gate.init();
}

export default Gate;