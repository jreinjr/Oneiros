/**
 * Logger UI module
 * Handles connection log display and management
 */

/**
 * Logger manager class
 */
export class LoggerManager {
    constructor(config) {
        this.config = config;
        
        // DOM elements
        this.logContainer = document.getElementById('log-entries');
        this.logPanel = document.getElementById('poetry-log');
        
        // Single message display state
        this.currentMessage = null;
        this.currentMessageElement = null;
        this.messageQueue = [];
        this.isDisplaying = false;
        this.dismissTimer = null;
        
        this.initialize();
    }

    /**
     * Initialize logger functionality
     */
    initialize() {
        if (!this.logContainer) {
            console.warn('Log container element not found in DOM');
            return;
        }
        
        this.clear();
    }

    /**
     * Add a new log entry
     * @param {Object} node - Node that was focused
     * @param {Map} nodesMap - Map of distance to nodes (from getNodesWithinSteps)
     */
    async addEntry(node, nodesMap = null) {
        if (!node) return;
        
        const highlightSteps = this.config.get('highlightSteps');
        const connectionString = this.formatConnectionString(node, nodesMap || new Map(), highlightSteps);
        
        // Use unified logging pathway with typewriter animation
        await this.addLogEntryWithAnimation(connectionString);
    }

    /**
     * Format connection string for a node
     * @param {Object} node - Node object
     * @param {Map} nodesMap - Map of distance to nodes
     * @param {number} highlightSteps - Number of highlight steps
     * @returns {string} Formatted connection string
     */
    formatConnectionString(node, nodesMap, highlightSteps) {
        let connectionString = `Node ${node.id}`;
        
        if (highlightSteps === 1) {
            // For 1 step, show direct connections only
            const connectedNodeIds = Array.from(node.connections).sort((a, b) => a - b);
            connectionString += ` → [${connectedNodeIds.join(', ')}]`;
        } else {
            // For multiple steps, show nodes at each distance
            const stepDetails = [];
            for (let i = 1; i <= highlightSteps; i++) {
                if (nodesMap.has(i)) {
                    const nodeIds = nodesMap.get(i).map(n => n.id).sort((a, b) => a - b);
                    stepDetails.push(`${i} step${i > 1 ? 's' : ''}: [${nodeIds.join(', ')}]`);
                }
            }
            if (stepDetails.length > 0) {
                connectionString += ` → ${stepDetails.join(' | ')}`;
            }
        }
        
        return connectionString;
    }

    /**
     * Display a single message with fade-in animation
     * @param {Object} messageData - Message data object
     */
    async showMessage(messageData) {
        if (!this.logContainer) return;
        
        // Clear any existing message
        this.hideCurrentMessage();
        
        // Create the log entry element
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry typing';
        
        // Add type-specific styling
        if (messageData.type && messageData.type !== 'info') {
            logEntry.classList.add(`log-${messageData.type}`);
        }
        
        // Apply current color configuration
        this.applyLogEntryColors(logEntry);
        
        // Create text content span
        const textContent = document.createElement('span');
        textContent.className = 'text-content';
        
        // Create blinking cursor
        const cursor = document.createElement('span');
        cursor.className = 'blinking-cursor';
        cursor.textContent = '_';
        
        logEntry.appendChild(textContent);
        logEntry.appendChild(cursor);
        
        // Add to DOM
        this.logContainer.appendChild(logEntry);
        
        // Store current message
        this.currentMessage = messageData;
        this.currentMessageElement = logEntry;
        this.isDisplaying = true;
        
        // Start fade-in animation
        setTimeout(() => {
            logEntry.classList.add('fade-in');
        }, 50);
        
        // Start the typing animation
        this.animateTyping(textContent, messageData.text, () => {
            // Remove typing class and hide cursor when done
            logEntry.classList.remove('typing');
            logEntry.classList.add('complete');
            
            // Set auto-dismiss timer
            this.setDismissTimer();
        });
    }
    
    /**
     * Hide the current message with fade-out animation
     */
    hideCurrentMessage() {
        if (!this.currentMessageElement) return;
        
        // Clear dismiss timer
        this.clearDismissTimer();
        
        // Add fade-out class
        this.currentMessageElement.classList.remove('fade-in');
        this.currentMessageElement.classList.add('fade-out');
        
        // Remove element after transition
        setTimeout(() => {
            if (this.currentMessageElement && this.currentMessageElement.parentNode) {
                this.currentMessageElement.parentNode.removeChild(this.currentMessageElement);
            }
            this.currentMessage = null;
            this.currentMessageElement = null;
            this.isDisplaying = false;
            
            // Process next message in queue
            this.processMessageQueue();
        }, 500); // Match CSS transition duration
    }
    
    /**
     * Set auto-dismiss timer for current message
     */
    setDismissTimer() {
        this.clearDismissTimer();
        const duration = this.config.get('messageDuration') * 1000; // Convert seconds to milliseconds
        this.dismissTimer = setTimeout(() => {
            this.hideCurrentMessage();
        }, duration);
    }
    
    /**
     * Clear auto-dismiss timer
     */
    clearDismissTimer() {
        if (this.dismissTimer) {
            clearTimeout(this.dismissTimer);
            this.dismissTimer = null;
        }
    }
    
    /**
     * Process the next message in the queue
     */
    async processMessageQueue() {
        if (this.messageQueue.length === 0 || this.isDisplaying) return;
        
        const nextMessage = this.messageQueue.shift();
        await this.showMessage(nextMessage);
    }
    
    /**
     * Add message to queue or display immediately
     * @param {Object} messageData - Message data object
     */
    async queueMessage(messageData) {
        if (this.isDisplaying) {
            // If currently displaying, add to queue
            this.messageQueue.push(messageData);
        } else {
            // Display immediately
            await this.showMessage(messageData);
        }
    }
    
    /**
     * Add message with interrupt (dismisses current message)
     * @param {Object} messageData - Message data object
     */
    async addMessageWithInterrupt(messageData) {
        // Clear queue and hide current message
        this.messageQueue = [];
        this.hideCurrentMessage();
        
        // Wait for current message to finish hiding, then show new one
        setTimeout(async () => {
            await this.showMessage(messageData);
        }, 100);
    }

    /**
     * Clear all log entries and queued messages
     */
    clear() {
        // Clear message queue
        this.messageQueue = [];
        
        // Clear dismiss timer
        if (this.dismissTimer) {
            clearTimeout(this.dismissTimer);
            this.dismissTimer = null;
        }
        
        // Hide current message if it exists
        if (this.currentMessageElement) {
            this.hideCurrentMessage();
        }
        
        // Clear container
        if (this.logContainer) {
            this.logContainer.innerHTML = '';
        }
        
        // Reset state
        this.currentMessage = null;
        this.currentMessageElement = null;
        this.isDisplaying = false;
    }

    /**
     * Get current message information
     * @returns {Object|null} Current message data or null if no message
     */
    getCurrentMessage() {
        return this.currentMessage ? { ...this.currentMessage } : null;
    }

    /**
     * Set the message display duration
     * @param {number} duration - Duration in seconds
     */
    setMessageDuration(duration) {
        this.config.set('messageDuration', duration);
    }

    /**
     * Get the current message display duration
     * @returns {number} Duration in seconds
     */
    getMessageDuration() {
        return this.config.get('messageDuration');
    }

    /**
     * Set the typing speed
     * @param {number} speed - Speed in characters per second
     */
    setTypingSpeed(speed) {
        this.config.set('typingSpeed', speed);
    }

    /**
     * Get the current typing speed
     * @returns {number} Speed in characters per second
     */
    getTypingSpeed() {
        return this.config.get('typingSpeed');
    }

    /**
     * Add custom log entry
     * @param {string} message - Custom message to log
     * @param {string} type - Entry type ('info', 'warning', 'error')
     */
    async addCustomEntry(message, type = 'info') {
        // Use unified logging pathway with typewriter animation
        await this.addLogEntryWithAnimation(message, null, type);
    }

    /**
     * Show or hide the log panel
     * @param {boolean} visible - Whether to show the panel
     */
    setVisible(visible) {
        if (this.logPanel) {
            this.logPanel.style.display = visible ? 'block' : 'none';
        }
    }

    /**
     * Check if log panel is visible
     * @returns {boolean} Whether panel is visible
     */
    isVisible() {
        return this.logPanel && this.logPanel.style.display !== 'none';
    }

    /**
     * Get message queue information
     * @returns {Object} Queue information including length and messages
     */
    getQueueInfo() {
        return {
            length: this.messageQueue.length,
            messages: this.messageQueue.map(msg => ({ ...msg }))
        };
    }

    /**
     * Set log panel size
     * @param {number} width - Width in pixels
     * @param {number} height - Height in pixels (optional)
     */
    setSize(width, height = null) {
        if (!this.logPanel) return;
        
        this.logPanel.style.width = width + 'px';
        if (height !== null) {
            this.logPanel.style.height = height + 'px';
        }
    }

    /**
     * Set log panel style
     * @param {Object} styles - CSS styles object
     */
    setStyle(styles) {
        if (!this.logPanel) return;
        
        Object.assign(this.logPanel.style, styles);
    }

    /**
     * Add CSS class to log panel
     * @param {string} className - CSS class name
     */
    addClass(className) {
        if (this.logPanel) {
            this.logPanel.classList.add(className);
        }
    }

    /**
     * Remove CSS class from log panel
     * @param {string} className - CSS class name
     */
    removeClass(className) {
        if (this.logPanel) {
            this.logPanel.classList.remove(className);
        }
    }

    /**
     * Get display state information
     * @returns {Object} Current display state
     */
    getDisplayState() {
        return {
            isDisplaying: this.isDisplaying,
            currentMessage: this.currentMessage,
            queueLength: this.messageQueue.length,
            messageDuration: this.messageDuration
        };
    }

    /**
     * Force dismiss current message
     */
    dismissCurrentMessage() {
        if (this.isDisplaying) {
            this.hideCurrentMessage();
        }
    }

    /**
     * Clear message queue without affecting current message
     */
    clearQueue() {
        this.messageQueue = [];
    }

    /**
     * Set whether messages should interrupt current display
     * @param {boolean} shouldInterrupt - Whether new messages should interrupt current ones
     */
    setInterruptMode(shouldInterrupt) {
        this.interruptMode = shouldInterrupt;
    }

    /**
     * Add a quote entry with typing animation
     * @param {string} quoteText - The quote text to display
     * @param {string} author - The author of the quote (optional)
     */
    async addQuoteEntry(quoteText, author = null) {
        if (!quoteText) return;
        
        // Use unified logging pathway with typewriter animation
        await this.addLogEntryWithAnimation(quoteText, author);
    }
    
    /**
     * Unified method to add log entry with animation
     * @param {string} text - Text to display
     * @param {string} author - Author name (optional)
     * @param {string} type - Entry type ('info', 'warning', 'error')
     * @param {boolean} interrupt - Whether to interrupt current message (default: false)
     */
    async addLogEntryWithAnimation(text, author = null, type = 'info', interrupt = false) {
        if (!text) return;
        
        // Create message data object
        const messageData = {
            text: text,
            author: author,
            type: type
        };
        
        // Add to display queue or interrupt current message
        if (interrupt) {
            await this.addMessageWithInterrupt(messageData);
        } else {
            await this.queueMessage(messageData);
        }
    }
    
    /**
     * Animate text typing effect
     * @param {HTMLElement} element - Element to type into
     * @param {string} text - Text to type
     * @param {Function} onComplete - Callback when typing is complete
     */
    animateTyping(element, text, onComplete) {
        let index = 0;
        const charactersPerSecond = this.config.get('typingSpeed');
        const typingSpeed = Math.round(1000 / charactersPerSecond); // Convert to milliseconds per character
        
        const typeNextChar = () => {
            if (index < text.length) {
                element.textContent += text[index];
                index++;
                setTimeout(typeNextChar, typingSpeed);
            } else {
                // Typing complete
                if (onComplete) {
                    onComplete();
                }
            }
        };
        
        // Start typing after a short delay
        setTimeout(typeNextChar, 500);
    }
    
    /**
     * Enhance log message with AI
     * @param {string} message - Original message
     * @returns {Promise<string>} Enhanced message
     */
    async enhanceWithAI(message) {
        const endpoint = this.config.get('ollamaEndpoint');
        const model = this.config.get('ollamaModel');
        
        try {
            const response = await fetch(`${endpoint}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: model,
                    prompt: `Write a haiku inspired by the following message: "${message}"`,
                    stream: false,
                    options: {
                        temperature: 0.8,
                        max_tokens: 50
                    }
                })
            });
            
            if (!response.ok) {
                throw new Error(`Ollama API error: ${response.status}`);
            }
            
            const data = await response.json();
            return data.response || message;
        } catch (error) {
            console.error('Failed to enhance message with AI:', error);
            throw error;
        }
    }
    
    /**
     * Toggle AI-enhanced logging
     * @param {boolean} enabled - Whether to enable AI enhancement
     */
    setAIEnhancedLogging(enabled) {
        this.config.set('aiEnhancedLogging', enabled);
    }
    
    /**
     * Check if AI-enhanced logging is enabled
     * @returns {boolean} Whether AI enhancement is enabled
     */
    isAIEnhancedLoggingEnabled() {
        return this.config.get('aiEnhancedLogging');
    }
    
    /**
     * Apply colors to a log entry element
     * @param {HTMLElement} logEntry - The log entry element
     */
    applyLogEntryColors(logEntry) {
        const colors = this.config.get('colors');
        if (!colors) return;
        
        // Convert hex primary color to rgba for background
        const entryBackground = colors.logPrimary ? this.hexToRgba(colors.logPrimary, 0.1) : 'rgba(76, 175, 80, 0.1)';
        
        // Apply styles
        logEntry.style.setProperty('background', entryBackground, 'important');
        logEntry.style.setProperty('border-left-color', colors.logPrimary || '#4CAF50', 'important');
        logEntry.style.setProperty('color', colors.logSecondary || 'rgba(255, 255, 255, 0.6)', 'important');
    }
    
    /**
     * Update colors for all log entries
     */
    updateLogColors() {
        const logEntries = document.querySelectorAll('.log-entry');
        logEntries.forEach(entry => {
            this.applyLogEntryColors(entry);
        });
    }
    
    /**
     * Convert hex color to rgba
     * @param {string} hex - Hex color
     * @param {number} alpha - Alpha value
     * @returns {string} RGBA color
     */
    hexToRgba(hex, alpha) {
        const r = parseInt(hex.substr(1, 2), 16);
        const g = parseInt(hex.substr(3, 2), 16);
        const b = parseInt(hex.substr(5, 2), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    
    /**
     * Dispose of the logger manager and clean up resources
     */
    dispose() {
        this.clear();
        this.config = null;
        this.logContainer = null;
        this.logPanel = null;
        this.entries = [];
    }
}
