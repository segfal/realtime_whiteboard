# 🔧 CMake Configuration Guide - Complete Documentation

## 📋 Table of Contents
- [Overview](#overview)
- [CMakeLists.txt Breakdown](#cmakeliststxt-breakdown)
- [Library Integration](#library-integration)
- [Emscripten Configuration](#emscripten-configuration)
- [Build Process](#build-process)
- [Function Documentation](#function-documentation)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

This document provides a complete breakdown of the CMake configuration for the whiteboard rendering system. It explains every function, flag, and setting to help you understand how the build system works.

---

## 🏗️ CMakeLists.txt Breakdown

### 1. Project Setup

```cmake
cmake_minimum_required(VERSION 3.16)
project(drawing_engine)
set(CMAKE_CXX_STANDARD 17)
```

**What Each Line Does:**

- **`cmake_minimum_required(VERSION 3.16)`**: 
  - Sets the minimum CMake version required
  - Version 3.16 supports modern C++ features and Emscripten integration
  - Ensures compatibility across different build environments

- **`project(drawing_engine)`**: 
  - Defines the project name as "drawing_engine"
  - Sets up project-specific variables and targets
  - Used for documentation and IDE integration

- **`set(CMAKE_CXX_STANDARD 17)`**: 
  - Enables C++17 standard features
  - Required for modern C++ features like `std::unique_ptr`, `auto`, structured bindings
  - Ensures consistent compilation across platforms

### 2. Emscripten Configuration

```cmake
if(EMSCRIPTEN)
    # Enable WebGL2, SDL2, and WebGPU support
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s USE_WEBGL2=1 -s USE_SDL=2 -s FULL_ES3=1 -s USE_WEBGPU=1")
    
    # Enable threading for better performance
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s USE_PTHREADS=1 -s PTHREAD_POOL_SIZE=4")
    
    # Enable SIMD for vector operations
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -msimd128")
    
    # Enable exception handling
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s DISABLE_EXCEPTION_CATCHING=0")
endif()
```

**What Each Flag Does:**

#### WebGL2 and Graphics Support
- **`-s USE_WEBGL2=1`**: 
  - Enables WebGL2 support in Emscripten
  - Provides OpenGL ES 3.0 API for hardware-accelerated rendering
  - Required for the OpenGL renderer implementation

- **`-s USE_SDL=2`**: 
  - Links SDL2 library for software rendering and window management
  - Provides cross-platform input handling and pixel manipulation
  - Required for the SDL renderer implementation

- **`-s FULL_ES3=1`**: 
  - Enables full OpenGL ES 3.0 feature set
  - Provides advanced shader features and better performance
  - Ensures maximum compatibility with modern browsers

- **`-s USE_WEBGPU=1`**: 
  - Enables WebGPU support (experimental)
  - Provides modern GPU acceleration capabilities
  - Required for the WebGPU renderer implementation

#### Performance Optimizations
- **`-s USE_PTHREADS=1`**: 
  - Enables Web Workers for multi-threading
  - Allows parallel processing of rendering operations
  - Improves performance for complex drawing operations

- **`-s PTHREAD_POOL_SIZE=4`**: 
  - Sets the number of worker threads to 4
  - Balances performance with memory usage
  - Can be adjusted based on target device capabilities

- **`-msimd128`**: 
  - Enables SIMD (Single Instruction, Multiple Data) instructions
  - Accelerates vector and matrix operations
  - Improves performance for mathematical calculations

#### Error Handling
- **`-s DISABLE_EXCEPTION_CATCHING=0`**: 
  - Enables C++ exception handling
  - Allows proper error handling in the rendering code
  - Required for robust error management

### 3. Library Include Directories

```cmake
include_directories(
    ${CMAKE_SOURCE_DIR}/lib/glm
    ${CMAKE_SOURCE_DIR}/lib/clipper/CPP/Clipper2Lib/include
    ${CMAKE_SOURCE_DIR}/lib/clipper/CPP/Clipper2Lib/include/clipper2
    ${CMAKE_SOURCE_DIR}/lib/webgpu
    ${CMAKE_SOURCE_DIR}/include
    ${CMAKE_SOURCE_DIR}/src
)
```

**What Each Directory Contains:**

#### External Libraries
- **`${CMAKE_SOURCE_DIR}/lib/glm`**: 
  - GLM (OpenGL Mathematics) library
  - Provides `glm::vec2`, `glm::vec3`, `glm::vec4`, `glm::mat4` types
  - Used for vector and matrix operations in rendering

- **`${CMAKE_SOURCE_DIR}/lib/clipper/CPP/Clipper2Lib/include`**: 
  - Clipper2 library main include directory
  - Provides advanced geometric operations
  - Used for polygon clipping and path operations

- **`${CMAKE_SOURCE_DIR}/lib/clipper/CPP/Clipper2Lib/include/clipper2`**: 
  - Clipper2 specific headers
  - Contains `clipper.h` with the main API
  - Used for complex shape operations

- **`${CMAKE_SOURCE_DIR}/lib/webgpu`**: 
  - WebGPU headers for modern GPU acceleration
  - Provides `webgpu.h` with WebGPU API
  - Used for the WebGPU renderer implementation

#### Project Directories
- **`${CMAKE_SOURCE_DIR}/include`**: 
  - Project header files
  - Contains renderer interface definitions
  - Used for public API headers

- **`${CMAKE_SOURCE_DIR}/src`**: 
  - Project source files
  - Contains implementation files
  - Used for internal implementation

### 4. Source File Organization

```cmake
# Source files - organized by rendering backend
set(COMMON_SOURCE_FILES
    src/drawing_engine.cpp
    src/renderer/abstract_renderer.cpp
    src/renderer/renderer_factory.cpp
)

set(OPENGL_SOURCE_FILES
    src/renderer/opengl_renderer.cpp
    src/renderer/opengl_shaders.cpp
    src/renderer/opengl_utils.cpp
)

set(SDL_SOURCE_FILES
    src/renderer/sdl_renderer.cpp
    src/renderer/sdl_window_manager.cpp
)

set(WEBGPU_SOURCE_FILES
    src/renderer/webgpu_renderer.cpp
    src/renderer/webgpu_shaders.cpp
    src/renderer/webgpu_utils.cpp
)

# Combine all source files
set(ALL_SOURCE_FILES
    ${COMMON_SOURCE_FILES}
    ${OPENGL_SOURCE_FILES}
    ${SDL_SOURCE_FILES}
    ${WEBGPU_SOURCE_FILES}
)
```

**What Each File Group Does:**

#### Common Files
- **`src/drawing_engine.cpp`**: 
  - Main drawing engine implementation
  - Coordinates between different renderers
  - Provides the public API for JavaScript

- **`src/renderer/abstract_renderer.cpp`**: 
  - Base renderer interface implementation
  - Common functionality shared by all renderers
  - Performance monitoring and statistics

- **`src/renderer/renderer_factory.cpp`**: 
  - Factory pattern implementation
  - Creates appropriate renderer based on platform
  - Handles renderer selection and fallback

#### OpenGL Renderer Files
- **`src/renderer/opengl_renderer.cpp`**: 
  - OpenGL/WebGL2 renderer implementation
  - Hardware-accelerated rendering
  - Shader-based drawing operations

- **`src/renderer/opengl_shaders.cpp`**: 
  - OpenGL shader compilation and management
  - Vertex and fragment shader handling
  - Shader program linking and validation

- **`src/renderer/opengl_utils.cpp`**: 
  - OpenGL utility functions
  - Error checking and debugging
  - Buffer management helpers

#### SDL Renderer Files
- **`src/renderer/sdl_renderer.cpp`**: 
  - SDL2 software renderer implementation
  - Pixel-level drawing operations
  - Software-based rendering fallback

- **`src/renderer/sdl_window_manager.cpp`**: 
  - SDL window and surface management
  - Input handling and event processing
  - Cross-platform window operations

#### WebGPU Renderer Files
- **`src/renderer/webgpu_renderer.cpp`**: 
  - WebGPU modern renderer implementation
  - GPU-accelerated rendering
  - Modern graphics pipeline

- **`src/renderer/webgpu_shaders.cpp`**: 
  - WebGPU shader management
  - WGSL shader compilation
  - Pipeline state management

- **`src/renderer/webgpu_utils.cpp`**: 
  - WebGPU utility functions
  - Device and adapter management
  - Buffer and texture helpers

### 5. Executable Configuration

```cmake
# Create the WebAssembly module
add_executable(drawing_engine ${ALL_SOURCE_FILES})

# Set WebAssembly specific properties
set_target_properties(drawing_engine PROPERTIES
    SUFFIX ".js"
    LINK_FLAGS "--bind -s MODULARIZE=1 -s EXPORT_NAME=createDrawingEngineModule -s ENVIRONMENT=web -s ALLOW_MEMORY_GROWTH=1 -s EXPORTED_RUNTIME_METHODS=['ccall','cwrap'] -s EXPORTED_FUNCTIONS=['_malloc','_free']"
)
```

**What Each Property Does:**

#### Target Properties
- **`SUFFIX ".js"`**: 
  - Changes output file extension to `.js`
  - Creates `drawing_engine.js` instead of `drawing_engine`
  - Required for Emscripten JavaScript wrapper

#### Link Flags
- **`--bind`**: 
  - Enables Emscripten's Embind for C++/JavaScript binding
  - Allows calling C++ functions from JavaScript
  - Provides automatic type conversion

- **`-s MODULARIZE=1`**: 
  - Creates a modular JavaScript output
  - Wraps the WebAssembly module in a factory function
  - Enables better integration with modern JavaScript

- **`-s EXPORT_NAME=createDrawingEngineModule`**: 
  - Sets the name of the factory function
  - JavaScript will call `createDrawingEngineModule()` to create the module
  - Provides a clean API for module initialization

- **`-s ENVIRONMENT=web`**: 
  - Specifies the target environment as web browser
  - Optimizes the output for browser execution
  - Enables browser-specific features

- **`-s ALLOW_MEMORY_GROWTH=1`**: 
  - Allows the WebAssembly memory to grow dynamically
  - Prevents out-of-memory errors during complex operations
  - Improves stability for large drawings

- **`-s EXPORTED_RUNTIME_METHODS=['ccall','cwrap']`**: 
  - Exports Emscripten runtime methods
  - `ccall`: Call C++ functions with automatic type conversion
  - `cwrap`: Create JavaScript wrappers for C++ functions

- **`-s EXPORTED_FUNCTIONS=['_malloc','_free']`**: 
  - Exports memory management functions
  - Allows JavaScript to allocate/deallocate memory
  - Required for proper memory management

### 6. Installation

```cmake
# Install target
install(TARGETS drawing_engine DESTINATION ${CMAKE_BINARY_DIR})
```

**What This Does:**
- **`install(TARGETS drawing_engine DESTINATION ${CMAKE_BINARY_DIR})`**: 
  - Specifies where to install the built files
  - Copies output files to the build directory
  - Makes files available for the build process

---

## 📚 Library Integration Details

### GLM (OpenGL Mathematics)

**Purpose**: Vector and matrix mathematics for graphics operations

**Key Functions**:
```cpp
// Vector operations
glm::vec2 position(100.0f, 200.0f);
glm::vec4 color(1.0f, 0.0f, 0.0f, 1.0f); // Red color

// Matrix operations
glm::mat4 transform = glm::translate(glm::mat4(1.0f), glm::vec3(10.0f, 20.0f, 0.0f));

// Mathematical operations
float distance = glm::distance(point1, point2);
glm::vec2 normalized = glm::normalize(direction);
```

**CMake Integration**: 
- Header-only library, no linking required
- Include path: `${CMAKE_SOURCE_DIR}/lib/glm`
- Usage: `#include <glm/glm.hpp>`

### Clipper2 (Geometry Operations)

**Purpose**: Advanced geometric operations for complex shapes

**Key Functions**:
```cpp
// Polygon clipping
Clipper2Lib::Paths subject, clip, solution;
Clipper2Lib::Clipper64 clipper;
clipper.AddSubject(subject);
clipper.AddClip(clip);
clipper.Execute(Clipper2Lib::ClipType::Intersection, solution);

// Path operations
Clipper2Lib::Paths paths;
Clipper2Lib::SimplifyPaths(paths, 1.0); // Simplify paths
Clipper2Lib::InflatePaths(paths, 5.0);  // Expand paths
```

**CMake Integration**:
- Header-only library, no linking required
- Include paths: 
  - `${CMAKE_SOURCE_DIR}/lib/clipper/CPP/Clipper2Lib/include`
  - `${CMAKE_SOURCE_DIR}/lib/clipper/CPP/Clipper2Lib/include/clipper2`
- Usage: `#include <clipper2/clipper.h>`

### WebGPU (Modern GPU Rendering)

**Purpose**: Modern GPU acceleration for high-performance rendering

**Key Functions**:
```cpp
// Device creation
WGPUInstance instance = wgpuCreateInstance(nullptr);
WGPUAdapter adapter = wgpuInstanceRequestAdapter(instance, nullptr);
WGPUDevice device = wgpuAdapterRequestDevice(adapter, nullptr);

// Buffer creation
WGPUBufferDescriptor bufferDesc = {};
bufferDesc.size = sizeof(vertices);
bufferDesc.usage = WGPUBufferUsage_Vertex | WGPUBufferUsage_CopyDst;
WGPUBuffer buffer = wgpuDeviceCreateBuffer(device, &bufferDesc);

// Render pipeline
WGPURenderPipeline pipeline = wgpuDeviceCreateRenderPipeline(device, &pipelineDesc);
```

**CMake Integration**:
- Header-only library, no linking required
- Include path: `${CMAKE_SOURCE_DIR}/lib/webgpu`
- Usage: `#include <webgpu/webgpu.h>`
- Requires Emscripten WebGPU support: `-s USE_WEBGPU=1`

### SDL2 (Software Rendering)

**Purpose**: Software rendering and window management

**Key Functions**:
```cpp
// Window creation
SDL_Window* window = SDL_CreateWindow("Title", x, y, width, height, flags);
SDL_Renderer* renderer = SDL_CreateRenderer(window, -1, SDL_RENDERER_ACCELERATED);

// Drawing operations
SDL_SetRenderDrawColor(renderer, r, g, b, a);
SDL_RenderDrawLine(renderer, x1, y1, x2, y2);
SDL_RenderFillRect(renderer, &rect);

// Pixel manipulation
SDL_Surface* surface = SDL_CreateRGBSurface(0, width, height, 32, 0, 0, 0, 0);
uint32_t* pixels = (uint32_t*)surface->pixels;
```

**CMake Integration**:
- Provided by Emscripten automatically
- Enable with: `-s USE_SDL=2`
- Usage: `#include <SDL2/SDL.h>`

---

## 🔧 Build Process

### 1. CMake Configuration

```bash
# Configure the project
cmake -B build -S . -DCMAKE_TOOLCHAIN_FILE=emscripten-toolchain.cmake
```

**What Happens**:
- CMake reads `CMakeLists.txt`
- Sets up include directories for all libraries
- Configures Emscripten-specific settings
- Generates build files

### 2. Compilation

```bash
# Build the project
cmake --build build
```

**What Happens**:
- Compiles all C++ source files
- Links with required libraries
- Generates WebAssembly binary
- Creates JavaScript wrapper

### 3. Output Files

**Generated Files**:
- `drawing_engine.js`: JavaScript wrapper and loader
- `drawing_engine.wasm`: WebAssembly binary
- `drawing_engine.wasm.map`: Source map for debugging

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Library Not Found
```bash
# Error: fatal error: 'library/header.h' file not found
# Solution: Check include paths in CMakeLists.txt
```

#### 2. Emscripten Not Configured
```bash
# Error: CMAKE_TOOLCHAIN_FILE not found
# Solution: Set up Emscripten environment
source /path/to/emsdk/emsdk_env.sh
```

#### 3. WebGPU Not Available
```bash
# Error: WebGPU not supported
# Solution: Check browser support or fall back to OpenGL
```

#### 4. Memory Issues
```bash
# Error: Out of memory
# Solution: Increase memory limit or optimize code
```

### Debug Configuration

Add debug flags to CMakeLists.txt:
```cmake
if(DEBUG)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -g -O0 -s ASSERTIONS=1")
endif()
```

---

## 📊 Performance Considerations

### Compilation Optimizations

1. **Parallel Build**: Use `-j` flag for faster compilation
2. **Incremental Build**: Only rebuild changed files
3. **Optimization Levels**: Use `-O2` for production builds

### Runtime Optimizations

1. **Memory Management**: Use `ALLOW_MEMORY_GROWTH=1`
2. **SIMD Instructions**: Enable with `-msimd128`
3. **Threading**: Use `USE_PTHREADS=1` for parallel processing

---

## 🔮 Future Enhancements

### Potential Improvements

1. **Conditional Compilation**: Only include needed renderers
2. **Dynamic Loading**: Load renderers at runtime
3. **Plugin System**: Allow custom renderer plugins
4. **Cross-Platform**: Support native compilation for desktop

### CMake Improvements

1. **Find Packages**: Use `find_package()` for better library detection
2. **Target Properties**: Use modern CMake target-based approach
3. **Installation**: Proper installation rules for distribution

---

*This document provides a complete reference for the CMake configuration. For implementation details, refer to the source code and other documentation files.* 