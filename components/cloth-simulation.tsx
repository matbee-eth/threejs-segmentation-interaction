"use client"
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

interface Particle {
  position: THREE.Vector3;
  original: THREE.Vector3;
}

interface ClothSimulationProps {
  imageUrl: string;
}

const ClothSimulation: React.FC<ClothSimulationProps> = ({ imageUrl }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let scene: THREE.Scene;
    let camera: THREE.PerspectiveCamera;
    let renderer: THREE.WebGLRenderer;
    let cloth: THREE.Mesh;
    let sphere: THREE.Mesh;
    let controls: OrbitControls;
    let clothGeometry: THREE.PlaneGeometry;
    let particles: Particle[];

    const xSegs = 50;
    const ySegs = 50;

    const init = async (): Promise<void> => {
      try {
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 0, 5);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setClearColor(0x000000, 1);
        mountRef.current?.appendChild(renderer.domElement);

        controls = new OrbitControls(camera, renderer.domElement);

        clothGeometry = new THREE.PlaneGeometry(3, 3, xSegs, ySegs);

        // Load the image texture
        const textureLoader = new THREE.TextureLoader();
        const texture = await new Promise<THREE.Texture>((resolve, reject) => {
          textureLoader.load(imageUrl, resolve, undefined, reject);
        });

        const clothMaterial = new THREE.MeshPhongMaterial({
          map: texture,
          side: THREE.DoubleSide,
          wireframe: false,
        });

        cloth = new THREE.Mesh(clothGeometry, clothMaterial);
        scene.add(cloth);

        const sphereGeometry = new THREE.SphereGeometry(0.5, 32, 32);
        const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000});
        sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.set(0, 0, -0.5);  // Start slightly behind the cloth
        scene.add(sphere);

        const light = new THREE.PointLight(0xffffff, 1, 100);
        light.position.set(0, 0, 10);
        scene.add(light);

        const ambientLight = new THREE.AmbientLight(0x404040);
        scene.add(ambientLight);

        initClothSimulation();
        setIsLoading(false);
      } catch (err) {
        console.error("Error initializing scene:", err);
        setError("Failed to initialize the scene. Please try again.");
        setIsLoading(false);
      }
    };

    const initClothSimulation = (): void => {
      particles = [];
      const pos = clothGeometry.attributes.position;

      for (let i = 0; i < pos.count; i++) {
        particles.push({
          position: new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)),
          original: new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i)),
        });
      }
    };

    const updateCloth = (): void => {
      const spherePosition = sphere.position;
      const sphereRadius = 0.5;

      const pos = clothGeometry.attributes.position;

      for (let i = 0, il = particles.length; i < il; i++) {
        const particle = particles[i];
        const toSphere = particle.original.clone().sub(spherePosition);
        const distance = toSphere.length();

        if (distance < sphereRadius) {
          // If the particle is inside the sphere, move it to the surface
          const surfacePoint = spherePosition.clone().add(toSphere.normalize().multiplyScalar(sphereRadius));
          particle.position.copy(surfacePoint);
        } else {
          // If the particle is outside the sphere, smoothly transition back to its original position
          particle.position.lerp(particle.original, 0.1);
        }

        pos.setXYZ(i, particle.position.x, particle.position.y, particle.position.z);
      }

      clothGeometry.computeVertexNormals();
      pos.needsUpdate = true;
    };

    const animate = (): void => {
      requestAnimationFrame(animate);
      
      // Move the sphere back and forth
      sphere.position.z = Math.sin(Date.now() * 0.001) * 0.5;
      
      updateCloth();
      renderer.render(scene, camera);
    };

    init().then(() => {
      animate();
    }).catch((err) => {
      console.error("Error in init or animate:", err);
      setError("An error occurred while setting up the simulation.");
      setIsLoading(false);
    });

    const handleResize = (): void => {
      if (camera && renderer) {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (renderer && mountRef.current) {
        mountRef.current.removeChild(renderer.domElement);
      }
    };
  }, [imageUrl]);


  return <div ref={mountRef} style={{ width: '100%', height: '100vh' }} />;
};

export default ClothSimulation;