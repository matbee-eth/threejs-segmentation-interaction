"use client"

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const ImageSpherePullThrough: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
    renderer.setSize(canvas.width, canvas.height);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 1000);
    camera.position.z = 5;

    const loader = new THREE.TextureLoader();
    loader.crossOrigin = 'anonymous';

    const texture = loader.load('https://picsum.photos/400/400', (loadedTexture) => {
      loadedTexture.needsUpdate = true;
      render();
    });

    // Create a sphere with the image as a texture
    const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
    const sphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        textureSampler: { value: texture },
        pullProgress: { value: 0.0 },
        sphereCenter: { value: new THREE.Vector3(0, 0, -2) },
        sphereRadius: { value: 1.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        void main() {
          vUv = uv;
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D textureSampler;
        uniform float pullProgress;
        uniform vec3 sphereCenter;
        uniform float sphereRadius;
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        void main() {
          float distanceToSphere = distance(vWorldPosition, sphereCenter);
          float threshold = mix(sphereRadius * 2.0, -sphereRadius, pullProgress);
          if (distanceToSphere < threshold) {
            gl_FragColor = texture2D(textureSampler, vUv);
          } else {
            discard;
          }
        }
      `,
      side: THREE.DoubleSide,
      transparent: true,
    });

    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.position.z = -2;
    scene.add(sphere);

    // Create a plane to represent the canvas with a custom shader
    const planeGeometry = new THREE.PlaneGeometry(4, 4);
    const planeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        textureSampler: { value: texture },
        sphereCenter: { value: new THREE.Vector3(0, 0, -2) },
        sphereRadius: { value: 1.0 },
        pullProgress: { value: 0.0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        void main() {
          vUv = uv;
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D textureSampler;
        uniform vec3 sphereCenter;
        uniform float sphereRadius;
        uniform float pullProgress;
        varying vec2 vUv;
        varying vec3 vWorldPosition;
        void main() {
          float distanceToSphere = distance(vWorldPosition, sphereCenter);
          float threshold = mix(sphereRadius * 2.0, -sphereRadius, pullProgress);
          if (distanceToSphere < threshold) {
            discard;
          } else {
            gl_FragColor = texture2D(textureSampler, vUv);
          }
        }
      `,
      side: THREE.DoubleSide,
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    scene.add(plane);

    let mouseX = 0, mouseY = 0;
    let pullProgress = 0;

    const handleMouseMove = (event: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = ((event.clientX - rect.left) / canvas.width) * 2 - 1;
      mouseY = -((event.clientY - rect.top) / canvas.height) * 2 + 1;
    };

    const handleMouseDown = () => setIsMouseDown(true);
    const handleMouseUp = () => setIsMouseDown(false);

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);

    function render() {
      requestAnimationFrame(render);

      if (isMouseDown && pullProgress < 1) {
        pullProgress = Math.min(pullProgress + 0.01, 1);
      } else if (!isMouseDown && pullProgress > 0) {
        pullProgress = Math.max(pullProgress - 0.01, 0);
      }

      sphere.position.x = mouseX * 2;
      sphere.position.y = mouseY * 2;
      sphere.position.z = -2 + pullProgress * 2;

      sphere.material.uniforms.pullProgress.value = pullProgress;
      sphere.material.uniforms.sphereCenter.value = sphere.position;

      plane.material.uniforms.sphereCenter.value = sphere.position;
      plane.material.uniforms.pullProgress.value = pullProgress;

      renderer.render(scene, camera);
    }

    render();

    return () => {
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isMouseDown]);

  return (
    <div>
      <canvas ref={canvasRef} width={400} height={400} style={{ border: '1px solid black' }} />
      <p>Click and hold to pull the image through as a sphere.</p>
    </div>
  );
};

export default ImageSpherePullThrough;