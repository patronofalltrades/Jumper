"use client";

import { ContactShadows, Environment, Lightformer, Sparkles } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Group } from "three";
import { Mascot3D } from "@/components/mascots-3d/models";
import { LAND_CHEER, bandPose, dropHeight, landTime } from "@/lib/game/band";
import type { Pose } from "@/lib/game/mascot";
import type { MascotId } from "@/lib/game/project-mascot";

// The 3D mascot band in the hero of the landing page.
// The pure rules of the motion are in lib/game/band.ts. Loaded with next/dynamic (no server render), like the landing board.

/** A studio light for soft vinyl: a soft key, a cool fill, a green rim, and soft reflections without a file to load. */
function Studio() {
  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[-6, 10, 8]} intensity={3} />
      <directionalLight position={[0, 4, 14]} intensity={1.1} />
      <directionalLight position={[8, 6, -8]} intensity={2.4} color="#ffe2b0" />
      <directionalLight position={[6, 2, 6]} intensity={0.5} color="#cfe8ff" />
      <Environment resolution={256} frames={1}>
        <Lightformer intensity={2} position={[0, 5, -9]} scale={[10, 10, 1]} />
        <Lightformer intensity={1.5} position={[-6, 1, 0]} rotation-y={Math.PI / 2} scale={[10, 2, 1]} />
        <Lightformer intensity={1.2} position={[6, 1, 0]} rotation-y={-Math.PI / 2} scale={[10, 2, 1]} color="#22d66b" />
      </Environment>
    </>
  );
}

/** A thin dark disc with a glowing green edge, for the mascots to stand on. */
function Plinth({ radius }: { radius: number }) {
  return (
    <group position={[0, -0.13, 0]}>
      <mesh>
        <cylinderGeometry args={[radius, radius, 0.26, 96]} />
        <meshBasicMaterial color="#07120c" />
      </mesh>
      <mesh position={[0, 0.13, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[radius, 0.035, 8, 128]} />
        <meshBasicMaterial color="#22d66b" toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Keeps the camera far enough back for a box of half width `halfW` and half height `halfH` around `center`. */
function Fit({ halfW, halfH, centerY, tilt = 0.2 }: { halfW: number; halfH: number; centerY: number; tilt?: number }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const t = Math.tan((30 * Math.PI) / 360);
    const d = Math.max(halfW / (t * (size.width / size.height)), halfH / t);
    camera.position.set(0, centerY + d * tilt, d);
    camera.lookAt(0, centerY, 0);
  }, [camera, size, halfW, halfH, centerY, tilt]);
  return null;
}

/** Drops its children onto the stage, `index` places after the first one. Time starts when it mounts. */
function Drop({ index, still, children }: { index: number; still: boolean; children: ReactNode }) {
  const ref = useRef<Group>(null);
  const start = useRef<number | null>(null);
  useFrame((state) => {
    start.current ??= state.clock.elapsedTime;
    if (ref.current) ref.current.position.y = still ? 0 : dropHeight(state.clock.elapsedTime - start.current, index);
  });
  return <group ref={ref}>{children}</group>;
}

function useStill() {
  // The scenes render only in the browser (next/dynamic with no server render), so window is there.
  const [still] = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  return still;
}

/** A pointer or a tap on a mascot selects it. A tap ends after 2 seconds; a pointer ends when it leaves. */
function useSelect() {
  const [selected, setSelected] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const select = (i: number | null, forMs?: number) => {
    clearTimeout(timer.current);
    setSelected(i);
    if (forMs) timer.current = setTimeout(() => setSelected(null), forMs);
  };
  useEffect(() => {
    return () => clearTimeout(timer.current);
  }, []);
  const handlers = (i: number) => ({
    onPointerOver: () => {
      document.body.style.cursor = "pointer";
      select(i);
    },
    onPointerOut: () => {
      document.body.style.cursor = "";
      select(null);
    },
    onClick: () => select(i, 2000),
  });
  return { selected, handlers };
}

const BAND: { id: MascotId; at: [number, number, number]; turn: number; scale?: number }[] = [
  { id: "bulb", at: [-5.7, 0, -1.4], turn: 0.38 },
  { id: "volt", at: [-1.95, 0, 0.9], turn: 0.14, scale: 1.08 },
  { id: "knob", at: [2.1, 0, 0.6], turn: -0.14 },
  { id: "coil", at: [5.8, 0, -1.4], turn: -0.38 },
];

/** Sets the pose of each band mascot from the time, and re-renders only when a pose changes. */
function BandPoses({ selected, still, onChange }: { selected: number | null; still: boolean; onChange: (poses: Pose[]) => void }) {
  const last = useRef("");
  const start = useRef<number | null>(null);
  useFrame((state) => {
    start.current ??= state.clock.elapsedTime;
    const t = still ? landTime(BAND.length) + LAND_CHEER + 0.01 : state.clock.elapsedTime - start.current;
    const poses = BAND.map((_, i) => (still ? (selected === i ? "cheer" : "happy") : bandPose(t, i, BAND.length, selected)));
    const key = poses.join();
    if (key !== last.current) {
      last.current = key;
      onChange(poses);
    }
  });
  return null;
}

/** The hero band: Bulb, Volt, Knob and Coil drop onto the stage, cheer, then take turns. Point at one to make it cheer. */
export default function BandScene() {
  const still = useStill();
  const { selected, handlers } = useSelect();
  const [poses, setPoses] = useState<Pose[]>(BAND.map(() => "idle"));
  return (
    <Canvas dpr={[1, 2]} camera={{ fov: 30, near: 0.1, far: 200 }} gl={{ antialias: true, alpha: true, toneMappingExposure: 1.25 }}>
      <Fit halfW={8} halfH={3.9} centerY={3.3} />
      <Studio />
      <BandPoses selected={selected} still={still} onChange={setPoses} />
      {BAND.map((m, i) => (
        <group key={m.id} position={m.at} rotation={[0, m.turn, 0]} scale={m.scale ?? 1} {...handlers(i)}>
          <Drop index={i} still={still}>
            <Mascot3D id={m.id} pose={poses[i]} phase={i * 0.9} still={still} />
          </Drop>
        </group>
      ))}
      <Plinth radius={8.6} />
      <ContactShadows position={[0, 0.01, 0]} opacity={0.55} scale={20} blur={2.6} far={7} resolution={512} color="#000000" />
      {!still && <Sparkles count={36} scale={[16, 8, 6]} position={[0, 4, -1]} size={3} speed={0.3} opacity={0.7} color="#f5c518" />}
    </Canvas>
  );
}

