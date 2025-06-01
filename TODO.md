# Realtime Whiteboard TODO List

## Priority 1: Basic Drawing Features
1. Basic Drawing Tools
   - [x] Color selection
   - [x] Eraser tool
   - [ ] Brush size adjustment
   - [ ] Tool selection UI
   - [ ] Undo/Redo functionality

Learning Resources:
- OpenGL Color Management: https://learnopengl.com/Advanced-OpenGL/Blending
- OpenGL Line Drawing: https://learnopengl.com/Getting-started/Hello-Triangle

## Priority 2: Selection and Manipulation
1. Selection Tools
   - [ ] Area selection
   - [ ] Move selected area
   - [ ] Resize selected area
   - [ ] Delete selected area
   - [ ] Copy/Paste functionality

Learning Resources:
- OpenGL Selection: https://learnopengl.com/Advanced-OpenGL/Framebuffers
- OpenGL Transformations: https://learnopengl.com/Getting-started/Transformations

## Priority 3: Real-time Multi-user Implementation
1. WebSocket Setup
   - [ ] WebSocket server implementation
   - [ ] Client connection management
   - [ ] Basic message protocol
   - [ ] Connection status handling

2. Real-time Drawing Sync
   - [ ] Drawing event broadcasting
   - [ ] State synchronization
   - [ ] Conflict resolution
   - [ ] User presence indicators

Learning Resources:
- WebSocket C++: https://github.com/zaphoyd/websocketpp
- Real-time Drawing: https://socket.io/how-to/use-with-cpp
- WebSocket Protocol: https://websocket.org/echo.html

## Priority 4: Shape Recognition
1. Basic Shape Detection
   - [ ] Point sampling and normalization
   - [ ] Basic geometric shape detection
   - [ ] Shape correction algorithms
   - [ ] User feedback system

2. Machine Learning Integration
   - [ ] PyTorch C++ setup
   - [ ] Basic shape recognition model
   - [ ] Real-time inference
   - [ ] Model optimization

Learning Resources:
- PyTorch C++: https://pytorch.org/cppdocs/
- OpenCV Shape Detection: https://docs.opencv.org/4.x/d4/d73/tutorial_py_contours_begin.html
- TorchC++: https://github.com/pytorch/pytorch/tree/main/torch/csrc

## Priority 5: Advanced Features
1. Collaboration Features
   - [ ] User cursors
   - [ ] Chat system
   - [ ] User permissions
   - [ ] Board sharing

2. Advanced Drawing Tools
   - [ ] Text tool
   - [ ] Image import
   - [ ] Layer system
   - [ ] Export functionality

Learning Resources:
- Real-time Collaboration: https://socket.io/docs/v4/
- OpenGL Text Rendering: https://learnopengl.com/In-Practice/Text-Rendering

## Development Environment Setup
1. Required Tools
   - [ ] CMake
   - [ ] C++17 compatible compiler
   - [ ] OpenGL
   - [ ] GLFW
   - [ ] WebSocket++ or similar
   - [ ] PyTorch C++
   - [ ] OpenCV
   - [ ] TorchC++

2. Development Tools
   - [ ] Git for version control
   - [ ] CI/CD pipeline
   - [ ] Testing framework
   - [ ] Documentation system

## Learning Path
1. OpenGL Basics
   - Learn OpenGL: https://learnopengl.com/
   - OpenGL Documentation: https://www.khronos.org/opengl/

2. WebSocket Development
   - WebSocket++ Documentation: https://www.zaphoyd.com/websocketpp/
   - Socket.IO C++ Client: https://socket.io/blog/socket-io-cpp/

3. Machine Learning
   - PyTorch C++ Tutorials: https://pytorch.org/cppdocs/installing.html
   - OpenCV Tutorials: https://docs.opencv.org/4.x/d9/df8/tutorial_root.html
   - TorchC++ Examples: https://github.com/pytorch/pytorch/tree/main/torch/csrc

## Notes
- Each priority level should be completed before moving to the next
- Focus on stability and performance in real-time features
- Implement proper error handling and logging
- Write tests for critical functionality
- Document all major components and APIs 