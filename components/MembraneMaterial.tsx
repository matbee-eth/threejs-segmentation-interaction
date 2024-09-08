import * as THREE from 'three';
import { shaderMaterial } from '@react-three/drei';
import { extend, MaterialNode } from '@react-three/fiber';

const MembraneMaterialImpl = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color(0.9, 0.9, 0.9),
  },
  // vertex shader
  `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform float uTime;

    void main() {
      vUv = uv;
      vNormal = normalize(normalMatrix * normal);
      vPosition = position;

      float wave = sin(position.x * 2.0 + uTime) * 0.1
                 + cos(position.y * 2.0 + uTime) * 0.1;
      vec3 pos = position + normal * wave;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  // fragment shader
  `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vPosition;
    uniform vec3 uColor;
    uniform float uTime;

    // Simple procedural texture function
    vec3 proceduralTexture(vec2 uv) {
      float checker = mod(floor(uv.x * 10.0) + floor(uv.y * 10.0), 2.0);
      vec3 color1 = vec3(0.8, 0.8, 0.8);
      vec3 color2 = vec3(0.6, 0.6, 0.6);
      return mix(color1, color2, checker);
    }

    void main() {
      vec3 viewDirection = normalize(cameraPosition - vPosition);
      float fresnelTerm = dot(viewDirection, vNormal);
      fresnelTerm = clamp(1.0 - fresnelTerm, 0.0, 1.0);

      vec3 color = uColor + 0.1 * sin(uTime * 0.5);
      vec3 texColor = proceduralTexture(vUv);

      gl_FragColor = vec4(color * texColor + fresnelTerm * 0.5, 0.5 + fresnelTerm * 0.5);
    }
  `
);

// Create a type for the MembraneMaterial
export type MembraneMaterialType = {
  uTime: number;
  uColor: THREE.Color;
} & THREE.ShaderMaterial;

// Extend so it's available in JSX
extend({ MembraneMaterial: MembraneMaterialImpl });

// Add type declaration
declare global {
  namespace JSX {
    interface IntrinsicElements {
      membraneMaterial: MaterialNode<MembraneMaterialType, typeof MembraneMaterialImpl>
    }
  }
}

// Export the material with the correct type
export const MembraneMaterial = MembraneMaterialImpl as unknown as new () => MembraneMaterialType;