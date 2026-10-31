// Gate.js
import { ripemd160 } from '@noble/hashes/ripemd160';
import { bytesToHex } from '@noble/hashes/utils';

const INSTITUTIONAL_PRIVATE_TOKEN = "public_domain_torrents";
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

        alert("Enter Key.");
        $(document).on("keypress", function(e){
            if(e.key === "Enter"){
                loadSovereignBundle();
            }
        })
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