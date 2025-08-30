# Shared Components

Common types, protocols, and utilities shared between frontend, backend, and server.

## Structure

```
shared/
├── types/           # Shared TypeScript/C++ type definitions
│   └── websocket.ts # WebSocket message types
└── protocols/       # Message protocols and schemas
    └── websocket.json # WebSocket protocol definition
```

## Usage

### Frontend Integration
```typescript
import { WebSocketMessage, Stroke, Point } from '../shared/types/websocket';
```

### Server Integration
The C++ server should implement the same message types defined in the shared protocols.

### Type Safety
All components should use the same type definitions to ensure consistency:
- Message formats
- Data structures
- Protocol versions

## Message Types

### Core Types
- `Point`: 2D coordinates
- `Color`: RGBA color values
- `Stroke`: Drawing stroke with points and style

### WebSocket Messages
- Stroke operations: start, point, finish, add, remove, move
- Chat messages: send, receive
- User management: join, leave
- Synchronization: request, response

## Protocol Versioning

The protocol version is defined in `protocols/websocket.json`:
- Version changes should be backward compatible when possible
- Breaking changes require coordination across all components
- Protocol evolution should be documented

## Development

### Adding New Types
1. Define in `types/websocket.ts`
2. Update protocol in `protocols/websocket.json`
3. Update all components to use new types
4. Test integration

### Validation
- Frontend: TypeScript type checking
- Server: C++ type validation
- Protocol: JSON schema validation (future)

## Integration Points

- **Frontend**: Imports types for WebSocket communication
- **Server**: Implements message handling based on shared types
- **Backend**: Uses shared types for data consistency
