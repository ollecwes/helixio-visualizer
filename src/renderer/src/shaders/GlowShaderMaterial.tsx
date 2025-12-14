import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import * as THREE from 'three'

// Vertex shader - passes data to fragment shader
const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vUv = uv;
    
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Fragment shader - creates the visual magic
const fragmentShader = `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform vec3 uGlowColor;
  uniform float uFresnelPower;
  uniform float uNoiseScale;
  uniform float uNoiseSpeed;
  
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying vec3 vWorldPosition;
  
  // Simplex 3D noise function
  vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
      
    float n_ = 1.0/7.0;
    vec3 ns = n_ * D.wyz - D.xzx;
    
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
  
  void main() {
    // Calculate view direction for fresnel
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    
    // Fresnel effect - edges glow brighter
    float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), uFresnelPower);
    fresnel = clamp(fresnel, 0.0, 1.0);
    
    // Animated 3D noise for organic texture
    vec3 noisePos = vPosition * uNoiseScale + vec3(uTime * uNoiseSpeed);
    float noise = snoise(noisePos) * 0.5 + 0.5;
    
    // Secondary noise layer for more detail
    float noise2 = snoise(noisePos * 2.0 + 100.0) * 0.5 + 0.5;
    float combinedNoise = mix(noise, noise2, 0.3);
    
    // Iridescent color shift based on view angle and noise
    float iridescence = dot(vNormal, viewDir) * 0.5 + 0.5;
    iridescence += combinedNoise * 0.3;
    iridescence = fract(iridescence + uTime * 0.05);
    
    // Mix between two colors based on iridescence
    vec3 baseColor = mix(uColor1, uColor2, iridescence);
    
    // Add intensity-based brightness
    baseColor *= (0.7 + uIntensity * 0.5);
    
    // Add noise-based variation
    baseColor += combinedNoise * 0.15;
    
    // Fresnel glow - add glow color at edges
    vec3 glowContribution = uGlowColor * fresnel * (0.8 + uIntensity * 0.8);
    
    // Inner core glow - brighter in center
    float coreGlow = 1.0 - fresnel;
    coreGlow = pow(coreGlow, 1.5);
    
    // Combine all effects
    vec3 finalColor = baseColor * coreGlow + glowContribution;
    
    // Add subtle pulsing based on intensity
    finalColor += uGlowColor * uIntensity * 0.3 * (sin(uTime * 3.0) * 0.5 + 0.5);
    
    // Ensure we don't exceed 1.0 for nice bloom interaction
    finalColor = clamp(finalColor * 1.5, 0.0, 2.0);
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`

// Create the shader material
const GlowShaderMaterial = shaderMaterial(
    {
        uTime: 0,
        uIntensity: 0.5,
        uColor1: new THREE.Color('#4a9eff'),
        uColor2: new THREE.Color('#ff6b9d'),
        uGlowColor: new THREE.Color('#aaccff'),
        uFresnelPower: 2.5,
        uNoiseScale: 3.0,
        uNoiseSpeed: 0.3,
    },
    vertexShader,
    fragmentShader
)

// Extend Three.js with our custom material
extend({ GlowShaderMaterial })

// TypeScript declaration
declare global {
    namespace JSX {
        interface IntrinsicElements {
            glowShaderMaterial: any
        }
    }
}

export { GlowShaderMaterial }
