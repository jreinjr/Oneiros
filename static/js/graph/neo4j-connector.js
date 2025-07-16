/**
 * Neo4j Connector module
 * Handles connection and queries to Neo4j database
 */

// Global mapping between original_id and graph node id
window.neo4jIdMapping = {
    originalToId: {},  // Maps original_id -> node.id (Neo4j ID)
    idToOriginal: {}   // Maps node.id (Neo4j ID) -> original_id
};

/**
 * Fetch Neo4j configuration from server
 * @returns {Promise<Object>} Neo4j config
 */
async function fetchNeo4jConfig() {
    try {
        const response = await fetch('/api/neo4j-config');
        return await response.json();
    } catch (error) {
        console.error('Failed to fetch Neo4j config, using defaults:', error);
        return {
            uri: 'neo4j://127.0.0.1:7687',
            username: 'neo4j',
            password: 'neo4j'
        };
    }
}

/**
 * Create Neo4j driver instance
 * @returns {Promise<Object>} Neo4j driver
 */
export async function createDriver() {
    const config = await fetchNeo4jConfig();
    return neo4j.driver(
        config.uri,
        neo4j.auth.basic(config.username, config.password)
    );
}

/**
 * Fetch Quote nodes and SAME_AUTHOR relationships from Neo4j
 * @param {string|null} tagFilter - Optional tag to filter quotes by ('truth', 'beauty', 'love', or null for all)
 * @returns {Promise<Object>} Graph data with nodes and links
 */
export async function fetchBeliefGraph(tagFilter = null) {
    const config = await fetchNeo4jConfig();
    console.log(`Loading from Neo4j database at: ${config.uri}`);
    
    const driver = await createDriver();
    const session = driver.session();
    
    try {
        // Clear previous mappings
        window.neo4jIdMapping.originalToId = {};
        window.neo4jIdMapping.idToOriginal = {};
        
        // Build query based on whether we're filtering by tag
        let quotesQuery = `MATCH (q:Quote)`;
        if (tagFilter) {
            quotesQuery += ` WHERE $tag IN q.tags`;
        }
        quotesQuery += ` RETURN q`;
        
        // Get Quote nodes (filtered or all)
        const quotesResult = await session.run(quotesQuery, { tag: tagFilter });
        
        // Get node IDs for relationship query
        const nodeIds = quotesResult.records.map(record => 
            record.get('q').identity.toNumber()
        );
        
        // Get SAME_AUTHOR relationships only between the filtered nodes
        let relationshipsQuery = `
            MATCH (q1:Quote)-[r:SAME_AUTHOR]-(q2:Quote)
            WHERE id(q1) < id(q2)`;
        
        if (tagFilter) {
            relationshipsQuery += ` AND id(q1) IN $nodeIds AND id(q2) IN $nodeIds`;
        }
        
        // Return Neo4j IDs for relationships
        relationshipsQuery += ` 
            RETURN id(q1) as source, 
                   id(q2) as target`;
        
        const relationshipsResult = await session.run(relationshipsQuery, tagFilter ? { nodeIds } : {});
        
        const quotes = quotesResult.records.map(record => record.get('q'));
        const relationships = relationshipsResult.records.map(record => ({
            source: record.get('source').toNumber(),
            target: record.get('target').toNumber()
        }));
        
        // Transform Neo4j nodes to visualization format
        const nodes = quotes.map(quote => {
            const neo4jId = quote.identity.toNumber();
            const originalId = quote.properties.original_id;
            
            // Build ID mappings
            if (originalId) {
                window.neo4jIdMapping.originalToId[originalId] = neo4jId;
                window.neo4jIdMapping.idToOriginal[neo4jId] = originalId;
            }
            
            return {
                // Always use Neo4j ID as the primary node ID
                id: neo4jId,
                original_id: originalId, // Store original_id as a property
                quote: quote.properties.text || quote.properties.quote || 'No text available',
                author: quote.properties.author_name || quote.properties.author || 'Unknown',
                tags: quote.properties.tags || [],
                // Add connections set for compatibility with existing code
                connections: new Set()
            };
        });
        
        // Create a map for quick node lookup by Neo4j ID
        const nodeMap = new Map();
        nodes.forEach(node => {
            nodeMap.set(node.id, node);
        });
        
        // Transform relationships to links and update connections
        const links = [];
        
        relationships.forEach(rel => {
            const sourceNode = nodeMap.get(rel.source);
            const targetNode = nodeMap.get(rel.target);
            
            if (sourceNode && targetNode) {
                // Update connections sets
                sourceNode.connections.add(targetNode.id);
                targetNode.connections.add(sourceNode.id);
                
                links.push({
                    source: sourceNode.id,
                    target: targetNode.id
                });
            }
        });
        
        const filterInfo = tagFilter ? ` (filtered by tag: ${tagFilter})` : ' (no filter)';
        console.log(`Database loaded successfully from: ${config.uri}`);
        console.log(`Loaded ${nodes.length} nodes and ${links.length} relationships${filterInfo}`);
        console.log(`ID mapping created with ${Object.keys(window.neo4jIdMapping.originalToId).length} entries`);
        
        return { nodes, links };
        
    } catch (error) {
        console.error('Error fetching belief graph from Neo4j:', error);
        throw error;
    } finally {
        await session.close();
        await driver.close();
    }
}

/**
 * Fetch all Quote nodes and SAME_AUTHOR relationships from Neo4j (no filtering)
 * @returns {Promise<Object>} Graph data with nodes and links
 */
export async function fetchAllBeliefGraph() {
    return fetchBeliefGraph(null);
}

/**
 * Test Neo4j connection
 * @returns {Promise<boolean>} True if connection successful
 */
export async function testConnection() {
    const driver = await createDriver();
    const session = driver.session();
    
    try {
        await session.run('RETURN 1');
        console.log('Neo4j connection successful');
        return true;
    } catch (error) {
        console.error('Neo4j connection failed:', error);
        return false;
    } finally {
        await session.close();
        await driver.close();
    }
}
