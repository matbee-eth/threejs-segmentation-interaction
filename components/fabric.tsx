"use client";
import React, { useRef, useMemo, useState, useEffect, Suspense, forwardRef } from "react";
import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { MembraneMaterial, MembraneMaterialType } from "./MembraneMaterial";
import { GLTF } from "three/examples/jsm/Addons.js";

extend({ MembraneMaterial });

type GLTFResult = GLTF & {
  nodes: Record<string, THREE.Mesh>;
};

function Head({
  onLoad,
}: {
  onLoad: (scale: number, geometry: THREE.BufferGeometry) => void;
}) {
  const { nodes } = useGLTF(
    "/EvilScreamingManBaseMesh_1subd.glb"
  ) as unknown as GLTFResult;
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (meshRef.current && nodes.EvilScreaminManBaseMesh) {
      const bbox = new THREE.Box3().setFromObject(meshRef.current);
      const size = new THREE.Vector3();
      bbox.getSize(size);
      const maxDimension = Math.max(size.x, size.y, size.z);
      const scale = 2 / maxDimension;
      onLoad(scale, nodes.EvilScreaminManBaseMesh.geometry);
    }
  }, [nodes, onLoad]);

  if (!nodes.EvilScreaminManBaseMesh) {
    console.error("Head model not found in GLTF file");
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      geometry={nodes.EvilScreaminManBaseMesh.geometry}
      visible={false}
    >
      <meshStandardMaterial color="white" transparent opacity={0} />
    </mesh>
  );
}

interface MembraneProps {
    headPosition: THREE.Vector3;
    scale: number;
    headGeometry: THREE.BufferGeometry;
  }
  
  const Membrane: React.FC<MembraneProps> = ({ headPosition, scale, headGeometry }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const materialRef = useRef<MembraneMaterialType>(null);
  
    const gridSize = 200;
    const membraneSize = 10 * scale;
  
    const { positions, originalPositions, velocities } = useMemo(() => {
      const count = gridSize * gridSize;
      const pos = new Float32Array(count * 3);
      const origPos = new Float32Array(count * 3);
      const vel = new Float32Array(count * 3);
  
      for (let i = 0; i < count; i++) {
        const x = (i % gridSize) / (gridSize - 1) - 0.5;
        const y = Math.floor(i / gridSize) / (gridSize - 1) - 0.5;
        const i3 = i * 3;
        pos[i3] = origPos[i3] = x * membraneSize;
        pos[i3 + 1] = origPos[i3 + 1] = y * membraneSize;
        pos[i3 + 2] = origPos[i3 + 2] = 0;
        vel[i3] = vel[i3 + 1] = vel[i3 + 2] = 0;
      }
  
      return { positions: pos, originalPositions: origPos, velocities: vel };
    }, [gridSize, membraneSize]);
  
    const raycaster = useMemo(() => new THREE.Raycaster(), []);
    const tempVector = useMemo(() => new THREE.Vector3(), []);
  
    useFrame((state, delta) => {
      if (!meshRef.current || !materialRef.current) return;
  
      materialRef.current.uTime = state.clock.elapsedTime;
  
      const headMesh = new THREE.Mesh(headGeometry);
      headMesh.position.copy(headPosition);
      headMesh.updateMatrixWorld();
  
      for (let i = 0; i < positions.length; i += 3) {
        tempVector.set(positions[i], positions[i + 1], positions[i + 2]);
        raycaster.set(tempVector, new THREE.Vector3(0, 0, -1));
        const intersects = raycaster.intersectObject(headMesh);
  
        if (intersects.length > 0) {
          const pushDistance = Math.max(0, intersects[0].distance);
          const targetZ = -pushDistance;
          const force = (targetZ - positions[i + 2]) * 0.1;
          velocities[i + 2] += force;
        } else {
          const restoreForce = (originalPositions[i + 2] - positions[i + 2]) * 0.03;
          velocities[i + 2] += restoreForce;
        }
  
        velocities[i + 2] *= 0.99; // damping
        positions[i + 2] += velocities[i + 2];
      }
  
      meshRef.current.geometry.attributes.position.needsUpdate = true;
    });
  
    return (
      <mesh ref={meshRef} position={[0, 0, 0]}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={positions.length / 3}
            array={positions}
            itemSize={3}
          />
        </bufferGeometry>
        <membraneMaterial
          ref={materialRef}
          side={THREE.DoubleSide}
          transparent
          opacity={0.4}
          attach="material"
        />
      </mesh>
    );
  };

  function AnimatedHead({ position, rotation, scale, geometry }: {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: number;
    geometry: THREE.BufferGeometry;
  }) {
    return (
      <mesh position={position} rotation={rotation} scale={[scale, scale, scale]} geometry={geometry}>
        <meshStandardMaterial color="pink" transparent opacity={0.7} />
      </mesh>
    );
  }
  
  function Scene() {
    const [headPosition, setHeadPosition] = useState(new THREE.Vector3(0, 0, -2));
    const [headRotation] = useState(new THREE.Euler(Math.PI, 0, 0));
    const [scale, setScale] = useState<number | null>(null);
    const [headGeometry, setHeadGeometry] = useState<THREE.BufferGeometry | null>(null);
  
    useEffect(() => {
      if (scale === null) return;
  
      let animationFrameId: number;
      const animate = () => {
        const time = Date.now() * 0.001;
        const newZ = Math.sin(time) * 2 - 2; // Oscillate between -4 and 0
        setHeadPosition(new THREE.Vector3(0, 0, Math.min(newZ, -0.1))); // Prevent going past z=-0.1
        animationFrameId = requestAnimationFrame(animate);
      };
  
      animationFrameId = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(animationFrameId);
    }, [scale]);
  
    const handleHeadLoad = (headScale: number, geometry: THREE.BufferGeometry) => {
      setScale(headScale);
      setHeadGeometry(geometry);
    };
  
    return (
      <>
        <ambientLight intensity={0.2} />
        <pointLight position={[5, 5, 5]} intensity={0.5} />
        <Head onLoad={handleHeadLoad} />
        {scale !== null && headGeometry !== null && (
          <>
            <Membrane headPosition={headPosition} scale={scale} headGeometry={headGeometry} />
            <AnimatedHead position={headPosition} rotation={headRotation} scale={scale} geometry={headGeometry} />
          </>
        )}
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
