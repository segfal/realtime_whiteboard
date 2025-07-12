#include <iostream>
#include <webgpu/webgpu.h>

int main() {
    std::cout << "Testing WebGPU headers..." << std::endl;
    
    // Test that we can create WebGPU structures
    WGPUAdapterDescriptor adapterDesc = {};
    WGPUDeviceDescriptor deviceDesc = {};
    
    std::cout << "WebGPU structures created successfully" << std::endl;
    std::cout << "WebGPU test passed!" << std::endl;
    return 0;
}