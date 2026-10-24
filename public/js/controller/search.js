window.walkGraph = function walkGraph(){
  TEMPEST.route(
      "#torrents?search=true&title=" +
        encodeURIComponent($("#adv_title").val()) +
        "&author=" +
        encodeURIComponent($("#adv_author").val()) +
        "&classes=" +
        ($("#adv_classes").val()
          ? JSON.stringify(encodeURIComponent($("#adv_classes").val()))
          : "") +
        "&all=" +
        "true" +
        "&publisher=" +
        encodeURIComponent($("#adv_publisher").val()) +
        "&type=" +
        encodeURIComponent($("#adv_type").val()) +
        "&media=" +
        $("#adv_media").val() +
        "&format=" +
        $("#adv_format").val() +
        "&res=" +
        $("#adv_res").val()
    );
}

window.traverseGraph = function traverseGraph(label, searchable){
    TEMPEST.paramREM("label");
    TEMPEST.paramREM("uuid");
    label = label.toLowerCase();
    var key = label;
    if(label === "source"){
      key = "title";
    }
    else if(label === "class"){
      key = "classes";
    }

  if(key === "classes"){
    searchable = '"' + searchable + '"'
  }
  TEMPEST.paramSET({search : true, [key] : searchable, type : "all", media : "all", format : "all", res : "all"})

  
  // YIELD TO EVENT LOOP: Defer routing so performance observers don't get starved
  setTimeout(function() {
      TEMPEST.routeParams("#torrents");
  }, 0);
}

