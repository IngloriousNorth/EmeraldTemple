
const config = {
    defaultPage: "gate",
    dir: "/fragment",
    fade: true,
    pages: ["webtorrent", "torrents", "top10", "node", "Category", "upload", "privacy"],
    helm: [
        {
            page: "torrents",
            fn: function() {
                //removeGraph(".torrents_graph");
                advAutocomplete();

                initializeTorrents("torrents", function(){
                    $("h2 span a").text("Torrents").css("color", "#000").hide().fadeIn(2000);

                });
                
                $(".torrents_graph").hide();
                
                
            }
        },
        {
            page: "top10",
            fn: function() {
                // Ensure socket.io client script is loaded in your HTML, then:
                
                initializeTorrents("day", function(){
                });  
                initializeTorrents("week", function(){

                });
                initializeTorrents("month", function(){

                });
                initializeTorrents("year", function(){

                });
                initializeTorrents("alltime", function(){

                })
            }
        },
        {
            page: "node",
            fn: function() {
                removeGraph(".node_graph");

                
                assertGraph();
                initializeGraph();
                if (!TEMPEST.paramREC() || !TEMPEST.paramREC().uuid) {
                    TEMPEST.route("#torrents");
                    return;
                }  
                initializeTorrents("node", function(){
                    switch(TEMPEST.paramREC().label){
                        case "author":
                            $("h2 span a").text("Authors").css("color", "gold").hide().fadeIn(2000);;
                            break;
                        case "class":
                            $("h2 span a").text("Classes").css("color", "#50C777").hide().fadeIn(2000);;
                            break;
                        case "publisher":
                            $("h2 span a").text("Publishers").css("color", "mediumvioletred").hide().fadeIn(2000);;
                            break;
                    }

                });
                
                processGlyph();;
                
                

            }
        },
        {
            page: "Category",
            fn: function() {

                if (!TEMPEST.paramREC() || !TEMPEST.paramREC().ward) {
                    TEMPEST.route("#torrents");
                    return;
                }  
                Select(function(){
                    switch(TEMPEST.paramREC().ward){
                        case "authors":
                            $("h2 span a").text("Authors").css("color", "gold").hide().fadeIn(1337);
                            break;
                        case "classes":
                            $("h2 span a").text("Classes").css("color", "#50C777").hide().fadeIn(1337);;
                            break;
                        case "publishers":
                            $("h2 span a").text("Publishers").css("color", "mediumvioletred").hide().fadeIn(1337);;
                            break;
                    }
                });
            }
        },
        {
            page: "webtorrent",
            fn: function() {

                if (!TEMPEST.paramREC()) {
                    TEMPEST.route("#");
                    return;
                }
                if (!client) {
                    alert("NO CLIENT!");
                }
                const currentFile = {
                    infohash: TEMPEST.paramREC().infoHash,
                    apa: TEMPEST.paramREC().apa,
                    format: TEMPEST.paramREC().format
                };
                assertHero(currentFile);                
            }
        },
        {
            page: "upload",
            fn: function() {
                $("h2 span a").text("Upload").css("color", "darkviolet").hide().fadeIn(1337);;
                initializeUpload();

                uploadAutocomplete();
            }
        },           
        {
            page: "privacy",
            fn: function() {
                $("h2 span a").text("Privacy Policy").css("color", "silver").hide().fadeIn(1337);;
            }
        }
    ]
};

function go() {
    $(".autosuggestBox").hide();
    TEMPEST.route("#torrents");
    $(".city").fadeIn();

    const params = TEMPEST.paramREC() ? TEMPEST.paramREC() : {};
    $.get("/fragment/header.html", function(data){
        $("header").html(data);            
        headerAutocomplete();
        assertSentinel();

        $.get("/fragment/hero.html", function(data){
            $("footer").html(data);
            TEMPEST.initialize(config)
        })
    })

    $(document).on("TEMPEST", function(){       
        
        // Hide routing search/warp UI
        $("#mermaid").hide();
        $("h2 span a").hide();
        if(TEMPEST.pageREC() !== "torrents"){
            $("#road").hide();
        }
        else{
            $("#road").fadeIn(2000);
        }
       
    })


    
}

$(document).ready(function(){
    setTimeout(function(){
        $("header").fadeIn();
        $(".TEMPEST").show()

    },222)
    go();
    console.log("#")
    /*
        dragOn(selector, #pages, fullfile(bool) [ignores #pages], cb)
    */
    dragOn('body', 15, false, (data) => {
    console.log("Whole raw file ready:", data.rawFile);
    // Handle complete raw file upload or seeding
    });


})