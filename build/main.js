import async from 'async';
window.async = async;

import MVC from "../MAINFRAME/MAINFRAME";

import 'jquery';

import 'jquery-ui/dist/jquery-ui.js';

import * as pdfjs from 'pdfjs-dist';
pdfjs.GlobalWorkerOptions.workerSrc = '../lib/pdf.worker.min.mjs';
window.pdfjs = pdfjs;

import DataTable from 'datatables.net-jqui';
import 'datatables.net-scroller-jqui';
import 'datatables.net-rowgroup-jqui'
import 'datatables.net-responsive-jqui';
window.DataTable = DataTable;

//import * as d3 from 'd3';

import dragDrop from 'drag-drop';
window.dragDrop = dragDrop;

import moment from 'moment';

import '../Base/Form';

import '../Hook/Mobile';

import '../Hook/Search'
