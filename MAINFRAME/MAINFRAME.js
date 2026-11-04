// MAINFRAME.js
import Index from '../Control/Index.js';

import WebtorrentControl from "../Control/webtorrent.js";
import RamosaControl from "../Control/Ramosa.js";

import WebtorrentHook from "../Hook/webtorrent.js";
import RamosaHook from "../Hook/Ramosa.js";

import TableControl from '../Control/Table.js';

import TableBase from '../Base/Table.js';

import RamosaBase from '../Base/Ramosa.js';

const MVC = {
    Base: {
        Torrents: TorrentsBase,
        Ramosa: RamosaBase
    },
    Control: {
        Index : Index,
        Torrents: TorrentsControl,
        webtorrent: WebtorrentControl,
        Ramosa: RamosaControl
    },
    Hook: {
        webtorrent: WebtorrentHook,
        Ramosa: RamosaHook
    },
    // Convenient shortcut accessor for Ramosa Swarm RAy payload storage / retrieval
    Ramosa: {
        Swarm: RamosaBase
    }
};
console.log("BASE/Ramosa", MVC.Base.Ramosa)
window.MVC = MVC;

export default MVC;