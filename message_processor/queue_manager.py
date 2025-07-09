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
import threading
from concurrent.futures import ThreadPoolExecutor

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
        # We'll create the queue later in the worker thread's event loop
        self.queue = None
        self.processing = False
        self.current_task: Optional[LLMTask] = None
        self.results: Dict[str, Any] = {}
        self.task_status: Dict[str, str] = {}
        self.worker_thread: Optional[threading.Thread] = None
        self.worker_loop: Optional[asyncio.AbstractEventLoop] = None
        self.stop_event = threading.Event()
        self.executor = ThreadPoolExecutor(max_workers=1)
        self._started = False
        self._queue_ready = threading.Event()
        # Thread-safe task storage
        self._pending_tasks = []
        self._tasks_lock = threading.Lock()
        
    async def start_worker(self):
        """Start the background worker thread"""
        if not self._started or (self.worker_thread and not self.worker_thread.is_alive()):
            self.stop_event.clear()
            self.worker_thread = threading.Thread(target=self._run_worker_thread)
            self.worker_thread.daemon = True
            self.worker_thread.start()
            self._started = True
            logger.info("LLM queue worker thread started")
    
    async def stop_worker(self):
        """Stop the background worker thread"""
        if self.worker_thread and self.worker_thread.is_alive():
            self.stop_event.set()
            # Give the thread a moment to stop
            await asyncio.sleep(0.1)
            self._started = False
            logger.info("LLM queue worker thread stopped")
    
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
        
        # Ensure worker is running first
        await self.start_worker()
        
        # Wait for queue to be ready
        if not self._queue_ready.wait(timeout=5.0):
            logger.error("Queue not ready after 5 seconds")
            self.task_status[task_id] = "failed"
            self.results[task_id] = {"error": "Queue initialization timeout"}
            return task_id
        
        # Add task to pending tasks list (thread-safe)
        with self._tasks_lock:
            self._pending_tasks.append(task)
        
        # If we have a worker loop, schedule the task addition
        if self.worker_loop and not self.worker_loop.is_closed():
            async def add_to_queue():
                await self.queue.put(task)
            
            # Schedule the task addition in the worker's event loop
            asyncio.run_coroutine_threadsafe(add_to_queue(), self.worker_loop)
        
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
    
    def _run_worker_thread(self):
        """Run the worker in a separate thread with its own event loop"""
        # Create a new event loop for this thread
        self.worker_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(self.worker_loop)
        
        try:
            # Run the async worker in this thread's event loop
            self.worker_loop.run_until_complete(self._worker())
        except Exception as e:
            logger.error(f"Worker thread error: {e}")
        finally:
            self.worker_loop.close()
            self.worker_loop = None
    
    async def _worker(self):
        """Background worker that processes tasks from the queue"""
        logger.info("LLM queue worker started processing")
        
        # Initialize queue in this event loop
        self.queue = asyncio.PriorityQueue()
        self._queue_ready.set()
        
        # Process any pending tasks that were submitted before queue was ready
        with self._tasks_lock:
            for task in self._pending_tasks:
                await self.queue.put(task)
            self._pending_tasks.clear()
        
        while not self.stop_event.is_set():
            try:
                # Check for new pending tasks
                with self._tasks_lock:
                    for task in self._pending_tasks:
                        await self.queue.put(task)
                    self._pending_tasks.clear()
                
                # Try to get a task with a timeout
                try:
                    task = await asyncio.wait_for(self.queue.get(), timeout=1.0)
                except asyncio.TimeoutError:
                    continue  # Check stop_event and try again
                
                self.current_task = task
                self.task_status[task.task_id] = "processing"
                self.processing = True
                
                logger.info(f"Processing task {task.task_id} with priority {task.priority.name}")
                
                # Process the task
                try:
                    result = await task.handler(task.message)
                    self.results[task.task_id] = result
                    self.task_status[task.task_id] = "completed"
                    
                    # Call callback if provided
                    if task.callback:
                        try:
                            await task.callback(task.task_id, result)
                        except Exception as cb_error:
                            logger.error(f"Callback error for task {task.task_id}: {cb_error}")
                        
                    logger.info(f"Task {task.task_id} completed successfully")
                    
                except Exception as e:
                    logger.error(f"Task {task.task_id} failed: {e}")
                    self.task_status[task.task_id] = "failed"
                    self.results[task.task_id] = {"error": str(e)}
                
                finally:
                    self.current_task = None
                    self.processing = False
                    self.queue.task_done()
                    
            except Exception as e:
                logger.error(f"Error in LLM queue worker: {e}")
                await asyncio.sleep(1)  # Brief pause before retrying
        
        logger.info("LLM queue worker stopped")
    
    def get_queue_info(self) -> Dict[str, Any]:
        """Get information about the current queue state"""
        return {
            "queue_size": self.queue.qsize() if self.queue else 0,
            "processing": self.processing,
            "current_task": self.current_task.task_id if self.current_task else None,
            "total_results": len(self.results)
        }
    
    async def _store_result(self, task_id: str, result: Dict[str, Any]):
        """
        Store a result directly without going through the queue
        Used when reusing results or for immediate non-LLM processing
        
        Args:
            task_id: The task ID to store the result under
            result: The result to store
        """
        self.results[task_id] = result
        self.task_status[task_id] = "completed"
        logger.info(f"Stored result for task {task_id}")
    
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
