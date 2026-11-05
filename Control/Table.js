// EmeraldTemple Universal p2p GraphDB imports webtorrent functions
import WebTorrentControl from './WebTorrent.js'

/**
 * Table.js Controller (Bootstrap 5 + jQuery UI Hybrid)
 * Loads data dynamically from MVC.Base.Ramosa asynchronously using .unfold()
 */

function decodeEntities(encodedString) {
  var textArea = document.createElement('textarea');
  textArea.innerHTML = encodedString;
  return textArea.value;
}

function parseRAyData(rayArray) {
  const rows = [];

  (rayArray || []).forEach(item => {
    const sphere = item.Sphere || item.entity || {};
    const source = sphere.source || {};
    const authors = (sphere.persons || []).map(p => p.name).filter(Boolean);
    const categories = (sphere.classes || []).map(c => c.name).filter(Boolean);
    const institution = sphere.institution || {};
    const edition = sphere.edition || {};
    const docArray = sphere.Doc || [];

    const cleanSourceName = (source.name || 'Historical Work').replace(/\s*\([^)]*\)/g, '').trim();
    const groupKey = source.uuid || cleanSourceName.toLowerCase().replace(/[^a-z0-9]/g, '_');

    const publisherName = institution.name || {};
    let pubNameStr = typeof publisherName === 'object' ? (publisherName.name || '') : publisherName;
    
    // Prevent generic/placeholder archives from appearing as the publisher string in APA citation
    if (/Public Domain Archive|Digital Archive|Internet Archive|archive\.org/i.test(pubNameStr)) {
      pubNameStr = '';
    }

    const title = (edition.title || cleanSourceName).replace(/\*/g, '').trim();
    
    let apaCitation = edition.APA || `${authors.join(', ') || 'Unknown Author'} (${edition.date || source.date || 'n.d.'}). ${title}.`;
    
    if (pubNameStr) {
      if (/Project Gutenberg/i.test(pubNameStr)) {
        apaCitation += ` <a href="#" class="publisher_name text-decoration-none" style="color: mediumvioletred;">${pubNameStr}</a>.`;
      } else {
        apaCitation += ` <a href="#" class="publisher_name text-decoration-none">${pubNameStr}</a>.`;
      }
    } else {
      // If no valid publisher string was appended, check if Project Gutenberg is mentioned inside the APA or source, or append it if needed
      // Let's make sure Project Gutenberg gets styled with mediumvioletred if it's part of the citation text
      apaCitation = apaCitation.replace(/(Project Gutenberg)/gi, '<span style="color: mediumvioletred;">$1</span>');
    }

    // Also catch Project Gutenberg anywhere else in the generated citation string to style it mediumvioletred
    apaCitation = apaCitation.replace(/(Project Gutenberg)/gi, '<span style="color: mediumvioletred;">$1</span>');

    const formattedTorrents = docArray.map(doc => ({
      format: doc.format || 'PDF',
      size: doc.size || 0,
      snatches: doc.snatches || 0,
      infoHash: doc.RAy || doc.infoHash,
      webseeds: doc.webseeds || doc.urlList || [doc.webseed].filter(Boolean),
      created_at: doc.created_at || edition.created_at || Date.now()
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
        publisher: pubNameStr,
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
        <button class="webtorrent-dl-btn" id="${t.infoHash}">WebTorrent</button>
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

const TableControl = {
  unfold: async function(table, cb) {
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

    let rawRayData = [];
    try {
      const ramBase = window.MVC?.Base?.Ramosa;
      if (ramBase) {
        if (typeof ramBase.loadAll === 'function') {
          rawRayData = await ramBase.loadAll();
        } else if (typeof ramBase.get === 'function') {
          rawRayData = ramBase.get();
        } else {
          rawRayData = ramBase.Base || [];
        }
      }
    } catch (e) {
      console.warn("[TABLE CONTROLLER] Error fetching Ramosa records:", e);
      rawRayData = window.MVC?.Base?.Ramosa?.Base || [];
    }

    console.info(`[TABLE CONTROLLER] Unfolded and hydrated ${rawRayData.length} records into DataTable.`);

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
      scrollY: 'calc(100% - 100px)',
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
          
          // Ensure authors list handles array properly
          const authorsList = (src.authors && src.authors.length > 0)
            ? src.authors.map(a => `<a href="#" class="author_name text-decoration-none">${a}</a>`).join(', ')
            : '<a href="#" class="author_name text-decoration-none">Unknown Author</a>';

          const categories = (src.categories || [])
            .map(c => `<a href="#" class="class_name badge bg-secondary text-decoration-none px-2 py-1" style="font-size: 0.75em; font-weight: 500; letter-spacing: 0.3px;">${c}</a>`)
            .join(' ');

          const formattedDate = typeof adjDate === 'function' ? adjDate(src.date) : src.date;
          const formattedSourceName = src.name.replace(/([a-zA-Z])([0-9])/g, '$1 $2');

          return $(`
            <tr class="group-header border-bottom" style="position: relative; overflow: hidden;">
              <td colspan="4" class="py-2 px-3" style="position: relative; z-index: 2;">
                <div class="d-flex align-items-center gap-3 w-100">
                  <div class="flex-shrink-0 d-flex align-items-center justify-content-start" style="width: 222px;">
                    <img src="${src.cover}" alt="${formattedSourceName}" style="max-height: auto; width: 222px; object-fit: contain;" class="rounded shadow-sm border border-white bg-white" />
                  </div>
                  <div class="d-flex flex-column justify-content-center flex-grow-1 py-1 gap-1">
                    <div class="title_heading fw-bold fs-6 text-truncate" style="line-height: 1.3;">
                      <a href="#" class="source_name text-dark text-decoration-none">${formattedSourceName}</a> 
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
          const RAy = this.id; 
          if (!RAy) return;

          console.info("[UI] Download clicked for Ramosa RAy ID:", RAy);
          
          const ramosaBase = window.MVC?.Base?.Ramosa;
          const info = ramosaBase ? ramosaBase.get(RAy) : null;

          if (info) {
              console.info("[RAMOSA] Found record via Base, launching pipeline...", info);
              WebTorrentControl.propagate(info);
          } else {
              console.warn("[RAMOSA] No record found for RAy ID:", RAy);
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

export default TableControl;