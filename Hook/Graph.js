const TEMPEST = window.TEMPEST;
const MVC = window.MVC;
module.exports = {
    initialize : function(){
        MVC.Ramosa.Graph.remove(".node_graph");

        if (TEMPEST.pageREC() === "torrents" && TEMPEST.paramREC().search) {
        $.post("/graph_search", TEMPEST.paramREC(), function(data) {
            MVC.Control.Graph.initialize(data); 
        });
        }
        else if(TEMPEST.pageREC() === "node"){
            $.post("/node_graph/" + TEMPEST.paramREC().label, {uuid : TEMPEST.paramREC().uuid}, function(data){
                MVC.Control.Graph.initialize(data);
            });
        }
    },
    render : function(selector) {
        const container = document.querySelector(selector);
        if (!container) return;

        container.innerHTML = ""; // Clear out previous canvas/elements

        const width = container.clientWidth || window.innerWidth;
        const height = container.clientHeight || window.innerHeight;


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
        MVC.Ramosa.graph.Obelisk.nodes.forEach(node => {
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
            MVC.Model.graph.Obelisk.links.forEach(link => {
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
}



