var torrent = null;
var magnetURI = ""
var interval = null;
var wired = false;


function getMagnetURI(infoHash) {
    var trackers = [
        'wss://tracker.webtorrent.dev',
        'wss://tracker.openwebtorrent.com',
        'udp://tracker.opentrackr.org:1337/announce',
        'udp://explodie.org:6969/announce'
    ];

    var trParams = trackers.map(function(tr) {
        return '&tr=' + encodeURIComponent(tr);
    }).join('');

    return 'magnet:?xt=urn:btih:' + infoHash + trParams;
}