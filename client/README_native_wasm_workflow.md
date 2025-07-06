# Drawing Engine: Native Mac & WASM Workflow

This guide explains how to build, run, and develop your whiteboard app using both native (Mac) and WebAssembly (WASM/browser) backends. It also describes how the React frontend adapts automatically to each environment.

---

## 1. Build Modes

### A. Native Mac (Local Development)
- **Purpose:** Fast iteration, UI testing, and debugging without needing WASM.
- **Renderer:** Uses a simple C++ `StubRenderer` that prints actions to the terminal.
- **React:** Uses a JS mock that logs drawing actions to the browser console.

#### How to Build & Run (Native Mac)
```sh
cd client/wasm
mkdir -p build && cd build
cmake ..
make -j4
./drawing_engine   # Runs the native C++ test (see terminal output)
```

#### How React Works (Native Mac)
- The React hook (`useDrawingEngine`) detects that WASM is not available.
- It uses a JS mock (`NativeDrawingEngineMock`) that logs all drawing actions to the browser console.
- You can develop and test the UI without needing the WASM build.

---

### B. WASM (Browser/WebAssembly)
- **Purpose:** Production build, real C++ engine running in the browser.
- **Renderer:** Uses the C++ engine compiled to WASM via Emscripten.
- **React:** Loads the WASM module and interacts with the real engine.

#### How to Build & Run (WASM)
```sh
cd client/wasm
./build.sh
# This generates drawing_engine.js and drawing_engine.wasm in the public/ directory
# Start your React app as usual (e.g., npm run dev)
```

#### How React Works (WASM)
- The React hook loads the WASM module (`drawing_engine.js`).
- It uses the real C++/WASM drawing engine for all drawing actions.

---

## 2. How the React Hook Adapts
- The hook (`useDrawingEngine`) tries to load the WASM module.
- If successful, it uses the real engine.
- If not (e.g., local Mac dev), it falls back to the JS mock.
- **No code changes needed in your React components!**

---

## 3. Troubleshooting
- **WASM not loading?**
  - Make sure `drawing_engine.js` and `drawing_engine.wasm` are in your `public/` directory.
  - Check the browser console for errors.
- **Native build errors?**
  - Make sure you have CMake and a C++17 compiler installed.
  - If you see missing file errors, check that all source files are present.
- **React not drawing?**
  - In native mode, check the browser console for log messages from the mock.
  - In WASM mode, check for errors in the browser console.

---

## 4. Extending This Setup
- You can implement real OpenGL/SDL renderers for native Mac/Linux/Windows in C++.
- You can extend the JS mock to simulate more drawing features for UI testing.
- The React hook is ready for both development and production workflows.

---

**Questions?**
- Check the comments in the code for more details.
- This setup is designed to be beginner-friendly and easy to extend! 