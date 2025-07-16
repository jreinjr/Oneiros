/**
 * Camera Animator module
 * Handles smooth camera animations using Three.js parenting hierarchy
 */

export class CameraAnimator {
    constructor(graph, config, onNodeSelect) {
        this.graph = graph;
        this.config = config;
        this.onNodeSelect = onNodeSelect; // Callback for node selection
        this.scene = graph.scene();
        this.camera = graph.camera();
        
        // Create camera rig hierarchy
        this.cameraRig = new THREE.Object3D();
        this.cameraArm = new THREE.Object3D();
        
        // Current state
        this.mode = 'manual'; // 'manual', 'dreaming', 'haiku'
        this.isDreaming = false;
        this.isHaiku = false;
        this.currentRotationSpeed = 0;
        this.nodeTimer = 0;
        this.currentNodeIndex = -1;
        this.currentNode = null;
        this.lastTime = performance.now();
        
        this.setupCameraRig();
    }
    
    setupCameraRig() {
        // Store original camera parent for potential restoration
        this.originalCameraParent = this.camera.parent;
        
        // Remove camera from its current parent
        if (this.camera.parent) {
            this.camera.parent.remove(this.camera);
        }
        
        // Build hierarchy: Scene -> CameraRig -> CameraArm -> Camera
        this.scene.add(this.cameraRig);
        this.cameraRig.add(this.cameraArm);
        this.cameraArm.add(this.camera);
        
        // Position camera at initial orbit radius
        this.camera.position.set(0, 0, this.config.get('haikuOrbitRadius'));
        
        // Start at center
        this.cameraRig.position.set(0, 0, 0);
    }
    
    update(currentTime) {
        // Only update if not in manual mode
        if (this.mode === 'manual') return;
        
        // Calculate delta time in seconds
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        // Rotate the rig
        this.cameraRig.rotation.y += this.currentRotationSpeed * deltaTime;
        
        // Get rig world position
        const target = new THREE.Vector3();
        this.cameraRig.getWorldPosition(target);
        
        // Calculate screen-space offset for camera target
        const targetX = this.config.get('cameraTargetX') || 50; // Default to center (50%)
        const targetY = this.config.get('cameraTargetY') || 50;
        
        // Convert percentage to normalized device coordinates (-1 to 1)
        const ndcX = (targetX / 100) * 2 - 1;
        const ndcY = -((targetY / 100) * 2 - 1); // Invert Y for screen coordinates
        
        // Get camera properties
        const cameraWorldPos = new THREE.Vector3();
        this.camera.getWorldPosition(cameraWorldPos);
        const distance = cameraWorldPos.distanceTo(target);
        
        // Calculate offset in world space based on camera view
        const fov = this.camera.fov * Math.PI / 180;
        const aspect = this.camera.aspect || 1;
        
        // Calculate offset distances
        const halfHeight = Math.tan(fov / 2) * distance;
        const halfWidth = halfHeight * aspect;
        
        // Apply offset to target position
        const right = new THREE.Vector3();
        const up = new THREE.Vector3();
        this.camera.getWorldDirection(new THREE.Vector3()).normalize();
        this.camera.up.clone().normalize();
        
        // Get camera's right and up vectors in world space
        const cameraMatrix = new THREE.Matrix4();
        this.camera.matrixWorld.extractRotation(cameraMatrix);
        right.set(1, 0, 0).applyMatrix4(cameraMatrix);
        up.set(0, 1, 0).applyMatrix4(cameraMatrix);
        
        // Apply the offset
        const offsetX = -ndcX * halfWidth;  // Negative to make right = positive X
        const offsetY = -ndcY * halfHeight; // Negative to make up = positive Y
        target.add(right.multiplyScalar(offsetX));
        target.add(up.multiplyScalar(offsetY));
        
        // Look at the offset target
        this.camera.lookAt(target);
        
        // Handle dream mode node transitions
        if (this.isDreaming) {
            this.nodeTimer += deltaTime;
            if (this.nodeTimer >= this.config.get('dreamOrbitDuration')) {
                this.selectNewNode();
                this.nodeTimer = 0;
            }
        }
    }
    
    startDreamMode() {
        this.mode = 'dreaming';
        this.isDreaming = true;
        this.isHaiku = false;
        this.nodeTimer = 0;
        this.selectNewNode();
    }
    
    stopDreamMode() {
        this.isDreaming = false;
        // Don't automatically switch to manual mode here
        // Let the mode be set explicitly by the caller
    }
    
    startHaikuMode() {
        this.mode = 'haiku';
        this.isDreaming = false;
        this.isHaiku = true;
        this.transitionToCenter();
    }
    
    selectNewNode() {
        // Get current graph data
        const graphData = this.graph.graphData();
        const nodes = graphData.nodes;
        
        if (!nodes || nodes.length === 0) return;
        
        // Pick a random node different from the current one
        let newIndex;
        do {
            newIndex = Math.floor(Math.random() * nodes.length);
        } while (newIndex === this.currentNodeIndex && nodes.length > 1);
        
        this.currentNodeIndex = newIndex;
        const node = nodes[newIndex];
        this.currentNode = node;
        
        // Trigger node selection callback (same as clicking)
        if (this.onNodeSelect && node) {
            this.onNodeSelect(node);
        }
        
        // Animate to new node position
        gsap.to(this.cameraRig.position, {
            x: node.x || 0,
            y: node.y || 0,
            z: node.z || 0,
            duration: this.config.get('dreamTransitionDuration'),
            ease: "power2.inOut"
        });
        
        // Animate orbit radius
        gsap.to(this.camera.position, {
            z: this.config.get('dreamOrbitRadius'),
            duration: this.config.get('dreamTransitionDuration'),
            ease: "power2.inOut"
        });
        
        // Animate rotation speed
        gsap.to(this, {
            currentRotationSpeed: this.config.get('dreamOrbitSpeed'),
            duration: this.config.get('dreamTransitionDuration'),
            ease: "power2.inOut"
        });
    }
    
    transitionToCenter() {
        // Return to center
        gsap.to(this.cameraRig.position, {
            x: 0, 
            y: 0, 
            z: 0,
            duration: this.config.get('dreamTransitionDuration'),
            ease: "power2.inOut"
        });
        
        // Return to haiku orbit radius
        gsap.to(this.camera.position, {
            z: this.config.get('haikuOrbitRadius'),
            duration: this.config.get('dreamTransitionDuration'),
            ease: "power2.inOut"
        });
        
        // Return to haiku rotation speed
        gsap.to(this, {
            currentRotationSpeed: this.config.get('haikuOrbitSpeed'),
            duration: this.config.get('dreamTransitionDuration'),
            ease: "power2.inOut"
        });
        
        // Reset node selection
        this.currentNodeIndex = -1;
    }
    
    updateConfig(key, value) {
        // Handle live configuration updates
        switch(key) {
            case 'dreamOrbitRadius':
                if (this.isDreaming) {
                    gsap.to(this.camera.position, {
                        z: value,
                        duration: 0.5,
                        ease: "power2.out"
                    });
                }
                break;
                
            case 'haikuOrbitRadius':
                if (!this.isDreaming && this.mode !== 'manual') {
                    gsap.to(this.camera.position, {
                        z: value,
                        duration: 0.5,
                        ease: "power2.out"
                    });
                }
                break;
                
            case 'dreamOrbitSpeed':
                if (this.isDreaming) {
                    gsap.to(this, {
                        currentRotationSpeed: value,
                        duration: 0.5,
                        ease: "power2.out"
                    });
                }
                break;
                
            case 'haikuOrbitSpeed':
                if (!this.isDreaming && this.mode !== 'manual') {
                    gsap.to(this, {
                        currentRotationSpeed: value,
                        duration: 0.5,
                        ease: "power2.out"
                    });
                }
                break;
                
            case 'cameraTargetX':
            case 'cameraTargetY':
                // Camera target offset updates are handled in the update loop
                // No need for special handling here
                break;
        }
    }
    
    dispose() {
        // Kill any active GSAP animations
        gsap.killTweensOf(this.cameraRig.position);
        gsap.killTweensOf(this.camera.position);
        gsap.killTweensOf(this);
        
        // Remove camera from arm
        if (this.camera.parent === this.cameraArm) {
            this.cameraArm.remove(this.camera);
        }
        
        // Remove arm from rig
        if (this.cameraArm.parent === this.cameraRig) {
            this.cameraRig.remove(this.cameraArm);
        }
        
        // Remove rig from scene
        if (this.cameraRig.parent === this.scene) {
            this.scene.remove(this.cameraRig);
        }
        
        // Restore camera to original parent if possible
        if (this.originalCameraParent) {
            this.originalCameraParent.add(this.camera);
        }
        
        // Clear references
        this.graph = null;
        this.config = null;
        this.scene = null;
        this.camera = null;
        this.cameraRig = null;
        this.cameraArm = null;
    }
    
    setManualMode() {
        this.mode = 'manual';
        this.isDreaming = false;
        this.isHaiku = false;
        this.currentRotationSpeed = 0;
        // Restore camera to original parent if needed
        if (this.camera && this.originalCameraParent && this.camera.parent !== this.originalCameraParent) {
            if (this.camera.parent) {
                this.camera.parent.remove(this.camera);
            }
            this.originalCameraParent.add(this.camera);
        }
    }
}