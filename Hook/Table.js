const TorrentsHook = {
	header : function(node = false){
		if(!node){
			$("h2 a").text("Torrents");
		} else {
			if (window.MVC && window.MVC.Hook && window.MVC.Hook.Node) {
				window.MVC.Hook.Node.header(true);
			}
		}
	}
};

window.MVC = window.MVC || {};
window.MVC.Hook = window.MVC.Hook || {};
window.MVC.Hook.Torrents = TorrentsHook;

export default TorrentsHook;