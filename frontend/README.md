# Frontend - Real-time Whiteboard

This is the frontend for the real-time whiteboard application.

## 📚 **Documentation**

All documentation is located in the [docs/](./docs/) folder:

- **[📖 Documentation Index](./docs/DOCUMENTATION_INDEX.md)** - Start here! Complete guide to all documentation
- **[🗺️ Project Roadmap](./docs/PROJECT_ROADMAP.md)** - Overview of the entire system
- **[🎨 Components Guide](./docs/COMPONENTS_GUIDE.md)** - How React components work
- **[🛠️ Tools Guide](./docs/TOOLS_GUIDE.md)** - Understanding the drawing tools
- **[🪝 Hooks Guide](./docs/HOOKS_GUIDE.md)** - React logic and state management
- **[🏷️ Types Guide](./docs/TYPES_GUIDE.md)** - TypeScript types and interfaces
- **[⚡ WASM Guide](./docs/WASM_GUIDE.md)** - WebAssembly integration

## 🚀 **Quick Start**

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check
```

## 🏗️ **Architecture**

```
React UI ←→ Tool System ←→ WASM Engine (C++)
```

The frontend uses React for the user interface, a modular tool system for drawing functionality, and WebAssembly for high-performance graphics operations.

For detailed information, see the [Project Roadmap](./docs/PROJECT_ROADMAP.md). 