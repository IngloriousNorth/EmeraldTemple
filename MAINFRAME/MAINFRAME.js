import TEMPEST from "../lib/TEMPEST.js"

const MVC = {
        Base: {
            Category : require("../Hook/Category"),
            Graph: require("../Base/Graph"),
            Torrents: require("../Base/Torrents"),
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