/**
 * Navigation Manager
 * Handles different navigation modes for the 3D graph
 */

/**
 * Navigation manager class
 */
export class NavigationManager {
    constructor(config, visualizer, behaviorController) {
        this.config = config;
        this.visualizer = visualizer;
        this.behaviorController = behaviorController;
        
        // State
        this.currentMode = 'manual';
        this.automaticTimer = null;
        this.isOrbiting = false;
        this.orbitAnimationId = null;
        this.currentOrbitNode = null;
        this.orbitStartTime = null;
        
        // Bind methods
        this.handleAutomaticMode = this.handleAutomaticMode.bind(this);
        this.orbitAroundNode = this.orbitAroundNode.bind(this);
        
        this.initialize();
    }

    /**
     * Initialize the navigation manager
     */
    initialize() {
        const initialMode = this.config.get('navigationMode') || 'manual';
        this.setMode(initialMode);
        
        // Listen for configuration changes
        this.config.addListener('navigationMode', (key, newMode) => {
            this.setMode(newMode);
        });
    }

    /**
     * Set the navigation mode
     * @param {string} mode - Navigation mode ('manual', 'automatic', 'static')
     */
    setMode(mode) {
        if (this.currentMode === mode) return;
        
        // Clean up previous mode
        this.cleanup();
        
        this.currentMode = mode;
        
        switch (mode) {
            case 'manual':
                this.enableManualMode();
                break;
            case 'automatic':
                this.enableAutomaticMode();
                break;
            case 'static':
                this.enableStaticMode();
                break;
            default:
                console.warn(`Unknown navigation mode: ${mode}`);
                this.enableManualMode();
                break;
        }
        
        console.log(`Navigation mode changed to: ${mode}`);
    }

    /**
     * Enable manual navigation mode (default behavior)
     */
    enableManualMode() {
        // Enable Three.js navigation controls
        const graph = this.visualizer.getGraphInstance();
        if (graph) {
            graph.enableNavigationControls(true);
        }
    }

    /**
     * Enable static navigation mode (no user controls)
     */
    enableStaticMode() {
        // Disable Three.js navigation controls
        const graph = this.visualizer.getGraphInstance();
        if (graph) {
            graph.enableNavigationControls(false);
        }
    }

    /**
     * Enable automatic navigation mode (random node selection with orbit)
     */
    enableAutomaticMode() {
        // Disable Three.js navigation controls to prevent user interference
        const graph = this.visualizer.getGraphInstance();
        if (graph) {
            graph.enableNavigationControls(false);
        }
        
        // Start automatic node selection
        this.startAutomaticSelection();
    }

    /**
     * Start automatic node selection timer
     */
    startAutomaticSelection() {
        // Select first node immediately
        this.selectRandomNode();
        
        // Set up timer for subsequent selections
        const interval = this.config.get('automaticNodeSelectionInterval');
        this.automaticTimer = setInterval(this.handleAutomaticMode, interval);
    }

    /**
     * Handle automatic mode timer tick
     */
    handleAutomaticMode() {
        if (this.currentMode !== 'automatic') return;
        
        this.selectRandomNode();
    }

    /**
     * Select a random node and focus on it
     */
    selectRandomNode() {
        const graphData = this.behaviorController.graphData;
        if (!graphData || !graphData.nodes || graphData.nodes.length === 0) {
            console.warn('No nodes available for automatic selection');
            return;
        }
        
        // Select a random node
        const randomIndex = Math.floor(Math.random() * graphData.nodes.length);
        const selectedNode = graphData.nodes[randomIndex];
        
        if (selectedNode) {
            // Use the same pathway as user clicks for consistent behavior
            this.behaviorController.focusOnNode(selectedNode);
            
            // Start orbiting around the selected node
            this.startOrbitingNode(selectedNode);
        }
    }

    /**
     * Start orbiting around a node
     * @param {Object} node - Node to orbit around
     */
    startOrbitingNode(node) {
        if (this.currentMode !== 'automatic') return;
        
        // Stop any existing orbit
        this.stopOrbiting();
        
        this.currentOrbitNode = node;
        this.orbitStartTime = Date.now();
        this.isOrbiting = true;
        
        // Start orbit animation
        this.orbitAroundNode();
    }

    /**
     * Orbit camera around the current node
     */
    orbitAroundNode() {
        if (!this.isOrbiting || !this.currentOrbitNode || this.currentMode !== 'automatic') {
            return;
        }
        
        const currentTime = Date.now();
        const elapsedTime = (currentTime - this.orbitStartTime) / 1000; // Convert to seconds
        const orbitDuration = this.config.get('automaticOrbitDuration');
        
        // Check if we should stop orbiting (timer will handle node switching)
        if (elapsedTime >= orbitDuration) {
            this.stopOrbiting();
            return;
        }
        
        // Calculate orbit parameters
        const orbitSpeed = this.config.get('automaticOrbitSpeed');
        const angle = (elapsedTime * orbitSpeed * 2 * Math.PI) % (2 * Math.PI);
        const distance = this.config.get('automaticOrbitDistance') || 40;
        
        // Calculate camera position in orbit
        const nodeX = this.currentOrbitNode.x || 0;
        const nodeY = this.currentOrbitNode.y || 0;
        const nodeZ = this.currentOrbitNode.z || 0;
        
        // Create circular orbit in XZ plane
        const orbitRadius = distance;
        const cameraX = nodeX + orbitRadius * Math.cos(angle);
        const cameraY = nodeY + orbitRadius * 0.3 * Math.sin(angle * 2); // Slight Y variation
        const cameraZ = nodeZ + orbitRadius * Math.sin(angle);
        
        // Set camera position to orbit around node
        const graph = this.visualizer.getGraphInstance();
        if (graph) {
            graph.cameraPosition(
                { x: cameraX, y: cameraY, z: cameraZ },
                this.currentOrbitNode,
                100 // Short transition time for smooth orbit
            );
        }
        
        // Continue orbiting
        this.orbitAnimationId = requestAnimationFrame(this.orbitAroundNode);
    }

    /**
     * Stop orbiting animation
     */
    stopOrbiting() {
        this.isOrbiting = false;
        if (this.orbitAnimationId) {
            cancelAnimationFrame(this.orbitAnimationId);
            this.orbitAnimationId = null;
        }
        this.currentOrbitNode = null;
        this.orbitStartTime = null;
    }

    /**
     * Clean up current mode
     */
    cleanup() {
        // Clear automatic timer
        if (this.automaticTimer) {
            clearInterval(this.automaticTimer);
            this.automaticTimer = null;
        }
        
        // Stop orbiting
        this.stopOrbiting();
        
        // Re-enable navigation controls (will be disabled again if needed)
        const graph = this.visualizer.getGraphInstance();
        if (graph) {
            graph.enableNavigationControls(true);
        }
    }

    /**
     * Get current navigation mode
     * @returns {string} Current mode
     */
    getMode() {
        return this.currentMode;
    }

    /**
     * Check if currently in automatic mode
     * @returns {boolean} True if in automatic mode
     */
    isAutomatic() {
        return this.currentMode === 'automatic';
    }

    /**
     * Check if currently orbiting
     * @returns {boolean} True if orbiting
     */
    isCurrentlyOrbiting() {
        return this.isOrbiting;
    }

    /**
     * Get current orbit node
     * @returns {Object|null} Current orbit node or null
     */
    getCurrentOrbitNode() {
        return this.currentOrbitNode;
    }

    /**
     * Pause automatic mode (useful for user interactions)
     */
    pause() {
        if (this.currentMode === 'automatic') {
            this.cleanup();
        }
    }

    /**
     * Resume automatic mode
     */
    resume() {
        if (this.currentMode === 'automatic') {
            this.enableAutomaticMode();
        }
    }

    /**
     * Update configuration settings
     * @param {string} key - Configuration key
     * @param {*} value - New value
     */
    updateConfig(key, value) {
        // Handle configuration changes that affect navigation
        if (key === 'automaticNodeSelectionInterval' && this.currentMode === 'automatic') {
            // Restart timer with new interval
            this.cleanup();
            this.enableAutomaticMode();
        }
        // Note: automaticOrbitSpeed and automaticOrbitDistance changes take effect immediately
        // during the next orbit animation frame, no restart needed
    }

    /**
     * Dispose of the navigation manager
     */
    dispose() {
        this.cleanup();
        
        // Remove configuration listeners
        this.config.removeListener('navigationMode', this.setMode);
        
        // Clear references
        this.config = null;
        this.visualizer = null;
        this.behaviorController = null;
    }
}