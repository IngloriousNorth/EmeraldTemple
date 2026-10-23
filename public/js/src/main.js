// public/js/src/main.js

const $ = require('jquery');
window.jQuery = $;
window.$ = $;

require('jquery-ui');

// DataTables & UI Extensions
require('datatables.net-jqui')(window, $);
require('datatables.net-rowgroup-jqui')(window, $);
require('datatables.net-responsive-jqui')(window, $);

// Libraries (Targeting pre-built dist files for clean parsing)
require('d3/dist/d3.min.js');
require('aframe/dist/aframe-v1.8.0.js'); // <-- Pre-built minified dist bundle
require('3d-force-graph-vr/dist/3d-force-graph-vr.min.js');
require('three-spritetext/dist/three-spritetext.min.js');

const dragDrop = require('drag-drop');
window.dragDrop = dragDrop;
require('webtorrent');
require('moment');

// MVC Architecture & Router
require('../controller/index.js');
require('../model/index.js');
require('../hook/index.js');

const { TEMPEST } = require('../lib/TEMPEST.js');
window.TEMPEST = TEMPEST;
require('../lib/util.js');