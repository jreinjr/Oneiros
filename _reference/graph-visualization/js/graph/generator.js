/**
 * Graph data generation module
 * Handles creation of nodes and links with various algorithms
 */

/**
 * Generate graph data with nodes and links
 * @param {Object} config - Configuration object
 * @returns {Object} Graph data with nodes and links arrays
 */
export function generateGraph(config) {
    const { nodeCount, connectionDensity } = config;
    
    const nodes = generateNodes(nodeCount);
    const links = generateLinks(nodes, connectionDensity);
    
    return { nodes, links };
}

/**
 * Generate nodes array
 * @param {number} nodeCount - Number of nodes to create
 * @returns {Array} Array of node objects
 */
export function generateNodes(nodeCount) {
    const nodes = [];
    
    for (let i = 0; i < nodeCount; i++) {
        nodes.push({
            id: i,
            connections: new Set()
        });
    }
    
    return nodes;
}

/**
 * Generate links array ensuring connectivity
 * @param {Array} nodes - Array of node objects
 * @param {number} density - Connection density (0-1)
 * @returns {Array} Array of link objects
 */
export function generateLinks(nodes, density) {
    const links = [];
    const nodeCount = nodes.length;
    
    // Create a spanning tree to ensure connectivity
    const spanningTreeLinks = createSpanningTree(nodes);
    links.push(...spanningTreeLinks);
    
    // Add additional random connections based on density
    const additionalLinks = createRandomLinks(nodes, density, links);
    links.push(...additionalLinks);
    
    return links;
}

/**
 * Create a spanning tree to ensure graph connectivity
 * @param {Array} nodes - Array of node objects
 * @returns {Array} Array of link objects forming a spanning tree
 */
export function createSpanningTree(nodes) {
    const links = [];
    const nodeCount = nodes.length;
    
    if (nodeCount <= 1) return links;
    
    // Create spanning tree using random connections
    for (let i = 1; i < nodeCount; i++) {
        const target = Math.floor(Math.random() * i);
        const link = { source: i, target: target };
        
        links.push(link);
        nodes[i].connections.add(target);
        nodes[target].connections.add(i);
    }
    
    return links;
}

/**
 * Create additional random links based on density
 * @param {Array} nodes - Array of node objects
 * @param {number} density - Connection density (0-1)
 * @param {Array} existingLinks - Already created links to avoid duplicates
 * @returns {Array} Array of additional link objects
 */
export function createRandomLinks(nodes, density, existingLinks = []) {
    const links = [];
    const nodeCount = nodes.length;
    
    if (nodeCount <= 1) return links;
    
    // Calculate maximum possible additional links
    const maxPossibleLinks = (nodeCount * (nodeCount - 1)) / 2;
    const existingLinkCount = existingLinks.length;
    const maxAdditionalLinks = Math.floor((maxPossibleLinks - existingLinkCount) * density);
    
    let additionalLinks = 0;
    let attempts = 0;
    const maxAttempts = maxAdditionalLinks * 10; // Prevent infinite loops
    
    while (additionalLinks < maxAdditionalLinks && attempts < maxAttempts) {
        const source = Math.floor(Math.random() * nodeCount);
        const target = Math.floor(Math.random() * nodeCount);
        
        attempts++;
        
        // Skip if same node or connection already exists
        if (source === target || nodes[source].connections.has(target)) {
            continue;
        }
        
        const link = { source, target };
        links.push(link);
        
        nodes[source].connections.add(target);
        nodes[target].connections.add(source);
        additionalLinks++;
    }
    
    return links;
}

/**
 * Validate graph connectivity
 * @param {Object} graphData - Graph data with nodes and links
 * @returns {boolean} True if graph is connected
 */
export function isGraphConnected(graphData) {
    const { nodes, links } = graphData;
    
    if (nodes.length <= 1) return true;
    
    // Build adjacency list
    const adjacencyList = new Map();
    nodes.forEach(node => adjacencyList.set(node.id, new Set()));
    
    links.forEach(link => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        
        adjacencyList.get(sourceId).add(targetId);
        adjacencyList.get(targetId).add(sourceId);
    });
    
    // BFS to check connectivity
    const visited = new Set();
    const queue = [nodes[0].id];
    visited.add(nodes[0].id);
    
    while (queue.length > 0) {
        const currentId = queue.shift();
        const neighbors = adjacencyList.get(currentId);
        
        for (const neighborId of neighbors) {
            if (!visited.has(neighborId)) {
                visited.add(neighborId);
                queue.push(neighborId);
            }
        }
    }
    
    return visited.size === nodes.length;
}

/**
 * Get graph statistics
 * @param {Object} graphData - Graph data with nodes and links
 * @returns {Object} Statistics object
 */
export function getGraphStats(graphData) {
    const { nodes, links } = graphData;
    
    const nodeCount = nodes.length;
    const linkCount = links.length;
    const maxPossibleLinks = (nodeCount * (nodeCount - 1)) / 2;
    const density = maxPossibleLinks > 0 ? linkCount / maxPossibleLinks : 0;
    
    // Calculate degree distribution
    const degrees = nodes.map(node => node.connections.size);
    const minDegree = Math.min(...degrees);
    const maxDegree = Math.max(...degrees);
    const avgDegree = degrees.reduce((sum, degree) => sum + degree, 0) / nodeCount;
    
    return {
        nodeCount,
        linkCount,
        density,
        isConnected: isGraphConnected(graphData),
        degrees: {
            min: minDegree,
            max: maxDegree,
            average: avgDegree
        }
    };
}

/**
 * Generate graph with specific topology
 * @param {string} topology - Topology type ('random', 'smallWorld', 'scaleFree')
 * @param {Object} config - Configuration object
 * @returns {Object} Graph data
 */
export function generateGraphWithTopology(topology, config) {
    switch (topology) {
        case 'smallWorld':
            return generateSmallWorldGraph(config);
        case 'scaleFree':
            return generateScaleFreeGraph(config);
        case 'random':
        default:
            return generateGraph(config);
    }
}

/**
 * Generate small-world graph (Watts-Strogatz model)
 * @param {Object} config - Configuration object
 * @returns {Object} Graph data
 */
export function generateSmallWorldGraph(config) {
    const { nodeCount, connectionDensity } = config;
    const nodes = generateNodes(nodeCount);
    const links = [];
    
    // Start with a ring lattice
    const k = Math.max(2, Math.floor(nodeCount * connectionDensity * 2)); // Average degree
    
    for (let i = 0; i < nodeCount; i++) {
        for (let j = 1; j <= k / 2; j++) {
            const target = (i + j) % nodeCount;
            if (i !== target) {
                links.push({ source: i, target });
                nodes[i].connections.add(target);
                nodes[target].connections.add(i);
            }
        }
    }
    
    // Rewire with probability (simplified version)
    const rewireProb = 0.1;
    const linksToRewire = links.filter(() => Math.random() < rewireProb);
    
    linksToRewire.forEach(link => {
        const newTarget = Math.floor(Math.random() * nodeCount);
        if (newTarget !== link.source && !nodes[link.source].connections.has(newTarget)) {
            // Remove old connection
            nodes[link.source].connections.delete(link.target);
            nodes[link.target].connections.delete(link.source);
            
            // Add new connection
            link.target = newTarget;
            nodes[link.source].connections.add(newTarget);
            nodes[newTarget].connections.add(link.source);
        }
    });
    
    return { nodes, links };
}

/**
 * Generate scale-free graph (simplified Barabási-Albert model)
 * @param {Object} config - Configuration object
 * @returns {Object} Graph data
 */
export function generateScaleFreeGraph(config) {
    const { nodeCount, connectionDensity } = config;
    const nodes = generateNodes(nodeCount);
    const links = [];
    
    if (nodeCount < 2) return { nodes, links };
    
    const m = Math.max(1, Math.floor(connectionDensity * 10)); // Links per new node
    
    // Start with a small complete graph
    const initialNodes = Math.min(m + 1, nodeCount);
    for (let i = 0; i < initialNodes; i++) {
        for (let j = i + 1; j < initialNodes; j++) {
            links.push({ source: i, target: j });
            nodes[i].connections.add(j);
            nodes[j].connections.add(i);
        }
    }
    
    // Add remaining nodes with preferential attachment
    for (let i = initialNodes; i < nodeCount; i++) {
        const degrees = nodes.slice(0, i).map(node => node.connections.size);
        const totalDegree = degrees.reduce((sum, degree) => sum + degree, 0);
        
        const targets = new Set();
        let attempts = 0;
        
        while (targets.size < Math.min(m, i) && attempts < i * 2) {
            attempts++;
            let randomValue = Math.random() * totalDegree;
            
            for (let j = 0; j < i; j++) {
                randomValue -= degrees[j];
                if (randomValue <= 0 && !targets.has(j)) {
                    targets.add(j);
                    break;
                }
            }
        }
        
        // Create links to selected targets
        targets.forEach(target => {
            links.push({ source: i, target });
            nodes[i].connections.add(target);
            nodes[target].connections.add(i);
        });
    }
    
    return { nodes, links };
}
