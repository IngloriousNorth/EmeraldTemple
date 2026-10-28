module.exports = {
    table: function(table, cb) {
        const $target = $("#" + table);
        if ($target.length === 0) {
            console.warn(`[TORRENTS] Table element #${table} not found in DOM yet. Retrying...`);
            setTimeout(() => module.exports.table(table, cb), 50);
            return;
        }

        if ($.fn.DataTable.isDataTable($target)) {
            var oldTable = $target.DataTable();
            oldTable.clear().destroy(); 
            $target.empty(); 
            $target.removeAttr('style').removeClass('dtr-inline collapsed');
            $target.append('<thead><tr><th>Group</th><th>APA Citation</th><th>Revs</th><th>Date</th><th>Time</th><th class="none"></th></tr></thead><tbody></tbody>');
        }

        var dataTable = $target.DataTable({
            scroller: true,
            responsive: {
                details: {
                    display: $.fn.dataTable.Responsive.display.childRowImmediate,
                    type: 'none'
                }
            },
            serverSide: false,
            bSort: true,
            columns: [
                { visible: false, searchable: false }, 
                { width: "50%" },                      
                { width: "16.66%" },                   
                { width: "16.66%" },                   
                { width: "16.66%" },                   
                { width: "100%", responsivePriority: 1 } 
            ],
            columnDefs: [
                { targets: [0], visible: false }, 
                { targets: [1], className: "text-left" }, 
                { targets: [2, 3, 4], className: "dt-left" }, 
                { targets: 5, responsivePriority: 1 } 
            ],
            order: [[ 3, "desc" ]],
            processing: true,
            searching: false,
            info: true,
            rowGroup: {
                dataSrc: 0,
                ordering: true,
                orderable: true,
            },
            ajax: function(data, callback, settings) {
                // Ensure path points correctly to your static dummy.json asset location
                $.getJSON("Base/dummy.json", function(json) {
                    processTableData(json, callback);
                }).fail(function(err) {
                    console.error("[TORRENTS ERROR] Failed to load dummy.json:", err);
                    callback({ draw: 1, recordsTotal: 0, recordsFiltered: 0, data: [] });
                });
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

                var api = this.api();
                if (settings.iDraw > 1) {
                    var tableWrapper = $(api.table().container());
                    if (tableWrapper[0]) {
                        tableWrapper[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                }            
            },
        });

        // Citation copy handler
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
        
        // WebTorrent action handler
        $(document).off("click", "a.webtorrent").on("click", "a.webtorrent", function(e) {
            e.preventDefault();
            const d = this.dataset;
            
            $(this).text("[Revving..!]");
            $(this).css('color', 'darkcyan');
            
            var that = $(this);
            setTimeout(function() {
                that.text("[WebTorrent]");
                that.css("color", "darkgoldenrod");
            }, 2360);
            
            if (window.MVC && window.MVC.Controller && window.MVC.Controller.webtorrent) {
                window.MVC.Controller.webtorrent.propagate(d.infoHash);
            }
        });

        $("a.webtorrent").text("[WebTorrent]");
        
        if (typeof cb === "function") cb();
    }
};

function processTableData(json, callback) {
    var uploadBannerRow = [
        "", 
        "<div class='upload-dropzone-row' style='text-align: center; padding: 14px; font-weight: bold; cursor: pointer; border: 2px dashed #888; border-radius: 6px; margin: 4px 0; background: rgba(0,0,0,0.01);'>📄 Drag & Drop a PDF to seed the Graph</div>", 
        "", "", "", ""
    ];

    var records = json && json.records ? json.records : (Array.isArray(json) ? json : []);
    window.dtRecs = [uploadBannerRow];

    if (!records || records.length === 0) {
        callback({
            draw: 1,
            recordsTotal: window.dtRecs.length,
            recordsFiltered: window.dtRecs.length,
            data: window.dtRecs
        });
        return;
    }

    var editionsAdded = [];

    records.forEach(function(record) {
        if (!record._fields || record._fields.length === 0) return;

        var authorField = "";
        record._fields[1].forEach(function(field, i) {
            if (i === 0) authorField += "<span class='silver'> by </span>";
            authorField += "<a class='TEMPEST node author' href='#node?label=author&uuid=" +
                field.properties.uuid + "'>" + decodeEntities(field.properties.name);
            if (record._fields[1].length > 1 && i < record._fields[1].length - 1) {
                authorField += "<span class='silver'>, </span>";
            }
            authorField += "</a>";
        });

        var dateField = "";
        if (record._fields[0] && record._fields[0].properties.date) {
            dateField += "<b class='silver'>[" + decodeEntities(record._fields[0].properties.date) + "]</b>";
        }

        var classesField = " ";
        if (record._fields[3]) {
            record._fields[3].forEach(function(field, i) {
                if (field.properties.uuid) {
                    classesField += "<a class='TEMPEST node class' href='#node?label=class&uuid=" +
                        field.properties.uuid + "'>" + decodeEntities(field.properties.name);
                }
                if (record._fields[3].length > 1 && i < record._fields[3].length - 1) {
                    classesField += "<span class='classComma silver'>,</span></a>";
                } else {
                    classesField += "</a>";
                }
            });
        }

        record._fields[2].forEach(function(edition_torrent) {
            var currentApa = assertAPACitation(record, edition_torrent);
            var singleTrRow = assertTr(record, edition_torrent, currentApa);

            if (editionsAdded.indexOf(edition_torrent.edition.properties.uuid) === -1) {
                var fullTable = "<table class='torrentsTable'><thead><tr><th>File</th><th>Download</th><th>Revs</th><th>Size</th></tr></thead><tbody>" + 
                    singleTrRow + "</tbody></table>";
                
                assertFirstEditionRow(record, edition_torrent, editionsAdded, currentApa, dateField, authorField, classesField, fullTable);
            } else {
                assertExistingEditionRow(edition_torrent, editionsAdded, singleTrRow);
            }
        });
    });

    callback({
        draw: 1,
        recordsTotal: window.dtRecs.length,
        recordsFiltered: window.dtRecs.length,
        data: window.dtRecs
    });
}

function decodeEntities(encodedString) {
    if (!encodedString) return "";
    var textArea = document.createElement('textarea');
    textArea.innerHTML = encodedString;
    return textArea.value;
}

function assertExistingEditionRow(edition_torrent, editionsAdded, newRows) {
    var index = editionsAdded.indexOf(edition_torrent.edition.properties.uuid);
    if (window.dtRecs && window.dtRecs[index]) {
        var existingHtml = window.dtRecs[index][5];
        window.dtRecs[index][5] = existingHtml.replace("</tbody></table>", newRows + "</tbody></table>");
    }
}

function assertFirstEditionRow(record, edition_torrent, editionsAdded, citationHtml, dateField, authorField, classesField, tortables) { 
  editionsAdded.push(edition_torrent.edition.properties.uuid);

  const editionUuid = edition_torrent.edition.properties.uuid;
  const sourceUuid = record._fields[0].properties.uuid;
  const finalCoverUrl = typeof resolveCoverUrl === 'function' ? resolveCoverUrl(record, sourceUuid, '') : '';

  const copyBtnHtml = 
    "<button class='copy-citation-btn' data-uuid='" + editionUuid + "' title='Copy APA Citation' style='background:transparent; border:none; cursor:pointer; padding:0 0 0 6px; color:#a0a0a0; display:inline-flex; align-items:center; vertical-align:middle; line-height:1;'>" +
      "<svg width='15' height='15' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>" +
        "<rect x='9' y='9' width='13' height='13' rx='2' ry='2'></rect>" +
        "<path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'></path>" +
      "</svg>" +
    "</button>";

  window.dtRecs.push([
    "<img class='tableImg' id='source_" + sourceUuid + "' src='" + finalCoverUrl + "'>" +
    "<span class='sourceType'>" + decodeEntities(record._fields[0].properties.type) + "</span>" +
    "<div class='torrentSource'>" +
    "<div class='tableHeading'><a id='sourceTab' class='TEMPEST node source' href='#node?label=source&uuid=" + sourceUuid + "'>" +
    decodeEntities(record._fields[0].properties.name) +
    "</a>" + dateField + authorField + "</div><br><div class='torrentClasses'>" + classesField + "</div></div>",

    "<div class='apa-container' style='display:inline-flex; align-items:baseline; max-width:100%;'>" +
      "<span class='apa-text bold' id='edition_" + editionUuid + "_field'>" + citationHtml + "</span>" +
      copyBtnHtml +
    "</div>",

    edition_torrent.edition.properties.snatches,
    "<span id='edition_date'>" + 
    (edition_torrent.edition.properties.date && edition_torrent.edition.properties.date !== "undefined" && edition_torrent.edition.properties.date !== record._fields[0].properties.date ? record._fields[0].properties.date + "/" + edition_torrent.edition.properties.date : record._fields[0].properties.date) +
    "</span>",
    typeof timeSince === 'function' ? timeSince(edition_torrent.edition.properties.created_at) + " ago" : "",
    tortables
  ]);
}

function assertAPACitation(record, edition_torrent) {
    var publisherHtml = "";
    var formerPart = ""; 

    record._fields[1].forEach(function(field, i) {
        formerPart += decodeEntities(field.properties.name);
        if (record._fields[1][i + 1]) formerPart += ", ";
        else formerPart += (field.properties.name && !field.properties.name.endsWith(".")) ? ". " : " ";
    });

    if (!record._fields[0].properties.date && edition_torrent.edition.properties.date) {
        formerPart += "(" + decodeEntities(edition_torrent.edition.properties.date) + "). ";
    } else {
        formerPart += record._fields[0].properties.date ?
            "(" + decodeEntities(record._fields[0].properties.date) +
            (edition_torrent.edition.properties.date && edition_torrent.edition.properties.date !== record._fields[0].properties.date ?
                "/" + decodeEntities(edition_torrent.edition.properties.date) + "). " : "). ") : "";
    }

    formerPart += !["Journal Article", "Essay"].includes(record._fields[0].properties.type) ?
        "<span class='italics'>" + decodeEntities(record._fields[0].properties.name) + "</span>. " :
        decodeEntities(record._fields[0].properties.name) + ". ";

    if (edition_torrent.publisher && edition_torrent.publisher.properties.name) {
        var pubName = typeof toTitleCase === 'function' ? toTitleCase(decodeEntities(edition_torrent.publisher.properties.name)) : edition_torrent.publisher.properties.name;
        publisherHtml = "<a id='edition_span_publisher' class='TEMPEST node publisher' href='#node?label=publisher&uuid=" +
            edition_torrent.publisher.properties.uuid + "'>" + pubName + "</a>" +
            (pubName.endsWith(".") ? "" : (record._fields[0].properties.type !== "Journal Article" ? ". " : ", "));
    }

    var remainderPart = "";
    if (edition_torrent.edition.properties.title && edition_torrent.edition.properties.title !== "") {
        remainderPart += decodeEntities(edition_torrent.edition.properties.title);
        if (!edition_torrent.edition.properties.title.endsWith(".")) remainderPart += (record._fields[0].properties.type !== "Journal Article" ? ". " : "");
        else remainderPart += " ";
    }

    if (edition_torrent.edition.properties.no) {
        remainderPart += "(" + decodeEntities(edition_torrent.edition.properties.no) + ")";
        if (edition_torrent.edition.properties.pages) remainderPart += ": ";
    }
    if (edition_torrent.edition.properties.pages) {
        remainderPart += edition_torrent.edition.properties.no ?
            decodeEntities(edition_torrent.edition.properties.pages) + "." :
            ", " + edition_torrent.edition.properties.pages + ".";
    }

    var citationHtml = "<span class='apa-former'>" + formerPart + "</span>";
    if (record._fields[0].properties.type === "Journal Article") {
        citationHtml += " <span class='apa-publisher-wrap'>" + publisherHtml + remainderPart + "</span>";
    } else {
        citationHtml += " <span class='apa-publisher-wrap'>" + remainderPart + publisherHtml + "</span>";
    }
    return citationHtml;
}

function assertTr(record, edition_torrent, apaHtml) {
    if (edition_torrent.torrent) {
        const cleanApa = apaHtml.replace(/<[^>]*>?/gm, '');
        var tr = "<tr>";
        tr += "<td>" + edition_torrent.torrent.properties.format + "<br>" + (edition_torrent.torrent.properties.res ? edition_torrent.torrent.properties.res : "") + "</td>";        
        tr += "<td>" +
              "<a" +
               " data-id='" + edition_torrent.torrent.properties.size + "'" +
               " data-release='" + edition_torrent.torrent.properties.release + "'" + 
               " data-apa='" + cleanApa + "'" + 
               " data-format='" + edition_torrent.torrent.properties.format + "'" +
               " data-infohash = '" + edition_torrent.torrent.properties.infoHash + "'" +
               " class='webtorrent' href='webtorrent'>[WebTorrent]</a>" +
              "<a href='#' class='magnetURI' data-infohash='" + edition_torrent.torrent.properties.infoHash + "'>[magnetURI]</a>" + 
              "<a href='#' id='torrent_infoHash' data-infohash='" + edition_torrent.torrent.properties.infoHash + "'>[infoHash]</a>" +
            "</td>";
        tr += "<td>" + edition_torrent.torrent.properties.snatches + "</td>";
        tr += "<td>" + (typeof prettyBytes === 'function' ? prettyBytes(edition_torrent.torrent.properties.size) : edition_torrent.torrent.properties.size) + "</td>";
        tr += "</tr>";
        return tr;
    }
}