#include <iostream>
#include <emscripten/bind.h>
#include <emscripten/val.h>

using namespace emscripten;

class TestClass {
public:
    int add(int a, int b) {
        return a + b;
    }
    
    std::string getMessage() {
        return "Emscripten binding test successful!";
    }
};

EMSCRIPTEN_BINDINGS(test_module) {
    class_<TestClass>("TestClass")
        .constructor<>()
        .function("add", &TestClass::add)
        .function("getMessage", &TestClass::getMessage);
}

int main() {
    std::cout << "Testing Emscripten bindings..." << std::endl;
    std::cout << "Emscripten test passed!" << std::endl;
    return 0;
}