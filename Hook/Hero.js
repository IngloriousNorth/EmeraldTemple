var $body
var $progressBar
var $numPeers
var $downloaded
var $total
var $remaining
var $uploadSpeed
var $downloadSpeed


module.exports = {
    assertProgress : function(infoHash){
        $body = document.querySelector("body");
        $progressBar = document.querySelector('#progressBar');
        $numPeers = document.querySelector('#numPeers');
        $downloaded = document.querySelector('#downloaded')
        $total = document.querySelector('#total')
        $remaining = document.querySelector('#remaining')
        $uploadSpeed = document.querySelector('#uploadSpeed')
        $downloadSpeed = document.querySelector('#downloadSpeed')

        const torrent = client.get(infoHash);

        // 3. Conditional: If torrent exists and is finished downloading
        if (torrent && torrent.done) {
            // Apply the Seeding UI state
            $body.classList.add('is-seed');

            // Fill elements with the completed data
            $numPeers.innerHTML = torrent.numPeers + (torrent.numPeers === 1 ? ' peer' : ' peers');        
            $progressBar.style.width = '100%';

            $downloaded.innerHTML = prettyBytes(torrent.downloaded);
            $total.innerHTML = prettyBytes(torrent.length);
            $remaining.innerHTML = 'Done.';
            
            // Show current speeds (Download will likely be 0, Upload might be active)
            $downloadSpeed.innerHTML = prettyBytes(torrent.downloadSpeed) + '/s';
            $uploadSpeed.innerHTML = prettyBytes(torrent.uploadSpeed) + '/s';

        } else {
            // Fallback/Reset state if torrent isn't found or isn't done
            $body.classList.remove('is-seed');
            
            $numPeers.innerHTML = '0 peers';
            $progressBar.style.width = '0%';
            
            $downloaded.innerHTML = "";
            $total.innerHTML = "";
            $remaining.innerHTML = "";
            $uploadSpeed.innerHTML = "0 B/s";
            $downloadSpeed.innerHTML = "0 B/s";
        }
    }
    ,
    onProgress : function(torrent) {
        const $hero = $("#hero").find("option:selected");
        if(torrent.infoHash === $("#hero").val() || $("#hero").val() === "null"){
            if ($numPeers) $numPeers.innerHTML = torrent.numPeers + (torrent.numPeers === 1 ? ' peer' : ' peers');
            const percent = Math.round(torrent.progress * 100 * 100) / 100;
            if ($progressBar) $progressBar.style.width = percent + '%';
            $downloaded.innerHTML = prettyBytes(torrent.downloaded)
            $total.innerHTML = prettyBytes(torrent.length)

            // Remaining time
            let remaining
            if (torrent.done) {
              remaining = 'Done.'
              $body.className = ' is-seed'
            } else {
              remaining = moment.duration(torrent.timeRemaining / 1000, 'seconds').humanize()
              remaining = remaining[0].toUpperCase() + remaining.substring(1) + ' remaining.'
              $body.className = $body.className.replace('is-seed', '');
            }
            $remaining.innerHTML = remaining

            // Speed rates
            $downloadSpeed.innerHTML = prettyBytes(torrent.downloadSpeed) + '/s'
            $uploadSpeed.innerHTML = prettyBytes(torrent.uploadSpeed) + '/s'      
        }
    }
        
}