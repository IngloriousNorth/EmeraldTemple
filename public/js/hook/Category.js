/* These are not nodes (author page, source page, etc. but rather pages that list the "Set" of all authors, classes, and publishers. so it's authors, plural.) */var authorsTable;
var table;

function crossWard() {
    //no class 1:02
    const currentWard = TEMPEST.pageREC() === "set" ? TEMPEST.paramREC().ward : null;

    // STARDATE 202512.18.1355ms: Consolidating 'ward' and 'set'

    if (table) {
        table.destroy();
        $("#set tbody").empty(); // Targeting the static ID in HTML
    }

    table = $("#set").DataTable({
        responsive: true,
        serverSide: true,
        pageLength: 25,
        processing: true,
        searching: false,
        ajax: {
            url: "/set/" + currentWard,
            type: "POST",
            dataSrc: function(json) {
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
                    console.log(props.name, props.uuid)
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
        }
    });
}

