var Obelisk = {
	nodes : [
	],
	links : [
	]
}

window.renewObelisk = function renewObelisk(){
	Obelisk = {
		nodes :[],
		links: []
	}
}

var graphParams = {
	"source" : "",
	"author" : "",
	"classes" : [],
	"publisher" : ""
}

window.removeGraph = function removeGraph(containerSelector) {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    // 1. If you saved your Graph instance globally or locally, call _destructor() if available
    if (window.myGraphInstance && typeof window.myGraphInstance._destructor === 'function') {
        window.myGraphInstance._destructor();
    }

    // 2. Wipe the container HTML clean to remove canvas, A-Frame elements, and tooltips
    container.innerHTML = '';
}

function resetGraphParams(){
	graphParams.source = "";
	graphParams.author = "";
	graphParams.classes = [];
	graphParams.publisher = "";
}

