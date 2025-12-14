# 🧬 Helixio Visualizer

**A next-generation 3D audio visualizer built with WebGL and Electron.**

Helixio transforms your system audio or microphone input into a stunning, real-time double helix animation. Powered by custom GLSL shaders and React Three Fiber, every beat impacts the motion, color, and intensity of the DNA strands.

![Helixio Visualizer](resources/icon.png)

## ✨ Key Features

*   **Real-time Audio Reactivity:** The double helix dances, pulses, and expands in sync with your music.
*   **Advanced VFX:** Two intertwined strands with 70 nodes featuring custom GLSL shaders for neon glows, fresnel effects, and organic noise animations.
*   **Dynamic Particles:** Floating particles and 4 orbiting satellites with ribbon trails that react to different frequency bands (Bass, Mids, Highs).
*   **BPM-Synced Animation:** The helix rotation speed intelligently adapts to the beat of the music.
*   **Portable Design:** Single-file executable. No installation required.

## 🎮 How to Run (Portable)

No installation needed!

1.  Go to the [Releases](../../releases) page.
2.  Download **`Helixio Visualizer 1.0.0.exe`**.
3.  Double-click to launch.
4.  *Note: You may see a "Windows protected your PC" warning. This is normal for new open-source apps. Click **"More info" > "Run anyway"** to start the main engine.*

## 🛠️ Tech Stack

*   **Core:** Electron + React + TypeScript
*   **3D Engine:** Three.js (@react-three/fiber)
*   **VFX:** Custom GLSL Shaders & Post-processing
*   **Styling:** TailwindCSS

## 💻 Development

If you want to build it yourself:

### Install
```bash
npm install
```

### Run (Development)
```bash
npm run dev
```

### Build (Production)
```bash
# Windows (Portable .exe)
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

## 📝 License

MIT
