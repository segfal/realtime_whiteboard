# Architecture Diagrams

This directory contains comprehensive UML class diagrams for the real-time whiteboard application, including frontend, backend, WebSocket, and ML shapes architecture.

## Files Overview

### 📁 `frontend-architecture.md`

**Frontend Architecture - UML Class Diagram**

Contains a comprehensive UML class diagram for the React-based frontend application:

- **UML Class Diagram**: Shows all React components, state management, tool system, WASM integration, and WebSocket communication
- **Key Features & Capabilities**: Overview of frontend capabilities
- **File Structure**: Complete directory structure
- **Performance Characteristics**: Frontend performance metrics

### 📁 `backend-architecture.md`

**Backend Architecture - UML Class Diagram**

Contains a comprehensive UML class diagram for the C++ backend with WebAssembly compilation:

- **UML Class Diagram**: Shows C++ classes, shape hierarchy, drawing engine, and WASM bindings
- **Key Features & Capabilities**: Overview of backend capabilities
- **File Structure**: Complete directory structure
- **Performance Characteristics**: Backend performance metrics

### 📁 `websocket-architecture.md`

**WebSocket Architecture - UML Class Diagram**

Contains a comprehensive UML class diagram for real-time collaboration:

- **UML Class Diagram**: Shows WebSocket client/server classes, message handling, session management, and connection management
- **Real-Time Collaboration Flow**: Message flow and synchronization patterns
- **Key Features & Capabilities**: Overview of WebSocket capabilities
- **Performance Characteristics**: WebSocket performance metrics

### 📁 `docs/diagrams/ml-shapes-architecture.md`

**ML Shapes Architecture - UML Class Diagram**

Contains a comprehensive UML class diagram for the machine learning shape recognition system:

- **UML Class Diagram**: Shows PyTorch-based CNN architecture, dataset handling, training pipeline, and prediction engine
- **Key Features & Capabilities**: Overview of ML capabilities
- **File Structure**: Complete directory structure
- **Performance Characteristics**: ML performance metrics

## How to Use These Diagrams

### 1. **Understanding System Architecture**

Start with the UML Class Diagrams to understand the complete class structure and relationships in each system component.

### 2. **Class Relationships**

Use the UML Class Diagrams to understand:

- How classes interact with each other
- Inheritance and interface implementations
- Dependency relationships
- Data flow between components

### 3. **System Integration**

Follow the relationships between classes to understand:

- How frontend components communicate with backend
- WebSocket message flow between client and server
- ML model integration with the drawing system
- Data flow across the entire application

### 4. **Real-Time Collaboration**

Review the WebSocket architecture to understand:

- Client-server communication patterns
- Message handling and routing
- Session management and user tracking
- Error handling and reconnection logic

### 5. **Machine Learning Integration**

Review the ML Shapes architecture to understand:

- PyTorch-based CNN model structure
- Training and inference pipelines
- Dataset processing and augmentation
- Model serving and prediction workflows

### 6. **Performance & Scalability**

Examine the class structures to understand:

- Memory management strategies
- Performance optimization techniques
- Scalability considerations
- Resource utilization patterns

## Diagram Format

### 🔄 **Mermaid UML Class Diagrams**

All diagrams are written in Mermaid UML class diagram syntax, which can be rendered in:

- GitHub (native support)
- GitLab (native support)
- VS Code (with Mermaid extension)
- Online Mermaid Live Editor
- Documentation generators

### 📊 **Diagram Elements**

1. **Class Definitions**

   - Attributes (public, private, protected)
   - Methods with parameters and return types
   - Abstract classes and interfaces

2. **Relationships**

   - Inheritance (extends)
   - Implementation (implements)
   - Association (uses)
   - Composition (contains)
   - Aggregation (has-a)

3. **Annotations**

   - Stereotypes (<<interface>>, <<abstract>>)
   - Notes and comments
   - Grouping and packages

## Viewing Diagrams

### GitHub/GitLab

Diagrams render automatically in markdown files on GitHub and GitLab.

### VS Code

Install the "Mermaid Preview" extension to view diagrams inline.

### Online Editor

Use the [Mermaid Live Editor](https://mermaid.live/) to:

- Paste diagram code
- View rendered diagrams
- Export to various formats
- Debug diagram syntax

### Local Development

```bash
# Install Mermaid CLI for local rendering
npm install -g @mermaid-js/mermaid-cli

# Render diagram to PNG
mmdc -i diagram.md -o diagram.png

# Render diagram to SVG
mmdc -i diagram.md -o diagram.svg
```

## Architecture Patterns

### Frontend Patterns

- **React Context Pattern**: Global state management
- **Hook Pattern**: Custom hooks for logic reuse
- **Component Composition**: Modular UI components
- **Tool Strategy Pattern**: Polymorphic drawing tools

### Backend Patterns

- **Factory Pattern**: Shape creation
- **Strategy Pattern**: Different shape types
- **Observer Pattern**: Event-driven updates
- **Bridge Pattern**: WASM integration

### WebSocket Patterns

- **Observer Pattern**: Event-driven communication
- **Session Pattern**: User session management
- **Message Handler Pattern**: Command processing
- **Connection Pool Pattern**: Resource management

### ML Patterns

- **Pipeline Pattern**: Data processing pipeline
- **Strategy Pattern**: Different model architectures
- **Factory Pattern**: Model creation
- **Observer Pattern**: Training progress monitoring

### Integration Patterns

- **Bridge Pattern**: WASM integration
- **Adapter Pattern**: WebSocket communication
- **Facade Pattern**: Simplified API interfaces
- **Proxy Pattern**: Model serving

## Performance Considerations

### Frontend Performance

- **60 FPS Rendering**: Optimized canvas updates
- **Memory Efficiency**: Efficient stroke storage
- **WASM Integration**: High-performance drawing operations
- **Lazy Loading**: On-demand component loading

### Backend Performance

- **Vector Operations**: Efficient shape management
- **WASM Optimization**: Compiled C++ performance
- **Memory Management**: Optimized data structures
- **Concurrent Processing**: Multi-threaded operations

### WebSocket Performance

- **Low Latency**: < 50ms message delivery
- **High Throughput**: 1000+ messages per second
- **Connection Pooling**: Efficient resource usage
- **Message Batching**: Optimized network usage

### ML Performance

- **GPU Acceleration**: CUDA-enabled training
- **Batch Processing**: Efficient data loading
- **Model Optimization**: Quantization and pruning
- **Inference Speed**: < 50ms prediction latency

## Scalability Features

### Multi-User Support

- Real-time collaboration
- WebSocket-based synchronization
- Session management
- User presence tracking

### Performance Scaling

- Efficient data structures
- Optimized algorithms
- Resource pooling
- Caching strategies

### ML Model Scaling

- Distributed training
- Model versioning
- A/B testing support
- Performance monitoring

## Development Workflow

### Understanding Changes

1. Review relevant UML class diagrams
2. Identify affected classes and relationships
3. Understand impact on other components
4. Plan integration points

### Adding Features

1. Locate appropriate classes in the diagrams
2. Follow established patterns and relationships
3. Maintain consistency with existing architecture
4. Update diagrams as needed

### Debugging Issues

1. Trace through class relationships
2. Check method signatures and parameters
3. Verify data flow between components
4. Review error handling patterns

### Code Review

1. Compare implementation with diagrams
2. Verify class relationships are maintained
3. Check for architectural consistency
4. Ensure performance considerations

## Maintenance

### Keeping Diagrams Updated

- Update class diagrams when architecture changes
- Maintain consistency between frontend, backend, WebSocket, and ML components
- Version control diagram changes with code changes
- Regular review and validation

### Version Control

- Commit diagram changes with code changes
- Use meaningful commit messages
- Tag major architectural changes
- Maintain diagram history

### Documentation

- Keep diagrams synchronized with code
- Update documentation when diagrams change
- Provide context for architectural decisions
- Document performance implications

## Integration Points

### Frontend ↔ Backend

- WASM function calls
- WebSocket message exchange
- State synchronization
- Error handling coordination

### Frontend ↔ WebSocket

- Real-time message handling
- Connection state management
- User presence updates
- Drawing synchronization

### Backend ↔ WebSocket

- Message processing
- Session management
- Drawing state updates
- User coordination

### ML ↔ Application

- Model serving integration
- Prediction API endpoints
- Training job management
- Performance monitoring

## Security Considerations

### WebSocket Security

- Connection authentication
- Message validation
- Rate limiting
- Input sanitization

### ML Model Security

- Model file integrity
- Input validation
- Output sanitization
- Access control

### Data Protection

- User data privacy
- Secure communication
- Access logging
- Audit trails

### 📁 `component-architecture.md`

**Component Architecture - System Communication Diagram**

Contains a comprehensive component diagram showing how all parts of the system communicate:

- **Component Diagram**: Shows Frontend, WebSocket Server, WASM Backend, and Shared components
- **Communication Flow**: Detailed message flow between components
- **Technology Stack**: Technology used in each component
- **Deployment Architecture**: Development and production deployment patterns

### 📁 `component-flow.md`

**Component Flow - Simple Communication Diagram**

Contains a simplified visual diagram showing component interactions:

- **ASCII Diagram**: Simple visual representation of component relationships
- **Communication Patterns**: Real-time drawing, chat, and synchronization flows
- **Data Flow Examples**: Step-by-step examples of common operations
- **Technology Summary**: Quick reference for technology stack

## System Integration Overview

The component diagrams show how the four main architectural components work together:

1. **Frontend** (React/TypeScript) - User interface and interaction
2. **WebSocket Server** (C++/Docker) - Real-time communication
3. **Backend** (WASM/WebGPU) - Drawing engine and rendering
4. **Shared** (Types/Protocols) - Common definitions and protocols

### Key Integration Points

- **Real-time Drawing**: Frontend ↔ WebSocket Server ↔ WASM Backend
- **Chat System**: Frontend ↔ WebSocket Server
- **State Synchronization**: All components via shared protocols
- **Type Safety**: All components using shared type definitions

### Communication Patterns

- **WebSocket**: Bidirectional real-time messaging
- **WASM Calls**: Direct function calls for local processing
- **Shared Types**: Type safety across all components
- **Protocol Validation**: Consistent message formats
