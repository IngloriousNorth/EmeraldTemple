// Gate.js
export const Gate = {
    initialized: false,
    authTriggered: false,

    init() {
        if (this.initialized) {
            console.warn("[GATE] Gate.init() already executed.");
            return;
        }
        this.initialized = true;

        console.info("[GATE] Initializing Emerald Temple Institutional Enclave (Foobar Test Mode)...");
        this.authenticateWithHardcodedKey();
    },

    async authenticateWithHardcodedKey() {
        if (this.authTriggered) return;
        this.authTriggered = true;

        try {
            // HARDCODED "FOOBAR" UNIVERSITY PRIVATE KEY / TOKEN FOR TESTING
            const HARDCODED_UNIVERSITY_KEY = "foobar-institutional-harbor-master-key-2026";
            
            console.info("[AUTH] Processing hardcoded institutional key payload...");

            const encoder = new TextEncoder();
            const keyBytes = encoder.encode(HARDCODED_UNIVERSITY_KEY);
            
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

            // Broadcast infoHash to background service worker
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage(
                    { type: "UPDATE_BACKGROUND_SEED_INFOHASH", infoHash: institutionalHash },
                    (response) => {
                        if (response && response.success) {
                            console.info("[GATE] Background service worker synchronized with infoHash.");
                        }
                    }
                );
            }

            this.injectBundleAndUnlock();

        } catch (err) {
            console.error("[AUTH ERROR] Hardcoded key derivation failed:", err);
            this.authTriggered = false;
        }
    },

    async injectBundleAndUnlock() {
        console.info("[SUCCESS] Enclave gate unlocked via hardcoded institutional credentials.");

        const scriptSrc = "src/bundle.js";

        if (!document.querySelector(`script[data-gate-bundle]`)) {
            try {
                // 1. Fetch the compiled bundle text from your extension package
                const response = await fetch(scriptSrc);
                const bundleCode = await response.text();

                // 2. Wrap the code into a Blob URL to satisfy Chrome's MV3 CSP ('script-src 'self'')
                const blob = new Blob([bundleCode], { type: 'text/javascript' });
                const blobUrl = URL.createObjectURL(blob);

                const bundleScript = document.createElement('script');
                bundleScript.type = 'module';
                bundleScript.src = blobUrl;
                bundleScript.setAttribute('data-gate-bundle', 'true');

                bundleScript.onload = () => {
                    console.info("[GATE] bundle.js loaded successfully via secure Blob URL.");
                    // Clean up the blob reference once execution begins
                    URL.revokeObjectURL(blobUrl);
                };

                bundleScript.onerror = (err) => {
                    console.error("[GATE ERROR] Failed to load bundle.js:", err);
                    URL.revokeObjectURL(blobUrl);
                };

                document.head.appendChild(bundleScript);
                console.info("[GATE] bundle.js dynamically injected into HTML head.");

            } catch (fetchErr) {
                console.error("[GATE ERROR] Could not fetch bundle.js for Blob injection:", fetchErr);
            }
        } else {
            console.info("[GATE] bundle.js already injected.");
        }

        if (typeof $ !== 'undefined' && $(".crossRoad").length) {
            $(".crossRoad").fadeOut(777);
        }
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Gate.init(), { once: true });
} else {
    Gate.init();
}

export default Gate;