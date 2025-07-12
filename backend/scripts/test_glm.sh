#!/bin/bash
echo "Testing GLM library..."
echo "======================"

# Try system GLM first
g++ -std=c++17 \
    -I/opt/homebrew/Cellar/glm/1.0.1/include \
    -o ../build/test_glm_system \
    ../test_includes/test_glm.cpp

if [ $? -eq 0 ]; then
    echo "✅ GLM system compilation successful!"
    echo "Running GLM system test..."
    ../build/test_glm_system
    echo ""
fi

# Try git submodule GLM
g++ -std=c++17 \
    -I../glm \
    -o ../build/test_glm_git \
    ../test_includes/test_glm.cpp

if [ $? -eq 0 ]; then
    echo "✅ GLM git submodule compilation successful!"
    echo "Running GLM git test..."
    ../build/test_glm_git
    echo ""
else
    echo "❌ GLM git submodule compilation failed!"
    exit 1
fi

echo "GLM test completed!"
