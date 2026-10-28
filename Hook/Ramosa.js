// MAINFRAME/Ray.js (or MVC.Control.Ray.js)
import MVC from '../MAINFRAME/MAINFRAME.js';

module.exports = {
    put: function(webseedUrl, rayPayload) {
        if (!webseedUrl || !rayPayload) {
            console.error("[RAY CONTROL ERROR] Missing webseedUrl or rayPayload for put()");
            return;
        }

        console.info("[RAY CONTROL] Ingesting webseed and RAA payload from:", webseedUrl);

        // Extract infoHash and edition/torrent details from payload
        const entity = rayPayload.entity;
        if (!entity || !entity.edition || !entity.edition.torrents) {
            console.warn("[RAY CONTROL] Payload lacks valid edition or torrent structures.");
            return;
        }

        // Iterate through torrents tied to this edition and put them into the RAY data model
        entity.edition.torrents.forEach(torrentInfo => {
            const infoHash = torrentInfo.infoHash;
            if (!infoHash) return;

            // Ensure webseed URL is attached to the torrent entry
            if (!torrentInfo.urlList) {
                torrentInfo.urlList = [webseedUrl];
            }

            // Register into RAY data store (capitalizes names, maps genus -> type)
            MVC.Base.Ramos.RAy.put(infoHash, rayPayload);
        });

        // Trigger UI / Table refresh hook if available
        if (window.MVC && window.MVC.Hook && window.MVC.Hook.Ray && typeof window.MVC.Hook.Ray.updated === "function") {
            window.MVC.Hook.Ray.updated();
        }

        return rayPayload;
    }
};