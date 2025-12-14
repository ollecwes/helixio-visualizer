import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { EffectComposer, Bloom, ChromaticAberration, Vignette } from '@react-three/postprocessing'
import { OrbitControls, Stars } from '@react-three/drei'
import { DNAHelix } from './DNAHelix'
import { OrbitingSatellites } from './OrbitingSatellites'
import { FloatingParticles } from './FloatingParticles'
import { useAudioAnalyzer } from '../hooks/useAudioAnalyzer'
import { Vector2 } from 'three'

export const VisualizerScene = () => {
    const { analyser, dataArray, isReady } = useAudioAnalyzer()

    if (!isReady) {
        return (
            <div className="flex items-center justify-center h-full w-full bg-black text-white font-mono flex-col gap-4">
                <div className="animate-spin h-8 w-8 border-4 border-indigo-500 rounded-full border-t-transparent"></div>
                <p>Initializing Audio Capture...</p>
                <p className="text-xs text-gray-500">Make sure to play some audio!</p>
            </div>
        )
    }

    return (
        <div className="w-full h-full absolute inset-0 bg-black">
            <Canvas camera={{ position: [0, 2, 10], fov: 55 }}>
                {/* Deep space background */}
                <color attach="background" args={['#020208']} />
                <fog attach="fog" args={['#020208', 15, 35]} />

                {/* Ambient lighting */}
                <ambientLight intensity={0.2} />

                {/* Accent lights for the helix */}
                <pointLight position={[5, 5, 5]} intensity={0.8} color="#4488ff" />
                <pointLight position={[-5, -5, -5]} intensity={0.8} color="#ff4488" />
                <pointLight position={[0, 8, 0]} intensity={0.5} color="#88ff88" />

                {/* Stars in background */}
                <Suspense fallback={null}>
                    <Stars
                        radius={100}
                        depth={80}
                        count={5000}
                        factor={3}
                        saturation={0.2}
                        fade
                        speed={0.2}
                    />
                </Suspense>

                {/* Ambient floating particles */}
                <FloatingParticles
                    count={100}
                    radius={8}
                    analyser={analyser}
                    dataArray={dataArray}
                />

                {/* Main DNA Helix visualization */}
                <DNAHelix analyser={analyser} dataArray={dataArray} />

                {/* Orbiting satellites with trails */}
                <OrbitingSatellites analyser={analyser} dataArray={dataArray} />

                {/* Smooth camera orbit */}
                <OrbitControls
                    enableZoom={false}
                    enablePan={false}
                    autoRotate
                    autoRotateSpeed={0.15}
                    maxPolarAngle={Math.PI * 0.7}
                    minPolarAngle={Math.PI * 0.3}
                    maxDistance={15}
                    minDistance={8}
                />

                {/* Post-processing */}
                <EffectComposer>
                    <Bloom
                        luminanceThreshold={0.1}
                        luminanceSmoothing={0.9}
                        height={400}
                        intensity={1.5}
                        radius={1.0}
                    />
                    <ChromaticAberration
                        offset={new Vector2(0.001, 0.001)}
                    />
                    <Vignette
                        eskil={false}
                        offset={0.15}
                        darkness={0.6}
                    />
                </EffectComposer>
            </Canvas>

            {/* Minimal UI */}
            <div className="absolute bottom-4 left-4 text-white/25 text-xs pointer-events-none font-light tracking-widest uppercase">
                ♪ Helixio
            </div>
        </div>
    )
}
