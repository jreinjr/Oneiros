/**
 * Neo4j Connector module
 * Handles connection and queries to Neo4j database
 */

/**
 * Neo4j connection configuration
 */
const NEO4J_CONFIG = {
    uri: 'neo4j://127.0.0.1:7687',
    username: 'neo4j',
    password: '#$ER34er'
};

/**
 * Create Neo4j driver instance
 * @returns {Object} Neo4j driver
 */
export function createDriver() {
    return neo4j.driver(
        NEO4J_CONFIG.uri,
        neo4j.auth.basic(NEO4J_CONFIG.username, NEO4J_CONFIG.password)
    );
}

/**
 * Fetch Quote nodes and SAME_AUTHOR relationships from Neo4j
 * @param {string|null} tagFilter - Optional tag to filter quotes by ('truth', 'beauty', 'love', or null for all)
 * @returns {Promise<Object>} Graph data with nodes and links
 */
export async function fetchBeliefGraph(tagFilter = null) {
    const driver = createDriver();
    const session = driver.session();
    
    try {
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
        
        relationshipsQuery += ` RETURN id(q1) as source, id(q2) as target`;
        
        const relationshipsResult = await session.run(relationshipsQuery, { nodeIds });
        
        const quotes = quotesResult.records.map(record => record.get('q'));
        const relationships = relationshipsResult.records.map(record => ({
            source: record.get('source'),
            target: record.get('target')
        }));
        
        // Transform Neo4j nodes to visualization format
        const nodes = quotes.map(quote => ({
            id: quote.identity.toNumber(),
            quote: quote.properties.text || quote.properties.quote || 'No text available',
            author: quote.properties.author_name || quote.properties.author || 'Unknown',
            tags: quote.properties.tags || [],
            // Add connections set for compatibility with existing code
            connections: new Set()
        }));
        
        // Create a map for quick node lookup
        const nodeMap = new Map(nodes.map(node => [node.id, node]));
        
        // Transform relationships to links and update connections
        const links = relationships.map(rel => {
            const sourceId = rel.source.toNumber();
            const targetId = rel.target.toNumber();
            
            // Update connections sets
            const sourceNode = nodeMap.get(sourceId);
            const targetNode = nodeMap.get(targetId);
            if (sourceNode && targetNode) {
                sourceNode.connections.add(targetId);
                targetNode.connections.add(sourceId);
            }
            
            return {
                source: sourceId,
                target: targetId
            };
        });
        
        const filterInfo = tagFilter ? ` (filtered by tag: ${tagFilter})` : '';
        console.log(`Fetched ${nodes.length} quotes with ${links.length} SAME_AUTHOR relationships${filterInfo}`);
        
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
    const driver = createDriver();
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
