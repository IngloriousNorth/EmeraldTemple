import TEMPEST from '../TEMPEST/TEMPEST.js';
const async = require ('async');

module.exports = {
    initialize : function(){
        if (window.__TEMPEST_INDEX_INITIALIZED__) {
            console.warn("[KERNEL] Index.js execution skipped: Already initialized.");
            return;
        }
        window.__TEMPEST_INDEX_INITIALIZED__ = true;

        async function boot() {

                // 2. Inject structural template container safely inside .city
            
                // 3. Build TEMPEST Config Object
                const tempestConfig = {
                    defaultPage: "torrents",
                    fade: true,
                    pages: ["webtorrent", "torrents", "top10", "node", "Category", "privacy"],
                    helm: [
                        {
                            page: "torrents",
                            fn: function() {
                                MVC.Control.Torrents.table("torrents");
                            }
                        },
                        {
                            page: "top10",
                            fn: function() {
                                //RAID...if we use async.parallel, etc. with Ramosa we get Graph RAID()
                                async.parallel([
                                    MVC.Control.Torrents.table("day"),
                                    MVC.Control.Torrents.table("week"),
                                    MVC.Control.Torrents.table("month"),
                                    MVC.Control.Torrents.table("year"),
                                    MVC.Control.Torrents.table("alltime")
                                ])
                            }
                        },
                        {
                            page: "node",
                            fn: function() {
                                async.parallel([
                                    MVC.Hook.Graph.initialize(),
                                    MVC.Control.Torrents.initialize("node")
                                    //MVC.Control.Sentinel.processGlyph()
                                ])
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


                // Automatically detect GitHub Pages subpath vs local root
                const isGitHubPages = window.location.hostname.includes('github.io');
                const repoPath = isGitHubPages 
                    ? (window.location.pathname.split('/')[1] ? `/${window.location.pathname.split('/')[1]}` : '') 
                    : '';

                // Construct your safe base directory for fragments
                // Assuming your fragments live in /TEMPEST/fragment/ relative to root
                const fragmentBase = `${repoPath}/TEMPEST/fragment`;

                async.parallel([
                    function(cb){
                        $.get(`${fragmentBase}/Hero.html`, function(html){
                            $("footer").html(html);
                        }).always(() => cb(null)); // Ensures cb always fires even if request fails
                    },
                    function(cb){
                        $.get(`${fragmentBase}/header.html`, function(html){
                            $("header").html(html);
                        }).always(() => cb(null));
                    }
                ], function(err) {
                    // This executes once both parallel tasks finish
                    TEMPEST.initialize(tempestConfig, ()=>{ // 4. Fade out crossRoad / splash and initialize TEMPEST Router
                        $(".crossRoad").fadeOut(4444)
                        MVC.Hook.webtorrent.initialize();
                    }
                    )
                });
                
                console.info("[TEMPEST KERNEL] Router initialized successfully.");

        }
        //there is no try

        boot();    
    }
    
};