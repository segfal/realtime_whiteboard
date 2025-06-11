#!/bin/bash

# Create project structure
mkdir -p src/{core,ui,net,platform,export}
mkdir -p external

# Clone dependencies
cd external

# Clone Dear ImGui
git clone https://github.com/ocornut/imgui.git

# Clone Skia
git clone https://github.com/google/skia.git
cd skia
python tools/git-sync-deps
cd ..

# Clone SDL2
git clone https://github.com/libsdl-org/SDL.git sdl2

# Clone uWebSockets
git clone https://github.com/uNetworking/uWebSockets.git

cd ..

# Create initial source files
touch src/main.cpp
touch src/core/{Canvas.h,Canvas.cpp}
touch src/ui/{Toolbar.h,Toolbar.cpp}
touch src/net/{WebSocketClient.h,WebSocketClient.cpp}
touch src/platform/{Window.h,Window.cpp}
touch src/export/{Exporter.h,Exporter.cpp}

# Make setup script executable
chmod +x setup.sh 