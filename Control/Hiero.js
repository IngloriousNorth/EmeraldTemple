const HieroHook = {
    categorize : function(hero){
        const $selected = hero.find("option:selected");
        const val = $selected.val();

        if (!val || val === "null") return;

        const routeURL = `#webtorrent?infoHash=${$selected.data("infohash")}&apa=${encodeURIComponent($selected.data("apa"))}&format=${$selected.data("format")}`;

        if (window.TEMPEST) {
            TEMPEST.route(routeURL);
        }

        $(".output").hide();
        $("#output_" + $selected.data("infohash")).show();
    }
};

window.MVC = window.MVC || {};
window.MVC.Hook = window.MVC.Hook || {};
window.MVC.Hook.Hero = HieroHook;

export default HieroHook;