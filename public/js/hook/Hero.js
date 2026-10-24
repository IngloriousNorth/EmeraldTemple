window.dragOn = dragOn;

/**
 * Feross drag-drop wrapper for the Emerald-Temple
 * @param {string} dropTargetSelector - DOM selector for the drop zone
 * @param {number} maxPages - The number of pages to parse (e.g. first 15 pages)
 * @param {boolean|object} options - Pass `true` or `{ bypassPdfJs: true }` to send the entire raw file, bypassing PDF.js entirely
 * @param {function} onFileDropped - Callback handler returning the processed file/pages
 */
function dragOn(dropTargetSelector, maxPages = 15, options = false, onFileDropped) {
    // Handle options argument switch (can pass a boolean directly or an options object)
    const bypassPdfJs = typeof options === 'object' ? options.bypassPdfJs : options;

    dragDrop(dropTargetSelector, (files, pos, fileData, extra) => {
        console.log('📂 Files dropped via Feross drag-drop:', files);

        files.forEach(async (file) => {
            // ARG SWITCH: Bypass PDF.js and send the complete raw file
            if (bypassPdfJs) {
                console.log('⚡ Bypassing PDF.js extraction. Seeding raw file via WebTorrent:', file.name);
                
                client.seed(file, (torrent) => {
                    console.log('🌱 Torrent seeded successfully. InfoHash:', torrent.infoHash);

                    // Post infoHash and file metadata to /add_source
                    $.post('/add_source', {
                        infoHash: torrent.infoHash,
                        name: file.name,
                        size: file.size
                    }, (res) => {
                        console.log('📥 Response from /add_source:', res);

                        // Download the .torrent file once response is received
                        const torrentBlob = new Blob([torrent.torrentFile], { type: 'application/x-bittorrent' });
                        const downloadUrl = URL.createObjectURL(torrentBlob);
                        const a = document.createElement('a');
                        a.href = downloadUrl;
                        a.download = `${file.name}.torrent`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);

                        if (typeof onFileDropped === 'function') {
                            onFileDropped({
                                name: file.name,
                                size: file.size,
                                type: file.type,
                                rawFile: file,
                                infoHash: torrent.infoHash,
                                response: res
                            });
                        }

                        // Call initializeTorrents after successful torrent addition & download
                        if (typeof window.initializeTorrents === 'function') {
                            window.initializeTorrents("torrents");
                        }
                    });
                });
                return;
            }

            // STANDARD PATH: Extract up to `maxPages` using PDF.js
            try {
                console.log(`📖 Parsing first ${maxPages} pages of ${file.name}...`);
                const arrayBuffer = await file.arrayBuffer();
                const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                const pdfDocument = await loadingTask.promise;
                
                const pagesToParse = Math.min(pdfDocument.numPages, maxPages);
                const pagesArray = [];

                for (let i = 1; i <= pagesToParse; i++) {
                    const page = await pdfDocument.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map(item => item.str).join(' ');
                    pagesArray.push(pageText);
                }

                // Seed file using WebTorrent
                client.seed(file, (torrent) => {
                    console.log('🌱 Torrent seeded successfully. InfoHash:', torrent.infoHash);

                    // Post pages and infoHash to /add_source
                    $.post('/add_source', {
                        infoHash: torrent.infoHash,
                        name: file.name,
                        size: file.size,
                        pages_array: pagesArray,
                        totalPdfPages: pdfDocument.numPages
                    }, (res) => {
                        console.log('📥 Response from /add_source:', res);

                        // Download the .torrent file once /add_source returns response
                        const torrentBlob = new Blob([torrent.torrentFile], { type: 'application/x-bittorrent' });
                        const downloadUrl = URL.createObjectURL(torrentBlob);
                        const a = document.createElement('a');
                        a.href = downloadUrl;
                        a.download = `${file.name}.torrent`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);

                        if (typeof onFileDropped === 'function') {
                            onFileDropped({
                                name: file.name,
                                size: file.size,
                                pages_array: pagesArray,
                                totalPdfPages: pdfDocument.numPages,
                                infoHash: torrent.infoHash,
                                response: res
                            });
                        }

                        // Call initializeTorrents with "torrents"
                        if (typeof window.initializeTorrents === 'function') {
                            window.initializeTorrents("torrents");
                        }
                    });
                });

            } catch (err) {
                console.error("⚠️ Error parsing PDF file locally:", err);
            }
        });
    });
}

// Attach to window if needed globally
window.dragOn = dragOn;

var $body
var $progressBar
var $numPeers
var $downloaded
var $total
var $remaining
var $uploadSpeed
var $downloadSpeed


window.assertProgress = function assertProgress(infoHash){
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

window.onProgress = function onProgress(torrent) {

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