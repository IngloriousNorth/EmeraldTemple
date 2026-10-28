const TEMPEST = window.TEMPEST;

module.exports = {
    header : function(){
        switch(TEMPEST.paramREC().ward){
            case "authors":
                $("h2 span a").text("Authors").css("color", "gold").hide().fadeIn(1337);
                break;
            case "classes":
                $("h2 span a").text("Classes").css("color", "#50C777").hide().fadeIn(1337);
                break;
            case "publishers":
                $("h2 span a").text("Publishers").css("color", "mediumvioletred").hide().fadeIn(1337);
                break;
        }
    }
}