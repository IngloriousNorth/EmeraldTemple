function dragOn(zone){
    const dropArea = document.querySelector(zone) || document.body;

    // 1. Prevent default browser behavior for all drag/drop events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, function (e) {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    // 2. Optional visual feedback when dragging over
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.add('highlight'), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, () => dropArea.classList.remove('highlight'), false);
    });

    // 3. Handle the drop event and seed the files
    dropArea.addEventListener('drop', function (e) {
        const files = e.dataTransfer.files;

        if (!files || files.length === 0) return;

        // Convert FileList to Array and pass to client.seed
        const fileArray = Array.from(files);

        console.log(`Seeding ${fileArray.length} file(s)...`);

        client.seed(fileArray, function (torrent) {
            console.log('Seeding started!');
            console.log('Info hash:', torrent.infoHash);
            console.log('Magnet URI:', torrent.magnetURI);
            $.post("/add_source/" + torrent.infoHash);
            //then we process using RAG
            // Register torrent in your UI
            insertTorrent(torrent.infoHash, torrent);

            // Progress tracking
            torrent.interval = setInterval(function () {
                onProgress(torrent);
            }, 500);

            // Assert each file into your UI as-is (in raw dropped order)
            torrent.files.forEach(function (fileItem, index) {
                assertFile(fileItem, torrent.infoHash, index);
            });

            torrent.on('done', function () {
                onDone(torrent);
            });
        });
    }, false);
}