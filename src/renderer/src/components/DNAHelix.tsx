import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import '../shaders/GlowShaderMaterial'

interface DNAHelixProps {
    analyser: AnalyserNode | null
    dataArray: Uint8Array | null
}

// Color schemes for the two strands
const strandColors = {
    strand1: {
        color1: new THREE.Color('#4a9eff'),
        color2: new THREE.Color('#88ddff'),
        glow: new THREE.Color('#aaccff'),
    },
    strand2: {
        color1: new THREE.Color('#ff6b9d'),
        color2: new THREE.Color('#ffaa88'),
        glow: new THREE.Color('#ffccdd'),
    },
    connector: new THREE.Color('#88ddff'),
}

export const DNAHelix = ({ analyser, dataArray }: DNAHelixProps) => {
    const groupRef = useRef<THREE.Group>(null)
    const strand1Refs = useRef<THREE.Mesh[]>([])
    const strand2Refs = useRef<THREE.Mesh[]>([])
    const shaderRefs = useRef<any[]>([])
    const connectorsRef = useRef<THREE.Group>(null)

    // Smooth audio values
    const smoothValues = useRef({
        overall: 0.3,
        bass: 0.3,
        lowMid: 0.3,
        mid: 0.3,
        highMid: 0.3,
        high: 0.3,
        rotationSpeed: 0.3,
    })

    // Beat detection
    const beatDetection = useRef({
        lastBeatTime: 0,
        beatInterval: 500,
        energyHistory: [] as number[],
    })

    // Helix parameters
    const nodeCount = 35
    const baseHelixRadius = 1.1
    const helixHeight = 9
    const helixTurns = 2.5
    const nodeSize = 0.1

    // Pre-calculate helix structure
    const helixStructure = useMemo(() => {
        const nodes: { t: number; angle: number; y: number }[] = []
        const connectors: { t: number; y: number; angle: number }[] = []

        for (let i = 0; i < nodeCount; i++) {
            const t = i / (nodeCount - 1)
            const angle = t * Math.PI * 2 * helixTurns
            const y = (t - 0.5) * helixHeight

            nodes.push({ t, angle, y })

            if (i % 4 === 0) {
                connectors.push({ t, y, angle })
            }
        }

        return { nodes, connectors }
    }, [nodeCount, helixHeight, helixTurns])

    // Rotation accumulator
    const rotation = useRef(0)

    useFrame((state, delta) => {
        const time = state.clock.getElapsedTime()

        // Get frequency data
        let bands = { bass: 0.3, lowMid: 0.3, mid: 0.3, highMid: 0.3, high: 0.3 }

        if (analyser && dataArray) {
            analyser.getByteFrequencyData(dataArray)
            const len = dataArray.length

            const bassRange = dataArray.slice(0, Math.floor(len * 0.1))
            const lowMidRange = dataArray.slice(Math.floor(len * 0.1), Math.floor(len * 0.25))
            const midRange = dataArray.slice(Math.floor(len * 0.25), Math.floor(len * 0.5))
            const highMidRange = dataArray.slice(Math.floor(len * 0.5), Math.floor(len * 0.75))
            const highRange = dataArray.slice(Math.floor(len * 0.75))

            bands.bass = bassRange.reduce((a, b) => a + b, 0) / bassRange.length / 255
            bands.lowMid = lowMidRange.reduce((a, b) => a + b, 0) / lowMidRange.length / 255
            bands.mid = midRange.reduce((a, b) => a + b, 0) / midRange.length / 255
            bands.highMid = highMidRange.reduce((a, b) => a + b, 0) / highMidRange.length / 255
            bands.high = highRange.reduce((a, b) => a + b, 0) / highRange.length / 255

            // Beat detection
            const bd = beatDetection.current
            bd.energyHistory.push(bands.bass)
            if (bd.energyHistory.length > 30) bd.energyHistory.shift()

            const avgEnergy = bd.energyHistory.reduce((a, b) => a + b, 0) / bd.energyHistory.length
            const now = performance.now()

            if (bands.bass > avgEnergy * 1.3 && bands.bass > 0.4 && now - bd.lastBeatTime > 200) {
                const interval = now - bd.lastBeatTime
                if (interval > 200 && interval < 2000) {
                    bd.beatInterval = bd.beatInterval * 0.7 + interval * 0.3
                }
                bd.lastBeatTime = now
            }
        }

        // Smooth values
        const sv = smoothValues.current
        sv.bass += (bands.bass - sv.bass) * 0.08
        sv.lowMid += (bands.lowMid - sv.lowMid) * 0.06
        sv.mid += (bands.mid - sv.mid) * 0.05
        sv.highMid += (bands.highMid - sv.highMid) * 0.04
        sv.high += (bands.high - sv.high) * 0.03
        sv.overall = (sv.bass + sv.lowMid + sv.mid + sv.highMid + sv.high) / 5

        // BPM-influenced rotation
        const bpm = 60000 / beatDetection.current.beatInterval
        const targetRotSpeed = Math.max(0.15, Math.min(0.6, bpm / 180))
        sv.rotationSpeed += (targetRotSpeed - sv.rotationSpeed) * 0.02

        rotation.current += delta * sv.rotationSpeed

        if (groupRef.current) {
            groupRef.current.rotation.y = rotation.current
        }

        // Update shader uniforms and positions
        helixStructure.nodes.forEach((node, i) => {
            const mesh1 = strand1Refs.current[i]
            const mesh2 = strand2Refs.current[i]
            const shader1 = shaderRefs.current[i * 2]
            const shader2 = shaderRefs.current[i * 2 + 1]

            if (!mesh1 || !mesh2) return

            // Get band value for this position
            const bandValue = getBandValueForPosition(node.t, sv)

            // Dynamic radius
            const radiusMultiplier = 1 + bandValue * 0.7
            const dynamicRadius = baseHelixRadius * radiusMultiplier

            // Update positions
            mesh1.position.set(
                Math.cos(node.angle) * dynamicRadius,
                node.y,
                Math.sin(node.angle) * dynamicRadius
            )
            mesh2.position.set(
                Math.cos(node.angle + Math.PI) * dynamicRadius,
                node.y,
                Math.sin(node.angle + Math.PI) * dynamicRadius
            )

            // Scale based on audio
            const scale = nodeSize * (1 + bandValue * 0.4)
            mesh1.scale.setScalar(scale)
            mesh2.scale.setScalar(scale)

            // Update shader uniforms
            if (shader1) {
                shader1.uTime = time
                shader1.uIntensity = bandValue
            }
            if (shader2) {
                shader2.uTime = time
                shader2.uIntensity = bandValue
            }
        })

        // Update connectors
        if (connectorsRef.current) {
            connectorsRef.current.children.forEach((child, i) => {
                const conn = helixStructure.connectors[i]
                if (!conn) return

                const bandValue = getBandValueForPosition(conn.t, sv)
                const dynamicRadius = baseHelixRadius * (1 + bandValue * 0.7)

                const line = child as THREE.Line
                const positions = line.geometry.attributes.position.array as Float32Array

                positions[0] = Math.cos(conn.angle) * dynamicRadius
                positions[1] = conn.y
                positions[2] = Math.sin(conn.angle) * dynamicRadius
                positions[3] = Math.cos(conn.angle + Math.PI) * dynamicRadius
                positions[4] = conn.y
                positions[5] = Math.sin(conn.angle + Math.PI) * dynamicRadius

                line.geometry.attributes.position.needsUpdate = true

                // Update connector opacity based on audio
                const mat = line.material as THREE.LineBasicMaterial
                mat.opacity = 0.2 + bandValue * 0.4
            })
        }
    })

    const getBandValueForPosition = (t: number, sv: typeof smoothValues.current): number => {
        if (t < 0.2) return sv.bass
        if (t < 0.4) return sv.lowMid
        if (t < 0.6) return sv.mid
        if (t < 0.8) return sv.highMid
        return sv.high
    }

    return (
        <group ref={groupRef}>
            {/* Strand 1 - Blue */}
            {helixStructure.nodes.map((node, i) => (
                <mesh
                    key={`s1-${i}`}
                    ref={(el) => { if (el) strand1Refs.current[i] = el }}
                    position={[
                        Math.cos(node.angle) * baseHelixRadius,
                        node.y,
                        Math.sin(node.angle) * baseHelixRadius
                    ]}
                    scale={nodeSize}
                >
                    <sphereGeometry args={[1, 24, 24]} />
                    <glowShaderMaterial
                        ref={(el: any) => { if (el) shaderRefs.current[i * 2] = el }}
                        uColor1={strandColors.strand1.color1}
                        uColor2={strandColors.strand1.color2}
                        uGlowColor={strandColors.strand1.glow}
                        uFresnelPower={2.5}
                        uNoiseScale={4.0}
                        uNoiseSpeed={0.4}
                        transparent
                        toneMapped={false}
                    />
                </mesh>
            ))}

            {/* Strand 2 - Pink */}
            {helixStructure.nodes.map((node, i) => (
                <mesh
                    key={`s2-${i}`}
                    ref={(el) => { if (el) strand2Refs.current[i] = el }}
                    position={[
                        Math.cos(node.angle + Math.PI) * baseHelixRadius,
                        node.y,
                        Math.sin(node.angle + Math.PI) * baseHelixRadius
                    ]}
                    scale={nodeSize}
                >
                    <sphereGeometry args={[1, 24, 24]} />
                    <glowShaderMaterial
                        ref={(el: any) => { if (el) shaderRefs.current[i * 2 + 1] = el }}
                        uColor1={strandColors.strand2.color1}
                        uColor2={strandColors.strand2.color2}
                        uGlowColor={strandColors.strand2.glow}
                        uFresnelPower={2.5}
                        uNoiseScale={4.0}
                        uNoiseSpeed={0.4}
                        transparent
                        toneMapped={false}
                    />
                </mesh>
            ))}

            {/* Connectors */}
            <group ref={connectorsRef}>
                {helixStructure.connectors.map((conn, i) => (
                    <line key={`conn-${i}`}>
                        <bufferGeometry>
                            <bufferAttribute
                                attach="attributes-position"
                                count={2}
                                array={new Float32Array([
                                    Math.cos(conn.angle) * baseHelixRadius, conn.y, Math.sin(conn.angle) * baseHelixRadius,
                                    Math.cos(conn.angle + Math.PI) * baseHelixRadius, conn.y, Math.sin(conn.angle + Math.PI) * baseHelixRadius
                                ])}
                                itemSize={3}
                            />
                        </bufferGeometry>
                        <lineBasicMaterial
                            color={strandColors.connector}
                            transparent
                            opacity={0.3}
                        />
                    </line>
                ))}
            </group>

            {/* Central ambient light */}
            <pointLight position={[0, 0, 0]} intensity={1.2} color="#6688ff" distance={8} decay={2} />
        </group>
    )
}
