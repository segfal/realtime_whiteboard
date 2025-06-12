#!/bin/bash
set -e

# Create directories if they don't exist
mkdir -p external/glad/src
mkdir -p external/glad/include/KHR

# Download GLAD files
curl -L https://glad.dav1d.de/api/download/glad.zip -o glad.zip

# Extract glad.c to external/glad/src
unzip -j glad.zip "glad/src/glad.c" -d external/glad/src

# Extract glad.h and khrplatform.h to external/glad/include
unzip -j glad.zip "glad/include/glad/glad.h" -d external/glad/include
unzip -j glad.zip "glad/include/KHR/khrplatform.h" -d external/glad/include/KHR

# Clean up
rm glad.zip

echo "GLAD files downloaded and extracted successfully." 