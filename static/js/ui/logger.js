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
        
        // State
        this.entries = [];
        this.maxEntries = 6;
        this.fadeClasses = ['fade-1', 'fade-2', 'fade-3'];
        
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
     * Update the log display
     */
    updateDisplay() {
        if (!this.logContainer) return;
        
        // Clear existing entries
        this.logContainer.innerHTML = '';
        
        // Add each entry - newest entries go at the bottom
        this.entries.forEach((entry, index) => {
            // For string entries, create a div
            if (typeof entry === 'string') {
                const logEntry = document.createElement('div');
                logEntry.className = 'log-entry';
                logEntry.textContent = entry;
                
                // Add fade classes for older entries (at the top)
                if (index >= 3) {
                    const fadeIndex = Math.min(index - 3, this.fadeClasses.length - 1);
                    logEntry.classList.add(this.fadeClasses[fadeIndex]);
                }
                
                this.logContainer.appendChild(logEntry);
            } else if (entry.element) {
                // For animated entries, use the pre-created element directly
                // Add fade classes for older entries (at the top)
                if (index >= 3) {
                    const fadeIndex = Math.min(index - 3, this.fadeClasses.length - 1);
                    entry.element.classList.add(this.fadeClasses[fadeIndex]);
                }
                
                this.logContainer.appendChild(entry.element);
            }
        });
    }

    /**
     * Clear all log entries
     */
    clear() {
        this.entries = [];
        this.updateDisplay();
    }

    /**
     * Get all log entries
     * @returns {Array} Array of log entry strings
     */
    getEntries() {
        return [...this.entries];
    }

    /**
     * Set maximum number of entries to display
     * @param {number} maxEntries - Maximum number of entries
     */
    setMaxEntries(maxEntries) {
        this.maxEntries = Math.max(1, maxEntries);
        
        // Trim entries if necessary
        if (this.entries.length > this.maxEntries) {
            this.entries = this.entries.slice(0, this.maxEntries);
            this.updateDisplay();
        }
    }

    /**
     * Get maximum number of entries
     * @returns {number} Maximum number of entries
     */
    getMaxEntries() {
        return this.maxEntries;
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
     * Set log panel position
     * @param {string} position - CSS position ('bottom-left', 'bottom-right', 'top-left', 'top-right')
     */
    setPosition(position) {
        if (!this.logPanel) return;
        
        // Reset all position classes
        this.logPanel.classList.remove('bottom-left', 'bottom-right', 'top-left', 'top-right');
        
        // Apply new position
        this.logPanel.classList.add(position);
        
        // Update CSS properties based on position
        switch (position) {
            case 'bottom-left':
                this.logPanel.style.bottom = '20px';
                this.logPanel.style.left = '20px';
                this.logPanel.style.top = 'auto';
                this.logPanel.style.right = 'auto';
                break;
            case 'bottom-right':
                this.logPanel.style.bottom = '20px';
                this.logPanel.style.right = '20px';
                this.logPanel.style.top = 'auto';
                this.logPanel.style.left = 'auto';
                break;
            case 'top-left':
                this.logPanel.style.top = '20px';
                this.logPanel.style.left = '20px';
                this.logPanel.style.bottom = 'auto';
                this.logPanel.style.right = 'auto';
                break;
            case 'top-right':
                this.logPanel.style.top = '20px';
                this.logPanel.style.right = '20px';
                this.logPanel.style.bottom = 'auto';
                this.logPanel.style.left = 'auto';
                break;
        }
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
     * Export log entries as text
     * @param {string} separator - Line separator (default: '\n')
     * @returns {string} Exported log text
     */
    exportAsText(separator = '\n') {
        return this.entries.join(separator);
    }

    /**
     * Export log entries as JSON
     * @returns {string} JSON string of log entries
     */
    exportAsJSON() {
        return JSON.stringify({
            timestamp: new Date().toISOString(),
            maxEntries: this.maxEntries,
            entries: this.entries
        }, null, 2);
    }

    /**
     * Import log entries from JSON
     * @param {string} jsonString - JSON string to import
     * @returns {boolean} Whether import was successful
     */
    importFromJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            if (data.entries && Array.isArray(data.entries)) {
                this.entries = data.entries.slice(0, this.maxEntries);
                this.updateDisplay();
                return true;
            }
        } catch (error) {
            console.error('Failed to import log entries:', error);
        }
        
        return false;
    }

    /**
     * Set fade classes for older entries
     * @param {Array} fadeClasses - Array of CSS class names
     */
    setFadeClasses(fadeClasses) {
        this.fadeClasses = fadeClasses;
        this.updateDisplay();
    }

    /**
     * Get current fade classes
     * @returns {Array} Array of fade class names
     */
    getFadeClasses() {
        return [...this.fadeClasses];
    }

    /**
     * Animate new entry addition
     * @param {HTMLElement} entryElement - Entry element to animate
     */
    animateNewEntry(entryElement) {
        if (!entryElement) return;
        
        // Add animation class
        entryElement.classList.add('log-entry-new');
        
        // Remove animation class after animation completes
        setTimeout(() => {
            entryElement.classList.remove('log-entry-new');
        }, 500);
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
     * Unified method to add log entry with animation and AI enhancement
     * @param {string} text - Text to display
     * @param {string} author - Author name (optional)
     * @param {string} type - Entry type ('info', 'warning', 'error')
     */
    async addLogEntryWithAnimation(text, author = null, type = 'info') {
        if (!text) return;
        
        // Determine final text to display
        let finalText = text;
        
        // Check if AI-enhanced logging is enabled
        if (this.config.get('aiEnhancedLogging')) {
            try {
                finalText = await this.enhanceWithAI(text);
            } catch (error) {
                console.error('AI enhancement failed, using original message:', error);
                finalText = text;
            }
        }
        
        // Create the log entry element with typewriter animation
        const logEntry = document.createElement('div');
        logEntry.className = 'log-entry typing';
        
        // Add type-specific styling
        if (type !== 'info') {
            logEntry.classList.add(`log-${type}`);
        }
        
        // Create text content span
        const textContent = document.createElement('span');
        textContent.className = 'text-content';
        
        // Create blinking cursor
        const cursor = document.createElement('span');
        cursor.className = 'blinking-cursor';
        cursor.textContent = '_';
        
        logEntry.appendChild(textContent);
        logEntry.appendChild(cursor);
        
        // Add to entries array as an object with the element
        const entryObj = {
            element: logEntry,
            text: finalText,
            author: author,
            type: type
        };
        
        this.entries.unshift(entryObj);
        
        // Keep only maxEntries
        if (this.entries.length > this.maxEntries) {
            this.entries = this.entries.slice(0, this.maxEntries);
        }
        
        this.updateDisplay();
        
        // Start the typing animation
        this.animateTyping(textContent, finalText, () => {
            // Remove typing class and hide cursor when done
            logEntry.classList.remove('typing');
            logEntry.classList.add('complete');
        });
    }
    
    /**
     * Animate text typing effect
     * @param {HTMLElement} element - Element to type into
     * @param {string} text - Text to type
     * @param {Function} onComplete - Callback when typing is complete
     */
    animateTyping(element, text, onComplete) {
        let index = 0;
        const typingSpeed = 30; // milliseconds per character
        
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
