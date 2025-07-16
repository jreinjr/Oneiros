"""
Message Processing Handlers

Different handlers for processing messages:
- EchoHandler: Return input unchanged
- LLMHandler: Process through local LLM (via Ollama)
- QuoteHandler: Vector search for top matching quote
- RAGHandler: Vector search + LLM processing of result
"""

import logging
import json
from typing import Dict, Any, Optional
from abc import ABC, abstractmethod
import aiohttp
from sentence_transformers import SentenceTransformer
from neo4j import GraphDatabase

logger = logging.getLogger(__name__)


class BaseHandler(ABC):
    """Base class for all message handlers"""
    
    @abstractmethod
    async def process(self, message: str, theme: Optional[str] = None) -> Dict[str, Any]:
        """Process the message and return result"""
        pass


class EchoHandler(BaseHandler):
    """Handler that returns the input message unchanged"""
    
    async def process(self, message: str, theme: Optional[str] = None) -> Dict[str, Any]:
        """Return the message unchanged"""
        return {
            "type": "echo",
            "content": message,
            "source": "user_input"
        }


class LLMHandler(BaseHandler):
    """Handler that processes messages through local LLM via Ollama"""
    
    def __init__(self, ollama_config: Dict[str, Any]):
        self.endpoint = ollama_config.get('endpoint', 'http://localhost:11434')
        self.model = ollama_config.get('model', 'llama3.2:1b')
        self.prompt_template = ollama_config.get('prompt_template', 
            'You are a haiku generation tool. Write a haiku inspired by the following message: "{message}" ONLY return the haiku and NOTHING else, no conversational pleasantries.')
        self.timeout = ollama_config.get('timeout', 30)
        
    async def process(self, message: str, theme: Optional[str] = None) -> Dict[str, Any]:
        """Process message through LLM"""
        try:
            prompt = self.prompt_template.format(message=message)
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.endpoint}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "stream": False,
                        "options": {
                            "temperature": 0.8,
                            "max_tokens": 100
                        }
                    },
                    timeout=aiohttp.ClientTimeout(total=self.timeout)
                ) as response:
                    
                    if response.status != 200:
                        raise Exception(f"Ollama API error: {response.status}")
                    
                    data = await response.json()
                    content = data.get('response', '').strip()
                    
                    if not content:
                        raise Exception("Empty response from LLM")
                    
                    return {
                        "type": "llm",
                        "content": content,
                        "source": "ollama",
                        "model": self.model,
                        "prompt": prompt
                    }
                    
        except Exception as e:
            logger.error(f"LLM processing failed: {e}")
            # Fallback to echo on error
            return {
                "type": "llm_error",
                "content": message,
                "source": "fallback_echo",
                "error": str(e)
            }


class QuoteHandler(BaseHandler):
    """Handler that searches for similar quotes using vector search"""
    
    def __init__(self, neo4j_config: Dict[str, Any], sentence_model: Optional[SentenceTransformer] = None):
        self.neo4j_uri = neo4j_config.get('uri', 'neo4j://127.0.0.1:7687')
        self.neo4j_username = neo4j_config.get('username', 'neo4j')
        self.neo4j_password = neo4j_config.get('password', '#$ER34er')
        self.driver = GraphDatabase.driver(
            self.neo4j_uri, 
            auth=(self.neo4j_username, self.neo4j_password)
        )
        
        # Use provided model or initialize new one
        if sentence_model is not None:
            self.model = sentence_model
        else:
            try:
                self.model = SentenceTransformer('all-MiniLM-L6-v2')
            except Exception as e:
                logger.error(f"Failed to load sentence transformer: {e}")
                self.model = None
    
    async def process(self, message: str, theme: Optional[str] = None) -> Dict[str, Any]:
        """Find similar quote using vector search"""
        if not self.model:
            return {
                "type": "quote_error",
                "content": message,
                "source": "fallback_echo",
                "error": "Sentence transformer model not available"
            }
        
        try:
            # Generate embedding for the message
            query_embedding = self.model.encode(message).tolist()
            
            with self.driver.session() as session:
                # Check if vector index exists and has data
                index_check = session.run("""
                    MATCH (q:Quote)
                    WHERE q.embedding IS NOT NULL
                    RETURN count(q) as count
                """).single()
                
                if index_check['count'] == 0:
                    return {
                        "type": "quote_error",
                        "content": message,
                        "source": "fallback_echo",
                        "error": "No quotes with embeddings found"
                    }
                
                # Query vector index for most similar quotes
                # If theme is provided, filter by it
                if theme:
                    results = session.run("""
                        CALL db.index.vector.queryNodes('quote_embeddings', 10, $embedding)
                        YIELD node, score
                        WHERE $theme IN node.tags
                        MATCH (node)-[:WRITTEN_BY]->(a:Author)
                        RETURN node.text as quote, a.name as author, node.tags as tags, score, 
                               COALESCE(node.original_id, id(node)) as node_id
                        ORDER BY score DESC
                        LIMIT 2
                    """, embedding=query_embedding, theme=theme).data()
                else:
                    results = session.run("""
                        CALL db.index.vector.queryNodes('quote_embeddings', 2, $embedding)
                        YIELD node, score
                        MATCH (node)-[:WRITTEN_BY]->(a:Author)
                        RETURN node.text as quote, a.name as author, node.tags as tags, score, 
                               COALESCE(node.original_id, id(node)) as node_id
                        ORDER BY score DESC
                        LIMIT 2
                    """, embedding=query_embedding).data()
                
                if not results:
                    return {
                        "type": "quote_error",
                        "content": message,
                        "source": "fallback_echo",
                        "error": "No similar quotes found"
                    }
                
                # Return top quote with metadata containing both node IDs
                result = results[0]
                node_ids = [str(r['node_id']) for r in results]
                
                return {
                    "type": "quote",
                    "content": result['quote'],
                    "source": "vector_search",
                    "author": result['author'],
                    "tags": result['tags'],
                    "similarity_score": result['score'],
                    "query": message,
                    "metadata": {
                        "nodes": node_ids,
                        "theme": theme
                    }
                }
                
        except Exception as e:
            logger.error(f"Quote search failed: {e}")
            return {
                "type": "quote_error",
                "content": message,
                "source": "fallback_echo",
                "error": str(e)
            }
    
    def close(self):
        """Close Neo4j connection"""
        if hasattr(self, 'driver'):
            self.driver.close()


class RAGHandler(BaseHandler):
    """Handler that combines vector search with LLM processing"""
    
    def __init__(self, neo4j_config: Dict[str, Any], ollama_config: Dict[str, Any], sentence_model: Optional[SentenceTransformer] = None):
        self.quote_handler = QuoteHandler(neo4j_config, sentence_model)
        self.llm_handler = LLMHandler(ollama_config)
        
        # RAG-specific prompt template
        self.rag_prompt_template = ollama_config.get('rag_prompt_template',
            'You are a haiku generation tool. Write a haiku inspired by the following message: "{message}" ONLY return the haiku and NOTHING else, no conversational pleasantries.')
    
    async def process(self, message: str, theme: Optional[str] = None) -> Dict[str, Any]:
        """Process message using RAG: vector search + LLM"""
        try:
            # First, get the most similar quotes
            quote_result = await self.quote_handler.process(message, theme)
            
            if quote_result['type'] == 'quote_error':
                # If quote search fails, fall back to regular LLM
                return await self.llm_handler.process(message, theme)
            
            # Get both quotes from Neo4j for context
            node_ids = quote_result.get('metadata', {}).get('nodes', [])
            if len(node_ids) >= 2:
                # Fetch both quotes for LLM context
                with self.quote_handler.driver.session() as session:
                    # Handle both original_id and neo4j id
                    quotes_data = session.run("""
                        MATCH (q:Quote)
                        WHERE q.original_id IN $node_ids OR id(q) IN $node_ids
                        RETURN q.text as text
                    """, node_ids=[int(nid) for nid in node_ids]).data()
                    
                    if len(quotes_data) >= 2:
                        # Concatenate both quotes as context
                        context_text = f"{quotes_data[0]['text']}\n\n{quotes_data[1]['text']}"
                    else:
                        context_text = quote_result['content']
            else:
                context_text = quote_result['content']
            
            # Use quotes as context for LLM
            rag_prompt = self.rag_prompt_template.format(
                message=context_text
            )
            
            # Temporarily override the LLM prompt template
            original_prompt = self.llm_handler.prompt_template
            self.llm_handler.prompt_template = "{message}"  # Use message as-is since we formatted it
            
            llm_result = await self.llm_handler.process(rag_prompt, theme)
            
            # Restore original prompt template
            self.llm_handler.prompt_template = original_prompt
            
            if llm_result['type'] == 'llm_error':
                # If LLM fails, return the quote
                return quote_result
            
            # Combine results with metadata
            return {
                "type": "rag",
                "content": llm_result['content'],
                "source": "rag_processing",
                "context_quote": quote_result['content'],
                "context_author": quote_result['author'],
                "context_tags": quote_result['tags'],
                "similarity_score": quote_result['similarity_score'],
                "query": message,
                "llm_model": llm_result.get('model', 'unknown'),
                "metadata": quote_result.get('metadata', {})
            }
            
        except Exception as e:
            logger.error(f"RAG processing failed: {e}")
            # Fallback to echo
            return {
                "type": "rag_error",
                "content": message,
                "source": "fallback_echo",
                "error": str(e)
            }
    
    def close(self):
        """Close connections"""
        self.quote_handler.close()


class HandlerFactory:
    """Factory class for creating handlers"""
    
    @staticmethod
    def create_handler(handler_type: str, config: Dict[str, Any], sentence_model: Optional[SentenceTransformer] = None) -> BaseHandler:
        """Create a handler instance based on type"""
        if handler_type == "echo":
            return EchoHandler()
        elif handler_type == "llm":
            return LLMHandler(config.get('ollama', {}))
        elif handler_type == "quote":
            return QuoteHandler(config.get('neo4j', {}), sentence_model)
        elif handler_type == "rag":
            return RAGHandler(config.get('neo4j', {}), config.get('ollama', {}), sentence_model)
        else:
            raise ValueError(f"Unknown handler type: {handler_type}")
