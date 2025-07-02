/**
 * 3D Graph Visualizer module
 * Handles 3D Force Graph setup and visual management
 */

/**
 * 3D Graph Visualizer class
 */
export class GraphVisualizer {
    constructor(containerId, config) {
        this.containerId = containerId;
        this.config = config;
        this.graph = null;
        this.graphData = { nodes: [], links: [] };
        
        // Visual state
        this.currentNode = null;
        this.highlightedNodes = new Set();
        this.highlightedLinks = new Set();
        
        // Event callbacks
        this.onNodeClick = null;
        this.onNodeHover = null;
        
        this.initialize();
    }

    /**
     * Initialize the 3D Force Graph
     */
    initialize() {
        this.graph = new ForceGraph3D(document.getElementById(this.containerId))
            .enableNodeDrag(false)
            .enableNavigationControls(false)
            .showNavInfo(false)
            .nodeLabel('id')
            .nodeColor(node => this.getNodeColor(node))
            .nodeVal(node => this.getNodeSize(node))
            .linkColor(link => this.getLinkColor(link))
            .linkWidth(link => this.getLinkWidth(link))
            .linkOpacity(link => this.getLinkOpacity(link))
            .onNodeClick((node, event) => {
                if (this.onNodeClick) {
                    this.onNodeClick(node, event);
                }
            })
            .onNodeHover((node, prevNode) => {
                if (this.onNodeHover) {
                    this.onNodeHover(node, prevNode);
                }
            });
    }

    /**
     * Set graph data and update visualization
     * @param {Object} graphData - Graph data with nodes and links
     */
    setGraphData(graphData) {
        this.graphData = graphData;
        this.graph.graphData(graphData);
        this.updateForces();
    }

    /**
     * Update force simulation parameters
     */
    updateForces() {
        const nodeDistance = this.config.get('nodeDistance');
        
        // Apply node distance configuration
        this.graph.d3Force('charge').strength(-nodeDistance);
        this.graph.d3Force('link').distance(nodeDistance * 0.5);
    }

    /**
     * Set current selected node and update highlights
     * @param {Object} node - Selected node
     * @param {number} highlightSteps - Number of steps to highlight
     */
    setCurrentNode(node, highlightSteps = 1) {
        this.currentNode = node;
        this.updateHighlights(highlightSteps);
        this.refreshVisuals();
    }

    /**
     * Clear current selection
     */
    clearSelection() {
        this.currentNode = null;
        this.highlightedNodes.clear();
        this.highlightedLinks.clear();
        this.refreshVisuals();
    }

    /**
     * Update node and link highlights based on current selection
     * @param {number} steps - Number of steps to highlight from current node
     */
    updateHighlights(steps) {
        this.highlightedNodes.clear();
        this.highlightedLinks.clear();
        
        if (!this.currentNode) return;
        
        // If steps is 0, only highlight the current node (no connections)
        if (steps === 0) {
            return;
        }
        
        // Get nodes within N steps
        const nodesMap = this.getNodesWithinSteps(this.currentNode, steps);
        
        // Add all nodes within N steps to highlighted set
        for (const [distance, nodes] of nodesMap) {
            if (distance > 0) { // Don't include the current node itself
                nodes.forEach(node => this.highlightedNodes.add(node.id));
            }
        }
        
        // Find all links that connect highlighted nodes or connect to current node
        this.graphData.links.forEach(link => {
            const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
            const targetId = typeof link.target === 'object' ? link.target.id : link.target;
            
            if ((sourceId === this.currentNode.id && this.highlightedNodes.has(targetId)) ||
                (targetId === this.currentNode.id && this.highlightedNodes.has(sourceId)) ||
                (this.highlightedNodes.has(sourceId) && this.highlightedNodes.has(targetId))) {
                const linkKey = `${Math.min(sourceId, targetId)}-${Math.max(sourceId, targetId)}`;
                this.highlightedLinks.add(linkKey);
            }
        });
    }

    /**
     * Get nodes within specified number of steps from a starting node
     * @param {Object} startNode - Starting node
     * @param {number} steps - Maximum number of steps
     * @returns {Map} Map of distance to array of nodes
     */
    getNodesWithinSteps(startNode, steps) {
        const visited = new Set();
        const nodesAtDistance = new Map();
        const queue = [{ node: startNode, distance: 0 }];
        
        visited.add(startNode.id);
        nodesAtDistance.set(0, [startNode]);
        
        while (queue.length > 0) {
            const { node, distance } = queue.shift();
            
            if (distance < steps) {
                for (const neighborId of node.connections) {
                    if (!visited.has(neighborId)) {
                        visited.add(neighborId);
                        const neighborNode = this.graphData.nodes.find(n => n.id === neighborId);
                        if (neighborNode) {
                            queue.push({ node: neighborNode, distance: distance + 1 });
                            
                            if (!nodesAtDistance.has(distance + 1)) {
                                nodesAtDistance.set(distance + 1, []);
                            }
                            nodesAtDistance.get(distance + 1).push(neighborNode);
                        }
                    }
                }
            }
        }
        
        return nodesAtDistance;
    }

    /**
     * Get node color based on state
     * @param {Object} node - Node object
     * @returns {string} Color string
     */
    getNodeColor(node) {
        const colors = this.config.get('colors');
        
        if (node.id === (this.currentNode?.id)) {
            return colors.selectedNode;
        }
        if (this.highlightedNodes.has(node.id)) {
            return colors.highlightedNode;
        }
        return colors.defaultNode;
    }

    /**
     * Get node size based on state
     * @param {Object} node - Node object
     * @returns {number} Node size
     */
    getNodeSize(node) {
        const baseSize = this.config.get('nodeSize');
        
        if (node.id === (this.currentNode?.id)) {
            return baseSize * 2;
        }
        if (this.highlightedNodes.has(node.id)) {
            return baseSize * 1.5;
        }
        return baseSize;
    }

    /**
     * Get link color based on state
     * @param {Object} link - Link object
     * @returns {string} Color string
     */
    getLinkColor(link) {
        const colors = this.config.get('colors');
        const linkKey = this.getLinkKey(link);
        
        return this.highlightedLinks.has(linkKey) ? colors.highlightedLink : colors.defaultLink;
    }

    /**
     * Get link width based on state
     * @param {Object} link - Link object
     * @returns {number} Link width
     */
    getLinkWidth(link) {
        const baseWidth = this.config.get('connectionThickness');
        const linkKey = this.getLinkKey(link);
        
        return this.highlightedLinks.has(linkKey) ? baseWidth * 3 : baseWidth;
    }

    /**
     * Get link opacity based on state
     * @param {Object} link - Link object
     * @returns {number} Link opacity
     */
    getLinkOpacity(link) {
        const linkKey = this.getLinkKey(link);
        return this.highlightedLinks.has(linkKey) ? 0.8 : 0.3;
    }

    /**
     * Generate unique key for a link
     * @param {Object} link - Link object
     * @returns {string} Link key
     */
    getLinkKey(link) {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        return `${Math.min(sourceId, targetId)}-${Math.max(sourceId, targetId)}`;
    }

    /**
     * Refresh visual properties
     */
    refreshVisuals() {
        // Trigger visual update by reassigning the same functions
        this.graph.nodeColor(this.graph.nodeColor());
        this.graph.nodeVal(this.graph.nodeVal());
        this.graph.linkColor(this.graph.linkColor());
        this.graph.linkWidth(this.graph.linkWidth());
        this.graph.linkOpacity(this.graph.linkOpacity());
    }

    /**
     * Update configuration and refresh visuals
     * @param {string} key - Configuration key that changed
     * @param {*} value - New value
     */
    updateConfig(key, value) {
        switch (key) {
            case 'nodeSize':
            case 'connectionThickness':
                this.refreshVisuals();
                break;
            case 'nodeDistance':
                this.updateForces();
                break;
            default:
                // Handle other config changes if needed
                break;
        }
    }


    /**
     * Get screen coordinates for a 3D point
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {number} z - Z coordinate
     * @returns {Object} Screen coordinates
     */
    getScreenCoords(x, y, z) {
        return this.graph.graph2ScreenCoords(x, y, z);
    }

    /**
     * Set node click callback
     * @param {Function} callback - Callback function
     */
    setNodeClickCallback(callback) {
        this.onNodeClick = callback;
    }

    /**
     * Set node hover callback
     * @param {Function} callback - Callback function
     */
    setNodeHoverCallback(callback) {
        this.onNodeHover = callback;
    }

    /**
     * Get the underlying 3D Force Graph instance
     * @returns {Object} 3D Force Graph instance
     */
    getGraphInstance() {
        return this.graph;
    }

    /**
     * Dispose of the visualizer and clean up resources
     */
    dispose() {
        if (this.graph) {
            // Clean up any resources if needed
            this.graph = null;
        }
        this.graphData = { nodes: [], links: [] };
        this.currentNode = null;
        this.highlightedNodes.clear();
        this.highlightedLinks.clear();
    }
}
