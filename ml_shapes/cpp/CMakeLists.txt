cmake_minimum_required(VERSION 3.18)
project(quickdraw_libtorch CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# ---- LibTorch ----
# Set TORCH_DIR to the unzipped LibTorch directory or export Torch_DIR
# e.g., -DTorch_DIR=/path/to/libtorch/share/cmake/Torch
find_package(Torch REQUIRED)

# ---- OpenCV ----
find_package(OpenCV REQUIRED core imgcodecs imgproc)

# ---- nlohmann/json ----
# Option 1: Use system package (find_package)
# find_package(nlohmann_json REQUIRED)
# Option 2: FetchContent (header-only)
include(FetchContent)
FetchContent_Declare(nlohmann_json GIT_REPOSITORY https://github.com/nlohmann/json.git GIT_TAG v3.11.3)
FetchContent_MakeAvailable(nlohmann_json)

# ---- cxxopts ----
FetchContent_Declare(cxxopts GIT_REPOSITORY https://github.com/jarro2783/cxxopts.git GIT_TAG v3.2.0)
FetchContent_MakeAvailable(cxxopts)

add_executable(quickdraw quickdraw.cpp)
target_link_libraries(quickdraw
    "${TORCH_LIBRARIES}"
    ${OpenCV_LIBS}
    nlohmann_json::nlohmann_json
    cxxopts
)
target_compile_definitions(quickdraw PRIVATE -D_USE_MATH_DEFINES)
set_property(TARGET quickdraw PROPERTY CXX_STANDARD 17)

# Needed for LibTorch on some platforms
if (MSVC)
  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} /EHsc")
else()
  set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Wno-deprecated-declarations")
endif()
