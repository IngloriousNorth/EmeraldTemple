module.exports = {
    initialize : function(){
        nodeUUIDs = [];
        MVC.Model.graph.renewObelisk();

        var titles = [];
        if (TEMPEST.paramREC() && TEMPEST.paramREC().title) {
            let cleanedTitleStr = remove_stopwords(decodeEntities(decodeEntities(TEMPEST.paramREC().title)));
            titles = cleanedTitleStr.split(" ").filter(t => t.length > 0).map(t => t.trim().toLowerCase().replace(/\s/g, '').replace(/[!,:]/g, ""));
        }

        var classes = [];
        if (TEMPEST.paramREC() && TEMPEST.paramREC().classes) {
            try {
                classes = JSON.parse(decodeEntities(decodeEntities(TEMPEST.paramREC().classes))).split(",");
                classes = classes.map(c => decodeEntities(decodeEntities(c.trim().toLowerCase())).replace(/\s/g, ''));
            } catch(e) { classes = []; }
        }

        var publishers = [];
        if (TEMPEST.paramREC() && TEMPEST.paramREC().publisher) {
            let cleanedPubStr = remove_publisher_stopwords(decodeEntities(decodeEntities(TEMPEST.paramREC().publisher)));
            publishers = cleanedPubStr.split(" ").filter(p => p.length > 0).map(t => t.trim().toLowerCase().replace(/\s/g, '').replace(/[!,:]/g, ""));
        }

        const addedNodeIds = new Set();
        const nodes = [];
        const links = [];

        const addUniqueNode = (field) => {
            if (!field) return;
            if (Array.isArray(field)) {
                field.forEach(item => addUniqueNode(item));
                return;
            }

            if (typeof field === 'object' && !field.properties && !field.labels) {
                Object.values(field).forEach(item => addUniqueNode(item));
                return;
            }

            if (!field.properties) return;
            
            let isHieroglyph = field.labels && field.labels.includes("Hieroglyph");
            let id = field.properties.uuid;
            if (!id) return;

            if (!addedNodeIds.has(id)) {
                addedNodeIds.add(id);
                let label = (field.labels && field.labels.length > 0) ? field.labels[0] : "";
                let rawName = decodeEntities(decodeEntities(field.properties.name || ""));
                
                if (isHieroglyph) {
                    let tempDiv = document.createElement('div');
                    tempDiv.innerHTML = field.properties.html_entity || "";
                    let glyphSymbol = tempDiv.textContent || tempDiv.innerText || rawName;

                    nodes.push({ 
                        id: id, 
                        group: "Hieroglyph", 
                        html_entity: glyphSymbol,
                        name: field.properties.name,
                        count: 0, 
                        color: "darkgoldenrod", 
                        val: 4 
                    });
                }
                else if (label === "Source") {
                    nodeUUIDs.push(id);
                    var isMatch = (TEMPEST.pageREC() === "torrents") ? titles.some(t => rawName.toLowerCase().includes(t)) : (id === TEMPEST.paramREC().uuid);
                    nodes.push({ id: id, group: isMatch ? "Find Source" : "Source", name: rawName, count: 0, color: "#000" });
                } 
                else if (label === "Author") {
                    var isMatch = (TEMPEST.pageREC() === "node") && (id === TEMPEST.paramREC().uuid);
                    nodes.push({ id: id, group: isMatch ? "Find Author" : "Author", name: rawName, count: 0, color: "goldenrod" });
                } 
                else if (label === "Class") {
                    var isMatch = (TEMPEST.pageREC() === "node") && (id === TEMPEST.paramREC().uuid);
                    nodes.push({ id: id, group: isMatch ? "Find Class" : "Class", name: rawName, count: 0, color: "darkcyan" });
                }
                else if (label === "Publisher") {
                    var isMatch = (TEMPEST.pageREC() === "node") && (id === TEMPEST.paramREC().uuid);
                    nodes.push({ id: id, group: isMatch ? "Find Publisher" : "Publisher", name: toTitleCase(rawName), count: 0, color: "mediumvioletred" });
                }
            }
        };

        if (data && data.gData) {
            data.gData.forEach(function(record) {
                record._fields.forEach(addUniqueNode);
            });
        }

        MVC.Ramosa.graph.Obelisk.putNodes();

        const addedLinkKeys = new Set();

        const isGoldLink = (idA, idB) => {
            const findLabels = ["Find Source", "Find Author", "Find Class", "Find Publisher"];
            const node1 = Obelisk.nodes.find(n => n.id === idA);
            const node2 = Obelisk.nodes.find(n => n.id === idB);
            return (node1 && findLabels.includes(node1.group)) || (node2 && findLabels.includes(node2.group));
        };

        const getIdFromNode = (node) => {
            if (!node || !node.properties) return null;
            return node.properties.uuid;
        };

        const addSafeLinkEntity = (nodeA, nodeB) => {
            if (!nodeA || !nodeB) return;
            if (Array.isArray(nodeA)) {
                nodeA.forEach(itemA => addSafeLinkEntity(itemA, nodeB));
                return;
            }
            if (Array.isArray(nodeB)) {
                nodeB.forEach(itemB => addSafeLinkEntity(nodeA, itemB));
                return;
            }

            let idA = getIdFromNode(nodeA);
            let idB = getIdFromNode(nodeB);
            
            if (!idA || !idB || idA === idB) return;

            let linkKey = idA < idB ? `${idA}_${idB}` : `${idB}_${idA}`;

            if (!addedLinkKeys.has(linkKey)) {
                addedLinkKeys.add(linkKey);
                links.push({ source: idA, target: idB, isGold: isGoldLink(idA, idB) });
                
                let idxA = Obelisk.nodes.findIndex(n => n.id === idA);
                let idxB = Obelisk.nodes.findIndex(n => n.id === idB);
                if (idxA !== -1) Obelisk.nodes[idxA].count++;
                if (idxB !== -1) Obelisk.nodes[idxB].count++;
            }
        };

        const processPairs = (pairs, parentNode, isParentToNode = true) => {
            if (!Array.isArray(pairs)) return;
            pairs.forEach(pair => {
                if (!pair || !pair.node) return;
                if (isParentToNode) {
                    addSafeLinkEntity(parentNode, pair.node);
                } else {
                    addSafeLinkEntity(pair.node, parentNode);
                }
                if (pair.hieroglyph) {
                    addSafeLinkEntity(pair.node, pair.hieroglyph);
                }
            });
        };

        if (data && data.gData) {
            data.gData.forEach(function(record) {
                var s = record._fields[0];
                var h = record._fields[1];
                var authorPairs = record._fields[2];
                var classPairs = record._fields[3];
                var publisherPairs = record._fields[4];
                var connectedSources = record._fields[5];

                if (h) addSafeLinkEntity(s, h);
                processPairs(authorPairs, s, false); 
                processPairs(classPairs, s, true);    
                processPairs(publisherPairs, s, true); 

                if (Array.isArray(connectedSources)) {
                    connectedSources.forEach(item => {
                        if (!item || !item.source) return;
                        let s2 = item.source;
                        let h_s2 = item.hieroglyph;

                        if (h_s2) addSafeLinkEntity(s2, h_s2);
                        processPairs(item.authorPairs, s2, false);
                        processPairs(item.classPairs, s2, true);
                        processPairs(item.publisherPairs, s2, true);
                    });
                }
            });
        }

        MVC.Ramosa.Graph.Obelisk.putLinks(links)
        MVC.Hook.Graph.render("." + TEMPEST.pageREC() + "_graph");
}