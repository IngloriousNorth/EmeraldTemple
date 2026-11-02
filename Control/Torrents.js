/**
 * Torrents.js Controller (Bootstrap 5 + jQuery UI Hybrid)
 */

/**
 * Formats raw year/date strings or ints, converting negative years to B.C.
 */
function adjDate(dateVal) {
  if (!dateVal && dateVal !== 0) return '-';
  const strVal = String(dateVal).trim();
  if (strVal.startsWith('-')) {
    const positiveYear = strVal.substring(1);
    return `${positiveYear} B.C.`;
  }
  return strVal;
}

/**
 * Normalizes the response schema into flat edition rows grouped by clean source name
 */
function parseData(json) {
  const rows = [];

  (json.records || []).forEach(record => {
    const fields = record._fields || [];
    const source = fields[0]?.properties || {};
    const authors = (fields[1] || []).map(a => a.properties?.name).filter(Boolean);
    const items = fields[2] || [];
    const categories = (fields[3] || []).map(c => c.properties?.name).filter(Boolean);

    const cleanSourceName = (source.name || '').replace(/\s*\([^)]*\)/g, '').trim();
    const groupKey = source.uuid || cleanSourceName;

    const editionMap = new Map();

    items.forEach(item => {
      const edProps = item.edition?.properties || {};
      const pubProps = item.publisher?.properties || {};
      const torProps = item.torrent?.properties || {};

      const edUuid = edProps.uuid;
      if (!edUuid) return;

      if (!editionMap.has(edUuid)) {
        const title = edProps.title || cleanSourceName;
        const publisherName = pubProps.name || '';
        
        // Construct APA Citation dynamically incorporating clickable publisher anchor with .publisher_name
        let apaCitation = edProps.apaCitation || '';
        if (publisherName && publisherName !== 'Unknown Publisher' && !apaCitation.includes('publisher_name')) {
          const pubHtml = `<a href="#" class="publisher_name text-decoration-none">${publisherName}</a>.`;
          apaCitation = `${title}. ${pubHtml}`;
        } else if (publisherName && publisherName !== 'Unknown Publisher') {
          const pubHtml = `<a href="#" class="publisher_name text-decoration-none">${publisherName}</a>`;
          apaCitation = apaCitation.replace(publisherName, pubHtml);
        }

        editionMap.set(edUuid, {
          source: {
            uuid: groupKey,
            name: cleanSourceName,
            date: source.date,
            type: source.type,
            cover: source.cover,
            authors: authors,
            categories: categories
          },
          edition: {
            uuid: edProps.uuid,
            title: edProps.title,
            date: edProps.date,
            snatches: edProps.snatches || 0,
            created_at: edProps.created_at || Date.now(),
            publisher: publisherName,
            apaCitation: apaCitation
          },
          torrents: []
        });
      }

      if (torProps.infoHash) {
        editionMap.get(edUuid).torrents.push({
          format: torProps.format,
          size: torProps.size,
          snatches: torProps.snatches,
          infoHash: torProps.infoHash
        });
      }
    });

    editionMap.forEach(editionData => {
      rows.push(editionData);
    });
  });

  return rows;
}

/**
 * Renders the HTML inside the expanded Edition child row using BS5 utility classes
 */
function renderChildTorrentsTable(torrents) {
  if (!torrents || torrents.length === 0) {
    return '<div class="p-3 bg-light border rounded"><p class="mb-0 text-muted">No torrents available.</p></div>';
  }

  let rowsHtml = torrents.map(t => `
    <tr>
      <td><span class="ui-icon ui-icon-document"></span> <strong>${t.format}</strong></td>
      <td>${prettyBytes(t.size)}</td>
      <td>${t.snatches}</td>
      <td>
        <button class="webtorrent-download-btn btn btn-sm btn-outline-primary d-inline-flex align-items-center gap-1" 
              data-infohash="${t.infoHash}" 
              data-format="${t.format}" 
              data-size="${t.size}" 
              data-snatches="${t.snatches}">
          <span class="ui-icon ui-icon-arrowthick-1-s"></span> webtorrent
        </button>
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

module.exports = {
  /**
   * DataTable constructor matching table(table, cb)
   */
  table: function(table, cb) {
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
        <tr class="table-secondary">
          <th></th>
          <th>Source UUID</th>
          <th>APA Citation</th>
          <th>Edition Date</th>
          <th>Revs</th>
          <th>Time Since</th>
        </tr>
      </thead>
      <tbody></tbody>
    `);

    const isGitHubPages = window.location.hostname.includes('github.io');
    const repoPath = isGitHubPages 
        ? (window.location.pathname.split('/')[1] ? `/${window.location.pathname.split('/')[1]}` : '') 
        : '../';

    const fragmentBase = `${repoPath}/Base`;

    $.getJSON(`${fragmentBase}/dummy.json`, function(rawJson) {
      const tableData = parseData(rawJson);

      const tableInstance = $(tableSelector).DataTable({
        data: tableData,
        responsive: true,
        scroller: true,
        scrollY: 'calc(100vh - 169px)',
        scrollCollapse: false,
        dom: 'rt<"clear">',
        paging: true,
        columns: [
          {
            className: 'dt-control',
            orderable: false,
            data: null,
            defaultContent: '<span class="ui-icon ui-icon-circle-plus expand-btn" style="cursor:pointer; display:inline-block;"></span>',
            width: '30px'
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
            width: '55%',
            render: (data) => `<strong>${data}</strong>`
          },
          { 
            title: 'Edition Date',
            data: 'edition.date',
            className: 'text-center',
            render: (data) => adjDate(data)
          },
          { 
            title: 'Revs',
            data: 'edition.snatches',
            className: 'text-center'
          },
          { 
            title: 'Time Since',
            data: 'edition.created_at',
            className: 'text-center',
            render: (data) => typeof timeSince === 'function' ? timeSince(data) : (data ? data : '-')
          }
        ],
        order: [[1, 'asc']],
        rowGroup: {
          dataSrc: 'source.uuid',
          startRender: function (rows, group) {
            const firstRow = rows.data()[0];
            const src = firstRow.source;
            
            // Map each author into a clickable anchor with .author_name and join with commas
            const authorsList = src.authors
              .map(a => `<a href="#" class="author_name text-decoration-none">${a}</a>`)
              .join(', ') || '<a href="#" class="author_name text-decoration-none">Unknown Author</a>';

            // Map each category into a clickable anchor badge with .class_name and join with comma + space
            const categories = src.categories
              .map(c => `<a href="#" class="class_name badge bg-secondary text-decoration-none px-2 py-1" style="font-size: 0.75em; font-weight: 500; letter-spacing: 0.3px;">${c}</a>`)
              .join(' ');

            const formattedDate = adjDate(src.date);

            return $(`
              <tr class="group-header table-secondary border-bottom">
                <td colspan="5" class="py-2 px-3">
                  <div class="d-flex align-items-center gap-3 w-100">
                    <!-- Left Column: Fixed-size thumbnail with crisp shadow and border -->
                    <div class="flex-shrink-0" style="width: 52px; height: 75px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                      <img src="${src.cover}" alt="${src.name}" style="max-height: 75px; max-width: 52px; object-fit: cover;" class="rounded shadow-sm border border-white" />
                    </div>
                    <!-- Right Column: Vertically centered title heading & categories -->
                    <div class="d-flex flex-column justify-content-center flex-grow-1 py-1">
                      <div class="title_heading fw-bold fs-6 mb-1 text-truncate" style="line-height: 1.3;">
                        <a href="#" class="source_name text-dark text-decoration-none">${src.name}</a> 
                        <span class="fw-normal small text-muted">[${formattedDate}]</span> 
                        <span class="fw-normal text-muted">by <em>${authorsList}</em></span>
                      </div>
                      <div class="d-flex flex-wrap gap-1 align-items-center">${categories}</div>
                    </div>
                  </div>
                </td>
              </tr>
            `);
          }
        },
        drawCallback: function() {
          $(tableSelector).off('click', '.webtorrent-download-btn').on('click', '.webtorrent-download-btn', function() {
            const btnData = $(this).data();
            console.info("[TORRENTS CONTROLLER] Webtorrent button clicked. Data payload:", btnData);

            if (window.MVC && window.MVC.Controller && window.MVC.Controller.webtorrent && typeof window.MVC.Controller.webtorrent.propagate === 'function') {
              window.MVC.Controller.webtorrent.propagate(btnData.infohash || btnData.infoHash);
            } else if (typeof propagate === 'function') {
              propagate(btnData.infohash || btnData.infoHash);
            } else {
              console.warn("[TORRENTS CONTROLLER] propagate function is not defined globally.");
            }
          });
        }
      });

      // Expand/Collapse Child Row handler for Torrent Details
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
    });
  }
};