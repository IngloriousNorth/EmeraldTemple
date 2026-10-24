window.initializeTorrents = function initializeTorrents(table, cb) {    
    if ($.fn.DataTable.isDataTable("#" + table)) {
        var oldTable = $("#" + table).DataTable();
        oldTable.clear().destroy(); 
        
        // Manual DOM cleanup to prevent 'style' calculation errors
        $("#" + table).empty(); 
        $("#" + table).removeAttr('style').removeClass('dtr-inline collapsed');
        
        // Re-inject the skeleton because .empty() removes the <thead> your partial provided
        $("#" + table).append('<thead><tr><th>Group</th><th>APA Citation</th><th>Revs</th><th>Date</th><th>Time</th><th class="none"></th></tr></thead><tbody></tbody>');
    }

    var hashes = []
    var url = ""
    var checkTable = table;
    if (table === "torrents") {
        if (!TEMPEST.paramREC()) {
            url = "/" + table
        } else {
            url = "/" + table + "/adv_search"
        }
    } else if (TEMPEST.pageREC() === "top10") {
        url = "/top10/" + table
    } else if (table === "node") {
        url = "/" + table + "/" + TEMPEST.paramREC().label + "?uuid=" + TEMPEST.paramREC().uuid
    }

    dataTable = $("#" + table).DataTable({
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
            { visible: false, searchable: false }, // Index 0: Grouping (Date/Title)
            { width: "50%" },                 // Index 1: APA Citation
            { width: "16.66%" },// Index 2: Revs (Right-align to keep icon tidy)
            { width: "16.66%" },                 // Index 3: Date
            { width: "16.66%" },                 // Index 4: Time
            { width: "100%", responsivePriority: 1 }// Index 5: Download
        ],
        columnDefs: [
            { targets: [0], visible: false }, // Grouping column
            { targets: [1], className: "text-left" }, // APA Citation
            { targets: [2, 3, 4], className: "dt-left" }, // Revs, Date, Time (aligned left)
            { targets: 5, responsivePriority: 1 } // Download
        ],
        order: [[ 4, "desc" ]],
        processing: true,
        searching: false,
        paging: true,
        stateSave : (TEMPEST.pageREC() === "torrents" && !TEMPEST.paramREC()) ? true : false,
        info: true,
        rowGroup: {
            dataSrc: 0,
            ordering: true,
            orderable: true,
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
                res : TEMPEST.paramREC() ? TEMPEST.paramREC().res : ""
            },
            dataSrc: function(data) {
                refreshDTRecs();

                // Exactly 6 elements to match the 6 defined table columns (Index 0 to 5)
                var uploadBannerRow = [
                    "", // Index 0: Grouping
                    "<div class='upload-dropzone-row' style='text-align: center; padding: 12px; font-weight: bold; cursor: pointer; border: 2px dashed #888; border-radius: 6px; margin: 4px 0;'>📄 Drag & Drop a PDF to seed the Graph</div>", // Index 1: APA Citation column
                    "", // Index 2: Revs
                    "", // Index 3: Date
                    "", // Index 4: Time
                    ""  // Index 5: Download
                ];

                if (!data || !data.records || data.records.length === 0) {
                    console.log("No results found.");
                    dtRecs.unshift(uploadBannerRow);
                    return dtRecs;
                }
                else {
                    insertTableData(data);
                }

                var editionsAdded = [];
                tableData.records.forEach(function(record) {
                    var authorField = "";
                    record._fields[1].forEach(function(field, i) {
                        if(i===0)
                            authorField += "<span class='silver'> by </span>"
                        if (record._fields[1].length === 1){                            
                            authorField += "<a class='TEMPEST node author' href='#node?label=author&uuid=" +
                            field.properties.uuid + "'>" + decodeEntities(field.properties.name);
                        }
                        else{
                            authorField += "<a class='TEMPEST node author' href='#node?label=author&uuid=" +
                            field.properties.uuid + "'>" + decodeEntities(field.properties.name);
                            if(i < record._fields[1].length - 1){
                                authorField += "<span class='silver'>, </span>"
                            }                            
                        }
                        authorField += "</a>"
                        
                        
                    });

                    var dateField = "";
                    if (record._fields[0] && record._fields[0].properties.date) {
                        dateField += "<b class='silver'>[" + decodeEntities(record._fields[0].properties.date) + "]</b>";
                    }

                    var classesField = " ";
                    record._fields[3].forEach(function(field, i) {
                        if (field.properties.uuid) {
                            classesField += "<a class='TEMPEST node class' href='#node?label=class&uuid=" +
                                field.properties.uuid + "'>" + decodeEntities(field.properties.name);
                        }
                        if(record._fields[3].length > 1 && i < record._fields[3].length - 1){
                            classesField += "<span class='classComma silver'>,</span></a>"
                        }
                        else{
                            classesField += "</a>"
                        }
                    });

                    var sourceIMG = assertSourceIMG(record);
                    
                    var numPeers = 0;
                    record._fields[2].forEach(function(edition_torrent) {
                        var currentApa = assertAPACitation(record, edition_torrent);
                        
                        // 1. Generate ONLY the single <tr> for THIS specific torrent
                        var singleTrRow = assertTr(record, edition_torrent, currentApa);

                        if (editionsAdded.indexOf(edition_torrent.edition.properties.uuid) === -1) {
                            // NEW EDITION: Create the full table wrapper with just this first row
                            var fullTable = "<table class='torrentsTable'><thead><tr><th>File</th><th>Download</th><th>Revs</th><th>Size</th></tr></thead><tbody>" + 
                                            singleTrRow + "</tbody></table>";
                            
                            assertFirstEditionRow(record, edition_torrent, editionsAdded, currentApa, sourceIMG, dateField, authorField, classesField, fullTable);
                        } else {
                            // EXISTING EDITION: Append ONLY this single <tr> to the table
                            assertExistingEditionRow(edition_torrent, editionsAdded, singleTrRow);
                        }
                    });
                });
                return dtRecs;
            },
        },
        drawCallback: function(settings) {
            cb();

            // Inject add_source inputs safely whether groups exist or table is empty
            if (TEMPEST.pageREC() === "torrents" && $("#add_source").length === 0) {
                const $firstGroup = $(".dtrg-group").first();
                
                if ($firstGroup.length) {
                    $firstGroup.append(`
                        <span class="source-inputs-wrapper" style="margin-left: 15px;">
                            <input type="text" id="add_source_apa" placeholder="APA Citation" />
                            <input type="text" id="add_source" placeholder="Archive URL" />
                            <button id="add_source_btn">Add</button>
                        </span>
                    `);
                } else {
                    const $tableContainer = $("#" + table).closest(".dataTables_wrapper").length ? 
                                            $("#" + table).closest(".dataTables_wrapper") : 
                                            $("#" + table).parent();
                                            
                    if ($tableContainer.find("#add_source").length === 0) {
                        $tableContainer.prepend(`
                            <div class="empty-state-inputs" style="margin-bottom: 15px; padding: 10px; background: rgba(0,0,0,0.03); border: 1px dashed #ccc;">
                                <span style="margin-right: 10px; font-size: 0.9em; color: #666;">Add your first Source:</span>
                                <input type="text" id="add_source_apa" placeholder="APA Citation" style="margin-right: 5px;" />
                                <input type="text" id="add_source" placeholder="Archive URL" style="margin-right: 5px;" />
                                <button id="add_source_btn">Add</button>
                            </div>
                        `);
                    }
                }
            }

            $("table tbody").off("click", ".magnetURI").on("click", ".magnetURI", function(){
                const infoHash = $(this).data("infohash");
                $.post("/rev/" + infoHash)
            })

            assertNodeNameFromData()
            if (TEMPEST.pageREC() === "node") {
                assertButtonTab();
            }

            var api = this.api();
            if (settings.iDraw > 1) {
                var tableWrapper = $(api.table().container());
                tableWrapper[0].scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            }            
        },
    })

    if (TEMPEST.pageREC() === "top10") $('th').unbind('click.DT')
    
    $(document).off("click", "#torrent_infoHash").on("click", "#torrent_infoHash", function(e){
      e.preventDefault();
      const infoHash = $(this).data('infohash');
      if (!infoHash) return;

      navigator.clipboard.writeText(infoHash).then(() => {
          const $el = $(this);
          const originalText = $el.text();
          $el.text('[Copied!]');
          $el.css('color', '#50C777');
          setTimeout(() => { $el.text(originalText); $el.css('color', 'darkgoldenrod'); }, 2000);
      }).catch(err => console.error('Failed to copy:', err));
    });

    $(document).off("click", ".copy-citation-btn").on("click", ".copy-citation-btn", function(e) {
      e.stopPropagation();
      const uuid = $(this).data("uuid");
      const $btn = $(this);
      const textToCopy = $("#edition_" + uuid + "_field").text().trim();

      navigator.clipboard.writeText(textToCopy).then(() => {
        $btn.css("color", "#50C777");
        setTimeout(() => $btn.css("color", "#a0a0a0"), 1200);
      }).catch(err => console.error("Failed to copy citation: ", err));
    });
    
    $(document).off("click", "a.webtorrent").on("click", "a.webtorrent", function(e) {
        e.preventDefault();
        const d = this.dataset;
        const $existing = $(`#hero option[value="${d.infohash}"]`);

        if ($existing.length === 0){
            $(this).text("[Revving..!]");
            $(this).css('color', 'darkcyan');
        } else {
            $(this).text("[Already Revved.]");
            $(this).css('color', 'orange');
        }
        var that = $(this);
        setTimeout(function(){
            that.text("[WebTorrent]");
            that.css("color", "darkgoldenrod");
        },2360);
        
        webtorrent(d.infoHash);
    });

    $("a.webtorrent").text("[WebTorrent]");
};

window.initializeTorrents = initializeTorrents;