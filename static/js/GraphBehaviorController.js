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
            // Initialize visualizer
            this.visualizer = new GraphVisualizer('3d-graph', this.config);
            
            // Initialize UI components
            this.controls = new ControlsManager(this.config);
            this.popup = new PopupManager(this.visualizer);
            this.logger = new LoggerManager(this.config);
            
            // Set up event handlers
            this.setupEventHandlers();
            
            // Set up UI handlers
            this.setupUIHandlers();
            
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
     * Set the current theme
     * @param {string} theme - Theme name ('truth', 'beauty', 'love')
     */
    setTheme(theme) {
        // Update config
        this.config.set('currentTheme', theme);
        
        // Apply saved colors or default colors
        this.config.applySavedColors(theme);
        
        // Update body class for CSS styling
        document.body.className = `theme-${theme}`;
        
        // Update color controls to match new theme
        this.controls.updateColorControlsFromConfig();
        
        // Refresh visuals
        this.visualizer.refreshVisuals();
        this.updateBackgroundColor();
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

        this.controls.setCallback('savePalette', () => {
            this.savePalette();
        });

        this.controls.setCallback('resetPalette', () => {
            this.resetPalette();
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
        this.focusOnNode(node);
    }

    /**
     * Focus on a specific node
     * @param {Object} node - Node to focus on
     */
    focusOnNode(node) {
        const previousNode = this.currentNode;
        this.currentNode = node;
        this.updateHighlights();
        this.popup.show(node);
        
        // Animate camera to focus on the node
        this.visualizer.focusCameraOnNode(node);
        
        // Only log if it's a different node
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
    savePalette() {
        const currentTheme = this.config.get('currentTheme');
        this.config.saveThemeColors(currentTheme);
        console.log(`Saved palette for theme: ${currentTheme}`);
        
        // Visual feedback
        this.logger.addCustomEntry(`Saved ${currentTheme} palette`, 'info');
    }

    /**
     * Reset palette to default colors
     */
    resetPalette() {
        const currentTheme = this.config.get('currentTheme');
        const defaultColors = THEME_COLORS[currentTheme];
        if (defaultColors) {
            this.config.set('colors', defaultColors);
            this.controls.updateColorControlsFromConfig();
            this.visualizer.refreshVisuals();
            this.updateBackgroundColor();
            this.updatePopupColors();
            this.updateLogColors();
            
            console.log(`Reset palette for theme: ${currentTheme}`);
            this.logger.addCustomEntry(`Reset ${currentTheme} palette to default`, 'info');
        }
    }

    /**
     * Update graph background color
     */
    updateBackgroundColor() {
        const backgroundColor = this.config.get('colors.graphBackground');
        if (backgroundColor) {
            document.body.style.backgroundColor = backgroundColor;
            const graphContainer = document.getElementById('graph-container');
            if (graphContainer) {
                graphContainer.style.backgroundColor = backgroundColor;
            }
        }
    }

    /**
     * Update popup colors
     */
    updatePopupColors() {
        const colors = this.config.get('colors');
        const popup = document.getElementById('node-popup');
        if (popup && colors) {
            popup.style.setProperty('background-color', colors.popupBackground || 'rgba(0, 0, 0, 0.9)', 'important');
            popup.style.setProperty('border-color', colors.popupPrimary || '#4CAF50', 'important');
            // Create rgba shadow color
            const shadowColor = colors.popupPrimary ? this.hexToRgba(colors.popupPrimary, 0.3) : 'rgba(76, 175, 80, 0.3)';
            popup.style.setProperty('box-shadow', `0 4px 20px ${shadowColor}`, 'important');
            
            const title = document.getElementById('node-popup-title');
            if (title) {
                title.style.setProperty('color', colors.popupPrimary || '#4CAF50', 'important');
            }
            
            const name = document.getElementById('node-popup-name');
            if (name) {
                name.style.setProperty('color', colors.popupSecondary || '#fff', 'important');
            }
        }
    }

    /**
     * Update log colors
     */
    updateLogColors() {
        const colors = this.config.get('colors');
        const logPanel = document.getElementById('poetry-log');
        if (logPanel && colors) {
            logPanel.style.setProperty('background-color', colors.logBackground || 'rgba(0, 0, 0, 0.8)', 'important');
            logPanel.style.setProperty('border-color', colors.logPrimary || '#4CAF50', 'important');
            
            const logTitle = document.querySelector('.log-title');
            if (logTitle) {
                logTitle.style.setProperty('color', colors.logPrimary || '#4CAF50', 'important');
            }

            // Update log entries too
            const logEntries = document.querySelectorAll('.log-entry');
            const entryBackground = colors.logPrimary ? this.hexToRgba(colors.logPrimary, 0.1) : 'rgba(76, 175, 80, 0.1)';
            logEntries.forEach(entry => {
                entry.style.setProperty('background', entryBackground, 'important');
                entry.style.setProperty('border-left-color', colors.logPrimary || '#4CAF50', 'important');
            });
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
     * Convert hex color to rgba
     * @param {string} hex - Hex color
     * @param {number} alpha - Alpha value
     * @returns {string} RGBA color
     */
    hexToRgba(hex, alpha) {
        const r = parseInt(hex.substr(1, 2), 16);
        const g = parseInt(hex.substr(3, 2), 16);
        const b = parseInt(hex.substr(5, 2), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    /**
     * Get current application state
     * @returns {Object} Current state
     */
    getState() {
        return {
            graphData: this.graphData,
            currentNode: this.currentNode,
            configuration: this.config.getAll()
        };
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
