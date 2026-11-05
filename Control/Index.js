// src/Control/Index.js
import WebTorrentHook from '../Hook/WebTorrent.js';
import WebTorrentControl from '../Control/WebTorrent.js';
import WebTorrentBase from '../Base/WebTorrent.js'

const IndexControl = {
    initialize: function() {
        if (window.__TEMPEST_INDEX_INITIALIZED__) {
            console.warn("[KERNEL] Index.js execution skipped: Already initialized.");
            return;
        }
        window.__TEMPEST_INDEX_INITIALIZED__ = true;

        async function boot() {
            // 3. Build TEMPEST Config Object
            const tempestConfig = {
                defaultPage: "table",
                fade: true,
                pages: ["table", "top10", "node", "Category", "privacy"],
                helm: [
                    {
                        page: "table",
                        /* MAIN FUNCTION, of EmeraldTemple */
                        fn: function() {
                            //torrent-neutral table
                            MVC.Control.Table.unfold("table");
                        }
                    },
                    {
                        page: "node",
                        fn: function() {
                            window.async.parallel([
                                function(cb) { 
                                    if (MVC.Hook && MVC.Hook.Graph) MVC.Hook.Graph.initialize(); 
                                    cb(null); 
                                },
                                function(cb) { 
                                   
                                }
                            ]);
                        }
                    },
                    {
                        page: "Category",
                        fn: function() {  
                            if (MVC.Control && MVC.Control.Category && typeof MVC.Control.Category.List === 'function') {
                                MVC.Control.Category.List();
                            }
                        }
                    }
                ]
            };

            // Automatically detect GitHub Pages subpath vs local root
            const isGitHubPages = window.location.hostname.includes('github.io');
            const repoPath = isGitHubPages 
                ? (window.location.pathname.split('/')[1] ? `/${window.location.pathname.split('/')[1]}` : '') 
                : '';

            const fragmentBase = `${repoPath}/TEMPEST/fragment`;

            window.async.parallel([
                function(cb){
                    $.get(`${fragmentBase}/Hero.html`, function(html){
                        $("footer").html(html);
                    }).always(() => cb(null));
                },
                function(cb){
                    $.get(`${fragmentBase}/header.html`, function(html){
                        $("header").html(html);
                    }).always(() => cb(null));
                }
            ], function(err) {
                if (window.TEMPEST && typeof TEMPEST.initialize === 'function') {
                    TEMPEST.initialize(tempestConfig, async () => {
                        MVC.Hook.Ramosa.unfurl();
                        //webtorrentcontrol is modular, and Ramosa Graph-query language is encapsulated from the transport-layer.
                        WebTorrentBase.initialize();
                        //Gate.js encoded in build with GCFM-FSM Private_Safe_Harbor RIPEMD integrity hex
                        //static build shipped with hard-coded Peer-Exchange (PEX) infoHash.
                        //TODO: Build Dynamic, Peer-to-Peer (P2P) GraphDB in Ramosa query language via hard-coded PEX-swarm.
                    });
                }
            });
            
            console.info("[TEMPEST KERNEL] Router initialized successfully.");
        }

        boot();    
    }
};

window.MVC = window.MVC || {};
window.MVC.Control = window.MVC.Control || {};
window.MVC.Control.Index = IndexControl;

export default IndexControl;