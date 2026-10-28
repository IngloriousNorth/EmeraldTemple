import TEMPEST from './lib/TEMPEST'
window.TEMPEST = TEMPEST; 

const async = require('async');
window.async = async;

import MVC from "./MAINFRAME/MAINFRAME";
window.MVC = MVC;

import './MAINFRAME/Index';

import 'jquery-ui/dist/jquery-ui.js'

import DataTable from 'datatables.net-jqui';
import 'datatables.net-scroller-dt';
import 'datatables.net-rowgroup'
import 'datatables.net-responsive-dt';

import * as d3 from 'd3';


import pdfjs from 'pdfjs';


import dragDrop from 'drag-drop';

import moment from 'moment';

//TODO: WHY
import './Base/Form'

import './Hook/Mobile';

import './Hook/Search'
