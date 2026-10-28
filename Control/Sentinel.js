module.exports = {
  processMahoo : function(){
    $.get("/mahoo", function(data){
      console.log(data);
        const uuid = data.uuid;
        const label = data.label.toLowerCase();
        TEMPEST.route("#node?label=" + label + "&uuid=" + uuid);
        $("body").css('cursor','pointer');
    })
  },
  processSentinel : function(){
  $.post("/sentinel/" + TEMPEST.paramREC().uuid, {obelisk : JSON.stringify(cb_scribe.obelisk)}, function(data){

    if(data.mermaid){
      MVC.Base.Sentinel.mermaidCtrl(true);
    }
    else{
      MVC.Base.Sentinel.mermaidCtrl(false);
    }
    
      const uuid = data.uuid;

      //faster without re-route

      TEMPEST.route(`#node?label=${label}&uuid=${uuid}&from_meramid=${MVC.Base.Sentinel.cb_scribe.mermaid}`);

      $('body').css('cursor', "pointer");
    })
  },

  processGlyph : function(waltz = true){
    if(TEMPEST.paramREC().uuid === "undefined")
      return;

    $.get("/aten/" + TEMPEST.paramREC().uuid, function(data){
      const aten = data.aten;

      if(!aten)
        return

        //insertObelisk({name : aten._fields[0].properties.name, html_entity : aten._fields[0].properties.html_entity});
        //processForce();

    });     
  }
  ,
  processAbacus : function(d){
   $.post("/abacus/" + TEMPEST.paramREC().uuid, {aten : d.name}, function(){
    MVC.Control.Graph.initialize();
    MVC.Control.Sentinel.processGlyph();
    });
  }
}