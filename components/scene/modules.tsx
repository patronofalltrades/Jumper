"use client";

import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import type { Color } from "three";
import type { Bench } from "@/lib/circuit/bench";
import { bodyOutline, footprintHoles, FOOTPRINTS, type ModuleType } from "@/lib/circuit/modules";
import { drawModule } from "./textures";
import { useFontTexture } from "./use-font-texture";

// Modules (button, mic, amplifier, screen): a PCB box on a black pin header, with a printed top from the pin layout.

const HEADER_Y = 0.5;
const PCB_T = 0.16;
const TERMINAL_H = 0.9;

/** Height of the top of the screw terminal of a module: where speaker leads and wires go in. */
export const terminalTop = (type: ModuleType) => FOOTPRINTS[type].body.height + PCB_T + TERMINAL_H;

type Handlers = {
  onPointerMove: (e: ThreeEvent<PointerEvent>) => void;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
};

type Props = {
  bench: Bench;
  id: string;
  type: ModuleType;
  at: string;
  /** Pins and terminals that glow, and their colors. */
  glow: Map<string, Color>;
  /** Red glow: the Remove tool points at the part. */
  removeHot?: boolean;
  /** Pointer handlers for the body. Undefined: the body does not take clicks. */
  onPointerMove?: (e: ThreeEvent<PointerEvent>) => void;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
  /** Pointer handlers for a screw of the terminal, from its id ("amp1.OUT+"). */
  terminalHandlers?: (terminal: string) => Handlers;
};

export function ModuleMesh({ bench, id, type, at, glow, removeHot, onPointerMove, onClick, terminalHandlers }: Props) {
  const fp = FOOTPRINTS[type];
  const layout = useMemo(() => {
    const pins = footprintHoles(bench, type, at) ?? [];
    const outline = bodyOutline(bench, type, pins);
    const points = pins.map((p) => ({ ...p, ...bench.byId.get(p.hole)! }));
    return { pins: points, outline };
  }, [bench, type, at]);
  const { x0, x1, z0, z1 } = layout.outline;
  const top = useFontTexture(
    () =>
      drawModule(
        layout.outline,
        layout.pins.map((p) => ({ x: p.x, z: p.z, label: p.label })),
        fp.body.color,
        type === "pushbutton" ? "" : fp.title,
      ),
    layout,
  );
  const y = fp.body.height;
  const tint = removeHot ? { emissive: "#c9412f", emissiveIntensity: 0.6 } : {};
  const edge = { color: fp.body.color, roughness: 0.6, ...tint };

  return (
    <group>
      <mesh position={[(x0 + x1) / 2, y + PCB_T / 2, (z0 + z1) / 2]} castShadow receiveShadow onPointerMove={onPointerMove} onClick={onClick}>
        <boxGeometry args={[x1 - x0, PCB_T, z1 - z0]} />
        <meshStandardMaterial attach="material-0" {...edge} />
        <meshStandardMaterial attach="material-1" {...edge} />
        <meshStandardMaterial attach="material-2" map={top} roughness={0.55} {...tint} />
        <meshStandardMaterial attach="material-3" {...edge} />
        <meshStandardMaterial attach="material-4" {...edge} />
        <meshStandardMaterial attach="material-5" {...edge} />
      </mesh>
      {layout.pins.filter((p) => !p.terminal).map((p) => {
        const lit = glow.get(p.hole);
        return (
          <group key={p.hole}>
            {/* The plastic of the header, and the metal pin from the hole to the top of the PCB. */}
            <mesh position={[p.x, HEADER_Y / 2, p.z]} castShadow raycast={() => null}>
              <boxGeometry args={[0.8, HEADER_Y, 0.8]} />
              <meshStandardMaterial color="#1A1C1E" roughness={0.7} />
            </mesh>
            <mesh position={[p.x, (y + PCB_T) / 2, p.z]} raycast={() => null}>
              <boxGeometry args={[0.16, y + PCB_T, 0.16]} />
              <meshStandardMaterial color="#C9A646" metalness={0.6} roughness={0.35} />
            </mesh>
            <mesh position={[p.x, y + PCB_T + 0.05, p.z]} raycast={() => null}>
              <boxGeometry args={[0.3, 0.1, 0.3]} />
              <meshStandardMaterial color={lit ?? "#C9A646"} emissive={lit ?? "#000000"} emissiveIntensity={lit ? 0.8 : 0} metalness={0.6} roughness={0.35} />
            </mesh>
          </group>
        );
      })}
      {type === "pushbutton" && (
        <mesh position={[(x0 + x1) / 2, y + PCB_T + 0.3, (z0 + z1) / 2]} castShadow raycast={() => null}>
          <cylinderGeometry args={[0.75, 0.75, 0.6, 24]} />
          <meshStandardMaterial color="#1F2225" roughness={0.5} {...tint} />
        </mesh>
      )}
      {type === "inmp441" && (
        <mesh position={[(x0 + x1) / 2, y + PCB_T + 0.12, z0 + 0.6]} castShadow raycast={() => null}>
          <cylinderGeometry args={[0.3, 0.3, 0.24, 20]} />
          <meshStandardMaterial color="#C2C8CC" metalness={0.7} roughness={0.3} />
        </mesh>
      )}
      {layout.pins.some((p) => p.terminal) && (
        <Terminal
          pins={layout.pins.filter((p) => p.terminal).map((p) => ({ ...p, id: `${id}.${p.name}` }))}
          y={y + PCB_T}
          glow={glow}
          handlers={terminalHandlers}
        />
      )}
      {type === "st7789-154" && <Display x0={x0} x1={x1} z={z0} y={y + PCB_T} />}
    </group>
  );
}

/** The green screw terminal for the speaker leads, on top of the module. Each screw takes a click or a tap. */
function Terminal({ pins, y, glow, handlers }: { pins: { id: string; x: number; z: number }[]; y: number; glow: Map<string, Color>; handlers?: (terminal: string) => Handlers }) {
  const x = pins[0].x;
  const zs = pins.map((p) => p.z);
  return (
    <group>
      <mesh position={[x, y + TERMINAL_H / 2, (Math.min(...zs) + Math.max(...zs)) / 2]} castShadow raycast={() => null}>
        <boxGeometry args={[1.0, TERMINAL_H, Math.max(...zs) - Math.min(...zs) + 1.2]} />
        <meshStandardMaterial color="#2E9D5B" roughness={0.5} />
      </mesh>
      {pins.map((p) => {
        const lit = glow.get(p.id);
        return (
          <mesh key={p.id} position={[p.x, y + TERMINAL_H + 0.05, p.z]} {...handlers?.(p.id)}>
            <cylinderGeometry args={[0.38, 0.38, 0.12, 20]} />
            <meshStandardMaterial color={lit ?? "#C2C8CC"} emissive={lit ?? "#000000"} emissiveIntensity={lit ? 0.8 : 0} metalness={0.7} roughness={0.3} />
          </mesh>
        );
      })}
    </group>
  );
}

/** The 1.54" screen stands up at the far end of the module and looks at you: the face of Perch. */
function Display({ x0, x1, z, y }: { x0: number; x1: number; z: number; y: number }) {
  const size = 4.4;
  const cx = (x0 + x1) / 2;
  return (
    <group position={[cx, y, z + 0.2]}>
      <mesh position={[0, size / 2 + 0.2, 0]} castShadow raycast={() => null}>
        <boxGeometry args={[size + 0.5, size + 0.5, 0.3]} />
        <meshStandardMaterial color="#16324F" roughness={0.6} />
      </mesh>
      <mesh position={[0, size / 2 + 0.2, 0.16]} raycast={() => null}>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color="#0B0F14" roughness={0.2} metalness={0.1} />
      </mesh>
    </group>
  );
}

/** Where a module will go: a see-through body and a ring at each pin. Green if it fits, red if not. */
export function ModuleGhost({ bench, type, at, ok }: { bench: Bench; type: ModuleType; at: string; ok: boolean }) {
  const pins = useMemo(() => footprintHoles(bench, type, at), [bench, type, at]);
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => invalidate(), [pins, ok, invalidate]);
  if (!pins) return null;
  const { x0, x1, z0, z1 } = bodyOutline(bench, type, pins);
  const color = ok ? "#2E9D5B" : "#C9412F";
  const y = FOOTPRINTS[type].body.height;
  return (
    <group>
      <mesh position={[(x0 + x1) / 2, y, (z0 + z1) / 2]} raycast={() => null}>
        <boxGeometry args={[x1 - x0, PCB_T, z1 - z0]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} depthWrite={false} />
      </mesh>
      {pins.map((p) => {
        const h = bench.byId.get(p.hole)!;
        return (
          <mesh key={p.hole} position={[h.x, 0.04, h.z]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
            <ringGeometry args={[0.28, 0.46, 24]} />
            <meshBasicMaterial color={color} />
          </mesh>
        );
      })}
    </group>
  );
}
