"use client";
import React, { useRef, useMemo, useState, useEffect, Suspense } from "react";
import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { MembraneMaterial, MembraneMaterialType } from "./MembraneMaterial";
import { GLTF } from "three/examples/jsm/Addons.js";

extend({ MembraneMaterial });

type GLTFResult = GLTF & {
  nodes: Record<string, THREE.Mesh>;
};

function Head({ onLoad }: { onLoad: (scale: number) => void }) {
  const { nodes } = useGLTF("/EvilScreamingManBaseMesh_1subd.glb") as unknown as GLTFResult;
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (meshRef.current && nodes.EvilScreaminManBaseMesh) {
      const bbox = new THREE.Box3().setFromObject(meshRef.current);
      const size = new THREE.Vector3();
      bbox.getSize(size);
      const maxDimension = Math.max(size.x, size.y, size.z);
      const scale = 2 / maxDimension;
      onLoad(scale);
    }
  }, [nodes, onLoad]);

  if (!nodes.EvilScreaminManBaseMesh) {
    console.error("Head model not found in GLTF file");
    return null;
  }

  return (
    <mesh ref={meshRef} geometry={nodes.EvilScreaminManBaseMesh.geometry} visible={false}>
      <meshStandardMaterial color="white" transparent opacity={0} />
    </mesh>
  );
}

function Membrane({ headPosition, scale }: { headPosition: THREE.Vector3; scale: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  const materialRef = useRef<MembraneMaterialType>(null);

  const gridSize = 200;
  const membraneSize = 10 * scale;
  const particles = useMemo(() => {
    const count = gridSize * gridSize;
    const positions = new Float32Array(count * 3);
    const originalPositions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const x = (i % gridSize) / (gridSize - 1) - 0.5;
      const y = Math.floor(i / gridSize) / (gridSize - 1) - 0.5;
      const i3 = i * 3;
      positions[i3] = originalPositions[i3] = x * membraneSize;
      positions[i3 + 1] = originalPositions[i3 + 1] = y * membraneSize;
      positions[i3 + 2] = originalPositions[i3 + 2] = 0;
    }

    return { positions, originalPositions };
  }, [scale, membraneSize]);

  useFrame((state) => {
    if (materialRef.current && mesh.current) {
      materialRef.current.uTime = state.clock.elapsedTime;

      const positions = mesh.current.geometry.attributes.position.array as Float32Array;
      const { originalPositions } = particles;

      const headRadius = 1.5 * scale;
      const maxPushDistance = 2 * scale;
      const stiffness = 0.8;

      for (let i = 0; i < positions.length; i += 3) {
        const x = positions[i];
        const y = positions[i + 1];
        const dx = x - headPosition.x;
        const dy = y - headPosition.y;
        const dz = originalPositions[i + 2] - headPosition.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (distance < headRadius + maxPushDistance && headPosition.z > -1.5 * scale) {
          const pushFactor = Math.pow((headRadius + maxPushDistance - distance) / maxPushDistance, 2);
          const pushForce = pushFactor * maxPushDistance * (headPosition.z + 1.5 * scale) / (3 * scale);
          positions[i + 2] = originalPositions[i + 2] + pushForce;
        } else {
          positions[i + 2] += (originalPositions[i + 2] - positions[i + 2]) * stiffness;
        }
      }

      mesh.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <mesh ref={mesh}>
      <planeGeometry args={[membraneSize, membraneSize, gridSize - 1, gridSize - 1]} />
      <membraneMaterial
        ref={materialRef}
        side={THREE.DoubleSide}
        transparent
        opacity={0.8}
        attach="material"
      />
    </mesh>
  );
}

function Scene() {
  const [headPosition, setHeadPosition] = useState(new THREE.Vector3(0, 0, -2));
  const [scale, setScale] = useState<number | null>(null);
  const { camera } = useThree();

  useEffect(() => {
    if (scale === null) return;

    let animationFrameId: number;
    let startTime: number | null = null;
    const animationDuration = 10;
    const animationDistance = 3 * scale;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;
      const progress = (elapsed % animationDuration) / animationDuration;
      const z = Math.sin(progress * Math.PI * 2) * animationDistance - 2 * scale;
      setHeadPosition(new THREE.Vector3(0, 0, z));
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [scale]);

  useEffect(() => {
    if (scale !== null) {
      camera.position.set(0, 0, 10 * scale);
      camera.updateProjectionMatrix();
    }
  }, [camera, scale]);

  const handleHeadLoad = (headScale: number) => {
    setScale(headScale);
  };

  if (scale === null) {
    return <Head onLoad={handleHeadLoad} />;
  }

  return (
    <>
      <Membrane headPosition={headPosition} scale={scale} />
      <mesh scale={[scale, scale, scale]} position={headPosition}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="pink" transparent opacity={0.7} />
      </mesh>
    </>
  );
}

export default function MembraneEffect() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <Canvas>
        <color attach="background" args={["#111"]} />
        <OrbitControls />
        <Suspense fallback={null}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  );
}