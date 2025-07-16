/**
 * Neo4j Connector module
 * Handles connection and queries to Neo4j database
 */

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
        
        // Return original_id if available, otherwise Neo4j ID
        relationshipsQuery += ` 
            RETURN COALESCE(q1.original_id, id(q1)) as source, 
                   COALESCE(q2.original_id, id(q2)) as target,
                   q1.original_id as source_original,
                   q2.original_id as target_original,
                   id(q1) as source_neo4j,
                   id(q2) as target_neo4j`;
        
        console.log('Relationship query:', relationshipsQuery);
        const relationshipsResult = await session.run(relationshipsQuery, tagFilter ? { nodeIds } : {});
        
        const quotes = quotesResult.records.map(record => record.get('q'));
        const relationships = relationshipsResult.records.map(record => ({
            source: record.get('source'),
            target: record.get('target'),
            // Debug fields
            source_original: record.get('source_original'),
            target_original: record.get('target_original'),
            source_neo4j: record.get('source_neo4j'),
            target_neo4j: record.get('target_neo4j')
        }));
        
        // Debug logging
        console.log(`Raw relationships from Neo4j: ${relationshipsResult.records.length}`);
        console.log('First 5 relationships with debug info:', relationships.slice(0, 5));
        
        // Transform Neo4j nodes to visualization format
        const nodes = quotes.map(quote => {
            const originalId = quote.properties.original_id;
            const neo4jId = quote.identity.toNumber();
            const nodeId = originalId || neo4jId;
            
            return {
                // Use original_id if available, otherwise fall back to Neo4j identity
                id: nodeId,
                neo4j_id: neo4jId, // Keep Neo4j ID for internal use
                original_id: originalId, // Keep original ID for debugging
                quote: quote.properties.text || quote.properties.quote || 'No text available',
                author: quote.properties.author_name || quote.properties.author || 'Unknown',
                tags: quote.properties.tags || [],
                // Add connections set for compatibility with existing code
                connections: new Set()
            };
        });
        
        // Log ID distribution for debugging
        const hasOriginalId = nodes.filter(n => n.original_id).length;
        console.log(`Nodes with original_id: ${hasOriginalId}/${nodes.length}`);
        
        // Log first few node IDs for debugging
        console.log('First 5 nodes:', nodes.slice(0, 5).map(n => ({
            id: n.id,
            neo4j_id: n.neo4j_id,
            original_id: n.original_id,
            id_type: typeof n.id
        })));
        
        // Create a map for quick node lookup by both original_id and neo4j_id
        const nodeMap = new Map();
        const nodeByNeo4jId = new Map();
        
        nodes.forEach(node => {
            // Add both the ID and its string version to handle type mismatches
            nodeMap.set(node.id, node);
            nodeMap.set(String(node.id), node);
            
            if (node.neo4j_id) {
                nodeByNeo4jId.set(node.neo4j_id, node);
                nodeByNeo4jId.set(String(node.neo4j_id), node);
            }
        });
        
        console.log(`Node maps created - nodeMap size: ${nodeMap.size}, nodeByNeo4jId size: ${nodeByNeo4jId.size}`);
        
        // Transform relationships to links and update connections
        const links = [];
        const skippedLinks = [];
        
        console.log(`Processing ${relationships.length} relationships...`);
        
        relationships.forEach((rel, index) => {
            // Handle both regular numbers and Neo4j Integer objects
            const sourceId = typeof rel.source === 'object' ? rel.source.toNumber() : rel.source;
            const targetId = typeof rel.target === 'object' ? rel.target.toNumber() : rel.target;
            
            if (index < 5) {
                console.log(`Relationship ${index}: source=${sourceId} (type: ${typeof sourceId}), target=${targetId} (type: ${typeof targetId})`);
            }
            
            // Try to find nodes by original_id first, then by neo4j_id
            // Also try string/number conversions since original_id might be stored as string
            let sourceNode = nodeMap.get(sourceId) || 
                           nodeMap.get(String(sourceId)) || 
                           nodeMap.get(Number(sourceId)) ||
                           nodeByNeo4jId.get(sourceId) ||
                           nodeByNeo4jId.get(String(sourceId)) ||
                           nodeByNeo4jId.get(Number(sourceId));
                           
            let targetNode = nodeMap.get(targetId) || 
                           nodeMap.get(String(targetId)) || 
                           nodeMap.get(Number(targetId)) ||
                           nodeByNeo4jId.get(targetId) ||
                           nodeByNeo4jId.get(String(targetId)) ||
                           nodeByNeo4jId.get(Number(targetId));
            
            if (sourceNode && targetNode) {
                // Update connections sets using the node's primary ID
                sourceNode.connections.add(targetNode.id);
                targetNode.connections.add(sourceNode.id);
                
                links.push({
                    source: sourceNode.id,
                    target: targetNode.id
                });
            } else {
                // Log skipped relationships for debugging
                if (index < 5) {
                    console.log(`Could not find nodes: sourceNode=${!!sourceNode}, targetNode=${!!targetNode}`);
                }
                skippedLinks.push({ source: sourceId, target: targetId });
            }
        });
        
        if (skippedLinks.length > 0) {
            console.warn(`Skipped ${skippedLinks.length} relationships due to missing nodes:`, skippedLinks);
        }
        
        const filterInfo = tagFilter ? ` (filtered by tag: ${tagFilter})` : ' (no filter)';
        console.log(`Database loaded successfully from: ${config.uri}`);
        console.log(`Loaded ${nodes.length} nodes and ${links.length} relationships${filterInfo}`);
        
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
