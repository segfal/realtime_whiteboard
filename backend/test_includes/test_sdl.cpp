#include <iostream>
#include <SDL2/SDL.h>

int main() {
    std::cout << "Testing SDL library..." << std::endl;
    
    if (SDL_Init(SDL_INIT_VIDEO) < 0) {
        std::cout << "SDL could not initialize! SDL_Error: " << SDL_GetError() << std::endl;
        return 1;
    }
    
    std::cout << "SDL initialized successfully" << std::endl;
    std::cout << "SDL version: " << SDL_MAJOR_VERSION << "." << SDL_MINOR_VERSION << "." << SDL_PATCHLEVEL << std::endl;
    
    SDL_Quit();
    std::cout << "SDL test passed!" << std::endl;
    return 0;
}