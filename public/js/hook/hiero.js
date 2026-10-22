var $body
var $progressBar
var $numPeers
var $downloaded
var $total
var $remaining
var $uploadSpeed
var $downloadSpeed

//NB infohash is lowercase in hero, not camelCase, because it's an html5 data obj
function assertHero(currentFile) {
    const $existing = $(`#hero option[value="${currentFile.infohash}"]`);

    //called on webtorrent route load, either refresh or a.webtorrent route()
    if ($existing.length !== 0){
        assertSwitch(currentFile.infohash);
        return;
    }

    const $option = $("<option></option>");
    $option.val(currentFile.infohash);
    $option.text(`${currentFile.apa} (${currentFile.format})`);
    
    // Fix: ensure infohash is stored consistently
    $option.data(currentFile);

    $("#hero").append($option);

    // Trigger the download immediately when the file is first added
    DL(currentFile.infohash);

    const $hero = $("#hero");
    const $aten = $(".hiero");

    $aten.click(function(e){
        e.preventDefault();
        processHiero($hero);
    })
    // Use 'change' for new selections and 'click' for re-clicking the same one
    $hero.off("click").on("click", function(e) {
        // If the dropdown is open, some browsers don't register 'click' on options.
        // We check the value; if it's valid, we route.
        
    });

    assertSwitch(currentFile.infohash)
}


function assertSwitch(infoHash) {
    const $select = $("#hero");
    const $option = $select.find(`option[value="${infoHash}"]`);

    if ($option.length > 0) {
        // 1. Sync dropdown selection
        $select.val(infoHash);
        $option.prop('selected', true);
        
        // 2. Toggle visible output container
        $(".output").hide();
        $("#output_" + infoHash).show();
        
        // 3. Sync bottom progress bar
        assertProgress(infoHash);

        // 4. FIX: If torrent exists in WebTorrent memory and is already done,
        // force swap of status elements to Download Buttons!
        const torrent = client.get(infoHash);
        if (torrent && torrent.done) {
            apa = TEMPEST.paramREC() ? TEMPEST.paramREC().apa : ""
            torrent.files.forEach((file, index) => {
               assertButton(file, torrent.infoHash, index, apa);
            });
        } else if (!torrent) {
            // If it wasn't added yet, run full DL
            DL(infoHash);
        }
    }
}

function assertProgress(infoHash){
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

function onProgress(torrent) {
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