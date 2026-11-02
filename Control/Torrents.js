/**
 * Torrents.js Controller
 */

const TorrentsController = {
  
  /**
   * Formats raw bytes to human-readable string
   */
  formatBytes(bytes, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  },

  /**
   * Formats raw year/date strings or ints, converting negative years to B.C.
   */
  adjDate(dateVal) {
    if (!dateVal && dateVal !== 0) return '-';
    const strVal = String(dateVal).trim();
    if (strVal.startsWith('-')) {
      const positiveYear = strVal.substring(1);
      return `${positiveYear} B.C.`;
    }
    return strVal;
  },

  /**
   * Normalizes the response schema into flat edition rows grouped by clean source name
   */
  parseData(json) {
    const rows = [];

    (json.records || []).forEach(record => {
      const fields = record._fields || [];//GEMINI
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
          const publisher = pubProps.name || '';
          const apaCitation = publisher && publisher !== 'Unknown Publisher' ? `${title}. ${publisher}.` : title;

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
              publisher: publisher,
              apaCitation: apaCitation
            },
            torrents: []
          });
        }

        if (torProps.infoHash) {
          editionMap.get(edUuid).torrents.push({
            format: torProps.format,
            res: torProps.res,
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
  },

  /**
   * Renders the HTML inside the expanded Edition child row (Resolution column removed)
   */
  renderChildTorrentsTable(torrents) {
    if (!torrents || torrents.length === 0) {
      return '<div class="torrent-details-wrapper"><p>No torrents available.</p></div>';
    }

    let rowsHtml = torrents.map(t => `
      <tr>
        <td><span class="ui-icon ui-icon-document"></span> <strong>${t.format}</strong></td>
        <td>${this.formatBytes(t.size)}</td>
        <td>${t.snatches}</td>
        <td>
          <button class="webtorrent-download-btn ui-button ui-widget ui-corner-all" 
                  data-infohash="${t.infoHash}" 
                  data-format="${t.format}" 
                  data-res="${t.res || ''}" 
                  data-size="${t.size}" 
                  data-snatches="${t.snatches}"
                  style="font-size: 0.9em; padding: 6px 14px; cursor: pointer;">
            <span class="ui-icon ui-icon-arrowthick-1-s" style="display:inline-block; vertical-align:middle; margin-right:4px;"></span> Webtorrent
          </button>
        </td>
      </tr>
    `).join('');

    return `
      <div class="torrent-details-wrapper" style="padding: 10px; background: #f9f9f9; border: 1px solid #ddd; margin: 5px 0; border-radius: 4px;">
        <h4 style="margin: 0 0 8px 0; font-size: 0.9em; text-transform: uppercase; color: #555;">Available Downloads</h4>
        <table class="torrentsSubTable display compact cell-border" style="width:100%; text-align: left;">
          <thead>
            <tr class="ui-widget-header">
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
  },

  /**
   * DataTable constructor matching your required signature: table(table, cb)
   * @param {string|HTMLElement} table Table selector or element (e.g., "torrents" or "#torrents")
   * @param {Function} [cb] Optional callback function
   */
  table: function(table, cb) {
    const self = TorrentsController;

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
        <tr class="ui-widget-header">
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

    // Automatically detect GitHub Pages subpath vs local root
    const isGitHubPages = window.location.hostname.includes('github.io');
    const repoPath = isGitHubPages 
        ? (window.location.pathname.split('/')[1] ? `/${window.location.pathname.split('/')[1]}` : '') 
        : '../';

    const fragmentBase = `${repoPath}/Base`;

    $.getJSON(`${fragmentBase}/dummy.json`, function(rawJson) {
      const tableData = self.parseData(rawJson);

      const tableInstance = $(tableSelector).DataTable({
        data: tableData,
        jQueryUI: true,
        responsive: true,
        scroller: true,
        scrollY: 'calc(100vh - 169px)',
        scrollCollapse: false,
        dom : 'rt<"clear">',
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
            render: (data) => `<strong>${data}</strong>`
          },
          { 
            title: 'Edition Date',
            data: 'edition.date',
            className: 'dt-center',
            render: (data) => self.adjDate(data)
          },
          { 
            title: 'Revs',
            data: 'edition.snatches',
            className: 'dt-center'
          },
          { 
            title: 'Time Since',
            data: 'edition.created_at',
            className: 'dt-center',
            render: (data) => typeof timeSince === 'function' ? timeSince(data) : (data ? data : '-')
          }
        ],
        order: [[1, 'asc']],
        rowGroup: {
          dataSrc: 'source.uuid',
          startRender: function (rows, group) {
            const firstRow = rows.data()[0];
            const src = firstRow.source;
            const authorsList = src.authors.join(', ') || 'Unknown Author';
            const categories = src.categories.map(c => `<span class="ui-widget-header ui-corner-all" style="padding: 1px 5px; font-size: 0.8em; margin-right: 4px;">${c}</span>`).join('');
            const formattedDate = self.adjDate(src.date);

            return $(`
              <tr class="group-header ui-widget-header" style="background: #e9e9e9; font-size: 1.05em;">
                <td colspan="5" style="padding: 8px;">
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <img src="${src.cover}" alt="${src.name}" style="height: 55px; width: auto; border-radius: 3px; box-shadow: 0 1px 3px rgba(0,0,0,0.3);" />
                    <div>
                      <div style="font-weight: bold; font-size: 1.1em;">${src.name} <span style="font-weight: normal; font-size: 0.9em; opacity: 0.85;">[${formattedDate}]</span></div>
                      <div style="margin: 2px 0;">by <em>${authorsList}</em></div>
                      <div>${categories}</div>
                    </div>
                  </div>
                </td>
              </tr>
            `);
          }
        },
        drawCallback: function() {
          // Bind click handler to Webtorrent buttons and invoke DL
          $(tableSelector).off('click', '.webtorrent-download-btn').on('click', '.webtorrent-download-btn', function() {
            const btnData = $(this).data();
            console.info("[TORRENTS CONTROLLER] Webtorrent button clicked. Data payload:", btnData);

            if (typeof DL === 'function') {
              DL(btnData);
            } else if (window.DL && typeof window.DL === 'function') {
              window.DL(btnData);
            } else {
              console.warn("[TORRENTS CONTROLLER] DL function is not defined globally.");
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
          row.child(self.renderChildTorrentsTable(rowData.torrents)).show();
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

module.exports = TorrentsController;