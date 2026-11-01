document.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        console.log("[UI] Enter key pressed.");

        if (!navigator.serviceWorker.controller) {
            console.error("[KERNEL ERROR] Service Worker controller not active yet. Refresh once.");
            return;
        }

        // Send the trigger message to nano.js
        navigator.serviceWorker.controller.postMessage({
            type: "COMPILE_BUNDLE",
            timestamp: Date.now()
        });
    }
});

/*
// Listen for the decrypted code response from nano.js
navigator.serviceWorker.addEventListener('message', async (event) => {
    if (event.data && event.data.type === "BUNDLE_READY") {
        console.info("[UI] Decrypted bundle received from nano.js. Executing...");
        
        try {
            // Execute the decrypted code safely as a module or script
            const scriptEl = document.createElement('script');
            scriptEl.type = 'module';
            scriptEl.textContent = event.data.code;
            document.head.appendChild(scriptEl);

            if (typeof $ !== 'undefined' && $(".crossRoad").length) {
                $(".crossRoad").fadeOut(777);
            }
        } catch (err) {
            console.error("[UI ERROR] Failed to inject bundle code:", err);
        }
    }
});*/