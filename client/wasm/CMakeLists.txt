cmake_minimum_required(VERSION 3.16)
project(drawing_engine)

set(CMAKE_CXX_STANDARD 17)

# Emscripten specific settings
if(EMSCRIPTEN)
    set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -s USE_WEBGL2=1 -s FULL_ES3=1")
endif()

# Include directories for libraries
include_directories(
    ${CMAKE_SOURCE_DIR}/lib/glm
    ${CMAKE_SOURCE_DIR}/lib/clipper/CPP/Clipper2Lib/include
    ${CMAKE_SOURCE_DIR}/lib/clipper/CPP/Clipper2Lib/include/clipper2
)

# Source files
set(SOURCE_FILES
    drawing_engine.cpp
)

# Create the WebAssembly module
add_executable(drawing_engine ${SOURCE_FILES})

# Set WebAssembly specific properties
set_target_properties(drawing_engine PROPERTIES
    SUFFIX ".js"
    LINK_FLAGS "--bind -s MODULARIZE=1 -s EXPORT_NAME=createDrawingEngineModule -s ENVIRONMENT=web -s ALLOW_MEMORY_GROWTH=1 -s EXPORTED_RUNTIME_METHODS=['ccall','cwrap']"
)

# Install target
install(TARGETS drawing_engine DESTINATION ${CMAKE_BINARY_DIR})