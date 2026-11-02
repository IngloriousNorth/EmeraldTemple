import MVC from '../MAINFRAME/MAINFRAME';

module.exports = {
    initialize: function() {
        const submitBtn = document.getElementById('webseed-submit-btn');
        const urlInput = document.getElementById('webseed-url-input');

        if (!submitBtn || !urlInput) return;

        submitBtn.addEventListener('click', () => {
            const webseedUrl = urlInput.value.trim();
            if (!webseedUrl) {
                console.warn("[MVC.Hook.Webtorrent] Please provide a valid webseed URL.");
                return;
            }

            // Dispatch event/call to the controller
            if (MVC.Control && MVC.Control.Webtorrent && typeof MVC.Control.Webtorrent.addWebseed === 'function') {
                MVC.Control.Webtorrent.addWebseed(webseedUrl, (torrent) => {
                    console.info("[MVC.Hook.Webtorrent] Webseed successfully mounted:", torrent.infoHash);
                    urlInput.value = ''; // Reset input on success
                });
            } else {
                console.error("[MVC.Hook.Webtorrent] MVC.Control.Webtorrent.addWebseed is not defined.");
            }
        });

        // Optional Drag-and-Drop Hook support for the upload zone
        const dropZone = document.getElementById('emerald-upload-zone');
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => e.preventDefault());
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                const textData = e.dataTransfer.getData('text/plain');
                if (textData && textData.startsWith('http')) {
                    urlInput.value = textData;
                    submitBtn.click();
                }
            });
        }

        console.info("[MVC.Hook.Webtorrent] Webseed hook initialized successfully.");
    }
};