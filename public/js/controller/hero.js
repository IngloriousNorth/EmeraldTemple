window.processHero = function processHiero(hero){
        const $selected = hero.find("option:selected");
        const val = $selected.val();

        if (!val || val === "null") return;

        // Force route even if it's the same selection
        const routeURL = `#webtorrent?infoHash=${$selected.data("infohash")}&apa=${encodeURIComponent($selected.data("apa"))}&format=${$selected.data("format")}`;

        TEMPEST.route(routeURL);

        $(".output").hide();
        $("#output_" + $selected.data("infohash")).show();
        assertProgress();
}