/**
 * Main entry point for 3D Graph Visualization
 * Initializes the application when the page loads
 */

import { GraphBehaviorController } from './GraphBehaviorController.js';

/**
 * Application initialization
 */
class Application {
    constructor() {
        this.controller = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the application
     */
    async init() {
        if (this.isInitialized) {
            console.warn('Application already initialized');
            return;
        }

        try {
            console.log('Initializing 3D Graph Visualization...');
            
            // Create and initialize the main controller
            this.controller = new GraphBehaviorController();
            
            // Set up global error handling
            this.setupErrorHandling();
            
            // Set up window event handlers
            this.setupWindowEvents();
            
            this.isInitialized = true;
            console.log('3D Graph Visualization initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize application:', error);
            this.showErrorMessage('Failed to initialize the application. Please refresh the page.');
        }
    }

    /**
     * Set up global error handling
     */
    setupErrorHandling() {
        // Handle uncaught errors
        window.addEventListener('error', (event) => {
            console.error('Uncaught error:', event.error);
            this.showErrorMessage('An unexpected error occurred. The application may not function correctly.');
        });

        // Handle unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.showErrorMessage('An unexpected error occurred. The application may not function correctly.');
        });
    }

    /**
     * Set up window event handlers
     */
    setupWindowEvents() {
        // Handle window resize
        window.addEventListener('resize', () => {
            // The 3D Force Graph should handle resize automatically,
            // but we can add custom logic here if needed
        });

        // Handle page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Page is hidden - could pause animations to save resources
                console.log('Page hidden - consider pausing animations');
            } else {
                // Page is visible - resume animations
                console.log('Page visible - resume animations');
            }
        });

        // Handle beforeunload to clean up resources
        window.addEventListener('beforeunload', () => {
            this.dispose();
        });
    }

    /**
     * Show error message to user
     * @param {string} message - Error message to display
     */
    showErrorMessage(message) {
        // Create a simple error overlay
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(255, 0, 0, 0.9);
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 10000;
            max-width: 300px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        `;
        errorDiv.textContent = message;
        
        document.body.appendChild(errorDiv);
        
        // Auto-remove after 10 seconds
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.parentNode.removeChild(errorDiv);
            }
        }, 10000);
    }

    /**
     * Get the main controller instance
     * @returns {GraphBehaviorController|null} Controller instance
     */
    getController() {
        return this.controller;
    }

    /**
     * Check if application is initialized
     * @returns {boolean} Whether application is initialized
     */
    isReady() {
        return this.isInitialized && this.controller !== null;
    }

    /**
     * Dispose of the application and clean up resources
     */
    dispose() {
        if (this.controller) {
            this.controller.dispose();
            this.controller = null;
        }
        this.isInitialized = false;
        console.log('Application disposed');
    }

    /**
     * Restart the application
     */
    async restart() {
        console.log('Restarting application...');
        this.dispose();
        await this.init();
    }
}

// Create global application instance
const app = new Application();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        app.init();
    });
} else {
    // DOM is already ready
    app.init();
}

// Export for global access (useful for debugging)
window.GraphApp = app;

// Export for module usage
export default app;
