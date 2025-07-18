/**
 * Popup UI module
 * Handles node popup display and dragging functionality
 */

/**
 * Popup manager class
 */
export class PopupManager {
    constructor(visualizer, config) {
        this.visualizer = visualizer;
        this.config = config;
        
        // DOM elements
        this.wrapper = document.getElementById('node-popup-wrapper');
        this.popup = document.getElementById('node-popup');
        this.popupTitle = document.getElementById('node-popup-title');
        this.popupName = document.getElementById('node-popup-name');
        this.connectionLine = document.querySelector('.connection-path');
        this.leftQuote = document.querySelector('.popup-quote-left');
        this.rightQuote = document.querySelector('.popup-quote-right');
        
        // State
        this.currentNode = null;
        this.position = { x: 0, y: 0 };
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.lineUpdateInterval = null;
        this.showTimeout = null;
        this.hideTimeout = null;
        
        this.initialize();
    }

    /**
     * Initialize popup functionality
     */
    initialize() {
        if (!this.wrapper || !this.popup || !this.popupName || !this.connectionLine) {
            console.warn('Popup elements not found in DOM');
            return;
        }
        
        this.setupDragging();
        this.setupEventListeners();
        
        // Apply initial scale
        this.applyScale();
    }

    /**
     * Setup popup dragging functionality
     */
    setupDragging() {
        this.popup.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            const rect = this.wrapper.getBoundingClientRect();
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
     * @param {number} orbitDuration - Actual orbit duration for this node (optional)
     */
    show(node, orbitDuration) {
        if (!node || !this.popup) return;
        
        this.currentNode = node;
        
        // Update popup title with author if available
        if (this.popupTitle) {
            if (node.author) {
                // Create author text with birth location if available
                let titleContent = node.author;
                if (node.author_birth_location) {
                    // Extract country (last element) from comma-separated location
                    const locationParts = node.author_birth_location.split(',');
                    const country = locationParts[locationParts.length - 1].trim();
                    titleContent = `${node.author} <span class="popup-birth-location">- ${country}</span>`;
                }
                this.popupTitle.innerHTML = titleContent;
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
        
        // Apply colors from config
        this.applyPopupColors();
        
        // Position popup in center of screen if not already positioned
        if (this.position.x === 0 && this.position.y === 0) {
            this.centerOnScreen();
        }
        
        // Clear any existing timeouts
        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
            this.showTimeout = null;
        }
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
        
        // Get timing from config
        const dreamTransitionDuration = this.config ? this.config.get('dreamTransitionDuration') : 3;
        const cameraMode = this.config ? this.config.get('cameraMode') : 'manual';
        const popupDisplayDuration = this.config ? this.config.get('popupDisplayDuration') : 0.25;
        
        // Use provided orbit duration or fall back to config
        const actualOrbitDuration = orbitDuration || (this.config ? this.config.get('dreamOrbitDuration') : 10);
        
        const showDelay = dreamTransitionDuration * 1000; // Show after transition completes
        
        // Show popup after delay
        this.showTimeout = setTimeout(() => {
            this.wrapper.classList.add('visible');
            if (this.connectionLine) {
                this.connectionLine.classList.add('visible');
            }
            this.showTimeout = null;
            
            // In dream mode, hide popup after configured fraction of orbit time
            if (cameraMode === 'dreaming') {
                // Calculate how long to show the popup
                const popupVisibleTime = actualOrbitDuration * popupDisplayDuration * 1000; // Convert to ms
                
                this.hideTimeout = setTimeout(() => {
                    this.wrapper.classList.remove('visible');
                    if (this.connectionLine) {
                        this.connectionLine.classList.remove('visible');
                    }
                    this.hideTimeout = null;
                }, popupVisibleTime);
            }
        }, showDelay);
        
        // Start updating the connection line
        this.startLineUpdates();
    }

    /**
     * Fade out the popup immediately
     */
    fadeOut() {
        if (!this.popup) return;
        
        // Clear any existing timeouts
        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
            this.showTimeout = null;
        }
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
        
        // Immediately remove visible class to trigger fade
        this.wrapper.classList.remove('visible');
        if (this.connectionLine) {
            this.connectionLine.classList.remove('visible');
        }
        
        this.stopLineUpdates();
    }
    
    /**
     * Hide the popup
     */
    hide() {
        if (!this.popup) return;
        
        // Clear any pending timeouts
        if (this.showTimeout) {
            clearTimeout(this.showTimeout);
            this.showTimeout = null;
        }
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
        
        this.wrapper.classList.remove('visible');
        if (this.connectionLine) {
            this.connectionLine.classList.remove('visible');
        }
        this.currentNode = null;
        
        // Clear connection line path after fade
        if (this.connectionLine) {
            setTimeout(() => {
                this.connectionLine.setAttribute('d', '');
            }, 300); // Match CSS transition duration
        }
        
        this.stopLineUpdates();
    }

    /**
     * Center popup on screen
     */
    centerOnScreen() {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        // Get popup dimensions
        const popupRect = this.popup.getBoundingClientRect();
        const popupWidth = popupRect.width || 300; // fallback width
        const popupHeight = popupRect.height || 200; // fallback height
        
        // Calculate center position
        const centerX = (windowWidth - popupWidth) / 2;
        const centerY = (windowHeight - popupHeight) / 2;
        
        this.setPosition(centerX, centerY);
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
        
        // Use fixed offsets
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
        
        if (this.wrapper) {
            this.wrapper.style.left = x + 'px';
            this.wrapper.style.top = y + 'px';
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
        return this.wrapper && this.wrapper.classList.contains('visible');
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
        const wrapperRect = this.wrapper.getBoundingClientRect();
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
     * Apply popup colors from configuration
     */
    applyPopupColors() {
        if (!this.popup || !this.visualizer || !this.visualizer.config) return;
        
        const colors = this.visualizer.config.get('colors');
        if (!colors) return;
        
        // Apply background color
        this.popup.style.setProperty('background-color', colors.popupBackground || 'rgba(0, 0, 0, 0.9)', 'important');
        
        // Apply border color
        this.popup.style.setProperty('border-color', colors.popupPrimary || '#4CAF50', 'important');
        
        // Create rgba shadow color
        const shadowColor = colors.popupPrimary ? this.hexToRgba(colors.popupPrimary, 0.3) : 'rgba(76, 175, 80, 0.3)';
        this.popup.style.setProperty('box-shadow', `0 4px 20px ${shadowColor}`, 'important');
        
        // Apply title color
        if (this.popupTitle) {
            this.popupTitle.style.setProperty('color', colors.popupPrimary || '#4CAF50', 'important');
        }
        
        // Apply content color (secondary)
        if (this.popupName) {
            this.popupName.style.setProperty('color', colors.popupSecondary || '#fff', 'important');
        }
        
        // Apply connection line color
        if (this.connectionLine) {
            this.connectionLine.style.setProperty('stroke', colors.popupPrimary || '#4CAF50', 'important');
        }
        
        // Apply decorative quote colors
        if (this.leftQuote) {
            this.leftQuote.style.setProperty('color', colors.popupPrimary || '#4CAF50', 'important');
        }
        if (this.rightQuote) {
            this.rightQuote.style.setProperty('color', colors.popupPrimary || '#4CAF50', 'important');
        }
        
        // Apply birth location color to all elements with class popup-birth-location
        const birthLocationElements = this.popup.querySelectorAll('.popup-birth-location');
        birthLocationElements.forEach(element => {
            element.style.setProperty('color', colors.popupBirthLocation || '#81C784', 'important');
        });
    }
    
    /**
     * Update popup colors (called when colors change in config)
     */
    updateColors() {
        // Always apply colors, not just when visible
        this.applyPopupColors();
    }
    
    /**
     * Update popup position with current node (called when offset changes)
     */
    updatePosition() {
        if (this.isVisible() && this.currentNode) {
            this.positionNearNode(this.currentNode);
        }
    }
    
    /**
     * Update popup scale
     * @param {number} scale - Scale percentage (50-200)
     */
    updateScale(scale) {
        if (!this.wrapper) return;
        
        // Convert percentage to scale factor
        const scaleFactor = scale / 100;
        
        // Apply transform to the wrapper which includes the popup and quotation marks
        this.wrapper.style.transform = `scale(${scaleFactor})`;
        this.wrapper.style.transformOrigin = 'left top';
    }
    
    /**
     * Apply current scale from config
     */
    applyScale() {
        if (this.config) {
            const scale = this.config.get('popupScale') || 100;
            this.updateScale(scale);
        }
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
        this.wrapper = null;
        this.popup = null;
        this.popupTitle = null;
        this.popupName = null;
        this.connectionLine = null;
        this.leftQuote = null;
        this.rightQuote = null;
        this.contentTemplate = null;
    }
}
