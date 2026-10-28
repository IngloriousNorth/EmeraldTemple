module.exports = {
	cb_scribe : {
		obelisk : [],
		mermaid : false,

		spirit : false,
		sentinel : false
	},
	put : function(aten){
		if(cb_scribe.obelisk.length >= 7){
		//processSentinel(assertSentinelComplete);
			clearObelisk();
		}
		MVC.Base.Sentinel.cb_scribe.obelisk.push({name : aten.name, html_entity : aten.html_entity})
	},
	refresh : function(){
		cb_scribe.obelisk = [];
	}
	,
	mermaidCtrl : function(mermaid){
		this.cb_scribe.mermaid = mermaid;
	}
}