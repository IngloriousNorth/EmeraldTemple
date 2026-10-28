import TEMPEST from "../lib/TEMPEST.js"

const MVC = {
        Ramosa: {
            Graph: require("../Ramosa/Graph"),
            Torrents: require("../Ramosa/Torrents"),
        },
        Control: {
            Search: require("../Control/Search"),
            Category : require("../Control/Category"),
            Torrents: require("../Control/Torrents"),
            webtorrent: require("../Control/webtorrent"),
        },
        Hook: {
            Graph: require("../Hook/Graph"),
            Node: require("../Hook/Node"),
            Search: require("../Hook/Search"),
            Category : require("../Hook/Category")
        }
};

export default MVC;

//so the language allows: 
//MVC.Ramosa.Swarm.put(metadata)