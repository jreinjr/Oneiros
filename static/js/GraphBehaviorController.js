/**
 * Graph Behavior Controller
 * Main orchestrator that coordinates graph visualization and UI components
 */

import { config, THEME_COLORS } from './config.js';
import { generateGraph } from './graph/generator.js';
import { fetchBeliefGraph } from './graph/neo4j-connector.js';
import { GraphVisualizer } from './graph/visualizer.js';
import { ControlsManager } from './ui/controls.js';
import { PopupManager } from './ui/popup.js';
import { LoggerManager } from './ui/logger.js';

/**
 * Main controller class for graph behaviors
 */
export class GraphBehaviorController {
    constructor() {
        // Core components
        this.config = config;
        this.visualizer = null;
        
        // UI components
        this.controls = null;
        this.popup = null;
        this.logger = null;
        
        // State
        this.graphData = { nodes: [], links: [] };
        this.currentNode = null;
        
        this.initialize();
    }

    /**
     * Initialize all components and set up the application
     */
    async initialize() {
        try {
            // Load saved settings from JSON first
            await this.config.loadAllSettings();
            
            // Initialize visualizer
            this.visualizer = new GraphVisualizer('3d-graph', this.config);
            
            // Initialize UI components
            this.controls = new ControlsManager(this.config);
            this.popup = new PopupManager(this.visualizer, this.config);
            this.logger = new LoggerManager(this.config);
            
            // Update all controls to match loaded settings
            this.controls.updateAllControlsFromConfig();
            
            // Set up event handlers
            this.setupEventHandlers();
            
            // Set up UI handlers
            this.setupUIHandlers();
            
            // Sync initial theme with server
            await this.syncInitialTheme();
            
            // Generate initial graph
            this.generateGraph();
            
            // Initialize colors
            this.updateBackgroundColor();
            this.updatePopupColors();
            this.updateLogColors();
            
            console.log('Graph Behavior Controller initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Graph Behavior Controller:', error);
        }
    }

    /**
     * Set up event handlers for all components
     */
    setupEventHandlers() {
        // Visualizer events
        this.visualizer.setNodeClickCallback((node, event) => {
            this.handleNodeClick(node, event);
        });

        // Control events
        this.setupControlCallbacks();

        // Configuration change events
        this.setupConfigurationListeners();
    }

    /**
     * Set up UI handlers for theme toggle and minimize button
     */
    setupUIHandlers() {
        // Minimize button
        const minimizeBtn = document.getElementById('minimizeBtn');
        const controlsPanel = document.getElementById('controls-panel');
        
        if (minimizeBtn && controlsPanel) {
            minimizeBtn.addEventListener('click', () => {
                controlsPanel.classList.toggle('minimized');
                minimizeBtn.textContent = controlsPanel.classList.contains('minimized') ? '+' : '−';
            });
        }
        
        // Theme toggle buttons
        const themeButtons = document.querySelectorAll('.theme-btn');
        themeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const theme = btn.dataset.theme;
                this.setTheme(theme);
                
                // Update active button
                themeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }
    
    /**
     * Sync initial theme with server
     */
    async syncInitialTheme() {
        const currentTheme = this.config.get('currentTheme');
        try {
            // First, load saved colors from file
            await this.config.applySavedColors(currentTheme);
            
            // Update color controls to match loaded colors
            this.controls.updateColorControlsFromConfig();
            
            // Then, try to set the server theme to match frontend
            const response = await fetch('/api/set-theme', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ theme: currentTheme })
            });
            
            if (!response.ok) {
                console.error('Failed to sync initial theme with server');
            } else {
                console.log(`Initial theme synced with server: ${currentTheme}`);
            }
        } catch (error) {
            console.error('Error syncing initial theme with server:', error);
        }
    }
    
    /**
     * Set the current theme
     * @param {string} theme - Theme name ('truth', 'beauty', 'love')
     */
    async setTheme(theme) {
        // Update config
        this.config.set('currentTheme', theme);
        
        // Save all settings including the new theme
        await this.config.saveAllSettings();
        
        // Sync theme with server
        try {
            const response = await fetch('/api/set-theme', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ theme: theme })
            });
            
            if (!response.ok) {
                console.error('Failed to sync theme with server');
            }
        } catch (error) {
            console.error('Error syncing theme with server:', error);
        }
        
        // Apply saved colors or default colors
        await this.config.applySavedColors(theme);
        
        // Update body class for CSS styling
        document.body.className = `theme-${theme}`;
        
        // Update color controls to match new theme
        this.controls.updateColorControlsFromConfig();
        
        // Refresh visuals
        this.visualizer.refreshVisuals();
        this.updateBackgroundColor();
        this.updatePopupColors();
        this.updateLogColors();
    }

    /**
     * Set up control panel callbacks
     */
    setupControlCallbacks() {
        // Graph regeneration (random)
        this.controls.setCallback('regenerateGraph', () => {
            this.generateGraph();
        });

        // Belief graph generation
        this.controls.setCallback('generateBeliefGraph', () => {
            this.generateBeliefGraph();
        });

        // Configuration changes that need immediate response
        this.controls.setCallback('nodeSize', (controlId, value) => {
            this.visualizer.updateConfig(controlId, value);
        });

        this.controls.setCallback('nodeDistance', (controlId, value) => {
            this.visualizer.updateConfig(controlId, value);
        });

        this.controls.setCallback('connectionThickness', (controlId, value) => {
            this.visualizer.updateConfig(controlId, value);
        });

        this.controls.setCallback('highlightSteps', (controlId, value) => {
            this.updateHighlights();
            if (this.currentNode) {
                this.logNodeConnection(this.currentNode);
            }
        });


        this.controls.setCallback('messageDuration', (controlId, value) => {
            this.logger.setMessageDuration(value);
        });

        this.controls.setCallback('typingSpeed', (controlId, value) => {
            this.logger.setTypingSpeed(value);
        });

        // Feature toggle callbacks
        this.controls.setCallback('poetryLogEnabled', (controlId, value) => {
            this.handlePoetryLogToggle(value);
        });

        this.controls.setCallback('nodePopupEnabled', (controlId, value) => {
            this.handleNodePopupToggle(value);
        });
        
        // Camera mode callbacks
        this.controls.setCallback('cameraModeChanged', (controlId, mode) => {
            this.handleCameraModeChange(mode);
        });
        
        // Dreaming mode parameter callbacks
        ['dreamOrbitRadius', 'dreamOrbitDuration', 'dreamOrbitSpeed', 
         'dreamTransitionDuration', 'haikuOrbitRadius', 'haikuOrbitSpeed', 'haikuTransitionDuration', 'haikuDistanceMultiplier'].forEach(param => {
            this.controls.setCallback(param, (controlId, value) => {
                this.visualizer.updateCameraAnimatorConfig(controlId, value);
            });
        });
        
        // Popup offset callbacks
        ['popupOffsetX', 'popupOffsetY'].forEach(param => {
            this.controls.setCallback(param, (controlId, value) => {
                if (this.popup) {
                    this.popup.updatePosition();
                }
            });
        });
        
        // Camera target position callbacks
        ['cameraTargetX', 'cameraTargetY'].forEach(param => {
            this.controls.setCallback(param, (controlId, value) => {
                this.visualizer.updateCameraAnimatorConfig(controlId, value);
            });
        });

        // Message processing mode callbacks
        this.controls.setCallback('userResponseModeChanged', (controlId, value) => {
            this.handleProcessingModeChange('user', value);
        });

        this.controls.setCallback('screenTextModeChanged', (controlId, value) => {
            this.handleProcessingModeChange('screen', value);
        });

        // Color control callbacks
        this.controls.setCallback('colorChanged', (controlId, data) => {
            this.handleColorChange(data.colorKey, data.colorValue);
        });

    }

    /**
     * Set up configuration change listeners
     */
    setupConfigurationListeners() {
        // Listen for configuration changes that affect visualization
        const visualKeys = ['nodeSize', 'nodeDistance', 'connectionThickness'];
        visualKeys.forEach(key => {
            this.config.addListener(key, (configKey, newValue) => {
                this.visualizer.updateConfig(configKey, newValue);
            });
        });
    }

    /**
     * Generate new graph data
     */
    generateGraph() {
        const graphConfig = {
            nodeCount: this.config.get('nodeCount'),
            connectionDensity: this.config.get('connectionDensity')
        };

        this.graphData = generateGraph(graphConfig);
        this.visualizer.setGraphData(this.graphData);
        
        // Clear current selection
        this.currentNode = null;
        this.popup.hide();
        this.logger.clear();
        
        console.log(`Generated graph with ${this.graphData.nodes.length} nodes and ${this.graphData.links.length} links`);
    }

    /**
     * Generate belief graph from Neo4j
     */
    async generateBeliefGraph() {
        try {
            console.log('Fetching belief graph from Neo4j...');
            
            // Get current theme to filter by tag
            const currentTheme = this.config.get('currentTheme');
            const tagFilter = currentTheme; // 'truth', 'beauty', or 'love'
            
            this.graphData = await fetchBeliefGraph(tagFilter);
            this.visualizer.setGraphData(this.graphData);
            
            // Clear current selection
            this.currentNode = null;
            this.popup.hide();
            this.logger.clear();
            
            console.log(`Loaded belief graph with ${this.graphData.nodes.length} quotes and ${this.graphData.links.length} SAME_AUTHOR relationships (filtered by ${tagFilter})`);
            
        } catch (error) {
            console.error('Failed to load belief graph:', error);
            alert('Failed to connect to Neo4j database. Please ensure Neo4j is running and the credentials are correct.');
        }
    }

    /**
     * Handle node click events
     * @param {Object} node - Clicked node
     * @param {Event} event - Mouse event
     */
    handleNodeClick(node, event) {
        // Check if this is from camera animator (dreaming/haiku mode selection)
        const isFromCameraAnimator = event && event.fromCameraAnimator;
        const orbitDuration = event && event.orbitDuration;
        
        // Only zoom camera in manual mode and for actual clicks (not animator selections)
        const cameraMode = this.config.get('cameraMode');
        const shouldZoom = cameraMode === 'manual' && !isFromCameraAnimator;
        
        this.focusOnNode(node, shouldZoom, orbitDuration);
    }

    /**
     * Focus on a specific node
     * @param {Object} node - Node to focus on
     * @param {boolean} zoomCamera - Whether to zoom camera to the node (default: true)
     * @param {number} orbitDuration - Actual orbit duration for this node (optional)
     */
    focusOnNode(node, zoomCamera = true, orbitDuration) {
        const previousNode = this.currentNode;
        this.currentNode = node;
        this.updateHighlights();
        
        // Show popup only if enabled
        if (this.config.get('nodePopupEnabled')) {
            this.popup.show(node, orbitDuration);
        }
        
        // Animate camera to focus on the node only if requested
        if (zoomCamera) {
            this.visualizer.focusCameraOnNode(node);
        }
        
        // Only log if it's a different node and logging is enabled
        if (!previousNode || previousNode.id !== node.id) {
            this.logNodeConnection(node);
        }
    }

    /**
     * Update node and link highlights
     */
    updateHighlights() {
        if (!this.currentNode) {
            this.visualizer.clearSelection();
            return;
        }

        const highlightSteps = this.config.get('highlightSteps');
        this.visualizer.setCurrentNode(this.currentNode, highlightSteps);
    }

    /**
     * Log node connection information
     * @param {Object} node - Node to log
     */
    logNodeConnection(node) {
        if (!node) return;
        
        // Only log if poetry log is enabled
        if (!this.config.get('poetryLogEnabled')) {
            return;
        }

        // Check if this is a Quote node with quote text
        if (node.quote) {
            // Add the quote text with animation
            this.logger.addQuoteEntry(node.quote, node.author);
        } else {
            // Regular node - show connections
            const highlightSteps = this.config.get('highlightSteps');
            const nodesMap = this.visualizer.getNodesWithinSteps(node, highlightSteps);
            this.logger.addEntry(node, nodesMap);
        }
    }

    /**
     * Handle color change from color controls
     * @param {string} colorKey - Color key that changed
     * @param {string} colorValue - New color value
     */
    handleColorChange(colorKey, colorValue) {
        // Refresh visuals for node and link colors
        if (colorKey.includes('Node') || colorKey.includes('Link')) {
            this.visualizer.refreshVisuals();
        }
        
        // Update background color
        if (colorKey === 'graphBackground') {
            this.updateBackgroundColor();
        }
        
        // Update popup colors
        if (colorKey.includes('popup')) {
            this.updatePopupColors();
        }
        
        // Update log colors
        if (colorKey.includes('log')) {
            this.updateLogColors();
        }
    }

    /**
     * Save current palette to localStorage
     */

    /**
     * Update graph background color
     */
    updateBackgroundColor() {
        const backgroundColor = this.config.get('colors.graphBackground');
        if (backgroundColor) {
            // Update the three.js scene background
            if (this.visualizer) {
                this.visualizer.updateBackgroundColor(backgroundColor);
            }
            
            // Also update the HTML elements for consistency
            document.body.style.backgroundColor = backgroundColor;
            const graphContainer = document.getElementById('graph-container');
            if (graphContainer) {
                graphContainer.style.backgroundColor = backgroundColor;
            }
        }
    }


    /**
     * Update log colors
     */
    updateLogColors() {
        if (this.logger) {
            this.logger.updateLogColors();
        }
    }

    /**
     * Handle processing mode change
     * @param {string} type - Type of processing ('user' or 'screen')
     * @param {string} mode - New mode ('echo', 'llm', 'quote', 'rag')
     */
    async handleProcessingModeChange(type, mode) {
        try {
            const settingsData = {};
            if (type === 'user') {
                settingsData.user_response_mode = mode;
            } else if (type === 'screen') {
                settingsData.screen_text_mode = mode;
            }
            
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(settingsData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const result = await response.json();
            console.log(`Updated ${type} processing mode to ${mode}:`, result);
            
        } catch (error) {
            console.error('Error updating processing mode:', error);
        }
    }

    /**
     * Handle poetry log toggle
     * @param {boolean} enabled - Whether poetry log is enabled
     */
    handlePoetryLogToggle(enabled) {
        if (this.logger) {
            this.logger.setVisible(enabled);
        }
        console.log(`Poetry log ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Handle node popup toggle
     * @param {boolean} enabled - Whether node popup is enabled
     */
    handleNodePopupToggle(enabled) {
        if (!enabled && this.popup) {
            this.popup.hide();
        }
        console.log(`Node popup ${enabled ? 'enabled' : 'disabled'}`);
    }

    /**
     * Update popup colors
     */
    updatePopupColors() {
        if (this.popup) {
            this.popup.updateColors();
        }
    }

    /**
     * Handle API message transition from Dreaming to Haiku mode
     * @param {Array} messages - Array of message objects from API
     */
    handleAPIMessageTransition(messages) {
        // Store the messages for processing
        this.pendingMessages = messages;
        
        // Extract node IDs from the first message that has them
        let nodePositions = null;
        console.log('[Haiku Debug] Processing messages for node positions:', messages);
        if (messages && messages.length > 0) {
            console.log('[Haiku Debug] First message structure:', messages[0]);
            console.log('[Haiku Debug] Message content:', messages[0].message);
            if (messages[0].message && messages[0].message.metadata) {
                console.log('[Haiku Debug] Metadata:', messages[0].message.metadata);
                console.log('[Haiku Debug] Nodes in metadata:', messages[0].message.metadata.nodes);
                console.log('[Haiku Debug] Number of nodes:', messages[0].message.metadata.nodes ? messages[0].message.metadata.nodes.length : 0);
            }
        }
        for (const msg of messages) {
            if (msg.message && msg.message.metadata && msg.message.metadata.nodes && 
                msg.message.metadata.nodes.length >= 1) {  // Changed from >= 2 to >= 1
                const nodeIds = msg.message.metadata.nodes;
                console.log('[Haiku Debug] Processing nodes array with length:', nodeIds.length);
                console.log('[Haiku Debug] Found node IDs in metadata:', nodeIds);
                if (this.visualizer && window.neo4jIdMapping) {
                    console.log('[Haiku Debug] neo4jIdMapping exists, checking mappings...');
                    console.log('[Haiku Debug] Available mappings:', Object.keys(window.neo4jIdMapping.originalToId));
                    const originalId1 = nodeIds[0];
                    const originalId2 = nodeIds[1];
                    const graphId1 = window.neo4jIdMapping.originalToId[originalId1];
                    const graphId2 = window.neo4jIdMapping.originalToId[originalId2];
                    console.log('[Haiku Debug] Mapped IDs:', { originalId1, originalId2, graphId1, graphId2 });
                    
                    // Handle case where we have 2 nodes
                    if (nodeIds.length >= 2 && graphId1 && graphId2) {
                        // Get the actual node objects
                        const node1 = this.graphData.nodes.find(n => n.id == graphId1);
                        const node2 = this.graphData.nodes.find(n => n.id == graphId2);
                        
                        if (node1 && node2) {
                            nodePositions = [
                                { x: node1.x || 0, y: node1.y || 0, z: node1.z || 0 },
                                { x: node2.x || 0, y: node2.y || 0, z: node2.z || 0 }
                            ];
                            console.log('[Haiku Debug] Found 2 node positions:', nodePositions);
                            break; // Found nodes, stop looking
                        } else {
                            console.log('[Haiku Debug] Could not find nodes in graph data', { node1, node2 });
                        }
                    } 
                    // Handle case where we only have 1 node
                    else if (nodeIds.length === 1 && graphId1) {
                        const node1 = this.graphData.nodes.find(n => n.id == graphId1);
                        if (node1) {
                            // For single node, duplicate the position so camera centers on it
                            nodePositions = [
                                { x: node1.x || 0, y: node1.y || 0, z: node1.z || 0 },
                                { x: node1.x || 0, y: node1.y || 0, z: node1.z || 0 }
                            ];
                            console.log('[Haiku Debug] Found 1 node, using its position:', nodePositions);
                            break;
                        }
                    }
                }
            }
        }
        
        // 1. Fade out node popup
        if (this.popup) {
            this.popup.fadeOut();
        }
        
        // 2. Transition to Haiku mode with camera movement
        console.log('[Haiku Debug] Transitioning to Haiku mode with positions:', nodePositions);
        this.transitionToHaikuMode(nodePositions, () => {
            // This callback is called when camera transition completes
            
            // 3. Process runtime edges immediately after camera arrives
            messages.forEach(msg => {
                if (msg.message && msg.message.metadata && msg.message.metadata.nodes && 
                    msg.message.metadata.nodes.length >= 2) {
                    const nodeIds = msg.message.metadata.nodes;
                    if (this.visualizer && window.neo4jIdMapping) {
                        const originalId1 = nodeIds[0];
                        const originalId2 = nodeIds[1];
                        const graphId1 = window.neo4jIdMapping.originalToId[originalId1];
                        const graphId2 = window.neo4jIdMapping.originalToId[originalId2];
                        
                        if (graphId1 && graphId2) {
                            this.visualizer.addRuntimeEdge(graphId1, graphId2);
                            console.log(`Added runtime edge between nodes ${graphId1} and ${graphId2}`);
                        }
                    }
                }
            });
            
            // 4. After 1 second, enable poetry log and fade up overlay
            setTimeout(() => {
                // Enable Poetry Log just before showing overlay
                this.config.set('poetryLogEnabled', true);
                this.controls.updateCheckboxFromConfig('poetryLogEnabled');
                this.handlePoetryLogToggle(true);
                
                if (this.logger) {
                    this.logger.showOverlay();
                }
                
                // 5. After 1 more second, start typewriter animation
                setTimeout(() => {
                    messages.forEach(msg => {
                        if (msg.message && msg.message.content) {
                            this.addLogMessage(msg.message, 'info');
                        }
                    });
                    
                    // 6. After message duration, return to Dreaming mode
                    const messageDuration = this.config.get('messageDuration') * 1000; // Convert to ms
                    setTimeout(() => {
                        this.returnToDreamingMode();
                    }, messageDuration);
                    
                }, 1000); // 1 second after overlay
            }, 1000); // 1 second after camera transition
        });
    }
    
    /**
     * Transition to Haiku mode with proper callback
     * @param {Array|null} nodePositions - Array of two node positions for camera targeting
     * @param {Function} onComplete - Callback when transition completes
     */
    transitionToHaikuMode(nodePositions, onComplete) {
        // Set camera mode to haiku but with special handling
        this.config.set('cameraMode', 'haiku');
        this.controls.setCameraMode('haiku');
        
        // Disable manual controls if we were in manual mode
        const previousMode = this.currentCameraMode || 'manual';
        if (previousMode === 'manual') {
            this.visualizer.enableManualControls(false);
        }
        
        // Start haiku mode with callback and node positions
        this.visualizer.startHaikuModeWithCallback(nodePositions, onComplete);
        
        // Disable Node Popup immediately
        this.config.set('nodePopupEnabled', false);
        this.controls.updateCheckboxFromConfig('nodePopupEnabled');
        this.handleNodePopupToggle(false);
        
        // Don't enable Poetry Log yet - it will be enabled when the overlay shows
        // This prevents the log panel from appearing before the overlay
        
        this.currentCameraMode = 'haiku';
    }
    
    /**
     * Return to Dreaming mode after message display
     */
    returnToDreamingMode() {
        // Hide overlay first
        if (this.logger) {
            this.logger.hideOverlay();
        }
        
        // Clear log entries
        if (this.logger) {
            this.logger.clear();
        }
        
        // Switch back to dreaming mode
        this.config.set('cameraMode', 'dreaming');
        this.controls.setCameraMode('dreaming');
        this.handleCameraModeChange('dreaming');
    }

    /**
     * Handle camera mode change
     * @param {string} mode - Camera mode (manual, dreaming, haiku)
     */
    handleCameraModeChange(mode) {
        // Track the previous mode to determine if we're entering/leaving manual mode
        const previousMode = this.currentCameraMode || 'manual';
        this.currentCameraMode = mode;
        
        switch(mode) {
            case 'manual':
                this.visualizer.stopDreamingMode();
                // Only enable manual controls if we weren't already in manual mode
                if (previousMode !== 'manual') {
                    this.visualizer.enableManualControls(true);
                }
                break;
            case 'dreaming':
                // Only disable manual controls if we were in manual mode
                if (previousMode === 'manual') {
                    this.visualizer.enableManualControls(false);
                }
                // Enable Node Popup, disable Poetry Log BEFORE starting dream mode
                // This ensures the popup is ready when the first node is selected
                this.config.set('nodePopupEnabled', true);
                this.config.set('poetryLogEnabled', false);
                this.controls.updateCheckboxFromConfig('nodePopupEnabled');
                this.controls.updateCheckboxFromConfig('poetryLogEnabled');
                this.handleNodePopupToggle(true);
                this.handlePoetryLogToggle(false);
                // Now start dreaming mode which will select a node
                this.visualizer.startDreamingMode();
                // If there's a current node from previous mode, show popup for it
                if (this.currentNode && this.popup) {
                    this.popup.show(this.currentNode);
                }
                break;
            case 'haiku':
                // Only disable manual controls if we were in manual mode
                if (previousMode === 'manual') {
                    this.visualizer.enableManualControls(false);
                }
                this.visualizer.startHaikuMode();
                // Enable Poetry Log, disable Node Popup
                this.config.set('poetryLogEnabled', true);
                this.config.set('nodePopupEnabled', false);
                this.controls.updateCheckboxFromConfig('poetryLogEnabled');
                this.controls.updateCheckboxFromConfig('nodePopupEnabled');
                this.handlePoetryLogToggle(true);
                this.handleNodePopupToggle(false);
                break;
        }
        console.log(`Camera mode changed from ${previousMode} to ${mode}`);
    }
    /**
     * Set application state
     * @param {Object} state - State to restore
     */
    setState(state) {
        if (state.configuration) {
            this.config.update(state.configuration, false);
        }

        if (state.graphData) {
            this.graphData = state.graphData;
            this.visualizer.setGraphData(this.graphData);
        }

        if (state.currentNode) {
            this.focusOnNode(state.currentNode);
        }
    }

    /**
     * Export current state as JSON
     * @returns {string} JSON string of current state
     */
    exportState() {
        return JSON.stringify({
            timestamp: new Date().toISOString(),
            version: '1.0.0',
            state: this.getState()
        }, null, 2);
    }

    /**
     * Import state from JSON
     * @param {string} jsonString - JSON string to import
     * @returns {boolean} Whether import was successful
     */
    importState(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            if (data.state) {
                this.setState(data.state);
                return true;
            }
        } catch (error) {
            console.error('Failed to import state:', error);
        }
        return false;
    }

    /**
     * Get graph statistics
     * @returns {Object} Graph statistics
     */
    getGraphStats() {
        const nodeCount = this.graphData.nodes.length;
        const linkCount = this.graphData.links.length;
        const maxPossibleLinks = (nodeCount * (nodeCount - 1)) / 2;
        const density = maxPossibleLinks > 0 ? linkCount / maxPossibleLinks : 0;

        return {
            nodeCount,
            linkCount,
            density: Math.round(density * 1000) / 1000,
            currentNode: this.currentNode?.id || null
        };
    }

    /**
     * Add custom behavior
     * @param {string} name - Behavior name
     * @param {Object} behavior - Behavior instance
     */
    addBehavior(name, behavior) {
        if (!this.customBehaviors) {
            this.customBehaviors = new Map();
        }
        this.customBehaviors.set(name, behavior);
    }

    /**
     * Remove custom behavior
     * @param {string} name - Behavior name
     */
    removeBehavior(name) {
        if (this.customBehaviors && this.customBehaviors.has(name)) {
            const behavior = this.customBehaviors.get(name);
            if (behavior.dispose) {
                behavior.dispose();
            }
            this.customBehaviors.delete(name);
        }
    }

    /**
     * Get custom behavior
     * @param {string} name - Behavior name
     * @returns {Object|null} Behavior instance or null
     */
    getBehavior(name) {
        return this.customBehaviors?.get(name) || null;
    }

    /**
     * Add a custom message to the logger
     * @param {string|Object} message - Message to add to the logger (string or structured object)
     * @param {string} type - Type of message ('info', 'warning', 'error')
     */
    addLogMessage(message, type = 'info') {
        if (!this.logger) return;
        
        // Handle structured message objects from the message processor
        if (typeof message === 'object' && message.content) {
            let displayText = message.content;
            let author = null;
            
            // Format based on message type
            switch(message.type) {
                case 'quote':
                    // For quote type, format with author
                    if (message.author) {
                        author = message.author;
                    }
                    break;
                case 'llm':
                    // For LLM generated content, just display as is
                    break;
                case 'rag':
                    // For RAG content, could include context info if desired
                    if (message.context_author) {
                        // Optionally show the source quote in a subtle way
                        // For now, just show the generated content
                    }
                    break;
                case 'echo':
                    // Echo just displays the content as is
                    break;
                default:
                    // Any other type, display content as is
                    break;
            }
            
            // Skip runtime edge creation here - it's already handled in handleAPIMessageTransition
            // This prevents duplicate edge creation between the same nodes
            
            // Use the logger's quote entry method if we have an author
            if (author) {
                this.logger.addQuoteEntry(displayText, author);
            } else {
                this.logger.addCustomEntry(displayText, type);
            }
        } else {
            // Backward compatibility for string messages
            this.logger.addCustomEntry(message, type);
        }
    }

    /**
     * Get the logger instance
     * @returns {LoggerManager|null} Logger instance
     */
    getLogger() {
        return this.logger;
    }

    /**
     * Dispose of the controller and clean up all resources
     */
    dispose() {
        // Dispose UI components
        if (this.controls) {
            this.controls.dispose();
        }
        if (this.popup) {
            this.popup.dispose();
        }
        if (this.logger) {
            this.logger.dispose();
        }

        // Dispose visualizer
        if (this.visualizer) {
            this.visualizer.dispose();
        }

        // Dispose custom behaviors
        if (this.customBehaviors) {
            this.customBehaviors.forEach(behavior => {
                if (behavior.dispose) {
                    behavior.dispose();
                }
            });
            this.customBehaviors.clear();
        }

        // Clear references
        this.config = null;
        this.visualizer = null;
        this.controls = null;
        this.popup = null;
        this.logger = null;
        this.graphData = { nodes: [], links: [] };
        this.currentNode = null;

        console.log('Graph Behavior Controller disposed');
    }
}
