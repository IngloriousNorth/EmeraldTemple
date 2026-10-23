const cb_scribe = {
	obelisk : [],
	mermaid : false,

	spirit : false,
	sentinel : false
}

function insertObelisk(aten){
	if(cb_scribe.obelisk.length >= 7){
		//processSentinel(assertSentinelComplete);
		clearObelisk();
	}
	cb_scribe.obelisk.push({name : aten.name, html_entity : aten.html_entity})
}

function clearObelisk(){
	cb_scribe.obelisk = [];
}

//communicating bug...
//need to debug
//cant debug without the beatles yapping 