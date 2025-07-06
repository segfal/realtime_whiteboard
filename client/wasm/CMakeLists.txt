cmake_minimum_required(VERSION 3.16)
project(drawing_engine)

set(CMAKE_CXX_STANDARD 17)

# Platform detection
if(APPLE)
    set(PLATFORM_MAC TRUE)
    message(STATUS "Detected platform: macOS")
elseif(WIN32)
    set(PLATFORM_WINDOWS TRUE)
    message(STATUS "Detected platform: Windows")
elseif(UNIX AND NOT APPLE)
    set(PLATFORM_LINUX TRUE)
    message(STATUS "Detected platform: Linux")
endif()

# Emscripten specific settings
if(EMSCRIPTEN)
    message(STATUS "Detected Emscripten environment - building for WebAssembly")
    
    # Enable WebGL2, SDL2, and WebGPU support
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s USE_WEBGL2=1 -s USE_SDL=2 -s FULL_ES3=1 -s USE_WEBGPU=1")
    
    # Enable threading for better performance (but not for this simple test)
    # set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s USE_PTHREADS=1 -s PTHREAD_POOL_SIZE=4")
    
    # Enable SIMD for vector operations (but not for this simple test)
    # set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -msimd128")
    
    # Enable exception handling (but not for this simple test)
    # set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s DISABLE_EXCEPTION_CATCHING=0")
    
    # Set WebGPU as available in Emscripten
    set(WEBGPU_AVAILABLE TRUE)
    message(STATUS "WebGPU: Available (Emscripten)")
else()
    message(STATUS "Native compilation detected")
    
    # Check if WebGPU is available natively
    if(PLATFORM_MAC)
        set(WEBGPU_AVAILABLE FALSE)
        message(STATUS "WebGPU: Not available (macOS native - use Emscripten for WebGPU)")
    else()
        # For other platforms, we could potentially support WebGPU natively
        set(WEBGPU_AVAILABLE FALSE)
        message(STATUS "WebGPU: Not available (native compilation)")
    endif()
endif()

# Include directories for libraries
include_directories(
    ${CMAKE_SOURCE_DIR}/lib/glm
    ${CMAKE_SOURCE_DIR}/lib/glm/glm
    ${CMAKE_SOURCE_DIR}/lib/clipper/CPP/Clipper2Lib/include
    ${CMAKE_SOURCE_DIR}/lib/clipper/CPP/Clipper2Lib/include/clipper2
    ${CMAKE_SOURCE_DIR}/include
    ${CMAKE_SOURCE_DIR}/src
)

# Conditionally include WebGPU headers
if(WEBGPU_AVAILABLE)
    include_directories(${CMAKE_SOURCE_DIR}/lib/webgpu)
    message(STATUS "WebGPU headers: Included")
else()
    message(STATUS "WebGPU headers: Skipped (not available)")
endif()

# Source files for the real engine (used for native Mac)
set(NATIVE_ENGINE_SOURCES
    src/drawing_engine.cpp
    src/renderer/renderer_factory.cpp
    src/renderer/webgpu_renderer.cpp
    src/bindings.cpp
)

# Source files for the WASM build (used for Emscripten)
set(WASM_ENGINE_SOURCES
    src/drawing_engine.cpp
    src/renderer/renderer_factory.cpp
    src/renderer/webgpu_renderer.cpp
    src/bindings.cpp
)

# Choose sources based on platform
if(EMSCRIPTEN)
    set(ALL_SOURCE_FILES ${WASM_ENGINE_SOURCES})
else()
    set(ALL_SOURCE_FILES ${NATIVE_ENGINE_SOURCES})
endif()

# Create the executable
add_executable(drawing_engine ${ALL_SOURCE_FILES})

# Set properties based on platform
if(EMSCRIPTEN)
    # WebAssembly specific properties
    set_target_properties(drawing_engine PROPERTIES
        SUFFIX ".js"
        LINK_FLAGS "--bind -s MODULARIZE=1 -s EXPORT_NAME=createTestModule -s ENVIRONMENT=web -s ALLOW_MEMORY_GROWTH=1"
    )
    message(STATUS "Building for WebAssembly")
else()
    # Native compilation
    message(STATUS "Building for native platform (macOS/Linux/Windows)")
endif()

# Install target
install(TARGETS drawing_engine DESTINATION ${CMAKE_BINARY_DIR})

# Print configuration summary
message(STATUS "")
message(STATUS "=== Configuration Summary ===")
message(STATUS "Platform: ${CMAKE_SYSTEM_NAME}")
message(STATUS "Compiler: ${CMAKE_CXX_COMPILER_ID}")
message(STATUS "C++ Standard: ${CMAKE_CXX_STANDARD}")
message(STATUS "Emscripten: ${EMSCRIPTEN}")
message(STATUS "WebGPU Available: ${WEBGPU_AVAILABLE}")
message(STATUS "Source Files: ${ALL_SOURCE_FILES}")
message(STATUS "==============================")
message(STATUS "")