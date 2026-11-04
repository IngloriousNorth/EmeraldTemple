// src/Control/Index.js

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
                defaultPage: "torrents",
                fade: true,
                pages: ["webtorrent", "torrents", "top10", "node", "Category", "privacy"],
                helm: [
                    {
                        page: "torrents",
                        fn: function() {
                            if (MVC.Control && MVC.Control.Torrents) {
                                MVC.Control.Torrents.table("torrents");

                            }
                        }
                    },
                    {
                        page: "top10",
                        fn: function() {
                            window.async.parallel([
                                function(cb) { MVC.Control.Torrents.table("day", cb); },
                                function(cb) { MVC.Control.Torrents.table("week", cb); },
                                function(cb) { MVC.Control.Torrents.table("month", cb); },
                                function(cb) { MVC.Control.Torrents.table("year", cb); },
                                function(cb) { MVC.Control.Torrents.table("alltime", cb); }
                            ]);
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
                                    if (MVC.Control && MVC.Control.Torrents && typeof MVC.Control.Torrents.initialize === 'function') {
                                        MVC.Control.Torrents.initialize("node", cb); 
                                    } else {
                                        cb(null);
                                    }
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