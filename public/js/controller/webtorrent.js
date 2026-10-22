function DL(infoHash) {    
    $.get(`/propagate/${infoHash}`, function(data){
        const torrent = data.torrent;
         assertProgress();
        assertOutput(infoHash);
        console.log("Downloading: " + infoHash)

        console.log(torrent.hex)
        // 1. Get the data from your API response (assuming it's a comma-separated string)
        const torrentHex = torrent.hex; // e.g., "100,56,58,97..."

        // 2. Convert the comma-separated string directly into a Uint8Array
        const torrentUint8Array = new Uint8Array(torrentHex.split(','));

        // 3. Pass it to WebTorrent
        console.log(torrent.webseeds);
        client.add(torrentUint8Array, {urlList : torrent.webseeds}, function(torrent){



            insertTorrent(infoHash, torrent);

            const interval = setInterval(function(){
                onProgress(torrent);

            },500);

            console.log("DOWNLOADED METADATA")

            

            // Sort files by sequence number
            torrent.files.sort(function(a, b) {
                const matchA = a.name.match(/_(\d+)_/) || a.name.match(/(\d+)/);
                const matchB = b.name.match(/_(\d+)_/) || b.name.match(/(\d+)/);
                const valA = matchA ? parseInt(matchA[1], 10) : 0;
                const valB = matchB ? parseInt(matchB[1], 10) : 0;
                return valA - valB;
            });

            // Initial render of files
            torrent.files.forEach(function(file, index) {
                assertFile(file, torrent.infoHash, index);
            });

            torrent.on('done', function(){
               onDone(torrent);

            });
        })        
    
    })
   

    
    
}

function onDone(torrent) {  
    console.log("TORRENT COMPLETE")       
    onProgress(torrent);
    
    //assertDL(torrent)
    clearInterval(interval);
    // Save the downloaded file handles to the hero option for later cycling
    apa = TEMPEST.paramREC() ? TEMPEST.paramREC().apa : ""
    torrent.files.forEach((file, index) => {
       assertButton(file, torrent.infoHash, index, apa);
    });

   $.post("/rev/" + torrent.infoHash)
}