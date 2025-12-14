import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { RibbonTrail } from './RibbonTrail'
import '../shaders/GlowShaderMaterial'

interface OrbitingSatellitesProps {
    analyser: AnalyserNode | null
    dataArray: Uint8Array | null
}

interface Satellite {
    orbitRadius: number
    orbitSpeed: number
    orbitTilt: THREE.Euler
    size: number
    color1: THREE.Color
    color2: THREE.Color
    glowColor: THREE.Color
    trailPositions: THREE.Vector3[]
    freqBand: 'bass' | 'mid' | 'high'
    phase: number
}

export const OrbitingSatellites = ({ analyser, dataArray }: OrbitingSatellitesProps) => {
    const groupRef = useRef<THREE.Group>(null)
    const satelliteRefs = useRef<(THREE.Mesh | null)[]>([])
    const shaderRefs = useRef<any[]>([])
    const timeRef = useRef(0)

    const smoothBass = useRef(0.2)
    const smoothMid = useRef(0.2)
    const smoothHigh = useRef(0.2)

    // Define satellites
    const satellites = useMemo<Satellite[]>(() => [
        {
            orbitRadius: 3.8,
            orbitSpeed: 0.22,
            orbitTilt: new THREE.Euler(0.35, 0, 0.15),
            size: 0.14,
            color1: new THREE.Color('#ff6b9d'),
            color2: new THREE.Color('#ffaa88'),
            glowColor: new THREE.Color('#ffddee'),
            trailPositions: [],
            freqBand: 'bass',
            phase: 0,
        },
        {
            orbitRadius: 4.5,
            orbitSpeed: -0.18,
            orbitTilt: new THREE.Euler(-0.4, 0.25, 0),
            size: 0.11,
            color1: new THREE.Color('#4a9eff'),
            color2: new THREE.Color('#88ddff'),
            glowColor: new THREE.Color('#ccddff'),
            trailPositions: [],
            freqBand: 'mid',
            phase: Math.PI * 0.5,
        },
        {
            orbitRadius: 5.0,
            orbitSpeed: 0.15,
            orbitTilt: new THREE.Euler(0.25, -0.35, 0.2),
            size: 0.09,
            color1: new THREE.Color('#88ffdd'),
            color2: new THREE.Color('#aaffee'),
            glowColor: new THREE.Color('#ddffee'),
            trailPositions: [],
            freqBand: 'high',
            phase: Math.PI,
        },
        {
            orbitRadius: 3.2,
            orbitSpeed: -0.25,
            orbitTilt: new THREE.Euler(-0.2, 0.4, -0.15),
            size: 0.1,
            color1: new THREE.Color('#ffaa44'),
            color2: new THREE.Color('#ffcc88'),
            glowColor: new THREE.Color('#ffeedd'),
            trailPositions: [],
            freqBand: 'bass',
            phase: Math.PI * 1.5,
        },
    ], [])

    const trailLength = 80

    useFrame((state) => {
        const time = state.clock.getElapsedTime()
        timeRef.current = time

        let bass = 0.2, mid = 0.2, high = 0.2
        if (analyser && dataArray) {
            analyser.getByteFrequencyData(dataArray)
            const bassRange = dataArray.slice(0, 25)
            const midRange = dataArray.slice(25, 90)
            const highRange = dataArray.slice(90, 180)

            bass = bassRange.reduce((a, b) => a + b, 0) / bassRange.length / 255
            mid = midRange.reduce((a, b) => a + b, 0) / midRange.length / 255
            high = highRange.reduce((a, b) => a + b, 0) / highRange.length / 255
        }

        smoothBass.current += (bass - smoothBass.current) * 0.08
        smoothMid.current += (mid - smoothMid.current) * 0.06
        smoothHigh.current += (high - smoothHigh.current) * 0.05

        const freqValues = {
            bass: smoothBass.current,
            mid: smoothMid.current,
            high: smoothHigh.current
        }

        satellites.forEach((sat, i) => {
            const mesh = satelliteRefs.current[i]
            const shader = shaderRefs.current[i]
            if (!mesh) return

            const freqValue = freqValues[sat.freqBand]

            const angle = time * sat.orbitSpeed + sat.phase
            const radius = sat.orbitRadius + freqValue * 0.3

            const x = Math.cos(angle) * radius
            const y = 0
            const z = Math.sin(angle) * radius

            const pos = new THREE.Vector3(x, y, z)
            pos.applyEuler(sat.orbitTilt)

            mesh.position.copy(pos)

            const scale = sat.size * (1 + freqValue * 0.4)
            mesh.scale.setScalar(scale)

            if (shader) {
                shader.uTime = time
                shader.uIntensity = freqValue
            }

            // Update trail positions
            sat.trailPositions.unshift(pos.clone())
            if (sat.trailPositions.length > trailLength) {
                sat.trailPositions.pop()
            }
        })
    })

    return (
        <group ref={groupRef}>
            {satellites.map((sat, i) => (
                <group key={i}>
                    {/* Satellite with shader */}
                    <mesh ref={(el) => (satelliteRefs.current[i] = el)}>
                        <icosahedronGeometry args={[1, 2]} />
                        <glowShaderMaterial
                            ref={(el: any) => (shaderRefs.current[i] = el)}
                            uColor1={sat.color1}
                            uColor2={sat.color2}
                            uGlowColor={sat.glowColor}
                            uFresnelPower={3.0}
                            uNoiseScale={5.0}
                            uNoiseSpeed={0.5}
                            transparent
                            toneMapped={false}
                        />
                    </mesh>

                    {/* Ribbon Trail */}
                    <RibbonTrail
                        positions={sat.trailPositions}
                        width={0.06 + (sat.freqBand === 'bass' ? 0.02 : 0)}
                        color={sat.color1}
                        glowColor={sat.glowColor}
                        intensity={
                            sat.freqBand === 'bass' ? smoothBass.current :
                                sat.freqBand === 'mid' ? smoothMid.current : smoothHigh.current
                        }
                        time={timeRef.current}
                    />
                </group>
            ))}
        </group>
    )
}
