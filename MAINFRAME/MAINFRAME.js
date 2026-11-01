import TEMPEST from "../lib/TEMPEST.js"

const MVC = {
        Ramosa: {
            Torrents: require("../Base/Torrents"),
        },
        Control: {
            Search: require("../Control/Search"),
            Category : require("../Control/Category"),
            Torrents: require("../Control/Torrents"),
            Index : require("../Control/Index")
        },
        Hook: {
            Node: require("../Hook/Node"),
            Search: require("../Hook/Search"),
            Category : require("../Hook/Category")
        }
};

export default MVC;

//so the language allows: 
//MVC.Ramosa.Swarm.put(metadata)