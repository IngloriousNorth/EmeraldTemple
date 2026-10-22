function assertScrollPause(){
    function stopScroll(e){
        if(["Space","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code) > -1) {
              e.preventDefault();
        }
      }

      $(".torrents_graph").on("mouseenter", function () {
            // Your existing keydown logic
            window.addEventListener("keydown", stopScroll);

            // FIX: Explicitly handle the wheel event on the graph container
            // Use the native DOM element to set passive: false
            
        });

      $(".torrents_graph").on('mouseleave', function () {
        window.removeEventListener("keydown", stopScroll);
      });

      $(".node_graph").on("mouseenter", function () {
            // Your existing keydown logic
            window.addEventListener("keydown", stopScroll);

            // FIX: Explicitly handle the wheel event on the graph container
            // Use the native DOM element to set passive: false
            
        });

      $(".node_graph").on('mouseleave', function () {
        window.removeEventListener("keydown", stopScroll);
      });
}

function assertGraph(){
    $("." + TEMPEST.pageREC() + "_graph").fadeIn(1337);
}
