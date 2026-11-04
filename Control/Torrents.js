/**
 * Torrents.js Controller (Bootstrap 5 + jQuery UI Hybrid)
 * Loads data dynamically from MVC.Base.Ramosa asynchronously.
 */

function decodeEntities(encodedString) {
  var textArea = document.createElement('textarea');
  textArea.innerHTML = encodedString;
  return textArea.value;
}

function assertAPACitation(record, edition_torrent) {
    var publisherHtml = "";
    var formerPart = ""; // Authors + Date + Title

    // 1. Build Authors Part
    if (record._fields && record._fields[1]) {
        record._fields[1].forEach(function(field, i) {
            if (field && field.properties && field.properties.name) {
                formerPart += decodeEntities(field.properties.name);
                if (record._fields[1][i + 1]) formerPart += ", ";
                else formerPart += (field.properties.name.endsWith(".")) ? " " : ". ";
            }
        });
    }

    // 2. Build Date Part
    var editionDate = edition_torrent.edition.properties.date || record._fields[0].properties.date || "n.d.";
    var yearMatch = String(editionDate).match(/\b(1[6-9]\d{2}|20\d{2})\b/);
    var year = yearMatch ? yearMatch[1] : "n.d.";
    formerPart += "(" + year + "). ";

    // 3. Build Title Part (Explicitly NO asterisks)
    var title = edition_torrent.edition.properties.title || record._fields[0].properties.name || "Untitled Work";
    title = title.replace(/\*/g, '').trim();
    formerPart += "*" + title + "*.";

    // 4. Build Publisher Part (if available) as a clickable anchor with .publisher_name class
    if (edition_torrent.publisher && edition_torrent.publisher.properties && edition_torrent.publisher.properties.name) {
        var pubName = decodeEntities(edition_torrent.publisher.properties.name);
        publisherHtml = ' <a href="#" class="publisher_name text-decoration-none">' + pubName + '</a>.';
    }

    return formerPart + publisherHtml;
}

function parseRAyData(rayArray) {
  const rows = [];

  (rayArray || []).forEach(item => {
    const entity = item.entity || {};
    const source = entity.source || {};
    const authors = (entity.persons || []).map(p => p.name).filter(Boolean);
    const categories = (entity.classes || []).map(c => c.name).filter(Boolean);
    const institution = entity.institution || {};
    const edition = entity.edition || {};

    const cleanSourceName = (source.name || 'Historical Work').replace(/\s*\([^)]*\)/g, '').trim();
    const groupKey = source.uuid || cleanSourceName.toLowerCase().replace(/[^a-z0-9]/g, '_');

    const publisherName = institution.name || '';
    const title = (edition.title || cleanSourceName).replace(/\*/g, '').trim();
    
    // Construct clean APA citation string without raw asterisks in dn if needed, but keeping markdown/HTML for display
    let apaCitation = edition.APA || `${authors.join(', ') || 'Unknown Author'} (${edition.date || source.date || 'n.d.'}). *${title}*.`;
    if (publisherName) {
      apaCitation += ` <a href="#" class="publisher_name text-decoration-none">${publisherName}</a>.`;
    }

    const torrentsList = edition.torrents || [];
    const formattedTorrents = torrentsList.map(tor => ({
      format: tor.format || 'PDF',
      size: tor.size || 0,
      snatches: tor.snatches || 0,
      infoHash: tor.infoHash,
      webseeds: tor.webseeds || tor.urlList || [tor.webseed].filter(Boolean),
      created_at: tor.created_at || edition.created_at || Date.now()
    }));

    rows.push({
      source: {
        uuid: groupKey,
        name: cleanSourceName,
        date: source.date || 'n.d.',
        type: source.genus || source.type || 'Historical Book',
        cover: source.cover || 'https://via.placeholder.com/222x300?text=No+Cover',
        authors: authors.length ? authors : ['Unknown Author'],
        categories: categories.length ? categories : ['Public Domain']
      },
      edition: {
        uuid: edition.uuid || 'ed_' + Math.random().toString(36).substring(2, 9),
        title: title,
        date: edition.date || source.date || 'n.d.',
        snatches: edition.snatches || formattedTorrents.reduce((acc, t) => acc + (t.snatches || 0), 0),
        created_at: edition.created_at || Date.now(),
        publisher: publisherName,
        apaCitation: apaCitation
      },
      torrents: formattedTorrents
    });
  });

  return rows;
}

function renderChildTorrentsTable(torrents) {
  if (!torrents || torrents.length === 0) {
    return '<div class="p-3 bg-light border rounded"><p class="mb-0 text-muted">No torrents available.</p></div>';
  }

  let rowsHtml = torrents.map(t => `
    <tr>
      <td><span class="ui-icon ui-icon-document"></span> <strong>${t.format}</strong></td>
      <td>${typeof prettyBytes === 'function' ? prettyBytes(t.size) : t.size}</td>
      <td>${t.snatches}</td>
      <td>${typeof timeSince === 'function' ? timeSince(t.created_at) : (t.created_at ? t.created_at : '-')}</td>
      <td>
        <button class="webtorrent-dl-btn" id="${t.infoHash}">Download</button>
      </td>
    </tr>
  `).join('');

  return `
    <div class="p-3 bg-light border rounded my-2">
      <table class="torrentsSubTable table table-sm table-striped table-bordered align-middle w-100 mb-0">
        <thead>
          <tr class="table-secondary">
            <th>Format</th>
            <th>Size</th>
            <th>Revs</th>
            <th>Time Since</th>
            <th>Stream</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>
    </div>
  `;
}

const TorrentsControl = {
  table: async function(table, cb) {
    const tableSelector = (typeof table === 'string' && !table.startsWith('#') && !table.startsWith('.')) 
      ? `#${table}` 
      : table;

    if ($.fn.DataTable.isDataTable(tableSelector)) {
      const oldTable = $(tableSelector).DataTable();
      oldTable.clear().destroy();
      $(tableSelector).empty();
      $(tableSelector).removeAttr('style').removeClass('dtr-inline collapsed');
    }

    $(tableSelector).html(`
      <thead>
        <tr class="table-primary">
          <th class="d-none"></th>
          <th></th>
          <th>APA Citation</th>
          <th>Edition Date</th>
          <th>Revs</th>
        </tr>
      </thead>
      <tbody></tbody>
    `);

    // Fetch records safely from Ramosa Base
    let rawRayData = [];
    try {
      const ramBase = window.MVC?.Base?.Ramosa;
      if (ramBase) {
        if (typeof ramBase.loadAll === 'function') {
          rawRayData = await ramBase.loadAll();
        } else if (typeof ramBase.get === 'function') {
          rawRayData = ramBase.get();
        } else {
          rawRayData = ramBase.RAy || [];
        }
      }
    } catch (e) {
      console.warn("[TORRENTS CONTROLLER] Error fetching Ramosa records:", e);
      rawRayData = window.MVC?.Base?.Ramosa?.RAy || [];
    }

    console.info(`[TORRENTS CONTROLLER] Hydrated ${rawRayData.length} records into DataTable.`);

    const tableData = parseRAyData(rawRayData);

    const tableInstance = $(tableSelector).DataTable({
      data: tableData,
      responsive: {
        details: {
          type: 'column',
          target: 4,
          renderer: function (api, rowIdx, columns) {
            const data = api.row(rowIdx).data();
            const torrentsHtml = data ? renderChildTorrentsTable(data.torrents) : "";
            
            const collapsedItems = columns.map(col => {
              if (col.hidden) {
                return `<tr data-dt-row="${col.rowIndex}" data-dt-column="${col.columnIndex}">
                        <td><strong>${col.title}:</strong></td>
                        <td>${col.data}</td>
                      </tr>`;
              }
              return '';
            }).join('');

            return $(`
              <div class="p-3 bg-light border rounded my-2">
                ${collapsedItems ? `<table class="table table-sm mb-2"><tbody>${collapsedItems}</tbody></table>` : ''}
                ${torrentsHtml}
              </div>
            `);
          }
        }
      },
      scroller: true,
      scrollY: 'calc(100vh - 190px)',
      scrollCollapse: true,
      dom: 'rt<"clear">',
      paging: true,
      columns: [
        {
          title: '',
          className: 'dt-control d-none',
          orderable: false,
          data: null,
          defaultContent: '<span class="ui-icon ui-icon-circle-plus expand-btn" style="cursor:pointer; display:inline-block;"></span>',
          width: '5%'
        },
        { 
          data: 'source.uuid',
          className: 'dt-src',
          visible: false
        },
        { 
          title: 'APA Citation',
          data: 'edition.apaCitation',
          className: 'apa-citation-column',
          width: '37.3%',
          render: (data) => `<div style="word-break: break-word; overflow-wrap: break-word; white-space: normal;">${data}</div>`
        },
        { 
          title: 'Edition Date',
          data: 'edition.date',
          className: 'text-center',
          width: '20%',
          render: (data) => typeof adjDate === 'function' ? adjDate(data) : data
        },
        { 
          title: 'Revs',
          data: 'edition.snatches',
          width: '15%',
          className: 'text-center'
        }
      ],
      order: [[1, 'asc']],
      rowGroup: {
        dataSrc: 'source.uuid',
        startRender: function (rows, group) {
          const firstRow = rows.data()[0];
          if (!firstRow) return $('<tr/>');
          const src = firstRow.source;
          
          const authorsList = (src.authors || [])
            .map(a => `<a href="#" class="author_name text-decoration-none">${a}</a>`)
            .join(', ') || '<a href="#" class="author_name text-decoration-none">Unknown Author</a>';

          const categories = (src.categories || [])
            .map(c => `<a href="#" class="class_name badge bg-secondary text-decoration-none px-2 py-1" style="font-size: 0.75em; font-weight: 500; letter-spacing: 0.3px;">${c}</a>`)
            .join(' ');

          const formattedDate = typeof adjDate === 'function' ? adjDate(src.date) : src.date;

          return $(`
            <tr class="group-header border-bottom" style="position: relative; overflow: hidden;">
              <td colspan="4" class="py-2 px-3" style="position: relative; z-index: 2;">
                <div class="d-flex align-items-center gap-3 w-100">
                  <div class="flex-shrink-0 d-flex align-items-center justify-content-start" style="width: 222px;">
                    <img src="${src.cover}" alt="${src.name}" style="max-height: auto; width: 222px; object-fit: contain;" class="rounded shadow-sm border border-white bg-white" />
                  </div>
                  <div class="d-flex flex-column justify-content-center flex-grow-1 py-1 gap-1">
                    <div class="title_heading fw-bold fs-6 text-truncate" style="line-height: 1.3;">
                      <a href="#" class="source_name text-dark text-decoration-none">${src.name}</a> 
                      <span class="fw-normal small text-muted">[${formattedDate}]</span> 
                      <span class="fw-normal text-muted">by <em>${authorsList}</em></span>
                    </div>
                    <div class="d-flex flex-wrap gap-1 align-items-center">
                      ${categories}
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          `);
        }
      },
      drawCallback: function() {
        $(document).off('click', '.webtorrent-dl-btn').on('click', '.webtorrent-dl-btn', function(e) {
          const index = this.id; 
          if (!index) return;

          console.info("[UI] Download clicked for Ramosa hash index:", index);
          const editionRecord = MVC.Base.Ramosa.get(index);//open protocol, establishes DMCA conduit Safe Harbor protection.

          if (editionRecord && editionRecord.torrent) {
              console.info("[RAMOSA] Found torrent record, launching pipeline...");
              window.MVC.Control.webtorrent.DL(editionRecord.torrent);
          } else {
              console.warn("[RAMOSA] No torrent record found for hash index:", index);
          }
        });
      }
    });

    $(tableSelector).off('click', 'td.dt-control').on('click', 'td.dt-control', function () {
      const tr = $(this).closest('tr');
      const row = tableInstance.row(tr);
      const icon = $(this).find('.expand-btn');

      if (row.child.isShown()) {
        row.child.hide();
        tr.removeClass('shown');
        icon.removeClass('ui-icon-circle-minus').addClass('ui-icon-circle-plus');
      } else {
        const rowData = row.data();
        row.child(renderChildTorrentsTable(rowData.torrents)).show();
        tr.addClass('shown');
        icon.removeClass('ui-icon-circle-plus').addClass('ui-icon-circle-minus');
      }
    });

    if (typeof cb === 'function') {
      cb(tableInstance);
    }
  }
};

window.MVC = window.MVC || {};
window.MVC.Control = window.MVC.Control || {};
window.MVC.Control.Torrents = TorrentsControl;

export default TorrentsControl;