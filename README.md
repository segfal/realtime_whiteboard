# Realtime Whiteboard

A real-time whiteboard application built with C++17 and OpenGL, allowing users to draw and interact with a canvas in real-time.

## Features

- Real-time drawing capabilities using OpenGL
- Smooth line rendering
- Mouse-based drawing interface
- Clean, modern architecture

## Dependencies

- C++17 compatible compiler
- CMake (version 3.10 or higher)
- OpenGL
- GLFW 3.x

## Building the Project

1. Install dependencies (macOS):
```bash
brew install glfw
```

2. Create a build directory:
```bash
mkdir build
cd build
```

3. Generate build files:
```bash
cmake ..
```

4. Build the project:
```bash
make
```

## Project Structure

```
.
├── CMakeLists.txt
├── include/
│   └── Canvas.hpp
├── src/
│   ├── Canvas.cpp
│   └── main.cpp
├── build.sh
└── README.md
```

## Usage

After building, run the executable:
```bash
./RealtimeWhiteboard
```

Controls:
- Left mouse button: Draw
- ESC: Exit application

## License

This project is licensed under the MIT License - see the LICENSE file for details. 