# 3D Graph Visualization - Project Architecture

## Overview

This project is a 3D force-directed graph visualization with interactive behaviors including auto-orbit camera movement, node highlighting, and real-time connection logging. The architecture is designed to be modular, extensible, and maintainable.

## Architecture Principles

- **Separation of Concerns**: Each module has a single, well-defined responsibility
- **Modularity**: Components can be developed, tested, and maintained independently
- **Extensibility**: New behaviors and UI components can be easily added
- **Configuration-Driven**: Behavior is controlled through a centralized configuration system
- **Event-Driven**: User interactions and system events trigger appropriate responses

## File Structure

```
graph-visualization/
├── index.html                    # Minimal HTML structure and module imports
├── PROJECT_ARCHITECTURE.md       # This documentation file
├── css/
│   └── styles.css               # All styling (UI, graph, animations)
├── js/
│   ├── main.js                  # Entry point and application initialization
│   ├── GraphBehaviorController.js # Main controller coordinating all behaviors
│   ├── config.js                # Centralized configuration management
│   ├── ui/
│   │   ├── controls.js          # Control panel interactions and updates
│   │   ├── popup.js             # Node popup display and dragging
│   │   └── logger.js            # Connection log management and display
│   └── graph/
│       ├── generator.js         # Graph data generation algorithms
│       ├── visualizer.js        # 3D Force Graph setup and visual updates
│       └── behaviors/
│           └── orbit.js         # Camera orbit behavior and transitions
└── lib/
    └── (external libraries if needed locally)
```

## Module Descriptions

### Core Modules

#### `GraphBehaviorController.js`
- **Purpose**: Main orchestrator that coordinates all graph behaviors
- **Responsibilities**:
  - Initialize and manage all sub-modules
  - Handle high-level state management
  - Coordinate interactions between modules
  - Provide public API for external interactions

#### `config.js`
- **Purpose**: Centralized configuration management
- **Responsibilities**:
  - Define default configuration values
  - Provide configuration validation
  - Handle configuration updates and persistence
  - Export configuration constants

### UI Modules

#### `ui/controls.js`
- **Purpose**: Manage control panel interactions
- **Responsibilities**:
  - Handle slider and button events
  - Update configuration values
  - Provide visual feedback for control states
  - Manage control panel visibility and layout

#### `ui/popup.js`
- **Purpose**: Node popup functionality
- **Responsibilities**:
  - Display node information popups
  - Handle popup dragging and positioning
  - Manage popup visibility and animations
  - Draw connection lines between popup and nodes

#### `ui/logger.js`
- **Purpose**: Connection log display and management
- **Responsibilities**:
  - Maintain connection history
  - Update log display with fade effects
  - Format connection information
  - Handle log entry lifecycle

### Graph Modules

#### `graph/generator.js`
- **Purpose**: Graph data generation
- **Responsibilities**:
  - Generate nodes and links based on configuration
  - Ensure graph connectivity (spanning tree)
  - Apply density-based random connections
  - Provide graph validation utilities

#### `graph/visualizer.js`
- **Purpose**: 3D Force Graph setup and visual management
- **Responsibilities**:
  - Initialize 3D Force Graph instance
  - Handle node and link visual properties
  - Manage highlighting and selection states
  - Apply visual updates and animations

#### `graph/behaviors/orbit.js`
- **Purpose**: Camera orbit behavior
- **Responsibilities**:
  - Manage auto-orbit functionality
  - Handle smooth camera transitions
  - Calculate orbit paths and timing
  - Coordinate with node selection for focus changes

## Data Flow

1. **Initialization**: `main.js` creates `GraphBehaviorController` with default config
2. **Graph Generation**: Controller uses `generator.js` to create graph data
3. **Visualization Setup**: Controller initializes `visualizer.js` with graph data
4. **UI Initialization**: Controller sets up all UI modules (`controls.js`, `popup.js`, `logger.js`)
5. **Behavior Activation**: User interactions trigger behaviors through the controller
6. **State Updates**: Configuration changes propagate through all relevant modules

## Event System

### User Events
- **Control Changes**: Slider/button interactions → `controls.js` → `GraphBehaviorController` → affected modules
- **Node Selection**: Click events → `visualizer.js` → `GraphBehaviorController` → `popup.js` + `logger.js`
- **Popup Dragging**: Mouse events → `popup.js` → visual updates

### System Events
- **Orbit Transitions**: Timer events → `orbit.js` → `visualizer.js` → visual updates
- **Configuration Updates**: Config changes → `config.js` → all dependent modules
- **Graph Regeneration**: User trigger → `generator.js` → `visualizer.js` → full refresh

## Configuration System

The configuration system is centralized in `config.js` and includes:

- **Graph Properties**: Node count, connection density, node size, distances
- **Visual Properties**: Colors, highlighting, connection thickness
- **Behavior Properties**: Orbit speed, focus duration, transition timing
- **UI Properties**: Control panel settings, popup behavior

Configuration changes are validated and propagated to all dependent modules automatically.

## Extension Points

### Adding New Behaviors
1. Create new behavior module in `js/graph/behaviors/`
2. Implement standard behavior interface (start, stop, configure)
3. Register behavior with `GraphBehaviorController`
4. Add corresponding UI controls if needed

### Adding New UI Components
1. Create new UI module in `js/ui/`
2. Implement standard UI interface (initialize, update, destroy)
3. Register component with `GraphBehaviorController`
4. Add corresponding CSS styles

### Adding New Graph Algorithms
1. Extend `generator.js` with new generation methods
2. Add configuration options in `config.js`
3. Update UI controls to expose new options
4. Test with existing visualization system

## Dependencies

### External Libraries
- **3d-force-graph**: Main 3D visualization library
- **three-spritetext**: Text rendering for 3D space
- **D3.js**: Included with 3d-force-graph for force simulation

### Browser APIs
- **Canvas/WebGL**: For 3D rendering
- **RequestAnimationFrame**: For smooth animations
- **Local Storage**: For configuration persistence (future)

## Future Considerations

### Planned Features
- **Path Finding**: Shortest path visualization between nodes
- **Clustering**: Dynamic node grouping and visualization
- **Data Import**: Load graph data from external sources
- **Graph Editing**: Interactive node/link creation and deletion
- **Performance Optimization**: Level-of-detail rendering for large graphs
- **Export Functionality**: Save graph states and configurations

### Scalability
- **Lazy Loading**: Load behaviors and UI components on demand
- **Web Workers**: Move heavy computations off main thread
- **Virtual Rendering**: Optimize rendering for very large graphs
- **Caching**: Cache generated graphs and computed layouts

### Extensibility
- **Plugin System**: Allow third-party behavior extensions
- **Theme System**: Customizable visual themes
- **API Layer**: RESTful API for external integrations
- **Configuration Profiles**: Save and load different setups

## Development Guidelines

1. **Module Independence**: Each module should be testable in isolation
2. **Error Handling**: Graceful degradation when modules fail
3. **Performance**: Minimize DOM manipulation and optimize animations
4. **Documentation**: Keep this architecture document updated
5. **Testing**: Write unit tests for core algorithms and behaviors
