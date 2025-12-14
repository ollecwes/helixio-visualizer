import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshDistortMaterial, Sphere } from '@react-three/drei'
import * as THREE from 'three'

// Elegant color palette - aurora/nebula inspired
const colorPalette = [
    new THREE.Color('#4a90d9'), // Soft blue
    new THREE.Color('#7b68ee'), // Medium purple
    new THREE.Color('#9370db'), // Medium orchid
    new THREE.Color('#da70d6'), // Orchid
    new THREE.Color('#87ceeb'), // Sky blue
    new THREE.Color('#40e0d0'), // Turquoise
]

const lerpColor = (colors: THREE.Color[], t: number): THREE.Color => {
    const index = t * (colors.length - 1)
    const lower = Math.floor(index)
    const upper = Math.min(lower + 1, colors.length - 1)
    const blend = index - lower
    return colors[lower].clone().lerp(colors[upper], blend)
}

export const Orb = ({ analyser, dataArray }: { analyser: AnalyserNode | null, dataArray: Uint8Array | null }) => {
    const materialRef = useRef<any>(null)
    const meshRef = useRef<THREE.Mesh>(null)
    const innerRef = useRef<THREE.Mesh>(null)
    const innerRef2 = useRef<THREE.Mesh>(null)
    const glowRef = useRef<THREE.Mesh>(null)

    // Smooth intensity value for organic feel
    const smoothIntensity = useRef(0.2)

    useFrame((state) => {
        const time = state.clock.getElapsedTime()
        let rawIntensity = 0

        if (analyser && dataArray) {
            analyser.getByteFrequencyData(dataArray)
            const bassZone = dataArray.slice(0, 40)
            rawIntensity = bassZone.reduce((a, b) => a + b, 0) / bassZone.length / 255.0
        }

        // Smooth interpolation for organic movement (slower reaction)
        smoothIntensity.current += (rawIntensity - smoothIntensity.current) * 0.08
        const intensity = smoothIntensity.current

        // Very slow breathing effect layered on top
        const breathe = Math.sin(time * 0.5) * 0.5 + 0.5

        if (materialRef.current) {
            // Subtle distortion - not too extreme
            materialRef.current.distort = 0.25 + (intensity * 0.3) + (breathe * 0.05)
            materialRef.current.speed = 1.5 + intensity * 2

            // Elegant color transition through palette
            const colorT = (Math.sin(time * 0.1) * 0.5 + 0.5 + intensity * 0.2) % 1.0
            const targetColor = lerpColor(colorPalette, colorT)
            materialRef.current.color.lerp(targetColor, 0.02)

            // Subtle emissive glow
            const emissiveT = (Math.sin(time * 0.15 + 0.5) * 0.5 + 0.5) % 1.0
            const emissiveColor = lerpColor(colorPalette, emissiveT)
            emissiveColor.multiplyScalar(0.4 + intensity * 0.3)
            materialRef.current.emissive.lerp(emissiveColor, 0.03)
            materialRef.current.emissiveIntensity = 0.6 + intensity * 0.8 + breathe * 0.1
        }

        if (meshRef.current) {
            // Gentle breathing scale with subtle audio response
            const baseScale = 1.6
            const audioScale = intensity * 0.4
            const breatheScale = breathe * 0.08
            const targetScale = baseScale + audioScale + breatheScale

            meshRef.current.scale.lerp(
                new THREE.Vector3(targetScale, targetScale, targetScale),
                0.04 // Very slow lerp for smooth movement
            )

            // Very slow, elegant rotation
            meshRef.current.rotation.x += 0.001 + intensity * 0.003
            meshRef.current.rotation.y += 0.002 + intensity * 0.004
        }

        // Inner layers - different rotation speeds for depth
        if (innerRef.current) {
            innerRef.current.rotation.x = time * 0.1
            innerRef.current.rotation.y = -time * 0.15
            innerRef.current.rotation.z = time * 0.08

            const innerScale = 0.5 + intensity * 0.15 + breathe * 0.05
            innerRef.current.scale.lerp(
                new THREE.Vector3(innerScale, innerScale, innerScale),
                0.05
            )
        }

        if (innerRef2.current) {
            innerRef2.current.rotation.x = -time * 0.08
            innerRef2.current.rotation.y = time * 0.12
            innerRef2.current.rotation.z = -time * 0.06

            const innerScale2 = 0.35 + intensity * 0.1 + (1 - breathe) * 0.05
            innerRef2.current.scale.lerp(
                new THREE.Vector3(innerScale2, innerScale2, innerScale2),
                0.05
            )
        }

        if (glowRef.current) {
            // Soft outer glow that breathes
            const glowScale = 2.2 + breathe * 0.15 + intensity * 0.3
            glowRef.current.scale.lerp(
                new THREE.Vector3(glowScale, glowScale, glowScale),
                0.03
            )
            glowRef.current.rotation.y = time * 0.02
        }
    })

    return (
        <group>
            {/* Outer soft glow sphere */}
            <Sphere ref={glowRef} args={[1, 32, 32]} scale={2.2}>
                <meshBasicMaterial
                    color="#6a5acd"
                    transparent
                    opacity={0.06}
                    side={THREE.BackSide}
                />
            </Sphere>

            {/* Main Orb */}
            <Sphere ref={meshRef} args={[1, 128, 128]} scale={1.6}>
                <MeshDistortMaterial
                    ref={materialRef}
                    color="#7b9ed9"
                    attach="material"
                    distort={0.3}
                    speed={2}
                    roughness={0.15}
                    metalness={0.2}
                    emissive="#4a5080"
                    emissiveIntensity={0.7}
                />
            </Sphere>

            {/* Inner layer 1 - wireframe icosahedron for geometric interest */}
            <mesh ref={innerRef} scale={0.5}>
                <icosahedronGeometry args={[1, 1]} />
                <meshBasicMaterial
                    color="#aaccff"
                    wireframe
                    transparent
                    opacity={0.25}
                />
            </mesh>

            {/* Inner layer 2 - smaller, different shape */}
            <mesh ref={innerRef2} scale={0.35}>
                <octahedronGeometry args={[1, 0]} />
                <meshBasicMaterial
                    color="#ffaadd"
                    wireframe
                    transparent
                    opacity={0.2}
                />
            </mesh>

            {/* Soft core light */}
            <pointLight position={[0, 0, 0]} intensity={1.5} color="#8899dd" distance={6} decay={2} />
        </group>
    )
}
