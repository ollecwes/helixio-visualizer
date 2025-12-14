import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface RibbonTrailProps {
    positions: THREE.Vector3[]
    width?: number
    color: THREE.Color
    glowColor: THREE.Color
    intensity: number
    time: number
}

export const RibbonTrail = ({
    positions,
    width = 0.08,
    color,
    glowColor,
    intensity,
    time
}: RibbonTrailProps) => {
    const meshRef = useRef<THREE.Mesh>(null)
    const geometryRef = useRef<THREE.BufferGeometry>(null)

    const maxPoints = 60

    // Create initial geometry with proper attributes
    const { positionArray, uvArray } = useMemo(() => {
        const geo = new THREE.BufferGeometry()

        // Each segment has 2 vertices (left and right of ribbon)
        const vertexCount = maxPoints * 2
        const positions = new Float32Array(vertexCount * 3)
        const uvs = new Float32Array(vertexCount * 2)

        // Indices for triangle strip (quads between segments)
        const indices: number[] = []
        for (let i = 0; i < maxPoints - 1; i++) {
            const i2 = i * 2
            // Two triangles per quad
            indices.push(i2, i2 + 1, i2 + 2)
            indices.push(i2 + 1, i2 + 3, i2 + 2)
        }

        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
        geo.setIndex(indices)

        return {
            positionArray: positions,
            uvArray: uvs
        }
    }, [maxPoints])

    // Update geometry when positions change
    useFrame(() => {
        if (!meshRef.current || positions.length < 2) return

        const geo = meshRef.current.geometry
        const posAttr = geo.attributes.position as THREE.BufferAttribute
        const uvAttr = geo.attributes.uv as THREE.BufferAttribute

        const posArr = posAttr.array as Float32Array
        const uvArr = uvAttr.array as Float32Array

        // Calculate ribbon vertices
        for (let i = 0; i < maxPoints; i++) {
            const posIndex = Math.min(i, positions.length - 1)
            const point = positions[posIndex] || new THREE.Vector3()

            // Progress along ribbon (0 = head, 1 = tail)
            const progress = i / (maxPoints - 1)

            // Calculate tangent direction
            let tangent: THREE.Vector3
            if (i < positions.length - 1 && i > 0) {
                const prev = positions[Math.max(0, posIndex - 1)]
                const next = positions[Math.min(positions.length - 1, posIndex + 1)]
                tangent = new THREE.Vector3().subVectors(next, prev).normalize()
            } else if (i === 0 && positions.length > 1) {
                tangent = new THREE.Vector3().subVectors(positions[1], positions[0]).normalize()
            } else if (positions.length > 1) {
                tangent = new THREE.Vector3().subVectors(
                    positions[positions.length - 1],
                    positions[positions.length - 2]
                ).normalize()
            } else {
                tangent = new THREE.Vector3(0, 1, 0)
            }

            // Calculate perpendicular direction (cross with up vector)
            const up = new THREE.Vector3(0, 1, 0)
            let perp = new THREE.Vector3().crossVectors(tangent, up).normalize()

            // Handle case where tangent is parallel to up
            if (perp.length() < 0.1) {
                perp = new THREE.Vector3().crossVectors(tangent, new THREE.Vector3(1, 0, 0)).normalize()
            }

            // Width tapers along the ribbon
            const taperWidth = width * (1.0 - progress * 0.9)

            // Left vertex
            const leftIndex = i * 2
            posArr[leftIndex * 3] = point.x - perp.x * taperWidth
            posArr[leftIndex * 3 + 1] = point.y - perp.y * taperWidth
            posArr[leftIndex * 3 + 2] = point.z - perp.z * taperWidth

            // Right vertex
            const rightIndex = i * 2 + 1
            posArr[rightIndex * 3] = point.x + perp.x * taperWidth
            posArr[rightIndex * 3 + 1] = point.y + perp.y * taperWidth
            posArr[rightIndex * 3 + 2] = point.z + perp.z * taperWidth

            // UVs
            uvArr[leftIndex * 2] = progress
            uvArr[leftIndex * 2 + 1] = 0
            uvArr[rightIndex * 2] = progress
            uvArr[rightIndex * 2 + 1] = 1
        }

        posAttr.needsUpdate = true
        uvAttr.needsUpdate = true
        geo.computeVertexNormals()
    })

    // Create gradient material with custom shader
    const material = useMemo(() => {
        return new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uIntensity: { value: 0.5 },
                uColor: { value: color },
                uGlowColor: { value: glowColor },
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform float uIntensity;
                uniform vec3 uColor;
                uniform vec3 uGlowColor;
                varying vec2 vUv;
                
                void main() {
                    // Progress fade (head to tail)
                    float fade = 1.0 - vUv.x;
                    fade = pow(fade, 1.2);
                    
                    // Edge softness
                    float edge = 1.0 - abs(vUv.y - 0.5) * 2.0;
                    edge = pow(edge, 0.6);
                    
                    // Flowing energy
                    float flow = sin((vUv.x * 10.0 - uTime * 3.0)) * 0.5 + 0.5;
                    
                    // Color blend
                    vec3 col = mix(uColor, uGlowColor, flow * 0.5 + (1.0 - vUv.x) * 0.3);
                    col *= 1.0 + uIntensity * 0.5;
                    
                    // Core glow at center
                    float core = edge * (1.0 - vUv.x) * uIntensity;
                    col += uGlowColor * core * 0.5;
                    
                    float alpha = fade * edge * (0.5 + uIntensity * 0.5);
                    
                    gl_FragColor = vec4(col * 1.5, alpha);
                }
            `,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        })
    }, [color, glowColor])

    // Update uniforms
    useFrame(() => {
        if (material) {
            material.uniforms.uTime.value = time
            material.uniforms.uIntensity.value = intensity
            material.uniforms.uColor.value = color
            material.uniforms.uGlowColor.value = glowColor
        }
    })

    if (positions.length < 2) return null

    return (
        <mesh ref={meshRef} material={material}>
            <bufferGeometry ref={geometryRef}>
                <bufferAttribute
                    attach="attributes-position"
                    count={maxPoints * 2}
                    array={positionArray}
                    itemSize={3}
                />
                <bufferAttribute
                    attach="attributes-uv"
                    count={maxPoints * 2}
                    array={uvArray}
                    itemSize={2}
                />
            </bufferGeometry>
        </mesh>
    )
}
