window.assertNodeNameFromData = function assertNodeNameFromData() {
    if(TEMPEST.paramREC() && TEMPEST.paramREC().uuid === "undefined"){
        $("h2 span a").css("color", "red").text("No Node Found!").fadeIn(5555)
        $("#sentinel").hide();
        history.go(-2);
        return;
    }
    const params = TEMPEST.paramREC();
    const targetUuid = params?.uuid ? String(params.uuid).trim().toLowerCase() : null;
    const targetLabel = params?.label; // 'source', 'author', 'class', 'publisher'

    // We must use the raw data, not the HTML strings array
    const dataSource = (typeof tableData !== 'undefined' && tableData.records) ? tableData.records : null;

    if (!dataSource || !Array.isArray(dataSource) || !targetUuid) {
        return;
    }

    let targetName = "";

    for (const record of dataSource) {
        if (targetName) break;
        const fields = record._fields;
        if (!fields) continue;

        // 1. Check Source (Field 0)
        if (fields[0]?.properties?.uuid && String(fields[0].properties.uuid).toLowerCase() === targetUuid) {
            targetName = fields[0].properties.name || fields[0].properties.title;
        }

        // 2. Check Authors (Field 1 - Array)
        if (!targetName && Array.isArray(fields[1])) {
            const match = fields[1].find(node => node.properties?.uuid && String(node.properties.uuid).toLowerCase() === targetUuid);
            if (match) targetName = match.properties.name;
        }

        // 3. Check Classes (Field 3 - Array)
        if (!targetName && Array.isArray(fields[3])) {
            const match = fields[3].find(node => node.properties?.uuid && String(node.properties.uuid).toLowerCase() === targetUuid);
            if (match) targetName = match.properties.name;
        }

        // 4. Check Publisher (Field 2 - Nested in edition_torrent array)
        if (!targetName && Array.isArray(fields[2])) {
            for (const et of fields[2]) {
                if (et.publisher?.properties?.uuid && String(et.publisher.properties.uuid).toLowerCase() === targetUuid) {
                    targetName = et.publisher.properties.name;
                    break;
                }
            }
        }
    }
   
    if (targetName) {
        //this is just the node name it's working
        const decoded = decodeEntities(decodeEntities((targetName)))
        updateTitleUI(decoded, targetLabel);
    }
}

function updateTitleUI(name, label) {

    const colors = {
        source: "#000",
        author: "gold",
        class: "darkcyan",
        publisher: "mediumvioletred"
    };

    switch(label){
        case "source":
            name = toTitleCase(name);
            break;
        case "author":
            break;
        case "class":
            break;
        case "publisher":
            name = toTitleCase(name)
            break;
    }

    $("#nodeTitle span a").text(name)
       .attr("class", "TEMPEST node")
       .attr("href", "#node?label=" + label + "&uuid=" + (TEMPEST.paramREC() ? TEMPEST.paramREC().uuid : "undefined"))
       .css("color", colors[label] || "whitesmoke").show(); 

    TEMPEST.DOM();
  
}

function assertButtonTab(){
    $(".graph_search").show();
    $("#mermaid").show();
}
