import MVC from '../MAINFRAME/MAINFRAME';

module.exports = {
    initialize: function() {
        $(document).on("click", "#webseed-submit-btn", () => {
            const webseedUrl = $("#webseed-url-input").val().trim();
            console.log(webseedUrl);
            if (!webseedUrl) {
                console.warn("[MVC.Hook.Webtorrent] Please provide a valid webseed URL.");
                return;
            }

            // Dispatch event/call to the controller
            if (MVC.Control && MVC.Control.webtorrent && typeof MVC.Control.webtorrent.addWebseed === 'function') {
                MVC.Control.webtorrent.addWebseed(webseedUrl, (torrent) => {
                    console.info("[MVC.Hook.webtorrent] Webseed successfully mounted:", torrent.infoHash);
                    urlInput.value = ''; // Reset input on success
                });
            } else {
                console.error("[MVC.Hook.Webtorrent] MVC.Control.Webtorrent.addWebseed is not defined.");
            }
        });

        console.info("[MVC.Hook.Webtorrent] Webseed hook initialized successfully.");
    }
};