async function initTempleServiceWorker() {
    if (!('serviceWorker' in navigator)) {
        console.error("[TEMPLE] Service Workers are not supported in this browser environment.");
        return;
    }

    try {
        // 1. Register nano.js as the service worker
        const registration = await navigator.serviceWorker.register('nano.min.js', { scope: './' });
        console.info("[TEMPLE] nano.js service worker registered successfully with scope:", registration.scope);

        // Wait until the service worker controller is active
        await navigator.serviceWorker.ready;

        // 2. Listen for messages from nano.js (e.g. bundle readiness or swarm sync)
        navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data) {
                if (event.data.type === "SWARM_READY") {
                    console.info("[TEMPLE] PEX Swarm active with InfoHash:", event.data.infoHash);
                }
            }
        });

        // 3. Query the service worker for the active seed InfoHash once ready
        if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: "GET_SEED_INFOHASH" });
        }

    } catch (err) {
        console.error("[TEMPLE FATAL] Service Worker registration or initialization failed:", err);
    }
}

window.addEventListener('load', initTempleServiceWorker);
