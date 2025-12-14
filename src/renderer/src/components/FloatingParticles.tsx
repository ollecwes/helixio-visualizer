import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface FloatingParticlesProps {
    count?: number
    radius?: number
    analyser: AnalyserNode | null
    dataArray: Uint8Array | null
}

export const FloatingParticles = ({
    count = 200,
    radius = 8,
    analyser,
    dataArray
}: FloatingParticlesProps) => {
    const meshRef = useRef<THREE.Points>(null)
    const smoothIntensity = useRef(0)

    // Generate particle positions
    const { positions, velocities, phases } = useMemo(() => {
        const positions = new Float32Array(count * 3)
        const velocities = new Float32Array(count * 3)
        const phases = new Float32Array(count)

        for (let i = 0; i < count; i++) {
            // Distribute in a sphere around the center
            const theta = Math.random() * Math.PI * 2
            const phi = Math.acos(2 * Math.random() - 1)
            const r = radius * (0.5 + Math.random() * 0.5)

            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
            positions[i * 3 + 2] = r * Math.cos(phi)

            // Random slow drift velocities
            velocities[i * 3] = (Math.random() - 0.5) * 0.002
            velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.002
            velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.002

            phases[i] = Math.random() * Math.PI * 2
        }

        return { positions, velocities, phases }
    }, [count, radius])

    useFrame((state) => {
        if (!meshRef.current) return

        const time = state.clock.getElapsedTime()
        let rawIntensity = 0

        if (analyser && dataArray) {
            analyser.getByteFrequencyData(dataArray)
            const midRange = dataArray.slice(20, 80)
            rawIntensity = midRange.reduce((a, b) => a + b, 0) / midRange.length / 255.0
        }

        smoothIntensity.current += (rawIntensity - smoothIntensity.current) * 0.05
        const intensity = smoothIntensity.current

        const positionAttribute = meshRef.current.geometry.attributes.position
        const posArray = positionAttribute.array as Float32Array

        for (let i = 0; i < count; i++) {
            const i3 = i * 3
            const phase = phases[i]

            // Gentle floating motion
            posArray[i3] += velocities[i3] + Math.sin(time * 0.3 + phase) * 0.003
            posArray[i3 + 1] += velocities[i3 + 1] + Math.cos(time * 0.2 + phase) * 0.002
            posArray[i3 + 2] += velocities[i3 + 2] + Math.sin(time * 0.25 + phase * 0.5) * 0.002

            // Add subtle attraction/repulsion based on audio
            const dx = posArray[i3]
            const dy = posArray[i3 + 1]
            const dz = posArray[i3 + 2]
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

            if (dist > 0.1) {
                // Gentle push outward on audio
                const force = intensity * 0.01
                posArray[i3] += (dx / dist) * force
                posArray[i3 + 1] += (dy / dist) * force
                posArray[i3 + 2] += (dz / dist) * force
            }

            // Keep particles within bounds - soft boundary
            if (dist > radius * 1.2) {
                const pullBack = 0.01
                posArray[i3] -= (dx / dist) * pullBack
                posArray[i3 + 1] -= (dy / dist) * pullBack
                posArray[i3 + 2] -= (dz / dist) * pullBack
            }
            if (dist < 2) {
                const pushOut = 0.005
                posArray[i3] += (dx / dist) * pushOut
                posArray[i3 + 1] += (dy / dist) * pushOut
                posArray[i3 + 2] += (dz / dist) * pushOut
            }
        }

        positionAttribute.needsUpdate = true

        // Slowly rotate the entire particle system
        meshRef.current.rotation.y = time * 0.02
        meshRef.current.rotation.x = Math.sin(time * 0.1) * 0.1
    })

    return (
        <points ref={meshRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.03}
                color="#aabbff"
                transparent
                opacity={0.6}
                sizeAttenuation
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </points>
    )
}
