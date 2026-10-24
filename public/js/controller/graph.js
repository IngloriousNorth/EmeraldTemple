window.initializeGraph = function initializeGraph() {
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

    Obelisk.nodes = nodes;

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

    Obelisk.links = links;
    graphRenderAdaptive("." + TEMPEST.pageREC() + "_graph");
}

function graphRenderAdaptive(selector) {
    graphRenderPureD33D(selector);
}

function graphRenderPureD33D(selector) {
    const container = document.querySelector(selector);
    if (!container) return;

    container.innerHTML = ""; // Clear out previous canvas/elements

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    assertScrollPause();

    // 1. Setup Three.js Scene, Camera, and WebGLRenderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('lightgoldenrodyellow');

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 0, 300);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.xr.enabled = true; // Enable native WebXR VR support!
    container.appendChild(renderer.domElement);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight.position.set(100, 200, 100);
    scene.add(directionalLight);

    // 2. Setup D3 3D Force Simulation
    const simulation = d3.forceSimulation(Obelisk.nodes, 3)
        .force('link', d3.forceLink(Obelisk.links).id(d => d.id).distance(150))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(0, 0, 0));

    // 3. Create Three.js Meshes for Nodes and Lines
    const nodeGroup = new THREE.Group();
    scene.add(nodeGroup);

    const nodeMeshes = new Map();
    Obelisk.nodes.forEach(node => {
        const radius = node.group === "Hieroglyph" ? 6 : Math.max(3, (node.count / 4));
        const geometry = new THREE.SphereGeometry(radius, 16, 16);
        const material = new THREE.MeshLambertMaterial({ color: node.color || '#333333' });
        const mesh = new THREE.Mesh(geometry, material);
        
        mesh.userData = node;
        nodeGroup.add(mesh);
        nodeMeshes.set(node.id, mesh);
    });

    // Create line segments for links
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0xCDCDCD, transparent: true, opacity: 0.6 });
    const lineGeometry = new THREE.BufferGeometry();
    const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lineSegments);

    // 4. Animation loop & Physics tick
    let animationFrameId;
    function animate() {
        animationFrameId = requestAnimationFrame(animate);

        // Update D3 simulation tick
        simulation.tick();

        // Update Node mesh positions from D3 simulation data
        nodeMeshes.forEach((mesh, id) => {
            const node = mesh.userData;
            mesh.position.set(node.x || 0, node.y || 0, node.z || 0);
        });

        // Update Link geometry buffer positions
        const positions = [];
        Obelisk.links.forEach(link => {
            const source = link.source;
            const target = link.target;
            if (source && target && typeof source.x === 'number' && typeof target.x === 'number') {
                positions.push(source.x, source.y, source.z || 0);
                positions.push(target.x, target.y, target.z || 0);
            }
        });
        lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        lineGeometry.attributes.position.needsUpdate = true;

        renderer.render(scene, camera);
    }
    animate();

    // 5. Native Raycasting / Click Detection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    container.addEventListener('click', (event) => {
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(nodeGroup.children);

        if (intersects.length > 0) {
            const clickedNode = intersects[0].object.userData;
            handleNormalClick(clickedNode);
        }
    });

    // Handle Window Resizing
    window.addEventListener('resize', onWindowResize);
    function onWindowResize() {
        const newW = container.clientWidth || window.innerWidth;
        const newH = container.clientHeight || window.innerHeight;
        camera.aspect = newW / newH;
        camera.updateProjectionMatrix();
        renderer.setSize(newW, newH);
    }
}