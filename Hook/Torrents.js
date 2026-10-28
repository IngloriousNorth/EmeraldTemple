const MVC = window.MVC;
module.exports = {
	header : function(node = false){
		if(!node){
			$("h2 a").text("Torrents")
		}
		else{
			MVC.Hook.Node.header(true);
		}
	}
}