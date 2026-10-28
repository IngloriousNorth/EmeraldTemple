// Gate.js
import { ripemd160 } from '@noble/hashes/ripemd160';
import { bytesToHex } from '@noble/hashes/utils';

export const Gate = {
    initialized: false,
    authTriggered: false,

    init() {
        if (this.initialized) return;
        this.initialized = true;

        console.info("[GATE] Initializing Emerald Temple Gate...");

        // Listen for Enter key anywhere on screen without activeGate restrictions
        window.addEventListener('keydown', async (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                console.info("[GATE] Enter key detected anywhere on screen. Triggering prompt...");
                await this.checkAndPromptToken();
            }
        });
    },

    async checkAndPromptToken() {
        if (this.authTriggered) return;
        this.authTriggered = true;

        try {
            chrome.storage.sync.get(['emeraldRipemdToken'], async (result) => {
                let token = result.emeraldRipemdToken;

                if (!token) {
                    // Prompt user immediately on boot / keypress
                    token = prompt("[EMERALD TEMPLE] Enter key to Enter Temple. Enter your institutional RIPEMD token:");
                    
                    if (!token || !token.trim()) {
                        console.warn("[ACCESS RESTRICTED] Token entry cancelled or empty.");
                        this.authTriggered = false;
                        return;
                    }

                    token = token.trim();

                    await new Promise((res) => {
                        chrome.storage.sync.set({ emeraldRipemdToken: token }, res);
                    });
                }

                const encoder = new TextEncoder();
                const tokenBytes = encoder.encode(token);
                const hashDigest = ripemd160(tokenBytes);
                const institutionalHash = bytesToHex(hashDigest);

                console.info("[AUTH] Institutional token verified. Hash:", institutionalHash);

                if (window.client) {
                    window.client.lockedPexHash = institutionalHash;
                }

                this.injectBundleAndUnlock();
            });

        } catch (err) {
            console.error("[AUTH ERROR] Gate sequence failed:", err);
            this.authTriggered = false;
        }
    },

    injectBundleAndUnlock() {
        console.info("[SUCCESS] Enclave gate unlocked.");

        // Dynamically inject bundle.js as a module into the html head once
        if (!document.querySelector('script[src="src/bundle.js"]')) {
            const bundleScript = document.createElement('script');
            bundleScript.type = 'module';
            bundleScript.src = 'src/bundle.js';

            bundleScript.onerror = (err) => {
                console.error("[GATE ERROR] Failed to load bundle.js:", err);
            };

            document.head.appendChild(bundleScript);
            console.info("[GATE] bundle.js dynamically injected into HTML head.");
        } else {
            // If already injected, directly attempt import
            import('./Index.js').catch(() => {});
        }

        if (typeof $ !== 'undefined' && $(".crossRoad").length) {
            $(".crossRoad").fadeOut(777);
        }
    }
};

// Auto-initialize upon script load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Gate.init(), { once: true });
} else {
    Gate.init();
}

export default Gate;