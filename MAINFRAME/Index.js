const async = window.async;

(function() {
    if (window.__TEMPEST_INDEX_INITIALIZED__) {
        console.warn("[KERNEL] Index.js execution skipped: Already initialized.");
        return;
    }
    window.__TEMPEST_INDEX_INITIALIZED__ = true;

    async function boot() {
        try {
            // 2. Inject structural template container safely inside .city
            $(".EmeraldTemple").html(`
                    <header></header>
                    <div class="TEMPEST upload"></div>
                    <div class="TEMPEST webtorrent"></div>
                    <div class="TEMPEST top10"></div>
                    <div class="TEMPEST node"></div>
                    <div class="TEMPEST Category"></div>
                    <div class="TEMPEST torrents"></div>
                    <div class="TEMPEST privacy"></div>
                    <footer></footer>
                `);

            // 3. Build TEMPEST Config Object
            const tempestConfig = {
                defaultPage: "torrents",
                dir: "/fragment",
                directory: "/fragment",
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
                    $.get("fragment/footer.html", function(html){
                        $("footer").html(html);
                    })
                    cb(null)
                },
                function(err, cb){
                    $.get("fragment/header.html", function(html){
                        $("header").html(html);
                    })
                }
            ],TEMPEST.initialize(tempestConfig));
            
            console.info("[TEMPEST KERNEL] Router initialized successfully.");

        } catch (err) {
            console.error("[KERNEL ERROR] Native bootstrap failed:", err);
        }
    }

    boot();
})();