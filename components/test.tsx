"use client"
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

const BasicScene: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("useEffect triggered");

    // Check if the component is mounted
    if (!mountRef.current) {
      console.error("mountRef.current is null");
      return;
    }

    // Scene setup
    const scene = new THREE.Scene();
    console.log("Scene created");

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    console.log("Camera created");

    const renderer = new THREE.WebGLRenderer();
    console.log("Renderer created");

    renderer.setSize(window.innerWidth, window.innerHeight);
    console.log("Renderer size set");

    mountRef.current.appendChild(renderer.domElement);
    console.log("Renderer DOM element appended");

    // Add a simple cube
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    console.log("Geometry created");

    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    console.log("Material created");

    const cube = new THREE.Mesh(geometry, material);
    console.log("Cube created");

    scene.add(cube);
    console.log("Cube added to scene");

    camera.position.z = 5;
    console.log("Camera position set");

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;

      renderer.render(scene, camera);
      console.log("Scene rendered");
    };

    animate();
    console.log("Animation started");

    // Cleanup
    return () => {
      if (mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
        console.log("Renderer DOM element removed");
      }
    };
  }, []);

  if (error) {
    console.error("Error state:", error);
    return <div>Error: {error}</div>;
  }

  return <div ref={mountRef} style={{ width: '100%', height: '100vh' }} />;
};

export default BasicScene;