// Source/Gate.js
//import { ethers } from './lib/ethers.min.js';

export const Gate = {
    initialized: false,
    authTriggered: false,

    init() {
        if (this.initialized) {
            console.warn("[GATE] Gate.init() already executed.");
            return;
        }
        this.initialized = true;

        console.info("[GATE] Initializing Web3 institutional gate (Anywhere Enter Key Listener)...");

        // Handle Enter Keypress anywhere on the screen
        document.addEventListener('keydown', async (e) => {
            if (e.key !== "Enter") return;
            await this.authenticateAndLock();
        });
    },

    async authenticateAndLock() {
        if (this.authTriggered) {
            console.warn("[AUTH] Authentication already in progress or completed.");
            return;
        }
        this.authTriggered = true;

        try {
            if (!window.ethereum) {
                throw new Error("No Web3 wallet provider detected.");
            }

            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const userAddress = accounts[0];
            console.info(`[WALLET] User interacting locally as: ${userAddress}`);

            // 1. Institutional hardcoded key/passphrase for shared swarm derivation
            const INSTITUTIONAL_HARBOR_PRIVATE_KEY = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";

            console.info("[AUTH] Deriving universal PEX InfoHash via Web3 Keccak-256...");

            // 2. Pure Web3 Keccak-256 hash generation using ethers
            const institutionalHash = ethers.keccak256(
                ethers.toUtf8Bytes(INSTITUTIONAL_HARBOR_PRIVATE_KEY)
            );

            // Inside Gate.js -> authenticateAndLock()
            const lockedInfoHash = institutionalHash.slice(2, 42);
            console.info(`[HARBOR LOCKED] Universal PEX InfoHash: ${lockedInfoHash}`);

            // 1. Assign locally to window/self for local scripts
            self.infoHash = lockedInfoHash;
            window.infoHash = lockedInfoHash;
            window.seedInfoHash = lockedInfoHash;

            if (window.client) {
                window.client.lockedPexHash = lockedInfoHash;
            }

            // 2. Broadcast the locked infoHash to background.js to update the background swarm in real time
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage(
                    { type: "UPDATE_BACKGROUND_SEED_INFOHASH", infoHash: lockedInfoHash },
                    (response) => {
                        if (response && response.success) {
                            console.info("[GATE] Background service worker synchronized with infoHash:", lockedInfoHash);
                        }
                    }
                );
            }

            // Visual confirmation and disabling of gate styling if present
            const gateEl = document.querySelector('.GATE');
            if (gateEl) {
                gateEl.style.opacity = '0.4';
                gateEl.style.pointerEvents = 'none';
            }

            console.info("[SUCCESS] Enclave gate unlocked and infoHash bound to self.");

            // 4. Dynamically inject bundle.js into the HTML head upon successful unlock
            if (!document.querySelector('script[src="src/bundle.js"]')) {
                const bundleScript = document.createElement('script');
                bundleScript.type = 'module';
                bundleScript.src = 'src/bundle.js';
                document.head.appendChild(bundleScript);
                console.info("[GATE] bundle.js dynamically injected into HTML head.");
            }

        } catch (err) {
            const isUserCancellation = err.code === 4001 || (err.message && err.message.includes("User Rejected"));
            console.warn("[AUTH] Wallet authorization failed or cancelled:", err);
            this.authTriggered = false;
        }
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => Gate.init(), { once: true });
} else {
    Gate.init();
}

export default Gate;