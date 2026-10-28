import TEMPEST from '../../lib/TEMPEST.js';
import MVC from '../../MAINFRAME/MAINFRAME.js'; // SERVERLESS TORRENTS CONTROLLER

module.exports = {
    table: function(table, cb) {
        if ($.fn.DataTable.isDataTable("#" + table)) {
            var oldTable = $("#" + table).DataTable();
            oldTable.clear().destroy();
            $("#" + table).empty();
            $("#" + table).removeAttr('style').removeClass('dtr-inline collapsed');
            $("#" + table).append('<thead><tr><th>Group</th><th>APA Citation</th><th>Revs</th><th>Date</th><th>Time</th><th class="none"></th></tr></thead><tbody></tbody>');
        }

        var dataTable = $("#" + table).DataTable({
            destroy: true,
            responsive: {
                details: {
                    display: $.fn.dataTable.Responsive.display.childRowImmediate,
                    type: 'none'
                }
            },
            serverSide: true,
            bSort: true,
            pageLength: 10,
            columns: [
                { visible: false, searchable: false }, // Index 0: Grouping (Rich HTML string)
                { width: "50%" },                      // Index 1: APA Citation / Drop Zone
                { width: "16.66%" },                   // Index 2: Revs
                { width: "16.66%" },                   // Index 3: Date
                { width: "16.66%" },                   // Index 4: Time
                { width: "100%", responsivePriority: 1 }// Index 5: Download
            ],
            columnDefs: [
                { targets: [0], visible: false },
                { targets: [1], className: "text-left" },
                { targets: [2, 3, 4], className: "dt-left" },
                { targets: 5, responsivePriority: 1 }
            ],
            order: [[ 4, "desc" ]],
            processing: true,
            searching: false,
            paging: true,
            stateSave: (TEMPEST.pageREC() === "torrents" && !TEMPEST.paramREC()) ? true : false,
            info: true,
            rowGroup: {
                dataSrc: 0,
                ordering: true,
                orderable: true,
                startRender: function (rows, group) {
                    // 'group' receives the actual string content stored in column 0.
                    // Wrapping it in jQuery converts the raw markup string into live DOM elements.
                    return $('<tr class="dtrg-group">' +
                                '<td colspan="5">' + group + '</td>' +
                             '</tr>');
                }
            },
            ajax: {
                url: url,
                type: "POST",
                data: {
                    title: TEMPEST.paramREC() ? TEMPEST.paramREC().title : "",
                    author: TEMPEST.paramREC() ? TEMPEST.paramREC().author : "",
                    classes: TEMPEST.paramREC() ? TEMPEST.paramREC().classes : "",
                    all: "true",
                    publisher: TEMPEST.paramREC() ? TEMPEST.paramREC().publisher : "",
                    type: TEMPEST.paramREC() ? TEMPEST.paramREC().type : "",
                    media: TEMPEST.paramREC() ? TEMPEST.paramREC().media : "",
                    format: TEMPEST.paramREC() ? TEMPEST.paramREC().format : "",
                    res: TEMPEST.paramREC() ? TEMPEST.paramREC().res : ""
                },
                dataSrc: function(json) {
                    MVC.Base.torrents.refresh();

                    var uploadBannerRow = [
                        "", // Index 0: Grouping
                        "<div class='upload-dropzone-row' style='text-align: center; padding: 14px; font-weight: bold; cursor: pointer; border: 2px dashed #888; border-radius: 6px; margin: 4px 0; background: rgba(0,0,0,0.01);'>📄 Drag & Drop a PDF to seed the Graph</div>", // Index 1: Drop Zone
                        "", // Index 2: Revs
                        "", // Index 3: Date
                        "", // Index 4: Time
                        ""  // Index 5: Download
                    ];

                    var records = json && json.records ? json.records : (Array.isArray(json) ? json : []);
                    // ... continuation of your data processing logic ...
                }
            },
            drawCallback: function(settings) {
                const currentPage = TEMPEST.pageREC();
                const capitalizedPage = currentPage ? (currentPage.charAt(0).toUpperCase() + currentPage.slice(1)) : "";
                
                if (window.MVC && window.MVC.Hook && window.MVC.Hook[capitalizedPage] && typeof window.MVC.Hook[capitalizedPage].header === "function") {
                    window.MVC.Hook[capitalizedPage].header();
                }

                $("table tbody").off("click", ".magnetURI").on("click", ".magnetURI", function(e) {
                    e.preventDefault();
                    const infoHash = $(this).data("infohash");
                    console.info("[PEX] Local rev increment recorded for infoHash:", infoHash);
                });
            }
        });
    }
};