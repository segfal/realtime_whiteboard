cmake_minimum_required(VERSION 3.15)
project(RealtimeWhiteboardServer C CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Find required packages
find_package(Threads REQUIRED)

# Build uSockets first
set(USOCKETS_SOURCES
    vendor/uWebSockets/uSockets/src/bsd.c
    vendor/uWebSockets/uSockets/src/context.c
    vendor/uWebSockets/uSockets/src/loop.c
    vendor/uWebSockets/uSockets/src/socket.c
    vendor/uWebSockets/uSockets/src/udp.c
    vendor/uWebSockets/uSockets/src/quic.c
    vendor/uWebSockets/uSockets/src/crypto/openssl.c
    vendor/uWebSockets/uSockets/src/eventing/epoll_kqueue.c
    vendor/uWebSockets/uSockets/src/eventing/gcd.c
    vendor/uWebSockets/uSockets/src/eventing/libuv.c
)

add_library(uSockets STATIC ${USOCKETS_SOURCES})
target_include_directories(uSockets PUBLIC vendor/uWebSockets/uSockets/src)
target_compile_definitions(uSockets PRIVATE LIBUS_NO_SSL)
target_compile_options(uSockets PRIVATE -O3)

# Include directories
include_directories(vendor/uWebSockets/src)
include_directories(vendor/json/include)

# Create the server executable
add_executable(server src/main.cpp)

# Link libraries
target_link_libraries(server 
    PRIVATE uSockets
    PRIVATE Threads::Threads
    PRIVATE z
)

# Compiler options
target_compile_options(server PRIVATE 
    -march=native 
    -O3 
    -Wall 
    -Wextra
) 