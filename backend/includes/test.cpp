#include <iostream>
#include <glm/glm.hpp>
#include <glm/gtc/matrix_transform.hpp>

void square(int x){
    
}

int main(){
    glm::vec3 a(1.0f, 2.0f, 3.0f);
    glm::vec3 b(4.0f, 5.0f, 6.0f);
    glm::vec3 c = a + b;
    std::cout << c.x << std::endl;
}

