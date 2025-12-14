import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import * as THREE from 'three'

// Vertex shader for ribbon - handles width and position
const ribbonVertexShader = `
  attribute float aProgress;
  attribute float aSide;
  
  varying float vProgress;
  varying vec2 vUv;
  
  uniform float uWidth;
  uniform float uTaper;
  
  void main() {
    vProgress = aProgress;
    vUv = vec2(aProgress, aSide * 0.5 + 0.5);
    
    // Width tapers from full at start to thin at end
    float width = uWidth * (1.0 - aProgress * uTaper);
    
    // Offset position by side (-1 or 1) and width
    vec3 pos = position;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

// Fragment shader for ribbon - handles glow and transparency
const ribbonFragmentShader = `
  uniform float uTime;
  uniform float uIntensity;
  uniform vec3 uColor;
  uniform vec3 uGlowColor;
  uniform float uFlowSpeed;
  
  varying float vProgress;
  varying vec2 vUv;
  
  void main() {
    // Base opacity - fades along the trail
    float fadeAlpha = 1.0 - vProgress;
    fadeAlpha = pow(fadeAlpha, 1.5); // Stronger fade at end
    
    // Edge fade - softer edges
    float edgeFade = 1.0 - abs(vUv.y - 0.5) * 2.0;
    edgeFade = pow(edgeFade, 0.5);
    
    // Flowing energy effect
    float flow = sin((vProgress * 8.0 - uTime * uFlowSpeed) * 3.14159) * 0.5 + 0.5;
    flow = mix(0.5, flow, 0.6);
    
    // Color with glow
    vec3 color = mix(uColor, uGlowColor, flow * uIntensity);
    color += uGlowColor * (1.0 - vProgress) * uIntensity * 0.5;
    
    // Final alpha
    float alpha = fadeAlpha * edgeFade * (0.6 + uIntensity * 0.4);
    
    // Boost brightness
    color *= 1.5;
    
    gl_FragColor = vec4(color, alpha);
  }
`

// Create ribbon shader material
const RibbonShaderMaterial = shaderMaterial(
    {
        uTime: 0,
        uIntensity: 0.5,
        uColor: new THREE.Color('#4a9eff'),
        uGlowColor: new THREE.Color('#aaccff'),
        uWidth: 0.1,
        uTaper: 0.9,
        uFlowSpeed: 2.0,
    },
    ribbonVertexShader,
    ribbonFragmentShader
)

extend({ RibbonShaderMaterial })

declare global {
    namespace JSX {
        interface IntrinsicElements {
            ribbonShaderMaterial: any
        }
    }
}

export { RibbonShaderMaterial }
