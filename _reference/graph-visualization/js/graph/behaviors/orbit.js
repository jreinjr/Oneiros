/**
 * Orbit behavior module
 * Handles camera orbit animations and transitions
 */

/**
 * Orbit behavior class
 */
export class OrbitBehavior {
    constructor(visualizer, config) {
        this.visualizer = visualizer;
        this.config = config;
        
        // State
        this.isActive = false;
        this.currentNode = null;
        this.orbitAngle = 0;
        this.focusStartTime = null;
        
        // Animation control
        this.orbitInterval = null;
        this.transitionTimeout = null;
        this.transitionTarget = null;
        
        // Callbacks
        this.onNodeChange = null;
    }

    /**
     * Start orbit behavior
     * @param {Object} startNode - Optional starting node
     */
    start(startNode = null) {
        if (this.isActive) return;
        
        this.isActive = true;
        
        if (startNode) {
            this.focusOnNode(startNode, false);
        } else if (!this.currentNode) {
            // Pick a random node to start with
            const graphData = this.visualizer.graphData;
            if (graphData.nodes.length > 0) {
                const randomNode = graphData.nodes[Math.floor(Math.random() * graphData.nodes.length)];
                this.focusOnNode(randomNode, false);
            }
        }
        
        this.startOrbitAnimation();
        this.scheduleNextTransition();
    }

    /**
     * Stop orbit behavior
     */
    stop() {
        this.isActive = false;
        
        if (this.orbitInterval) {
            clearInterval(this.orbitInterval);
            this.orbitInterval = null;
        }
        
        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
            this.transitionTimeout = null;
        }
        
        this.transitionTarget = null;
    }

    /**
     * Focus on a specific node
     * @param {Object} node - Node to focus on
     * @param {boolean} userTriggered - Whether this was triggered by user interaction
     */
    focusOnNode(node, userTriggered = false) {
        if (userTriggered) {
            this.stop();
        }

        const previousNode = this.currentNode;
        this.currentNode = node;
        
        // Notify about node change
        if (this.onNodeChange) {
            this.onNodeChange(node, previousNode);
        }

        // If orbiting is active, smoothly transition the target position
        if (this.isActive && !userTriggered) {
            this.transitionTarget = {
                from: previousNode ? { 
                    x: previousNode.x || 0, 
                    y: previousNode.y || 0, 
                    z: previousNode.z || 0 
                } : null,
                to: { 
                    x: node.x || 0, 
                    y: node.y || 0, 
                    z: node.z || 0 
                },
                startTime: Date.now(),
                duration: this.config.get('transitionSpeed')
            };
        } else {
            // For user-triggered focus or initial setup, position camera directly
            this.positionCameraForNode(node);
        }

        this.focusStartTime = Date.now();

        if (!userTriggered && this.isActive) {
            this.scheduleNextTransition();
        }
    }

    /**
     * Position camera for a specific node
     * @param {Object} node - Node to position camera for
     */
    positionCameraForNode(node) {
        const distance = this.config.get('orbitDistance');
        const nodePos = { 
            x: node.x || 0, 
            y: node.y || 0, 
            z: node.z || 0 
        };
        
        const startAngle = Math.random() * Math.PI * 2;
        const cameraPos = {
            x: nodePos.x + distance * Math.sin(startAngle),
            y: nodePos.y + distance * 0.3,
            z: nodePos.z + distance * Math.cos(startAngle)
        };

        this.visualizer.setCameraPosition(
            cameraPos, 
            nodePos, 
            this.config.get('transitionSpeed')
        );
        this.orbitAngle = startAngle;
    }

    /**
     * Start orbit animation loop
     */
    startOrbitAnimation() {
        if (this.orbitInterval) {
            clearInterval(this.orbitInterval);
        }

        this.orbitInterval = setInterval(() => {
            if (!this.currentNode || !this.isActive) return;

            // Calculate current target position (with smooth transition if active)
            let targetPos = { 
                x: this.currentNode.x || 0, 
                y: this.currentNode.y || 0, 
                z: this.currentNode.z || 0 
            };

            // Handle smooth target position transition
            if (this.transitionTarget) {
                const elapsed = Date.now() - this.transitionTarget.startTime;
                const progress = Math.min(elapsed / this.transitionTarget.duration, 1);
                
                // Use ease-in-out cubic for smooth start and end
                const easeProgress = progress < 0.5
                    ? 4 * progress * progress * progress
                    : 1 - Math.pow(-2 * progress + 2, 3) / 2;
                
                if (this.transitionTarget.from) {
                    targetPos = {
                        x: this.transitionTarget.from.x + (this.transitionTarget.to.x - this.transitionTarget.from.x) * easeProgress,
                        y: this.transitionTarget.from.y + (this.transitionTarget.to.y - this.transitionTarget.from.y) * easeProgress,
                        z: this.transitionTarget.from.z + (this.transitionTarget.to.z - this.transitionTarget.from.z) * easeProgress
                    };
                } else {
                    targetPos = this.transitionTarget.to;
                }

                // Clear transition when complete
                if (progress >= 1) {
                    this.transitionTarget = null;
                }
            }

            const distance = this.config.get('orbitDistance');
            const orbitSpeed = this.config.get('orbitSpeed');
            
            // Continue orbiting around the (possibly transitioning) target position
            this.orbitAngle += (Math.PI / 180) * orbitSpeed;
            
            const cameraPos = {
                x: targetPos.x + distance * Math.sin(this.orbitAngle),
                y: targetPos.y + distance * 0.3,
                z: targetPos.z + distance * Math.cos(this.orbitAngle)
            };

            this.visualizer.setCameraPosition(cameraPos, targetPos, 0);
        }, 16); // ~60fps
    }

    /**
     * Schedule next node transition
     */
    scheduleNextTransition() {
        if (this.transitionTimeout) {
            clearTimeout(this.transitionTimeout);
        }

        const duration = this.config.get('focusDuration') * 1000;
        this.transitionTimeout = setTimeout(() => {
            if (this.isActive) {
                this.transitionToConnectedNode();
            }
        }, duration);
    }

    /**
     * Transition to a connected node
     */
    transitionToConnectedNode() {
        if (!this.currentNode || !this.isActive) return;

        const graphData = this.visualizer.graphData;
        const connectedNodes = Array.from(this.currentNode.connections)
            .map(id => graphData.nodes.find(n => n.id === id))
            .filter(n => n);

        if (connectedNodes.length === 0) {
            // If no connections, pick a random node
            const randomNode = graphData.nodes[Math.floor(Math.random() * graphData.nodes.length)];
            this.focusOnNode(randomNode);
            return;
        }

        const nextNode = connectedNodes[Math.floor(Math.random() * connectedNodes.length)];
        this.focusOnNode(nextNode);
    }

    /**
     * Get current orbit state
     * @returns {Object} Orbit state
     */
    getState() {
        return {
            isActive: this.isActive,
            currentNode: this.currentNode,
            orbitAngle: this.orbitAngle,
            focusStartTime: this.focusStartTime
        };
    }

    /**
     * Update configuration
     * @param {string} key - Configuration key
     * @param {*} value - New value
     */
    updateConfig(key, value) {
        switch (key) {
            case 'orbitDistance':
                if (this.isActive && this.currentNode) {
                    this.positionCameraForNode(this.currentNode);
                }
                break;
            case 'orbitSpeed':
            case 'focusDuration':
            case 'transitionSpeed':
                // These will be picked up automatically on next use
                break;
        }
    }

    /**
     * Set node change callback
     * @param {Function} callback - Callback function (newNode, previousNode)
     */
    setNodeChangeCallback(callback) {
        this.onNodeChange = callback;
    }

    /**
     * Get current focused node
     * @returns {Object|null} Current node
     */
    getCurrentNode() {
        return this.currentNode;
    }

    /**
     * Check if orbit is currently active
     * @returns {boolean} Whether orbit is active
     */
    isOrbitActive() {
        return this.isActive;
    }

    /**
     * Force immediate transition to next node
     */
    skipToNext() {
        if (this.isActive) {
            this.transitionToConnectedNode();
        }
    }

    /**
     * Dispose of the orbit behavior and clean up resources
     */
    dispose() {
        this.stop();
        this.visualizer = null;
        this.config = null;
        this.currentNode = null;
        this.onNodeChange = null;
    }
}
