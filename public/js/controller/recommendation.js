window.processMahoo = function processMahoo(){
    $.get("/mahoo", function(data){
      console.log(data);
        const uuid = data.uuid;
        const label = data.label.toLowerCase();
        TEMPEST.route("#node?label=" + label + "&uuid=" + uuid);
        $("body").css('cursor','pointer');
    })
}

window.processSentinel = function processSentinel(){
	$.post("/sentinel/" + TEMPEST.paramREC().uuid, {obelisk : JSON.stringify(cb_scribe.obelisk)}, function(data){

	  if(data.mermaid){
	  	cb_scribe.mermaid = true;
	  }
	  else{
	  	cb_scribe.mermaid = false;
	  }
	  
      const uuid = data.uuid;

      //faster without re-route

      TEMPEST.paramSET({uuid : uuid, from_mermaid : cb_scribe.mermaid, label: data.label}, true);

      TEMPEST.routeParams("#node");
      $('body').css('cursor', "pointer");
    })
}

function processForce(){ //illocutionary force
  $(".sentinel").empty();
  cb_scribe.obelisk.forEach(function(sol){
    setTimeout(function(){
      const html = $(".sentinel").html();
      $(".sentinel").html(sol.html_entity + html)
    },0) 
  })
}


function processGlyph(){
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

function processAbacus(d){
  $.post("/abacus/" + TEMPEST.paramREC().uuid, {aten : d.name}, function(){
    initializeGraph();
    processGlyph();
  });
}
