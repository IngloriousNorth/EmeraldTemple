// MAINFRAME.js
import Index from '../Control/Index.js';

import RamosaControl from "../Control/Ramosa.js";

import RamosaHook from "../Hook/Ramosa.js";

import TableControl from '../Control/Table.js';

import TableBase from '../Base/Table.js';

import HeroHook from '../Hook/Hero.js';

import RamosaBase from '../Base/Ramosa.js';

const MVC = {
    Base: {
        Table: TableBase,
        Ramosa: RamosaBase
    },
    Control: {
        Index : Index,
        Table: TableControl,
        Ramosa: RamosaControl
    },
    Hook: {
        Ramosa: RamosaHook,
        Hero : HeroHook
    }
};

window.MVC = MVC;

export default MVC;