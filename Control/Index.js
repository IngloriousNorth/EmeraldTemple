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

                // 4. Fade out crossRoad / splash and initialize TEMPEST Router
                if (typeof $(".crossRoad").fadeOut === 'function') {
                    $(".crossRoad").fadeOut(3333);
                }

                async.parallel([
                    function(cb){
                        $.get("../TEMPEST/fragment/Hero.html", function(html){
                            $("footer").html(html);
                        })
                        cb(null)
                    },
                    function(err, cb){
                        $.get("../TEMPEST/fragment/header.html", function(html){
                            $("header").html(html);
                        })
                    }
                ],TEMPEST.initialize(tempestConfig));
                
                console.info("[TEMPEST KERNEL] Router initialized successfully.");

            //do, or do not
        }

        boot();    
    }
    
};