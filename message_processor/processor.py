"""
Main Message Processor

Coordinates message processing through different handlers with priority queuing
for LLM requests. Handles both user response and screen text processing.
"""

import logging
import asyncio
from typing import Dict, Any, Optional, Tuple
from dataclasses import dataclass
from sentence_transformers import SentenceTransformer
from .handlers import HandlerFactory, BaseHandler
from .queue_manager import LLMQueueManager, Priority

logger = logging.getLogger(__name__)


@dataclass
class ProcessingResult:
    """Result of message processing"""
    user_response: Dict[str, Any]
    screen_text: Dict[str, Any]
    task_id: str
    user_task_id: Optional[str] = None
    screen_task_id: Optional[str] = None


class MessageProcessor:
    """Main message processor that coordinates all processing types"""
    
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.llm_queue = LLMQueueManager()
        self.handlers = {}
        self.processing_settings = {
            'user_response_mode': 'echo',
            'screen_text_mode': 'echo'
        }
        
        # Initialize sentence transformer model once
        self.sentence_model = self._initialize_sentence_model()
        
        # Initialize handlers
        self._initialize_handlers()
        
        # Start the queue worker
        self._start_queue_worker()
    
    def _start_queue_worker(self):
        """Start the LLM queue worker in a separate thread"""
        try:
            # Create an event loop for this thread if needed
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            # Start the worker
            loop.run_until_complete(self.llm_queue.start_worker())
            
            logger.info("LLM queue worker started during processor initialization")
        except Exception as e:
            logger.error(f"Failed to start LLM queue worker: {e}")
    
    def _initialize_sentence_model(self) -> Optional[SentenceTransformer]:
        """Initialize sentence transformer model once for all handlers"""
        try:
            model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("Sentence transformer model initialized successfully")
            return model
        except Exception as e:
            logger.error(f"Failed to initialize sentence transformer model: {e}")
            return None
    
    def _initialize_handlers(self):
        """Initialize all handler instances"""
        try:
            self.handlers['echo'] = HandlerFactory.create_handler('echo', self.config, self.sentence_model)
            self.handlers['llm'] = HandlerFactory.create_handler('llm', self.config, self.sentence_model)
            self.handlers['quote'] = HandlerFactory.create_handler('quote', self.config, self.sentence_model)
            self.handlers['rag'] = HandlerFactory.create_handler('rag', self.config, self.sentence_model)
            logger.info("All handlers initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize handlers: {e}")
            # Fallback to echo handler only
            self.handlers['echo'] = HandlerFactory.create_handler('echo', self.config, self.sentence_model)
    
    def update_settings(self, user_response_mode: str, screen_text_mode: str):
        """Update processing settings"""
        valid_modes = ['echo', 'llm', 'quote', 'rag']
        
        if user_response_mode in valid_modes:
            self.processing_settings['user_response_mode'] = user_response_mode
        else:
            logger.warning(f"Invalid user response mode: {user_response_mode}")
            
        if screen_text_mode in valid_modes:
            self.processing_settings['screen_text_mode'] = screen_text_mode
        else:
            logger.warning(f"Invalid screen text mode: {screen_text_mode}")
            
        logger.info(f"Settings updated - User: {self.processing_settings['user_response_mode']}, Screen: {self.processing_settings['screen_text_mode']}")
    
    def get_settings(self) -> Dict[str, str]:
        """Get current processing settings"""
        return self.processing_settings.copy()
    
    async def process_message(self, message: str, user_mode: Optional[str] = None, screen_mode: Optional[str] = None) -> ProcessingResult:
        """
        Process a message through both user response and screen text handlers
        
        Args:
            message: The message to process
            user_mode: Override for user response mode
            screen_mode: Override for screen text mode
            
        Returns:
            ProcessingResult with both responses and task IDs
        """
        # Use provided modes or fall back to settings
        user_response_mode = user_mode or self.processing_settings['user_response_mode']
        screen_text_mode = screen_mode or self.processing_settings['screen_text_mode']
        
        logger.info(f"Processing message with modes - User: {user_response_mode}, Screen: {screen_text_mode}")
        
        # Generate task ID for this processing request
        import uuid
        task_id = str(uuid.uuid4())
        
        # Process both responses
        user_result, user_task_id = await self._process_single_message(
            message, user_response_mode, Priority.USER_RESPONSE
        )
        
        screen_result, screen_task_id = await self._process_single_message(
            message, screen_text_mode, Priority.SCREEN_TEXT
        )
        
        return ProcessingResult(
            user_response=user_result,
            screen_text=screen_result,
            task_id=task_id,
            user_task_id=user_task_id,
            screen_task_id=screen_task_id
        )
    
    async def _process_single_message(self, message: str, mode: str, priority: Priority) -> Tuple[Dict[str, Any], Optional[str]]:
        """
        Process a single message through the specified handler
        
        Args:
            message: The message to process
            mode: Processing mode (echo, llm, quote, rag)
            priority: Priority level for LLM queue
            
        Returns:
            Tuple of (result, task_id) where task_id is None for non-LLM processing
        """
        if mode not in self.handlers:
            logger.error(f"Handler not found for mode: {mode}")
            # Fallback to echo
            return await self.handlers['echo'].process(message), None
        
        handler = self.handlers[mode]
        
        # For LLM-based processing, use the queue
        if mode in ['llm', 'rag']:
            task_id = await self.llm_queue.submit_task(
                message=message,
                handler=handler.process,
                priority=priority
            )
            
            # Wait for result with timeout
            result = await self.llm_queue.wait_for_result(task_id, timeout=30.0)
            
            if result is None:
                logger.error(f"LLM task {task_id} timed out")
                # Fallback to echo
                return await self.handlers['echo'].process(message), task_id
            
            return result, task_id
        
        # For non-LLM processing, process directly
        else:
            result = await handler.process(message)
            return result, None
    
    async def get_task_result(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get the result of a specific task"""
        return await self.llm_queue.get_result(task_id)
    
    def get_task_status(self, task_id: str) -> str:
        """Get the status of a specific task"""
        return self.llm_queue.get_task_status(task_id)
    
    def get_queue_info(self) -> Dict[str, Any]:
        """Get information about the LLM queue"""
        return self.llm_queue.get_queue_info()
    
    async def process_user_response_only(self, message: str, mode: Optional[str] = None) -> Dict[str, Any]:
        """Process message for user response only (higher priority)"""
        user_mode = mode or self.processing_settings['user_response_mode']
        result, _ = await self._process_single_message(message, user_mode, Priority.USER_RESPONSE)
        return result
    
    async def process_screen_text_only(self, message: str, mode: Optional[str] = None) -> Dict[str, Any]:
        """Process message for screen text only (lower priority)"""
        screen_mode = mode or self.processing_settings['screen_text_mode']
        result, _ = await self._process_single_message(message, screen_mode, Priority.SCREEN_TEXT)
        return result
    
    def get_available_modes(self) -> list:
        """Get list of available processing modes"""
        return list(self.handlers.keys())
    
    def is_mode_available(self, mode: str) -> bool:
        """Check if a processing mode is available"""
        return mode in self.handlers
    
    async def test_handlers(self) -> Dict[str, Any]:
        """Test all handlers with a simple message"""
        test_message = "Hello, world!"
        results = {}
        
        for mode, handler in self.handlers.items():
            try:
                if mode in ['llm', 'rag']:
                    # Test through queue
                    task_id = await self.llm_queue.submit_task(
                        message=test_message,
                        handler=handler.process,
                        priority=Priority.SCREEN_TEXT
                    )
                    result = await self.llm_queue.wait_for_result(task_id, timeout=10.0)
                    results[mode] = {"success": result is not None, "result": result}
                else:
                    # Test directly
                    result = await handler.process(test_message)
                    results[mode] = {"success": True, "result": result}
            except Exception as e:
                results[mode] = {"success": False, "error": str(e)}
        
        return results
    
    async def process_user_immediate(self, message: str, user_mode: Optional[str] = None) -> Dict[str, Any]:
        """
        Process user response immediately and return it
        
        Args:
            message: The message to process
            user_mode: Override for user response mode
            
        Returns:
            Dict with user_response only
        """
        user_response_mode = user_mode or self.processing_settings['user_response_mode']
        logger.info(f"Processing user response with mode: {user_response_mode}")
        
        # Process user response with priority
        user_result, user_task_id = await self._process_single_message(
            message, user_response_mode, Priority.USER_RESPONSE
        )
        
        return {
            "user_response": user_result,
            "user_task_id": user_task_id
        }
    
    async def process_screen_async(self, message: str, screen_mode: Optional[str] = None, 
                                   user_result: Optional[Dict[str, Any]] = None,
                                   user_mode: Optional[str] = None) -> str:
        """
        Process screen text asynchronously (to be called after user response is sent)
        
        Args:
            message: The message to process
            screen_mode: Override for screen text mode
            user_result: The user result to reuse if modes are the same
            user_mode: The user mode that was used
            
        Returns:
            Task ID for LLM processing or None
        """
        screen_text_mode = screen_mode or self.processing_settings['screen_text_mode']
        user_response_mode = user_mode or self.processing_settings['user_response_mode']
        
        # Check if we can reuse the user result
        if screen_text_mode == user_response_mode and user_result is not None:
            logger.info("Screen mode same as user mode - storing user result for screen")
            # Store the result directly for immediate retrieval
            import uuid
            task_id = str(uuid.uuid4())
            await self.llm_queue._store_result(task_id, user_result)
            return task_id
        
        # Process screen text
        if screen_text_mode in ['llm', 'rag']:
            # For LLM-based processing, submit to queue
            task_id = await self.llm_queue.submit_task(
                message=message,
                handler=self.handlers[screen_text_mode].process,
                priority=Priority.SCREEN_TEXT
            )
            logger.info(f"Screen text processing queued with task ID: {task_id}")
            return task_id
        else:
            # For non-LLM processing, process directly and store
            result = await self.handlers[screen_text_mode].process(message)
            import uuid
            task_id = str(uuid.uuid4())
            await self.llm_queue._store_result(task_id, result)
            return task_id
    
    async def shutdown(self):
        """Shutdown the message processor and clean up resources"""
        logger.info("Shutting down message processor")
        
        # Stop the LLM queue worker
        await self.llm_queue.stop_worker()
        
        # Close handler connections
        for handler in self.handlers.values():
            if hasattr(handler, 'close'):
                handler.close()
        
        logger.info("Message processor shutdown complete")
    
    def get_handler_info(self) -> Dict[str, Any]:
        """Get information about loaded handlers"""
        info = {}
        for mode, handler in self.handlers.items():
            info[mode] = {
                "class": handler.__class__.__name__,
                "available": True
            }
        return info
    
    def update_handler_config(self, handler_type: str, config: Dict[str, Any]):
        """Update configuration for a specific handler"""
        if handler_type in self.handlers:
            try:
                # Recreate handler with new config
                new_handler = HandlerFactory.create_handler(handler_type, {**self.config, **config}, self.sentence_model)
                
                # Close old handler if it has a close method
                old_handler = self.handlers[handler_type]
                if hasattr(old_handler, 'close'):
                    old_handler.close()
                
                # Replace with new handler
                self.handlers[handler_type] = new_handler
                logger.info(f"Updated {handler_type} handler configuration")
                
            except Exception as e:
                logger.error(f"Failed to update {handler_type} handler: {e}")
        else:
            logger.warning(f"Handler {handler_type} not found")
