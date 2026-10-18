"use client";

import { Line, OrbitControls } from "@react-three/drei";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Color, MathUtils, Object3D, Vector3, type InstancedMesh } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { BOARD, BOARD_B_X, nearestHole, type Bench, type Hole } from "@/lib/circuit/bench";
import { isModuleType, type ModuleType } from "@/lib/circuit/modules";
import { buildNets, netHoles } from "@/lib/circuit/nets";
import { checkModule, isModule, partPins } from "@/lib/circuit/parts";
import { boardStore, useBoard } from "@/lib/game/board-store";
import { ModuleGhost, ModuleMesh } from "./modules";
import { PartMesh } from "./parts";
import { drawBreadboard, drawEsp, drawShield, SHIELD } from "./textures";
import { useFontTexture } from "./use-font-texture";

const HOLE_BASE = new Color("#3B4146");
/** The bench center, between the two breadboards. */
const TARGET = new Vector3(BOARD_B_X / 2 + BOARD.centerX - 0.5, 0, 1.5);
/** Keep the camera target on the bench, so that a pan cannot lose the board. */
const PAN_LIMIT = { x: [-4, 35], z: [-16, 16] } as const;
const PCB_Y = 1.0;
const PCB_T = 0.16;

/** A click or tap, not the end of a camera drag: less than 6 px of movement and less than 600 ms. */
let pressedAt = 0;
const isTap = (e: ThreeEvent<MouseEvent>) => e.delta < 6 && performance.now() - pressedAt < 600;
const isTouchScreen = () => document.documentElement.dataset.touch === "true";

export default function BuildScene() {
  return (
    <Canvas
      shadows
      flat
      frameloop="demand"
      dpr={[1, 2]}
      camera={{ fov: 35, near: 0.5, far: 400 }}
      gl={{ alpha: true, antialias: true }}
      onPointerDown={() => (pressedAt = performance.now())}
      onPointerMissed={() => boardStore.getState().setHover(null)}
      className="touch-none"
    >
      <hemisphereLight args={["#ffffff", "#8899a6", 0.75 * Math.PI]} />
      <directionalLight
        position={[TARGET.x - 18, 42, 26]}
        intensity={0.75 * Math.PI}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0008}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <CameraRig />
      <Bench />
    </Canvas>
  );
}

function CameraRig() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const controls = useRef<OrbitControlsImpl>(null);
  const fittedAspect = useRef(0);

  // Frame the whole bench at the first size, and again when the shape of the screen changes a lot (a phone turns).
  // Small changes, such as a phone browser bar that hides, keep the camera where the learner put it.
  // A phone in portrait sees the bench from closer and more from above.
  useLayoutEffect(() => {
    if (!size.width || !size.height) return;
    const aspect = size.width / size.height;
    if (fittedAspect.current && Math.abs(aspect / fittedAspect.current - 1) < 0.25) return;
    fittedAspect.current = aspect;
    const vfov = MathUtils.degToRad(35);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    // Fit the width of both boards (39.4) and most of their length (32.5); the tilt makes the length look shorter.
    const distance = Math.max(46 / 2 / Math.tan(hfov / 2), 32 / 2 / Math.tan(vfov / 2));
    const direction = aspect < 0.9 ? new Vector3(0, 0.9, 0.42) : new Vector3(0, 0.78, 0.62);
    camera.position.copy(TARGET).add(direction.normalize().multiplyScalar(distance));
    camera.lookAt(TARGET);
    controls.current?.target.copy(TARGET);
    controls.current?.update();
    invalidate();
  }, [camera, size, invalidate]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={TARGET}
      enableDamping
      minDistance={12}
      maxDistance={140}
      maxPolarAngle={Math.PI * 0.47}
      onChange={(e) => e && clampTarget(e.target)}
    />
  );
}

function clampTarget(controls: OrbitControlsImpl) {
  const t = controls.target;
  t.x = MathUtils.clamp(t.x, PAN_LIMIT.x[0], PAN_LIMIT.x[1]);
  t.z = MathUtils.clamp(t.z, PAN_LIMIT.z[0], PAN_LIMIT.z[1]);
  t.y = 0;
}

function Bench() {
  const bench = useBoard((s) => s.bench);
  const parts = useBoard((s) => s.parts);
  const hover = useBoard((s) => s.hover);
  const pending = useBoard((s) => s.pending);
  const tool = useBoard((s) => s.tool);
  const probe = useProbeColor();

  // Nets change only when a part changes, not on each frame.
  const nets = useMemo(() => buildNets(bench, parts), [bench, parts]);
  const hot = useMemo(() => (hover ? netHoles(nets, hover) : new Set<string>()), [nets, hover]);

  const point = (e: ThreeEvent<PointerEvent | MouseEvent>, radius?: number) =>
    nearestHole(bench, e.point.x, e.point.z, radius ?? (isTouchScreen() ? 0.7 : 0.5));

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (e.pointerType === "touch") return;
    const hole = point(e);
    if (hole?.id !== boardStore.getState().hover) boardStore.getState().setHover(hole?.id ?? null);
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (!isTap(e)) return;
    const hole = point(e);
    if (!hole) return;
    // A phone has no hover, so a tap also shows the net of the hole, and a module shows where it goes before it is put down.
    boardStore.getState().setHover(hole.id);
    boardStore.getState().tapHole(hole.id, isTouchScreen());
  };
  const handlers = { onPointerMove: onMove, onClick, onPointerLeave: () => boardStore.getState().setHover(null) };

  return (
    <group>
      <Breadboard x0={0} handlers={handlers} />
      <Breadboard x0={BOARD_B_X} handlers={handlers} />
      <Holes bench={bench} board="A" hot={hot} probe={probe} />
      <Holes bench={bench} board="B" hot={hot} probe={probe} />
      <Esp32S3 bench={bench} hot={hot} probe={probe} />
      <Parts bench={bench} removing={tool === "remove"} hot={hot} probe={probe} />
      {isModuleType(tool) && <Ghost tool={tool} />}
      {pending && !isModuleType(tool) && <PendingMarker hole={bench.byId.get(pending)!} to={hover && hover !== pending ? bench.byId.get(hover) : undefined} probe={probe} />}
    </group>
  );
}

type Handlers = {
  onPointerMove: (e: ThreeEvent<PointerEvent>) => void;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
  onPointerLeave: () => void;
};

function Breadboard({ x0, handlers }: { x0: number; handlers: Handlers }) {
  const top = useFontTexture(() => drawBreadboard(x0));
  return (
    <mesh position={[x0 + BOARD.centerX, -0.45, 0]} receiveShadow {...handlers}>
      <boxGeometry args={[BOARD.width, 0.9, BOARD.length]} />
      <meshStandardMaterial attach="material-0" color="#E9ECEE" roughness={0.8} />
      <meshStandardMaterial attach="material-1" color="#E9ECEE" roughness={0.8} />
      <meshStandardMaterial attach="material-2" map={top} roughness={0.8} />
      <meshStandardMaterial attach="material-3" color="#E9ECEE" roughness={0.8} />
      <meshStandardMaterial attach="material-4" color="#E9ECEE" roughness={0.8} />
      <meshStandardMaterial attach="material-5" color="#E9ECEE" roughness={0.8} />
    </mesh>
  );
}

/** The 400 holes of one breadboard, as one instanced mesh: one draw call. Holes in the hovered net glow. */
function Holes({ bench, board, hot, probe }: { bench: Bench; board: "A" | "B"; hot: Set<string>; probe: Color }) {
  const mesh = useRef<InstancedMesh>(null);
  const invalidate = useThree((s) => s.invalidate);
  const holes = useMemo(() => bench.holes.filter((h) => h.board === board && !bench.covered.has(h.id)), [bench, board]);

  useLayoutEffect(() => {
    const m = mesh.current!;
    const o = new Object3D();
    holes.forEach((h, i) => {
      o.position.set(h.x, 0.006, h.z);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [holes]);

  useLayoutEffect(() => {
    const m = mesh.current!;
    holes.forEach((h, i) => m.setColorAt(i, hot.has(h.id) ? probe : HOLE_BASE));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    invalidate();
  }, [holes, hot, probe, invalidate]);

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, holes.length]} receiveShadow raycast={() => null}>
      <boxGeometry args={[0.4, 0.04, 0.4]} />
      <meshLambertMaterial color="#ffffff" />
    </instancedMesh>
  );
}

function Esp32S3({ bench, hot, probe }: { bench: Bench; hot: Set<string>; probe: Color }) {
  const { x0, x1, z0, z1 } = bench.esp;
  const top = useFontTexture(() => drawEsp(bench));
  const shield = useFontTexture(drawShield);
  const cx = (x0 + x1) / 2;
  const headers = useMemo(() => {
    const byX = new Map<number, Hole[]>();
    for (const p of bench.pins) {
      const h = bench.byId.get(p.hole)!;
      byX.set(h.x, [...(byX.get(h.x) ?? []), h]);
    }
    return [...byX.entries()].map(([x, holes]) => ({ x, zs: holes.map((h) => h.z) }));
  }, [bench]);

  // The pointer on the board points at the nearest pin, so you can see what each pin connects to.
  const pinNear = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    const hole = nearestHole(bench, e.point.x, e.point.z, 1.2);
    return hole && bench.pinAt.has(hole.id) ? hole.id : null;
  };
  const onMove = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (e.pointerType === "touch") return;
    const pin = pinNear(e);
    if (pin !== boardStore.getState().hover) boardStore.getState().setHover(pin);
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const pin = pinNear(e);
    if (!isTap(e) || !pin) return;
    boardStore.getState().setHover(pin);
    boardStore.getState().tapHole(pin, isTouchScreen());
  };

  return (
    <group>
      <mesh position={[cx, PCB_Y + PCB_T / 2, (z0 + z1) / 2]} castShadow receiveShadow onPointerMove={onMove} onClick={onClick}>
        <boxGeometry args={[x1 - x0, PCB_T, z1 - z0]} />
        <meshStandardMaterial attach="material-0" color="#16212A" roughness={0.6} />
        <meshStandardMaterial attach="material-1" color="#16212A" roughness={0.6} />
        <meshStandardMaterial attach="material-2" map={top} roughness={0.55} />
        <meshStandardMaterial attach="material-3" color="#16212A" roughness={0.6} />
        <meshStandardMaterial attach="material-4" color="#16212A" roughness={0.6} />
        <meshStandardMaterial attach="material-5" color="#16212A" roughness={0.6} />
      </mesh>
      {headers.map(({ x, zs }) => (
        <group key={x}>
          <mesh position={[x, PCB_Y / 2, (Math.min(...zs) + Math.max(...zs)) / 2]} castShadow raycast={() => null}>
            <boxGeometry args={[0.9, PCB_Y, Math.max(...zs) - Math.min(...zs) + 1]} />
            <meshStandardMaterial color="#1A1C1E" roughness={0.7} />
          </mesh>
          {zs.map((z) => {
            const hole = bench.holes.find((h) => h.x === x && h.z === z)!;
            const lit = hot.has(hole.id);
            return (
              <mesh key={z} position={[x, PCB_Y + PCB_T + 0.06, z]} raycast={() => null}>
                <boxGeometry args={[0.32, 0.12, 0.32]} />
                <meshStandardMaterial color={lit ? probe : "#C9A646"} emissive={lit ? probe : "#000000"} emissiveIntensity={lit ? 0.8 : 0} metalness={0.6} roughness={0.35} />
              </mesh>
            );
          })}
        </group>
      ))}
      <mesh position={[cx, PCB_Y + PCB_T + 0.16, z1 - 0.3 - SHIELD.length / 2]} castShadow raycast={() => null}>
        <boxGeometry args={[SHIELD.width, 0.32, SHIELD.length]} />
        <meshStandardMaterial attach="material-0" color="#B3BAC0" metalness={0.6} roughness={0.35} />
        <meshStandardMaterial attach="material-1" color="#B3BAC0" metalness={0.6} roughness={0.35} />
        <meshStandardMaterial attach="material-2" map={shield} metalness={0.5} roughness={0.4} />
        <meshStandardMaterial attach="material-3" color="#B3BAC0" metalness={0.6} roughness={0.35} />
        <meshStandardMaterial attach="material-4" color="#B3BAC0" metalness={0.6} roughness={0.35} />
        <meshStandardMaterial attach="material-5" color="#B3BAC0" metalness={0.6} roughness={0.35} />
      </mesh>
      {[cx - 1.6, cx + 1.6].map((x) => (
        <mesh key={x} position={[x, PCB_Y + PCB_T + 0.25, z0 + 0.6]} castShadow raycast={() => null}>
          <boxGeometry args={[1.2, 0.45, 1.4]} />
          <meshStandardMaterial color="#C2C8CC" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      {[cx - 3, cx + 3].map((x) => (
        <group key={x} position={[x, PCB_Y + PCB_T, z0 + 2.4]}>
          <mesh position={[0, 0.12, 0]} raycast={() => null}>
            <boxGeometry args={[0.9, 0.25, 0.9]} />
            <meshStandardMaterial color="#D5D9DC" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0.3, 0]} raycast={() => null}>
            <cylinderGeometry args={[0.22, 0.22, 0.15, 16]} />
            <meshStandardMaterial color="#2A2D30" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Parts({ bench, removing, hot, probe }: { bench: Bench; removing: boolean; hot: Set<string>; probe: Color }) {
  const parts = useBoard((s) => s.parts);
  const [target, setTarget] = useState<string | null>(null);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => invalidate(), [parts, target, removing, invalidate]);

  return (
    <group>
      {parts.map((p) => (
        <group
          key={p.id}
          // With the Remove tool, a click on the part itself removes it. With other tools, the part lets the click through to the hole below.
          onPointerOver={removing ? (e) => (e.stopPropagation(), setTarget(p.id)) : undefined}
          onPointerOut={removing ? () => setTarget(null) : undefined}
          onClick={
            removing
              ? (e) => {
                  e.stopPropagation();
                  if (isTap(e)) boardStore.getState().removePart(p.id);
                }
              : undefined
          }
        >
          {isModule(p) ? (
            <ModuleMesh
              bench={bench}
              type={p.type}
              at={p.at}
              hot={hot}
              probe={probe}
              removeHot={removing && target === p.id}
              {...(removing ? {} : pinHandlers(partPins(bench, p).map((pin) => pin.hole)))}
            />
          ) : (
            <PartMesh part={p} a={bench.byId.get(p.a)!} b={bench.byId.get(p.b)!} hot={removing && target === p.id} />
          )}
        </group>
      ))}
    </group>
  );
}

/**
 * The body of a module covers its pins, so the pointer on the body points at the nearest pin: you see what the pin
 * connects to, and a tap says to use an empty hole in the same line.
 */
function pinHandlers(pins: string[]) {
  const { bench } = boardStore.getState();
  const pinNear = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    let best: string | null = null;
    let bestDistance = 1.2;
    for (const id of pins) {
      const h = bench.byId.get(id)!;
      const d = Math.hypot(h.x - e.point.x, h.z - e.point.z);
      if (d < bestDistance) {
        bestDistance = d;
        best = id;
      }
    }
    return best;
  };
  return {
    onPointerMove: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (e.pointerType === "touch") return;
      const pin = pinNear(e);
      if (pin !== boardStore.getState().hover) boardStore.getState().setHover(pin);
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      const pin = pinNear(e);
      if (!isTap(e) || !pin) return;
      boardStore.getState().setHover(pin);
      boardStore.getState().tapHole(pin, isTouchScreen());
    },
  };
}

/** Where the selected module will go: at the hole under the pointer, or at the tapped hole on a phone. */
function Ghost({ tool }: { tool: ModuleType }) {
  const bench = useBoard((s) => s.bench);
  const parts = useBoard((s) => s.parts);
  const hover = useBoard((s) => s.hover);
  const pending = useBoard((s) => s.pending);
  const at = isTouchScreen() ? pending : hover;
  if (!at) return null;
  return <ModuleGhost bench={bench} type={tool} at={at} ok={!checkModule(bench, parts, tool, at)} />;
}

/** A ring on the first hole of an unfinished part, and a dashed line to the hole under the pointer. */
function PendingMarker({ hole, to, probe }: { hole: Hole; to?: Hole; probe: Color }) {
  return (
    <group>
      <mesh position={[hole.x, 0.04, hole.z]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <ringGeometry args={[0.32, 0.5, 28]} />
        <meshBasicMaterial color={probe} />
      </mesh>
      {to && (
        <Line
          points={[
            [hole.x, 0.3, hole.z],
            [to.x, 0.3, to.z],
          ]}
          color={probe}
          lineWidth={2}
          dashed
          dashSize={0.35}
          gapSize={0.22}
          raycast={() => null}
        />
      )}
    </group>
  );
}

/** The --probe color of the page, for the glow. It follows the light or dark theme. */
function useProbeColor() {
  const read = () => new Color(getComputedStyle(document.documentElement).getPropertyValue("--probe").trim() || "#e3a008");
  const [color, setColor] = useState(read);
  useEffect(() => {
    const dark = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setColor(read());
    dark.addEventListener("change", update);
    return () => dark.removeEventListener("change", update);
  }, []);
  return color;
}
