function initializeGraph() {
    if (TEMPEST.pageREC() === "torrents" && TEMPEST.paramREC().search) {
        $.post("/graph_search", TEMPEST.paramREC(), function(data) {
            graph(data); 
        });
    }
    else if(TEMPEST.pageREC() === "node"){
        $.post("/node_graph/" + TEMPEST.paramREC().label, {uuid : TEMPEST.paramREC().uuid}, function(data){
            graph(data);
        });
    }
}

function graph(data) {
    nodeUUIDs = [];
    renewObelisk();

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

                Obelisk.nodes.push({ 
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
                Obelisk.nodes.push({ id: id, group: isMatch ? "Find Source" : "Source", name: rawName, count: 0, color: "#000" });
            } 
            else if (label === "Author") {
                var isMatch = (TEMPEST.pageREC() === "node") && (id === TEMPEST.paramREC().uuid);
                Obelisk.nodes.push({ id: id, group: isMatch ? "Find Author" : "Author", name: rawName, count: 0, color: "goldenrod" });
            } 
            else if (label === "Class") {
                var isMatch = (TEMPEST.pageREC() === "node") && (id === TEMPEST.paramREC().uuid);
                Obelisk.nodes.push({ id: id, group: isMatch ? "Find Class" : "Class", name: rawName, count: 0, color: "darkcyan" });
            }
            else if (label === "Publisher") {
                var isMatch = (TEMPEST.pageREC() === "node") && (id === TEMPEST.paramREC().uuid);
                Obelisk.nodes.push({ id: id, group: isMatch ? "Find Publisher" : "Publisher", name: toTitleCase(rawName), count: 0, color: "mediumvioletred" });
            }
        }
    };

    if (data && data.gData) {
        data.gData.forEach(function(record) {
            record._fields.forEach(addUniqueNode);
        });
    }

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
            Obelisk.links.push({ source: idA, target: idB, isGold: isGoldLink(idA, idB) });
            
            let idxA = Obelisk.nodes.findIndex(n => n.id === idA);
            let idxB = Obelisk.nodes.findIndex(n => n.id === idB);
            if (idxA !== -1) Obelisk.nodes[idxA].count++;
            if (idxB !== -1) Obelisk.nodes[idxB].count++;
        }
    };

    // Helper to process exact {node, hieroglyph} pairs
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
            var s            = record._fields[0];
            var h            = record._fields[1];
            var authorPairs  = record._fields[2];
            var classPairs   = record._fields[3];
            var publisherPairs = record._fields[4];
            var connectedSources = record._fields[5];

            // Primary Source links
            if (h) addSafeLinkEntity(s, h);
            processPairs(authorPairs, s, false);  // author -> s
            processPairs(classPairs, s, true);    // s -> class
            processPairs(publisherPairs, s, true); // s -> publisher

            // Secondary Connected Sources
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

    graphRenderAdaptive("." + TEMPEST.pageREC() + "_graph");
}
function graphRenderAdaptive(selector) {
    /*if (isMobileDevice() && typeof ForceGraphAR === 'function') {
        console.log("Initializing AR for mobile device...");
        graphRenderAR(selector);
    } else {
        console.log("Initializing VR / standard view...");
        graphRenderVR(selector);
    }*/
    graphRenderVR(selector);
}
let highlightedNode = null;
let highlightedLinks = new Set();
let highlightedNodes = new Set();

function graphRenderVR(selector) {
    const container = document.querySelector(selector);
    if (!container) return;

    if (container.clientWidth === 0 || container.clientHeight === 0) {
        requestAnimationFrame(() => graphRenderVR(selector));
        return;
    }

    assertScrollPause();

    const Graph = ForceGraphVR()(container)
        .width(container.clientWidth)
        .height(container.clientHeight)
        .backgroundColor('lightgoldenrodyellow')// AR usually benefits from a transparent background

        .graphData({ nodes: Obelisk.nodes, links: Obelisk.links })

        .nodeRelSize(7)
        .nodeLabel("")
        .nodeColor(d => d.color)
        .nodeThreeObject(node => {
            const group = new THREE.Group();

            if (node.group === "Hieroglyph") {
                // Check if this hieroglyph is tied to a gold link or node property
                const isConnectedToGold = Graph.graphData().links.some(link => {
                    const sId = typeof link.source === 'object' ? link.source.id : link.source;
                    const tId = typeof link.target === 'object' ? link.target.id : link.target;
                    return (sId === node.id || tId === node.id) && link.isGold;
                }) || node.isGold;

                const spriteColor = isConnectedToGold ? 'gold' : (node.color || 'darkgoldenrod');

                const sprite = new SpriteText(node.html_entity || '');
                sprite.font = 'bold 128px Noto Sans Egyptian Hieroglyphs';
                sprite.color = spriteColor;
                sprite.textHeight = isConnectedToGold ? 40 : 40; 
                sprite.position.set(0, 0, 0); 
                sprite.padding = 15;

                sprite.material.depthWrite = false;

                node.__sprite = sprite;
                node.__defaultColor = spriteColor; // Save default color for hover restoration
                sprite.raycast = () => {};
                group.add(sprite);

                const hitbox = new THREE.Mesh(
                    new THREE.SphereGeometry(32),
                    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
                );
                hitbox.scale.set(1, 2.8, 1);
                group.add(hitbox);

                return group;
            }

            const sprite = new SpriteText(node.name || '');
            sprite.font = '16px Rationale';
            
            const textColor = node.color;
            sprite.color = textColor;
            sprite.textHeight = 11;
            sprite.position.set(3, 6, 9);
            
            sprite.material.depthWrite = false;

            node.__sprite = sprite; 
            node.__defaultColor = textColor;
            group.add(sprite);

            const dynamicRadius = Math.max(3, (node.count / 4));

            const visibleMesh = new THREE.Mesh(
                new THREE.SphereGeometry(dynamicRadius), 
                new THREE.MeshLambertMaterial({ color: node.color })
            );
            group.add(visibleMesh);

            const hitbox = new THREE.Mesh(
                new THREE.SphereGeometry(dynamicRadius + 8),
                new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
            );
            group.add(hitbox);

            return group;
        })
        .onNodeClick((node) => {
            handleNormalClick(node);
        })
        let isSimulationStable = false;

// Enable hovers only after ForceAtlas2 finishes its initial layout
Graph.onEngineStop(() => {
    isSimulationStable = true;
});

Graph.onNodeHover(node => {
    // Ignore hover events while the simulation is actively moving nodes
    if (!isSimulationStable) return;

    if (highlightedNode && highlightedNode.__sprite) {
        if (highlightedNode.group !== "Hieroglyph") {
            highlightedNode.__sprite.color = highlightedNode.__defaultColor || '#475569';
            highlightedNode.__sprite.textHeight = 12;
        } else {
            highlightedNode.__sprite.textHeight = 55; 
        }
    }

    if (node && node.__sprite) {
        if (node.group === "Hieroglyph") {
            const isConnectedToGold = Graph.graphData().links.some(link => {
                const sId = typeof link.source === 'object' ? link.source.id : link.source;
                const tId = typeof link.target === 'object' ? link.target.id : link.target;
                return (sId === node.id || tId === node.id) && link.isGold;
            }) || node.isGold;
            node.__sprite.textHeight = isConnectedToGold ? 55 : 55; 
            node.__sprite.color = isConnectedToGold ? 'gold' : 'gold';
            insertObelisk(node.name, node.html_entity);
        } else {
            node.__sprite.color = 'gold';
            node.__sprite.textHeight = 17;
        }
    }

    highlightedNode = node;
    highlightedNodes.clear();
    highlightedLinks.clear();

    if (node) {
        highlightedNodes.add(node);

        Graph.graphData().links.forEach(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;

            if (sourceId === node.id || targetId === node.id) {
                highlightedLinks.add(link);
                if (typeof link.source === 'object') highlightedNodes.add(link.source);
                if (typeof link.target === 'object') highlightedNodes.add(link.target);
            }
        });
    }

        Graph
                .linkColor(link => (highlightedLinks.has(link) ? 'gold' : (link.isGold ? 'gold' : '#CDCDCD')))
                .linkWidth(link => ((highlightedLinks.has(link) || link.isGold) ? 3 : 0.08))
        })
        .linkColor("#CDCDCD")
        .linkWidth(.08)
        .linkDirectionalParticleColor('#007BFF')
        .linkOpacity(link => link.isGold ? 1 : 0.06);

    Graph.d3Force('charge').strength(-333);
    Graph.d3Force('link').distance(333);
    Graph.d3Force('center').strength(0.33);
    Graph.cooldownTime(3333);

    const sceneEl = container.querySelector('a-scene');

    if (sceneEl) {
        const bindRaycaster = () => {
            setTimeout(() => {
                window.dispatchEvent(new Event('resize'));
                enableMouseRaycaster(sceneEl);
            }, 100);
        };

        if (sceneEl.hasLoaded) {
            bindRaycaster();
        } else {
            sceneEl.addEventListener('loaded', bindRaycaster);
        }
    }


    // --- DRAG VS TAP DISTANCE THRESHOLD FIX ---
    let pointerDownX = 0;
    let pointerDownY = 0;
    let hasDragged = false;
    const DRAG_THRESHOLD = 10; // Pixels of movement allowed before considering it a drag/pan

    container.addEventListener('pointerdown', (e) => {
        pointerDownX = e.clientX;
        pointerDownY = e.clientY;
        hasDragged = false;
    }, { passive: true });

    container.addEventListener('pointermove', (e) => {
        if (!hasDragged && (pointerDownX !== 0 || pointerDownY !== 0)) {
            const dx = Math.abs(e.clientX - pointerDownX);
            const dy = Math.abs(e.clientY - pointerDownY);
            if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
                hasDragged = true;
            }
        }
    }, { passive: true });

    // Intercept clicks/taps on the graph canvas renderer to cancel if user panned
    const rendererDom = container.querySelector('canvas') || container;
    rendererDom.addEventListener('click', (e) => {
        if (hasDragged) {
            e.stopImmediatePropagation();
            e.preventDefault();
        }
    }, true);
}

function isMobileDevice() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    // Check common mobile device strings
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    // Also check for modern touch-enabled iPads (iOS 13+ reporting as MacIntel)
    const isTouchMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    
    return mobileRegex || isTouchMac;
}

function graphRenderAR(selector) {
    const container = document.querySelector(selector);
    if (!container) return;

    if (container.clientWidth === 0 || container.clientHeight === 0) {
        requestAnimationFrame(() => graphRenderAR(selector));
        return;
    }

    assertScrollPause();

    // Uses ForceGraphAR instead of ForceGraphVR
    const Graph = ForceGraphAR()(container)
        .width(container.clientWidth)
        .height(container.clientHeight)
        .graphData({ nodes: Obelisk.nodes, links: Obelisk.links })
        .backgroundColor('transparent') // AR usually benefits from a transparent background
        .nodeRelSize(7)
        .nodeLabel("")
        .nodeColor(d => d.color)
        .nodeThreeObject(node => {
            const group = new THREE.Group();

            if (node.group === "Hieroglyph") {
                const sprite = new SpriteText(node.html_entity || '');
                sprite.font = '360px Noto Sans Egyptian Hieroglyphs';
                sprite.color = node.color || 'goldenrod';
                sprite.textHeight = 360; 
                sprite.position.set(0, 0, 0); 
                sprite.padding = 45;
                sprite.material.depthWrite = false;
                sprite.renderOrder = 999;

                node.__sprite = sprite;
                group.add(sprite);

                const hitbox = new THREE.Mesh(
                    new THREE.SphereGeometry(18),
                    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
                );
                group.add(hitbox);
                return group;
            }

            const sprite = new SpriteText(node.name || '');
            sprite.font = '16px Share Tech Mono';
            sprite.color = node.color;
            sprite.textHeight = 6;
            sprite.position.set(3, 6, 9);
            sprite.material.depthWrite = false;
            sprite.renderOrder = 999;

            node.__sprite = sprite; 
            node.__defaultColor = node.color;
            group.add(sprite);

            const dynamicRadius = Math.max(3, (node.count / 5));
            const visibleMesh = new THREE.Mesh(
                new THREE.SphereGeometry(dynamicRadius), 
                new THREE.MeshLambertMaterial({ color: node.color })
            );
            group.add(visibleMesh);

            const hitbox = new THREE.Mesh(
                new THREE.SphereGeometry(dynamicRadius + 8),
                new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
            );
            group.add(hitbox);

            return group;
        })
        .onNodeClick((node) => {
            handleNormalClick(node);
        });

    Graph.d3Force('charge').strength(-300);
    Graph.d3Force('link').distance(137);
    Graph.d3Force('center').strength(0.09);

    setupMobileFullscreen(Graph);
}

function enableMouseRaycaster(sceneEl) {
    const cameraEl = sceneEl.querySelector('[camera]') || (sceneEl.camera && sceneEl.camera.el);
    
    if (cameraEl) {
        cameraEl.setAttribute('cursor', 'rayOrigin: mouse');
        cameraEl.setAttribute('raycaster', 'objects: *');

        if (sceneEl.resize) {
            sceneEl.resize();
        }
        
        const cursorComp = cameraEl.components.cursor;
        if (cursorComp && cursorComp.updateCanvasBounds) {
            cursorComp.updateCanvasBounds();
        }
    }
}

let isRoutingNode = false;

function handleNormalClick(clickedNode) {
    if (isRoutingNode) return;
    
    if (clickedNode) {
        isRoutingNode = true;
        
        const d = clickedNode;
        const routeMap = { 
            "Source": "source", 
            "Author": "author", 
            "Class": "class", 
            "Publisher": "publisher", 
            "Find Source": "source", 
            "Find Author": "author", 
            "Find Class": "class", 
            "Find Publisher": "publisher",
            "Hieroglyph": "hieroglyph"
        };
        const label = routeMap[d.group] || d.group.toLowerCase();
        
        exitFullscreenIfActive();
        if(label === "hieroglyph"){
            processAbacus(d);
        }
        else{
            TEMPEST.route(`#node?label=${label}&uuid=${d.id}`);
        }
        
        setTimeout(() => {
            isRoutingNode = false;
        }, 300);
    }
}

function exitFullscreenIfActive() {
    if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
            document.webkitExitFullscreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.msExitFullscreen) {
            document.msExitFullscreen();
        }
    }
}