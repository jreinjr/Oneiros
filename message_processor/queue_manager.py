"""
LLM Queue Manager

Manages a priority queue for LLM processing requests to ensure:
1. Only one LLM request processes at a time (single-threaded local LLM)
2. User responses get priority over screen text
3. Async handling of requests
"""

import asyncio
import logging
from typing import Dict, Any, Optional, Callable
from dataclasses import dataclass, field
from enum import IntEnum
import uuid
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class Priority(IntEnum):
    """Priority levels for LLM requests"""
    USER_RESPONSE = 1  # Highest priority
    SCREEN_TEXT = 2    # Lower priority


@dataclass
class LLMTask:
    """Represents a task to be processed by the LLM"""
    task_id: str
    message: str
    handler: Callable
    priority: Priority
    created_at: datetime = field(default_factory=datetime.now)
    callback: Optional[Callable] = None
    
    def __lt__(self, other):
        """For priority queue ordering"""
        return self.priority < other.priority


class LLMQueueManager:
    """Manages LLM processing queue with priority handling"""
    
    def __init__(self):
        self.queue = asyncio.PriorityQueue()
        self.processing = False
        self.current_task: Optional[LLMTask] = None
        self.results: Dict[str, Any] = {}
        self.task_status: Dict[str, str] = {}
        self.worker_task: Optional[asyncio.Task] = None
        
    async def start_worker(self):
        """Start the background worker task"""
        if self.worker_task is None or self.worker_task.done():
            self.worker_task = asyncio.create_task(self._worker())
            logger.info("LLM queue worker started")
    
    async def stop_worker(self):
        """Stop the background worker task"""
        if self.worker_task and not self.worker_task.done():
            self.worker_task.cancel()
            try:
                await self.worker_task
            except asyncio.CancelledError:
                pass
            logger.info("LLM queue worker stopped")
    
    async def submit_task(self, message: str, handler: Callable, priority: Priority = Priority.SCREEN_TEXT, callback: Optional[Callable] = None) -> str:
        """
        Submit a task to the LLM queue
        
        Args:
            message: The message to process
            handler: The handler function to use
            priority: Priority level for the task
            callback: Optional callback function for when task completes
            
        Returns:
            Task ID for tracking
        """
        task_id = str(uuid.uuid4())
        task = LLMTask(
            task_id=task_id,
            message=message,
            handler=handler,
            priority=priority,
            callback=callback
        )
        
        self.task_status[task_id] = "queued"
        await self.queue.put(task)
        
        # Ensure worker is running
        try:
            await self.start_worker()
        except RuntimeError as e:
            if "no running event loop" in str(e):
                # Create a new event loop if none exists
                import asyncio
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                await self.start_worker()
            else:
                raise
        
        logger.info(f"Task {task_id} queued with priority {priority.name}")
        return task_id
    
    async def get_result(self, task_id: str) -> Optional[Any]:
        """Get the result of a completed task"""
        return self.results.get(task_id)
    
    def get_task_status(self, task_id: str) -> str:
        """Get the status of a task"""
        return self.task_status.get(task_id, "unknown")
    
    async def wait_for_result(self, task_id: str, timeout: float = 30.0) -> Optional[Any]:
        """
        Wait for a task to complete and return its result
        
        Args:
            task_id: The task ID to wait for
            timeout: Maximum time to wait in seconds
            
        Returns:
            The task result or None if timeout/error
        """
        start_time = asyncio.get_event_loop().time()
        
        while asyncio.get_event_loop().time() - start_time < timeout:
            if task_id in self.results:
                return self.results[task_id]
            
            status = self.get_task_status(task_id)
            if status in ["completed", "failed"]:
                break
                
            await asyncio.sleep(0.1)
        
        return None
    
    async def _worker(self):
        """Background worker that processes tasks from the queue"""
        logger.info("LLM queue worker started processing")
        
        while True:
            try:
                # Get next task from queue
                task = await self.queue.get()
                self.current_task = task
                self.task_status[task.task_id] = "processing"
                
                logger.info(f"Processing task {task.task_id} with priority {task.priority.name}")
                
                # Process the task
                try:
                    result = await task.handler(task.message)
                    self.results[task.task_id] = result
                    self.task_status[task.task_id] = "completed"
                    
                    # Call callback if provided
                    if task.callback:
                        await task.callback(task.task_id, result)
                        
                    logger.info(f"Task {task.task_id} completed successfully")
                    
                except Exception as e:
                    logger.error(f"Task {task.task_id} failed: {e}")
                    self.task_status[task.task_id] = "failed"
                    self.results[task.task_id] = {"error": str(e)}
                
                finally:
                    self.current_task = None
                    self.queue.task_done()
                    
            except asyncio.CancelledError:
                logger.info("LLM queue worker cancelled")
                break
            except Exception as e:
                logger.error(f"Error in LLM queue worker: {e}")
                await asyncio.sleep(1)  # Brief pause before retrying
    
    def get_queue_info(self) -> Dict[str, Any]:
        """Get information about the current queue state"""
        return {
            "queue_size": self.queue.qsize(),
            "processing": self.processing,
            "current_task": self.current_task.task_id if self.current_task else None,
            "total_results": len(self.results)
        }
    
    def clear_old_results(self, max_age_hours: int = 24):
        """Clear old results to prevent memory buildup"""
        cutoff_time = datetime.now() - timedelta(hours=max_age_hours)
        
        # Find tasks older than cutoff
        old_task_ids = []
        for task_id, status in self.task_status.items():
            if status in ["completed", "failed"]:
                # Note: We don't have creation time for results, so we'll keep a simpler approach
                # In a production system, you might want to store timestamps with results
                pass
        
        # For now, just limit total stored results
        if len(self.results) > 100:
            # Remove oldest results (simple FIFO)
            oldest_tasks = list(self.results.keys())[:len(self.results) - 100]
            for task_id in oldest_tasks:
                self.results.pop(task_id, None)
                self.task_status.pop(task_id, None)
            
            logger.info(f"Cleaned up {len(oldest_tasks)} old results")
