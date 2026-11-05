const HeroHook = {
    assertProgress: function(infoHash) {
        // Safe DOM selection inside the method so elements aren't evaluated before they exist
        const $body = document.querySelector("body");
        const $progressBar = document.querySelector('#progressBar');
        const $numPeers = document.querySelector('#numPeers');
        const $downloaded = document.querySelector('#downloaded');
        const $total = document.querySelector('#total');
        const $remaining = document.querySelector('#remaining');
        const $uploadSpeed = document.querySelector('#uploadSpeed');
        const $downloadSpeed = document.querySelector('#downloadSpeed');

        const client = window.client || window.webtorrentClient;
        if (!client) return;

        const torrent = client.get(infoHash);

        if (torrent) {
            // Initial render call
            HeroHook.onProgress(torrent);
        } else {
            // Fallback/Reset state if torrent isn't found
            if ($body) $body.classList.remove('is-seed');
            if ($numPeers) $numPeers.innerHTML = '0 peers';
            if ($progressBar) $progressBar.style.width = '0%';
            if ($downloaded) $downloaded.innerHTML = "";
            if ($total) $total.innerHTML = "";
            if ($remaining) $remaining.innerHTML = "";
            if ($uploadSpeed) $uploadSpeed.innerHTML = "0 B/s";
            if ($downloadSpeed) $downloadSpeed.innerHTML = "0 B/s";
        }
    },

    onProgress: function(torrent) {
        const $body = document.querySelector("body");
        const $progressBar = document.querySelector('#progressBar');
        const $numPeers = document.querySelector('#numPeers');
        const $downloaded = document.querySelector('#downloaded');
        const $total = document.querySelector('#total');
        const $remaining = document.querySelector('#remaining');
        const $uploadSpeed = document.querySelector('#uploadSpeed');
        const $downloadSpeed = document.querySelector('#downloadSpeed');

        if (!torrent) return;

        console.log(torrent);

        if ($numPeers) {
            $numPeers.innerHTML = torrent.numPeers + (torrent.numPeers === 1 ? ' peer' : ' peers');
        }

        const percent = Math.round((torrent.progress || 0) * 100 * 100) / 100;
        if ($progressBar) {
            $progressBar.style.width = percent + '%';
        }

        if ($downloaded && torrent.downloaded !== undefined) {
            $downloaded.innerHTML = prettyBytes(torrent.downloaded);
        }
        if ($total && torrent.length !== undefined) {
            $total.innerHTML = prettyBytes(torrent.length);
        }

        // Remaining time & Seed status state toggle
        let remaining = '';
        if ($body) {
            if (torrent.done || torrent.progress === 1) {
                remaining = 'Done.';
                // Use classList safely instead of overwriting className with a stray leading space
                $body.classList.add('is-seed');
            } else {
                remaining = moment.duration((torrent.timeRemaining || 0) / 1000, 'seconds').humanize();
                remaining = remaining[0].toUpperCase() + remaining.substring(1) + ' remaining.';
                $body.classList.remove('is-seed');
            }
        }
        if ($remaining) {
            $remaining.innerHTML = remaining;
        }

        // Speed rates
        if ($downloadSpeed) {
            $downloadSpeed.innerHTML = prettyBytes(torrent.downloadSpeed || 0) + '/s';
        }
        if ($uploadSpeed) {
            $uploadSpeed.innerHTML = prettyBytes(torrent.uploadSpeed || 0) + '/s';
        }
    }
};

export default HeroHook;