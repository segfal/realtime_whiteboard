#define GLM_ENABLE_EXPERIMENTAL 
#include <iostream>
#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtx/string_cast.hpp>

int main() {
    std::cout << "Testing GLM library..." << std::endl;
    
    // Test basic vector operations
    glm::vec3 v1(1.0f, 2.0f, 3.0f);
    glm::vec3 v2(4.0f, 5.0f, 6.0f);
    glm::vec3 result = v1 + v2;
    
    std::cout << "Vector addition: " << glm::to_string(v1) << " + " << glm::to_string(v2) << " = " << glm::to_string(result) << std::endl;
    
    // Test matrix operations
    glm::mat4 model = glm::mat4(1.0f);
    model = glm::translate(model, glm::vec3(1.0f, 2.0f, 3.0f));
    
    std::cout << "Translation matrix created successfully" << std::endl;
    
    std::cout << "GLM test passed!" << std::endl;
    return 0;
}