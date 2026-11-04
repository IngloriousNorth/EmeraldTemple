// src/main.js (Place at the absolute top of the file)
if (typeof window.process === 'undefined') {
    window.process = {
        browser: true,
        platform: 'browser',
        env: { NODE_ENV: 'production' },
        version: 'v16.0.0',
        cwd: () => '/'
    };
}

import async from 'async';
window.async = async;

import MVC from "../MAINFRAME/MAINFRAME";

import 'jquery';

import 'jquery-ui/dist/jquery-ui.js';

import * as pdfjs from 'pdfjs-dist';
pdfjs.GlobalWorkerOptions.workerSrc = '../lib/pdf.worker.min.mjs';
window.pdfjs = pdfjs;

import { pipeline } from '@huggingface/transformers';
window.transformers = { pipeline };

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
