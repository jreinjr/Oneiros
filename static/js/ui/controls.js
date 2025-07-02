/**
 * Controls UI module
 * Handles control panel interactions and updates
 */

/**
 * Controls manager class
 */
export class ControlsManager {
    constructor(config) {
        this.config = config;
        this.elements = new Map();
        this.callbacks = new Map();
        
        this.initialize();
    }

    /**
     * Initialize control elements and event listeners
     */
    initialize() {
        this.setupSliders();
        this.setupButtons();
        this.setupConfigListeners();
    }

    /**
     * Setup slider controls
     */
    setupSliders() {
        const sliders = [
            'nodeCount', 'connectionDensity',
            'nodeSize', 'nodeDistance', 'connectionThickness', 'highlightSteps'
        ];

        sliders.forEach(id => {
            const slider = document.getElementById(id);
            const valueDisplay = document.getElementById(id + 'Value');
            
            if (!slider || !valueDisplay) {
                console.warn(`Control elements not found for: ${id}`);
                return;
            }

            this.elements.set(id, { slider, valueDisplay });
            
            // Set initial value
            const currentValue = this.config.get(id);
            slider.value = currentValue;
            valueDisplay.textContent = currentValue;
            
            // Add event listener
            slider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                valueDisplay.textContent = value;
                this.config.set(id, value);
                
                // Trigger specific callbacks
                this.triggerCallback(id, value);
            });
        });
    }

    /**
     * Setup button controls
     */
    setupButtons() {
        // Regenerate Graph button (now Generate Random Graph)
        const regenerateBtn = document.getElementById('regenerateGraph');
        if (regenerateBtn) {
            this.elements.set('regenerateGraph', regenerateBtn);
            regenerateBtn.addEventListener('click', () => {
                this.triggerCallback('regenerateGraph');
            });
        }

        // Generate Belief Graph button
        const beliefGraphBtn = document.getElementById('generateBeliefGraph');
        if (beliefGraphBtn) {
            this.elements.set('generateBeliefGraph', beliefGraphBtn);
            beliefGraphBtn.addEventListener('click', () => {
                this.triggerCallback('generateBeliefGraph');
            });
        }

    }

    /**
     * Setup configuration change listeners
     */
    setupConfigListeners() {
        // Listen for external config changes to update UI
        const sliderKeys = [
            'nodeCount', 'connectionDensity',
            'nodeSize', 'nodeDistance', 'connectionThickness', 'highlightSteps'
        ];

        sliderKeys.forEach(key => {
            this.config.addListener(key, (configKey, newValue) => {
                this.updateSliderValue(configKey, newValue);
            });
        });
    }

    /**
     * Update slider value from external source
     * @param {string} key - Configuration key
     * @param {*} value - New value
     */
    updateSliderValue(key, value) {
        const elements = this.elements.get(key);
        if (elements) {
            elements.slider.value = value;
            elements.valueDisplay.textContent = value;
        }
    }


    /**
     * Set callback for control events
     * @param {string} controlId - Control identifier
     * @param {Function} callback - Callback function
     */
    setCallback(controlId, callback) {
        if (!this.callbacks.has(controlId)) {
            this.callbacks.set(controlId, new Set());
        }
        this.callbacks.get(controlId).add(callback);
    }

    /**
     * Remove callback for control events
     * @param {string} controlId - Control identifier
     * @param {Function} callback - Callback function to remove
     */
    removeCallback(controlId, callback) {
        if (this.callbacks.has(controlId)) {
            this.callbacks.get(controlId).delete(callback);
        }
    }

    /**
     * Trigger callbacks for a control
     * @param {string} controlId - Control identifier
     * @param {*} value - Value to pass to callbacks
     */
    triggerCallback(controlId, value = null) {
        if (this.callbacks.has(controlId)) {
            this.callbacks.get(controlId).forEach(callback => {
                try {
                    callback(controlId, value);
                } catch (error) {
                    console.error(`Error in control callback for '${controlId}':`, error);
                }
            });
        }
    }

    /**
     * Get current value of a control
     * @param {string} controlId - Control identifier
     * @returns {*} Current value
     */
    getValue(controlId) {
        const elements = this.elements.get(controlId);
        if (elements && elements.slider) {
            return parseFloat(elements.slider.value);
        }
        return null;
    }

    /**
     * Set value of a control
     * @param {string} controlId - Control identifier
     * @param {*} value - Value to set
     * @param {boolean} triggerCallback - Whether to trigger callbacks
     */
    setValue(controlId, value, triggerCallback = false) {
        const elements = this.elements.get(controlId);
        if (elements && elements.slider) {
            elements.slider.value = value;
            elements.valueDisplay.textContent = value;
            
            if (triggerCallback) {
                this.triggerCallback(controlId, value);
            }
        }
    }

    /**
     * Enable or disable a control
     * @param {string} controlId - Control identifier
     * @param {boolean} enabled - Whether to enable the control
     */
    setEnabled(controlId, enabled) {
        const elements = this.elements.get(controlId);
        if (elements) {
            if (elements.slider) {
                elements.slider.disabled = !enabled;
            }
            if (elements.button) {
                elements.button.disabled = !enabled;
            }
        }
    }

    /**
     * Show or hide the controls panel
     * @param {boolean} visible - Whether to show the panel
     */
    setVisible(visible) {
        const panel = document.getElementById('controls-panel');
        if (panel) {
            panel.style.display = visible ? 'block' : 'none';
        }
    }

    /**
     * Get configuration limits for a control
     * @param {string} controlId - Control identifier
     * @returns {Object|null} Limits object
     */
    getLimits(controlId) {
        return this.config.getLimits(controlId);
    }

    /**
     * Validate control value
     * @param {string} controlId - Control identifier
     * @param {*} value - Value to validate
     * @returns {boolean} Whether value is valid
     */
    isValidValue(controlId, value) {
        return this.config.isValidValue(controlId, value);
    }

    /**
     * Reset all controls to default values
     * @param {boolean} triggerCallbacks - Whether to trigger callbacks
     */
    resetToDefaults(triggerCallbacks = false) {
        this.config.reset(false); // Don't notify to avoid double updates
        
        // Update UI elements
        this.elements.forEach((elements, controlId) => {
            if (elements.slider) {
                const defaultValue = this.config.get(controlId);
                elements.slider.value = defaultValue;
                elements.valueDisplay.textContent = defaultValue;
                
                if (triggerCallbacks) {
                    this.triggerCallback(controlId, defaultValue);
                }
            }
        });
    }

    /**
     * Get all current control values
     * @returns {Object} Object with control values
     */
    getAllValues() {
        const values = {};
        this.elements.forEach((elements, controlId) => {
            if (elements.slider) {
                values[controlId] = parseFloat(elements.slider.value);
            }
        });
        return values;
    }

    /**
     * Set multiple control values
     * @param {Object} values - Object with control values
     * @param {boolean} triggerCallbacks - Whether to trigger callbacks
     */
    setAllValues(values, triggerCallbacks = false) {
        Object.entries(values).forEach(([controlId, value]) => {
            this.setValue(controlId, value, triggerCallbacks);
        });
    }

    /**
     * Add custom control element
     * @param {string} controlId - Control identifier
     * @param {HTMLElement} element - Control element
     * @param {Function} valueGetter - Function to get value from element
     * @param {Function} valueSetter - Function to set value on element
     */
    addCustomControl(controlId, element, valueGetter, valueSetter) {
        this.elements.set(controlId, {
            element,
            getValue: valueGetter,
            setValue: valueSetter
        });
    }

    /**
     * Dispose of the controls manager and clean up resources
     */
    dispose() {
        // Remove event listeners
        this.elements.forEach((elements) => {
            if (elements.slider) {
                elements.slider.removeEventListener('input', () => {});
            }
            if (elements.button) {
                elements.button.removeEventListener('click', () => {});
            }
        });
        
        this.elements.clear();
        this.callbacks.clear();
        this.config = null;
    }
}
