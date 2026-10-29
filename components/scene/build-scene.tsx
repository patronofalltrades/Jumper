"use client";

import { Line, OrbitControls } from "@react-three/drei";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Color, MathUtils, Object3D, Vector3, type Camera, type InstancedMesh } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { BOARD, nearestHole, type Bench, type Hole } from "@/lib/circuit/bench";
import { isModuleType, type ModuleType } from "@/lib/circuit/modules";
import { buildNets, netHoles } from "@/lib/circuit/nets";
import { problemHoles, type Problem } from "@/lib/circuit/problem";
import { checkModule, isModule, partPins, terminalAt, type Part } from "@/lib/circuit/parts";
import { useTaskSpot } from "@/components/build/popups";
import text from "@/content/ui/site.json";
import { hasWebGL } from "@/lib/device";
import { boardStore, useBoard } from "@/lib/game/board-store";
import { focusDistance } from "@/lib/game/focus";
import { aliveStore, useAlive } from "@/lib/game/alive-store";
import { sketchStore, useSketch } from "@/lib/game/sketch-store";
import { ModuleGhost, ModuleMesh, terminalTop } from "./modules";
import { PartMesh, type End } from "./parts";
import { ProblemMarks } from "./problem-marks";
import { drawBreadboard, drawEsp, drawShield, SHIELD } from "./textures";
import { UNO_SOCKET_TOP, UNO_TOP, Uno } from "./uno";
import { useFontTexture } from "./use-font-texture";

const HOLE_BASE = new Color("#3B4146");
/** The flash of a part that snaps in, and of a wrong one. */
const SNAP = new Color("#3BE07F");
const BUZZ = new Color("#E5432F");
/** The point that the camera looks at: the middle of the bench (content/benches/). */
const targetOf = (bench: Bench) => new Vector3(bench.view.target.x, 0, bench.view.target.z);
const PCB_Y = 1.0;
const PCB_T = 0.16;

/** A click or tap, not the end of a camera drag: less than 6 px of movement and less than 600 ms. */
let pressedAt = 0;
const isTap = (e: ThreeEvent<MouseEvent>) => e.delta < 6 && performance.now() - pressedAt < 600;
const isTouchScreen = () => document.documentElement.dataset.touch === "true";

/** The 3D bench. `children` go inside the canvas: the pop-up that hangs over the target pin. */
export default function BuildScene({ children }: { children?: ReactNode }) {
  // Without WebGL the canvas throws, and the whole page stops. Show a note in place of the board.
  const [webgl] = useState(() => hasWebGL());
  const bench = useBoard((s) => s.bench);
  const target = useMemo(() => targetOf(bench), [bench]);
  if (!webgl) return <p className="grid h-full place-items-center p-6 text-center text-sm text-muted-foreground">{text.no3d}</p>;
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
        position={[target.x - 18, 42, 26]}
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
      {children}
    </Canvas>
  );
}

function CameraRig() {
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);
  const bench = useBoard((s) => s.bench);
  const controls = useRef<OrbitControlsImpl>(null);
  // "Show me" (issue #90): the camera moves to the problem. A problem from before this mount does not move it again.
  const focus = useBoard((s) => s.focus);
  const shown = useRef(focus);
  const fitted = useRef<{ aspect: number; bench: Bench | null }>({ aspect: 0, bench: null });
  const target = useMemo(() => targetOf(bench), [bench]);

  // Frame the whole bench at the first size, and again when the shape of the screen changes a lot (a phone turns),
  // or when the bench changes. Small changes, such as a phone browser bar that hides, keep the camera where the
  // learner put it. A phone in portrait sees the bench from closer and more from above.
  useLayoutEffect(() => {
    if (!size.width || !size.height) return;
    const aspect = size.width / size.height;
    if (fitted.current.bench === bench && fitted.current.aspect && Math.abs(aspect / fitted.current.aspect - 1) < 0.25) return;
    fitted.current = { aspect, bench };
    const vfov = MathUtils.degToRad(35);
    const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
    // Fit the width of the bench and most of its length; the tilt makes the length look shorter.
    const distance = Math.max(bench.view.width / 2 / Math.tan(hfov / 2), bench.view.length / 2 / Math.tan(vfov / 2));
    const direction = aspect < 0.9 ? new Vector3(0, 0.9, 0.42) : new Vector3(0, 0.78, 0.62);
    camera.position.copy(target).add(direction.normalize().multiplyScalar(distance));
    camera.lookAt(target);
    controls.current?.target.copy(target);
    controls.current?.update();
    invalidate();
  }, [camera, size, invalidate, bench, target]);

  useEffect(() => {
    if (!focus || focus === shown.current) return;
    shown.current = focus;
    const { bench: now, parts, problem } = boardStore.getState();
    const [from, to] = problemEnds(now, parts, problem);
    if (!from || !to || !controls.current) return;
    const middle = new Vector3((from.x + to.x) / 2, 0, (from.z + to.z) / 2);
    const span = Math.hypot(to.x - from.x, to.z - from.z);
    const distance = focusDistance(span, size.width / size.height, controls.current.minDistance, controls.current.maxDistance);
    return flyTo(controls.current, camera, invalidate, middle, distance);
  }, [focus, camera, size, invalidate]);

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={target}
      enableDamping
      minDistance={12}
      maxDistance={140}
      maxPolarAngle={Math.PI * 0.47}
      onChange={(e) => e && clampTarget(e.target, bench)}
    />
  );
}

/** Keep the camera target on the bench, so that a pan cannot lose the board. */
function clampTarget(controls: OrbitControlsImpl, bench: Bench) {
  const t = controls.target;
  t.x = MathUtils.clamp(t.x, bench.area.x0, bench.area.x1);
  t.z = MathUtils.clamp(t.z, bench.area.z0, bench.area.z1);
  t.y = 0;
}

/** The two ends of the problem of a failed Check on the bench. The marks show them, and Show me moves to them. */
function problemEnds(bench: Bench, parts: Part[], problem: Problem | null): End[] {
  if (!problem) return [];
  return problemHoles(bench, parts, problem).map((h) => endOf(bench, parts, h)).filter((e): e is End => e !== null);
}

/** The time of the camera move of Show me. */
const FLY_MS = 600;

/**
 * Moves the camera to `target` and keeps its direction, so the view stays on the same side of the bench. The move eases
 * out over FLY_MS. With reduced motion it jumps. Returns a function that stops the move.
 */
function flyTo(controls: OrbitControlsImpl, camera: Camera, invalidate: () => void, target: Vector3, distance: number) {
  const fromTarget = controls.target.clone();
  const fromCamera = camera.position.clone();
  const toCamera = target.clone().addScaledVector(fromCamera.clone().sub(fromTarget).normalize(), distance);
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const start = performance.now();
  let frame = 0;
  const step = (now: number) => {
    const t = reduced ? 1 : Math.min(1, (now - start) / FLY_MS);
    const eased = 1 - (1 - t) ** 3;
    controls.target.lerpVectors(fromTarget, target, eased);
    camera.position.lerpVectors(fromCamera, toCamera, eased);
    controls.update();
    invalidate();
    if (t < 1) frame = requestAnimationFrame(step);
  };
  step(start);
  return () => cancelAnimationFrame(frame);
}

function Bench() {
  const bench = useBoard((s) => s.bench);
  const parts = useBoard((s) => s.parts);
  const hover = useBoard((s) => s.hover);
  const pending = useBoard((s) => s.pending);
  const tool = useBoard((s) => s.tool);
  const flash = useBoard((s) => s.flash);
  const problem = useBoard((s) => s.problem);
  const probe = useProbeColor();
  const spot = useTaskSpot();
  const blink = useBlink(!!spot && (spot.holes.length > 0 || !!spot.area));

  // Nets change only when a part changes, not on each frame.
  const nets = useMemo(() => buildNets(bench, parts), [bench, parts]);
  const marks = useMemo(() => problemEnds(bench, parts, problem), [bench, parts, problem]);
  // What glows, and in which color. A flash is first, then the net under the pointer (pale), then the task target,
  // which blinks so that it looks different from the pointer.
  const glow = useMemo(() => {
    const colors = new Map<string, Color>();
    const hover_ = probe.clone().lerp(new Color("#ffffff"), 0.45);
    const target = blink ? probe : probe.clone().lerp(HOLE_BASE, 0.6);
    for (const h of spot?.holes ?? []) colors.set(h, target);
    if (hover) for (const h of netHoles(nets, hover)) colors.set(h, hover_);
    for (const h of flash?.holes ?? []) for (const n of netHoles(nets, h)) colors.set(n, flash!.kind === "snap" ? SNAP : BUZZ);
    return colors;
  }, [spot, blink, hover, flash, nets, probe]);

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
      {bench.breadboards.map((b) => (
        <group key={b.id}>
          <Breadboard x0={b.x} letter={b.id} handlers={handlers} />
          <Holes bench={bench} board={b.id} glow={glow} />
        </group>
      ))}
      {bench.board.type === "arduino-uno" ? (
        <Uno bench={bench} glow={glow} handlers={boardPinHandlers(bench)} />
      ) : (
        <Esp32S3 bench={bench} glow={glow} />
      )}
      <Parts bench={bench} removing={tool === "remove"} glow={glow} />
      <ProblemMarks ends={marks} />
      {isModuleType(tool) && <Ghost tool={tool} />}
      {spot && <Cue taps={spot.taps} area={spot.area} up={blink} probe={probe} />}
      {pending && !isModuleType(tool) && endOf(bench, parts, pending) && (
        <PendingMarker hole={endOf(bench, parts, pending)!} to={hover && hover !== pending ? (endOf(bench, parts, hover) ?? undefined) : undefined} probe={probe} />
      )}
    </group>
  );
}

type Handlers = {
  onPointerMove: (e: ThreeEvent<PointerEvent>) => void;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
  onPointerLeave: () => void;
};

function Breadboard({ x0, letter, handlers }: { x0: number; letter: string; handlers: Handlers }) {
  const top = useFontTexture(() => drawBreadboard(x0, letter));
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

/** The end of a leg: a breadboard hole, the top of a pin socket of the Uno, or the top of a screw terminal. */
function endOf(bench: Bench, parts: Part[], id: string): End | null {
  const hole = bench.byId.get(id);
  if (hole) return bench.pinAt.get(id)?.socket ? { ...hole, lift: UNO_SOCKET_TOP } : hole;
  const terminal = terminalAt(bench, parts, id);
  return terminal && { id, x: terminal.under.x, z: terminal.under.z, lift: terminalTop(terminal.part.type) };
}

/** True and false in turn, twice a second, while `on`: the blink of the target holes. */
function useBlink(on: boolean) {
  const [lit, setLit] = useState(true);
  useEffect(() => {
    if (!on) return;
    const timer = setInterval(() => setLit((l) => !l), 600);
    return () => clearInterval(timer);
  }, [on]);
  return !on || lit;
}

/** The 400 holes of one breadboard, as one instanced mesh: one draw call. Holes in `glow` light up. */
function Holes({ bench, board, glow }: { bench: Bench; board: string; glow: Map<string, Color> }) {
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
    holes.forEach((h, i) => m.setColorAt(i, glow.get(h.id) ?? HOLE_BASE));
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    invalidate();
  }, [holes, glow, invalidate]);

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, holes.length]} receiveShadow raycast={() => null}>
      <boxGeometry args={[0.4, 0.04, 0.4]} />
      <meshLambertMaterial color="#ffffff" />
    </instancedMesh>
  );
}

/**
 * The pointer on the main board points at the nearest pin, so you can see what each pin connects to. A tap on the
 * ESP32-S3 says to use an empty hole in the same line. A tap on the Uno puts a wire end into the pin.
 */
function boardPinHandlers(bench: Bench) {
  const pinNear = (e: ThreeEvent<PointerEvent | MouseEvent>) => {
    const hole = nearestHole(bench, e.point.x, e.point.z, 1.2);
    return hole && bench.pinAt.has(hole.id) ? hole.id : null;
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

function Esp32S3({ bench, glow }: { bench: Bench; glow: Map<string, Color> }) {
  const { x0, x1, z0, z1 } = bench.board.outline;
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
  const { onPointerMove: onMove, onClick } = boardPinHandlers(bench);

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
            const lit = glow.get(hole.id);
            return (
              <mesh key={z} position={[x, PCB_Y + PCB_T + 0.06, z]} raycast={() => null}>
                <boxGeometry args={[0.32, 0.12, 0.32]} />
                <meshStandardMaterial color={lit ?? "#C9A646"} emissive={lit ?? "#000000"} emissiveIntensity={lit ? 0.8 : 0} metalness={0.6} roughness={0.35} />
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

/** A press on a button while a sketch runs (issue #58). */
const pressButton = (id: string) => (down: boolean) => {
  sketchStore.getState().press(id, down);
  // The Talk button of Perch, while it is alive: the face is surprised (issue #86).
  if (aliveStore.getState().stage) aliveStore.getState().input(down);
};

function Parts({ bench, removing, glow }: { bench: Bench; removing: boolean; glow: Map<string, Color> }) {
  const parts = useBoard((s) => s.parts);
  const running = useSketch((s) => s.running);
  const lit = useSketch((s) => s.lit);
  const pressed = useSketch((s) => s.pressed);
  const awake = useAlive((s) => s.stage !== null);
  const blink = useAlive((s) => s.effects.has("led") && s.ledOn);
  const talkDown = useAlive((s) => s.talkDown);
  const presses = useMemo(() => new Map(parts.map((p) => [p.id, pressButton(p.id)])), [parts]);
  const [target, setTarget] = useState<string | null>(null);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
  }, [parts, target, removing, lit, pressed, blink, talkDown, invalidate]);

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
              id={p.id}
              type={p.type}
              at={p.at}
              glow={glow}
              removeHot={removing && target === p.id}
              pressed={pressed.has(p.id) || talkDown}
              onPress={(running || awake) && p.type === "pushbutton" && !removing ? presses.get(p.id) : undefined}
              {...(removing ? {} : { ...pinHandlers(partPins(bench, p).flatMap((pin) => (pin.terminal ? [] : [pin.hole]))), terminalHandlers })}
            />
          ) : (
            <PartMesh part={p} a={endOf(bench, parts, p.a)!} b={endOf(bench, parts, p.b)!} hot={removing && target === p.id} on={lit.has(p.id) || (blink && p.type === "led")} />
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

/** A screw of a terminal: the pointer on it shows its net, and a click or tap puts a lead or a wire end into it. */
function terminalHandlers(terminal: string) {
  return {
    onPointerMove: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      if (e.pointerType !== "touch" && boardStore.getState().hover !== terminal) boardStore.getState().setHover(terminal);
    },
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      if (!isTap(e)) return;
      boardStore.getState().setHover(terminal);
      boardStore.getState().tapHole(terminal, isTouchScreen());
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

/**
 * The "tap here" cue of the task: an arrow that bobs over the next hole to tap, with a ring on the hole. For a wire,
 * the arrow moves to the second hole after the first tap. A part that is always on the bench gets a blinking outline.
 */
function Cue({ taps, area, up, probe }: { taps: string[]; area: { x0: number; x1: number; z0: number; z1: number } | null; up: boolean; probe: Color }) {
  const bench = useBoard((s) => s.bench);
  const parts = useBoard((s) => s.parts);
  const pending = useBoard((s) => s.pending);
  const tool = useBoard((s) => s.tool);
  const nets = useMemo(() => buildNets(bench, parts), [bench, parts]);

  let tap = taps[0];
  // A phone shows a module before the second tap: the arrow goes to that hole.
  if (pending && isModuleType(tool)) tap = pending;
  else if (pending && taps.length === 2) tap = netHoles(nets, pending).has(taps[0]) || pending === taps[0] ? taps[1] : taps[0];
  const end = tap ? endOf(bench, parts, tap) : null;
  const on = area === bench.board.outline ? (bench.board.type === "arduino-uno" ? UNO_TOP : PCB_Y + PCB_T) : 0;
  if (!end && !area) return null;

  return (
    <group>
      {end && (
        <mesh position={[end.x, (end.lift ?? 0) + 0.05, end.z]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <ringGeometry args={up ? [0.42, 0.62, 28] : [0.5, 0.7, 28]} />
          <meshBasicMaterial color={probe} />
        </mesh>
      )}
      {area && (
        <Line
          points={[
            [area.x0, on + 0.05, area.z0],
            [area.x1, on + 0.05, area.z0],
            [area.x1, on + 0.05, area.z1],
            [area.x0, on + 0.05, area.z1],
            [area.x0, on + 0.05, area.z0],
          ]}
          color={up ? probe : probe.clone().lerp(new Color("#ffffff"), 0.5)}
          lineWidth={5}
          raycast={() => null}
        />
      )}
      {/* The arrow points down at the hole: a cone with its tip at the bottom. */}
      {end && (
        <mesh position={[end.x, (end.lift ?? 0) + (up ? 1.3 : 2), end.z]} rotation={[Math.PI, 0, 0]} castShadow raycast={() => null}>
          <coneGeometry args={[0.55, 1.4, 20]} />
          <meshStandardMaterial color={probe} emissive={probe} emissiveIntensity={0.35} />
        </mesh>
      )}
    </group>
  );
}

/** A ring on the first hole of an unfinished part, and a dashed line to the hole under the pointer. */
function PendingMarker({ hole, to, probe }: { hole: End; to?: End; probe: Color }) {
  return (
    <group>
      <mesh position={[hole.x, (hole.lift ?? 0) + 0.04, hole.z]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
        <ringGeometry args={[0.32, 0.5, 28]} />
        <meshBasicMaterial color={probe} />
      </mesh>
      {to && (
        <Line
          points={[
            [hole.x, (hole.lift ?? 0) + 0.3, hole.z],
            [to.x, (to.lift ?? 0) + 0.3, to.z],
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
