#define GLM_ENABLE_EXPERIMENTAL
#include <iostream>
#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>
#include <glm/gtc/quaternion.hpp>
#include <glm/gtx/string_cast.hpp>
#include <glm/gtx/norm.hpp>
#include <glm/gtx/rotate_vector.hpp>

struct Vector3 {
    float x;
    float y;
    float z;

    Vector3(float x=0, float y=0, float z=0) {
        this->x = x;
        this->y = y;
        this->z = z;
    }
};


class VectorMath {
    private:
        
    public:
        VectorMath(){}
        
        // Option 1: Return glm::vec3 (recommended)
        glm::vec3 vector_add(const Vector3 a, const Vector3 b) const {
            glm::vec3 result = glm::vec3(a.x,a.y,a.z) + glm::vec3(b.x,b.y,b.z);
            return result;  // Return glm::vec3 directly
        }
        
        // Option 2: Return Vector3 (if you prefer your custom struct)
        Vector3 vector_add_custom(const Vector3 a, const Vector3 b) const {
            glm::vec3 result = glm::vec3(a.x,a.y,a.z) + glm::vec3(b.x,b.y,b.z);
            return Vector3(result.x, result.y, result.z);  // Convert back to Vector3
        }
    
};



int main(){
    // Option 1: Using glm::vec3 return type
    glm::vec3 result1 = VectorMath().vector_add(Vector3(1,2,3), Vector3(3,2,1));
    std::cout << "Result 1: " << result1.x << ", " << result1.y << ", " << result1.z << std::endl;
    
    // Option 2: Using Vector3 return type
    Vector3 result2 = VectorMath().vector_add_custom(Vector3(1,2,3), Vector3(3,2,1));
    std::cout << "Result 2: " << result2.x << ", " << result2.y << ", " << result2.z << std::endl;
    
    // You can also use glm::to_string for nice formatting
    std::cout << "Result 1 (formatted): " << glm::to_string(result1) << std::endl;
}

/**
 * Build Command:
 * g++ -std=c++17 -I/opt/homebrew/Cellar/glm/1.0.1/include -o test test.cpp
 */