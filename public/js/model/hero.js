// Fixed: Using template literals to ensure the value is quoted correctly
function insertTorrent(infoHash, torrent) {
    const $targetOption = $(`#hero option[value="${infoHash}"]`);
    if ($targetOption.length > 0) {
        $targetOption.data("torrent", torrent)
        console.log(`💾 Metadata indexed for hash: ${infoHash.substring(0, 8)}...`);
    }
}