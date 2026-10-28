module.exports = {
	Obelisk : {
		nodes : [],
		links : []
	},
	graphParams : {
		nodes : [],
		links : []
	},
	refresh : function(containerSelector){
		const container = document.querySelector(containerSelector);
	    if (!container) return;

	    // 1. If you saved your Graph instance globally or locally, call _destructor() if available
	    if (window.myGraphInstance && typeof window.myGraphInstance._destructor === 'function') {
	        window.myGraphInstance._destructor();
	    }

	    // 2. Wipe the container HTML clean to remove canvas, A-Frame elements, and tooltips
	    container.innerHTML = '';
	}
	,
	resetGraphParams : function(){
		graphParams.source = "";
		graphParams.author = "";
		graphParams.classes = [];
		graphParams.publisher = "";
	}
	,
	putNodes : function(nodes){
		Obelisk.nodes = nodes;
	},
	putLinks : function(links){
		Obelisk.links = links;
	}
	
}