# Real-time Collaborative Whiteboard

A desktop application for real-time collaborative drawing and whiteboarding, built with C++ and modern graphics libraries.

## Features

- 🎨 Real-time drawing with various tools (pen, eraser, shapes, text)
- 👥 Multi-user collaboration via WebSocket
- 💾 Export boards as PNG images
- 🔗 Shareable board links
- 💬 Built-in chat functionality

## Dependencies

- SDL2 - Window management and input handling
- Dear ImGui - User interface
- Skia - Vector graphics engine
- uWebSockets - WebSocket client
- OpenGL - Graphics rendering

## Building from Source

1. Clone the repository:
```bash
git clone https://github.com/yourusername/realtime_whiteboard.git
cd realtime_whiteboard
```

2. Run the setup script to clone dependencies:
```bash
./setup.sh
```

3. Create a build directory and run CMake:
```bash
mkdir build && cd build
cmake ..
make
```

4. Run the application:
```bash
./realtime_whiteboard
```

## Project Structure

```
src/
├── core/       # Drawing model, tools, canvas logic
├── ui/         # ImGui controls and interface
├── net/        # WebSocket client and message handling
├── platform/   # SDL2 & Skia bridge
└── export/     # PNG + JSON saving functionality
```

## Development

The project uses CMake as its build system. The main components are:

- Canvas Engine (Skia)
- UI System (Dear ImGui)
- Networking (WebSockets)
- Export System (PNG + JSON)

## License

MIT License - see LICENSE file for details 