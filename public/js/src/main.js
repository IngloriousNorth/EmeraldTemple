//ethers login
import 'ethers'
import '../hook/ethers-login.js'
// ==========================================
// 1. GLOBALS & DEPENDENCIES SETUP
// ==========================================
import 'jquery-ui/dist/jquery-ui.js'

import DataTable from 'datatables.net';
window.DataTable = DataTable;
import 'datatables.net-responsive';
import 'datatables.net-rowgroup';

import * as d3 from 'd3';
window.d3 = d3;

import pdfjs from 'pdfjs';
window.pdfjsLib = pdfjs;

import dragDrop from 'drag-drop';
window.dragDrop = dragDrop;

import moment from 'moment';
window.moment = moment;

// Core local utils & framework
import util from '../lib/util.js';
window.util = util;

// ==========================================
// 2. MODELS (Data & State Layer)
// ==========================================
import '../model/Category.js';
import '../model/graph.js';
import '../model/hero.js';
import '../model/recommendation.js';
import '../model/torrents.js';
import '../model/webtorrent.js';

// ==========================================
// 3. HOOKS (DOM Bindings & Component Views)
// ==========================================
import '../hook/graph.js';
import '../hook/header.js';
import '../hook/Hero.js';
import '../hook/node.js';
import '../hook/recommendation.js';
import '../hook/torrents.js';

// ==========================================
// 4. CONTROLLERS (Business Logic Layer)
// ==========================================
import '../controller/autocomplete.js';
import '../controller/Category.js';
import '../controller/graph.js';
import '../controller/hero.js';
import '../controller/recommendation.js';
import '../controller/search.js';
import '../controller/torrents.js';
import '../controller/webtorrent.js';
import '../controller/loader.js';