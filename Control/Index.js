// src/Control/Index.js
import WebTorrentControl from '../Control/WebTorrent.js';
import RamosaProtocol from '../Model/WebTorrent.js'

const IndexControl = {
    initialize: function() {
        if (window.__TEMPEST_INDEX_INITIALIZED__) {
            console.warn("[KERNEL] Index.js execution skipped: Already initialized.");
            return;
        }
        window.__TEMPEST_INDEX_INITIALIZED__ = true;

        async function boot() {
            const tempestConfig = {
                defaultPage: "table",
                fade: true,
                pages: ["table", "top10", "node", "Category", "privacy"],
                helm: [
                    {
                        page: "table",
                        fn: function() {
                            MVC.Control.Table.unfold("table");
                        }
                    },
                    {
                        page: "node",
                        fn: function() {
                            window.async.parallel([
                                function(cb) { 
                                    if (window.MVC?.Hook?.Graph) window.MVC.Hook.Graph.initialize(); 
                                    cb(null); 
                                },
                                function(cb) { cb(null); }
                            ]);
                        }
                    },
                    {
                        page: "Category",
                        fn: function() {  
                            MVC.Control.Category.List();
                        }
                    }
                ]
            };

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
                        RamosaProtocol.initialize();

                    });
                }
            });
            
            console.info("[TEMPEST KERNEL] Router initialized successfully.");
        }

        boot();    
    }
};

export default IndexControl;