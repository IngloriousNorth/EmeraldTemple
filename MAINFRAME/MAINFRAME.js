import TEMPEST from "../TEMPEST/TEMPEST.js"

const MVC = {
        Ramosa: {
            Torrents: require("../Base/Torrents"),
        },
        Control: {
            Search: require("../Control/Search"),
            Category : require("../Control/Category"),
            Torrents: require("../Control/Torrents"),
            Index : require("../Control/Index"),
            webtorrent : require("../Control/webtorrent")
        },
        Hook: {
            Node: require("../Hook/Node"),
            Search: require("../Hook/Search"),
            Category : require("../Hook/Category"),
            webtorrent : require("../Hook/webtorrent"),
            Hero : require("../Hook/Hero.js")
        }
};

export default MVC;

//so the language allows: 
//MVC.Ramosa.Swarm.put(metadata)