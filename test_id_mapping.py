#!/usr/bin/env python3
"""
Test script to verify the ID mapping is working correctly
"""

import asyncio
from neo4j import GraphDatabase
import json

async def test_id_mapping():
    # Neo4j connection
    driver = GraphDatabase.driver(
        "neo4j://127.0.0.1:7687",
        auth=("neo4j", "#$ER34er")
    )
    
    with driver.session() as session:
        # Check if original_id exists on quotes
        result = session.run("""
            MATCH (q:Quote)
            WHERE q.original_id IS NOT NULL
            RETURN count(q) as count, 
                   collect(q.original_id)[0..5] as sample_original_ids,
                   collect(id(q))[0..5] as sample_neo4j_ids
            LIMIT 1
        """)
        
        record = result.single()
        print(f"Quotes with original_id: {record['count']}")
        print(f"Sample original_ids: {record['sample_original_ids']}")
        print(f"Sample neo4j_ids: {record['sample_neo4j_ids']}")
        
        # Test quote handler response
        from message_processor.handlers import QuoteHandler
        from sentence_transformers import SentenceTransformer
        
        model = SentenceTransformer('all-MiniLM-L6-v2')
        handler = QuoteHandler({
            'uri': 'neo4j://127.0.0.1:7687',
            'username': 'neo4j',
            'password': '#$ER34er'
        }, model)
        
        result = await handler.process("What is love?", None)
        print("\nQuote handler result:")
        print(json.dumps(result, indent=2))
        
        handler.close()
    
    driver.close()

if __name__ == "__main__":
    asyncio.run(test_id_mapping())