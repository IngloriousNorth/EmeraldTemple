function crossWard(cb) {
    //no class 1:02
    const currentWard = TEMPEST.pageREC() === "set" ? TEMPEST.paramREC().ward : null;
    // STARDATE 202512.18.1355ms: Consolidating 'ward' and 'set'

    if ($.fn.DataTable.isDataTable("#set")) {
        var oldTable = $("#set").DataTable();
        oldTable.clear().destroy(); 
        
        // Manual DOM cleanup to prevent 'style' calculation errors
        $("#set").empty(); 
        $("#set").removeAttr('style').removeClass('dtr-inline collapsed');
        
        // Re-inject the skeleton because .empty() removes the <thead> your partial provided
        $("#set").append('<thead><tr><th>Name</th><th>Editions</th><th>Revs</th></tr></thead><tbody></tbody>');
    }

    setTable = $("#set").DataTable({
        columnDefs: [
            { targets: [0, 1, 2], className: "dt-left" }, // Grouping column 
        ],
        serverSide: true,
        pageLength: 25,
        processing: true,
        searching: false,
        ajax: {
            url: "/set/" + currentWard,
            type: "POST",
            dataSrc: function(json) {
                if(json.data.length === 0){
                    return;
                }
                var records = [];
                // Singularize the ward for the link class (e.g., "publishers" -> "publisher")
                var field = currentWard.endsWith('es') ? 
                            currentWard.substr(0, currentWard.length - 2) : 
                            currentWard.substr(0, currentWard.length - 1);

                json.data.forEach(function(record) {
                    // Neo4j Driver Index Mapping:
                    // [0] = Node, [1] = Connected Count, [2] = Snatches
                    var props = record._fields[0].properties;
                    var name = props.name || "Unknown";
                    var nodeUuid = props.uuid || 0; 
                    if(!nodeUuid)
                        return;
                    var count = (record._fields[1] && typeof record._fields[1].low !== 'undefined') ? 
                                record._fields[1].low : (record._fields[1] || 0);
                    
                    var revs = (record._fields[2] && typeof record._fields[2].low !== 'undefined') ? 
                                   record._fields[2].low : (record._fields[2] || 0);
                   
                    records.push([
                        `<a class='TEMPEST node ` + field + `' href='#node?label=${field}&uuid=${nodeUuid}'>` + (currentWard === "publishers" ? toTitleCase(decodeEntities(name)) : decodeEntities(name)) + `</a>`,
                        count,
                        revs
                    ]);
                    

                });

                return records;
            }
        },
        drawCallback: function() {
            if (typeof TEMPEST !== 'undefined') TEMPEST.DOM();
            cb()
        }
    });
    $('.page').on('click', function() {
        // Get the value (DataTables uses 0-based indexing, so subtract 1)
        const pageNum = parseInt($('#page-jump-input').val(), 10) - 1;
        
        // Get total number of pages
        const info = setTable.page.info();

        if (pageNum >= 0 && pageNum < info.pages) {
            setTable.page(pageNum).draw('page');
        } else {
            alert("Please enter a valid page number between 1 and " + info.pages);
        }
    });
}