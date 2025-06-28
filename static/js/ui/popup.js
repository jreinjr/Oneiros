/**
 * Popup UI module
 * Handles node popup display and dragging functionality
 */

/**
 * Popup manager class
 */
export class PopupManager {
    constructor(visualizer) {
        this.visualizer = visualizer;
        
        // DOM elements
        this.popup = document.getElementById('node-popup');
        this.popupTitle = document.getElementById('node-popup-title');
        this.popupName = document.getElementById('node-popup-name');
        this.connectionLine = document.querySelector('.connection-path');
        
        // State
        this.currentNode = null;
        this.position = { x: 0, y: 0 };
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.lineUpdateInterval = null;
        
        this.initialize();
    }

    /**
     * Initialize popup functionality
     */
    initialize() {
        if (!this.popup || !this.popupName || !this.connectionLine) {
            console.warn('Popup elements not found in DOM');
            return;
        }
        
        this.setupDragging();
        this.setupEventListeners();
    }

    /**
     * Setup popup dragging functionality
     */
    setupDragging() {
        this.popup.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            const rect = this.popup.getBoundingClientRect();
            this.dragOffset.x = e.clientX - rect.left;
            this.dragOffset.y = e.clientY - rect.top;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            
            const x = e.clientX - this.dragOffset.x;
            const y = e.clientY - this.dragOffset.y;
            
            this.setPosition(x, y);
            this.updateConnectionLine();
        });

        document.addEventListener('mouseup', () => {
            this.isDragging = false;
        });
    }

    /**
     * Setup additional event listeners
     */
    setupEventListeners() {
        // Handle window resize to update connection line
        window.addEventListener('resize', () => {
            if (this.isVisible()) {
                this.updateConnectionLine();
            }
        });
    }

    /**
     * Show popup for a node
     * @param {Object} node - Node to show popup for
     */
    show(node) {
        if (!node || !this.popup) return;
        
        this.currentNode = node;
        
        // Update popup title with author if available
        if (this.popupTitle) {
            if (node.author) {
                this.popupTitle.textContent = node.author;
            } else {
                this.popupTitle.textContent = 'Selected Node';
            }
        }
        
        // Update popup content
        if (this.popupName) {
            // Check if this is a quote node (has quote property)
            if (node.quote) {
                this.popupName.textContent = node.quote;
                // Adjust popup size for potentially longer text
                this.popup.style.maxWidth = '400px';
                this.popup.style.whiteSpace = 'normal';
            } else {
                // Fallback for random graph nodes
                this.popupName.textContent = `Node ${node.id}`;
                this.popup.style.maxWidth = '200px';
            }
        }
        
        // Position popup near the node if not already positioned
        if (this.position.x === 0 && this.position.y === 0) {
            this.positionNearNode(node);
        }
        
        // Show popup
        this.popup.classList.add('visible');
        
        // Start updating the connection line
        this.startLineUpdates();
    }

    /**
     * Hide the popup
     */
    hide() {
        if (!this.popup) return;
        
        this.popup.classList.remove('visible');
        this.currentNode = null;
        
        // Clear connection line
        if (this.connectionLine) {
            this.connectionLine.setAttribute('d', '');
        }
        
        this.stopLineUpdates();
    }

    /**
     * Position popup near a node
     * @param {Object} node - Node to position near
     */
    positionNearNode(node) {
        if (!this.visualizer) return;
        
        // Get node's screen position
        const nodeScreenPos = this.visualizer.getScreenCoords(
            node.x || 0, 
            node.y || 0, 
            node.z || 0
        );
        
        // Position popup with offset
        const offsetX = 50;
        const offsetY = -50;
        
        this.setPosition(
            nodeScreenPos.x + offsetX,
            nodeScreenPos.y + offsetY
        );
    }

    /**
     * Set popup position
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     */
    setPosition(x, y) {
        this.position.x = x;
        this.position.y = y;
        
        if (this.popup) {
            this.popup.style.left = x + 'px';
            this.popup.style.top = y + 'px';
        }
    }

    /**
     * Get popup position
     * @returns {Object} Position object with x and y
     */
    getPosition() {
        return { ...this.position };
    }

    /**
     * Reset popup position for next use
     */
    resetPosition() {
        this.position = { x: 0, y: 0 };
    }

    /**
     * Check if popup is currently visible
     * @returns {boolean} Whether popup is visible
     */
    isVisible() {
        return this.popup && this.popup.classList.contains('visible');
    }

    /**
     * Get current node
     * @returns {Object|null} Current node or null
     */
    getCurrentNode() {
        return this.currentNode;
    }

    /**
     * Start connection line updates
     */
    startLineUpdates() {
        this.stopLineUpdates(); // Clear any existing interval
        
        this.lineUpdateInterval = setInterval(() => {
            this.updateConnectionLine();
        }, 16); // 60fps
    }

    /**
     * Stop connection line updates
     */
    stopLineUpdates() {
        if (this.lineUpdateInterval) {
            clearInterval(this.lineUpdateInterval);
            this.lineUpdateInterval = null;
        }
    }

    /**
     * Update connection line between popup and node
     */
    updateConnectionLine() {
        if (!this.currentNode || !this.isVisible() || !this.connectionLine || !this.visualizer) {
            return;
        }
        
        // Get node's current screen position
        const nodeScreenPos = this.visualizer.getScreenCoords(
            this.currentNode.x || 0, 
            this.currentNode.y || 0, 
            this.currentNode.z || 0
        );
        
        // Get popup center position
        const popupRect = this.popup.getBoundingClientRect();
        const popupCenterX = popupRect.left + popupRect.width / 2;
        const popupCenterY = popupRect.top + popupRect.height / 2;
        
        // Create SVG path
        const path = `M ${popupCenterX} ${popupCenterY} L ${nodeScreenPos.x} ${nodeScreenPos.y}`;
        this.connectionLine.setAttribute('d', path);
    }

    /**
     * Update popup content
     * @param {Object} content - Content object with title and name
     */
    updateContent(content) {
        if (content.title && this.popupTitle) {
            this.popupTitle.textContent = content.title;
        }
        
        if (content.name && this.popupName) {
            this.popupName.textContent = content.name;
        }
    }

    /**
     * Set popup content template
     * @param {Function} templateFunction - Function that returns content object
     */
    setContentTemplate(templateFunction) {
        this.contentTemplate = templateFunction;
    }

    /**
     * Apply content template to current node
     */
    applyContentTemplate() {
        if (this.contentTemplate && this.currentNode) {
            const content = this.contentTemplate(this.currentNode);
            this.updateContent(content);
        }
    }

    /**
     * Set popup style
     * @param {Object} styles - CSS styles object
     */
    setStyle(styles) {
        if (!this.popup) return;
        
        Object.assign(this.popup.style, styles);
    }

    /**
     * Add CSS class to popup
     * @param {string} className - CSS class name
     */
    addClass(className) {
        if (this.popup) {
            this.popup.classList.add(className);
        }
    }

    /**
     * Remove CSS class from popup
     * @param {string} className - CSS class name
     */
    removeClass(className) {
        if (this.popup) {
            this.popup.classList.remove(className);
        }
    }

    /**
     * Toggle CSS class on popup
     * @param {string} className - CSS class name
     * @param {boolean} force - Force add/remove
     */
    toggleClass(className, force = undefined) {
        if (this.popup) {
            this.popup.classList.toggle(className, force);
        }
    }

    /**
     * Set popup size
     * @param {number} width - Width in pixels
     * @param {number} height - Height in pixels
     */
    setSize(width, height) {
        if (this.popup) {
            this.popup.style.width = width + 'px';
            this.popup.style.height = height + 'px';
        }
    }

    /**
     * Get popup size
     * @returns {Object} Size object with width and height
     */
    getSize() {
        if (!this.popup) return { width: 0, height: 0 };
        
        const rect = this.popup.getBoundingClientRect();
        return {
            width: rect.width,
            height: rect.height
        };
    }

    /**
     * Set connection line style
     * @param {Object} styles - SVG styles object
     */
    setLineStyle(styles) {
        if (!this.connectionLine) return;
        
        Object.entries(styles).forEach(([property, value]) => {
            this.connectionLine.setAttribute(property, value);
        });
    }

    /**
     * Enable or disable dragging
     * @param {boolean} enabled - Whether dragging is enabled
     */
    setDraggable(enabled) {
        if (this.popup) {
            this.popup.style.cursor = enabled ? 'move' : 'default';
            // Note: The actual dragging logic is always active, 
            // but this changes the visual cursor indication
        }
    }

    /**
     * Dispose of the popup manager and clean up resources
     */
    dispose() {
        this.hide();
        this.stopLineUpdates();
        
        // Remove event listeners
        if (this.popup) {
            this.popup.removeEventListener('mousedown', () => {});
        }
        
        document.removeEventListener('mousemove', () => {});
        document.removeEventListener('mouseup', () => {});
        window.removeEventListener('resize', () => {});
        
        this.visualizer = null;
        this.currentNode = null;
        this.popup = null;
        this.popupTitle = null;
        this.popupName = null;
        this.connectionLine = null;
        this.contentTemplate = null;
    }
}
