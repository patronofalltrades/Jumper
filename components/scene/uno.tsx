"use client";

import type { ThreeEvent } from "@react-three/fiber";
import { useMemo } from "react";
import type { Color } from "three";
import uno from "@/content/parts/arduino-uno.json";
import { unoAt, type Bench } from "@/lib/circuit/bench";
import { useSketch } from "@/lib/game/sketch-store";
import { BOARD_LED } from "@/lib/sketch/circuit";
import { drawUno, unoHeaders } from "./textures";
import { useFontTexture } from "./use-font-texture";

// The Arduino Uno on the table beside the breadboard, made from code shapes (TRD 5.1). The breadboard top is at y = 0
// and its bottom, the table, is at y = −0.9. The heights are smaller than on a real Uno, as for the breadboard.

const TABLE_Y = -0.9;
const PCB_BOTTOM = TABLE_Y + 0.25;
const PCB_T = 0.16;
/** The top of the PCB, for the outline of the "Got it" task. */
export const UNO_TOP = PCB_BOTTOM + PCB_T;
const HEADER_H = 0.95;
/** The top of the header sockets, where a wire end goes in. */
export const UNO_SOCKET_TOP = UNO_TOP + HEADER_H;

type Handlers = {
  onPointerMove: (e: ThreeEvent<PointerEvent>) => void;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
};

/** A box on the PCB, from (u0, v0) to (u1, v1) on the board, `h` high. u goes along the long side from the USB end. */
function Box({ bench, u, v, h, color, metal }: { bench: Bench; u: [number, number]; v: [number, number]; h: number; color: string; metal?: boolean }) {
  const c = unoAt(bench.board.outline, (u[0] + u[1]) / 2, (v[0] + v[1]) / 2);
  return (
    <mesh position={[c.x, UNO_TOP + h / 2, c.z]} castShadow raycast={() => null}>
      <boxGeometry args={[u[1] - u[0], h, v[1] - v[0]]} />
      <meshStandardMaterial color={color} metalness={metal ? 0.65 : 0.1} roughness={metal ? 0.3 : 0.6} />
    </mesh>
  );
}

/** The small LED marked L, on pin 13 (issue #58). It glows orange while a sketch sets pin 13 HIGH. */
function BoardLed({ bench }: { bench: Bench }) {
  const on = useSketch((s) => s.lit.has(BOARD_LED));
  const c = unoAt(bench.board.outline, uno.led_l.u, uno.led_l.v);
  return (
    <group>
      <mesh position={[c.x, UNO_TOP + 0.12, c.z]} raycast={() => null}>
        <boxGeometry args={[0.8, 0.24, 0.5]} />
        <meshStandardMaterial color={on ? "#FFB347" : "#E8D9A8"} emissive={on ? "#FF8A00" : "#000000"} emissiveIntensity={on ? 2.4 : 0} roughness={0.3} />
      </mesh>
      <pointLight position={[c.x, UNO_TOP + 1.2, c.z]} color="#FF9A1F" intensity={on ? 6 : 0} distance={6} decay={2} />
    </group>
  );
}

/**
 * The Uno. The pointer on the board points at the nearest pin, and its net glows. A tap puts a wire end into the pin.
 * A socket that Jumper does not use (for example AREF) shows, but it does not glow.
 */
export function Uno({ bench, glow, handlers }: { bench: Bench; glow: Map<string, Color>; handlers: Handlers }) {
  const { x0, x1, z0, z1 } = bench.board.outline;
  const top = useFontTexture(() => drawUno(bench));
  const headers = useMemo(() => unoHeaders(bench), [bench]);
  /** The hole of each socket that is a pin, by its place on the bench. */
  const holeAt = useMemo(() => new Map(bench.pins.map((p) => [`${bench.byId.get(p.hole)!.x},${bench.byId.get(p.hole)!.z}`, p.hole])), [bench]);

  return (
    <group {...handlers}>
      <mesh position={[(x0 + x1) / 2, PCB_BOTTOM + PCB_T / 2, (z0 + z1) / 2]} castShadow receiveShadow>
        <boxGeometry args={[x1 - x0, PCB_T, z1 - z0]} />
        <meshStandardMaterial attach="material-0" color="#006B72" roughness={0.6} />
        <meshStandardMaterial attach="material-1" color="#006B72" roughness={0.6} />
        <meshStandardMaterial attach="material-2" map={top} roughness={0.55} />
        <meshStandardMaterial attach="material-3" color="#006B72" roughness={0.6} />
        <meshStandardMaterial attach="material-4" color="#006B72" roughness={0.6} />
        <meshStandardMaterial attach="material-5" color="#006B72" roughness={0.6} />
      </mesh>
      {/* Small feet under the corners, so the board sits on the table. */}
      {[
        [x0 + 1.2, z0 + 1.2],
        [x1 - 1.2, z0 + 1.2],
        [x0 + 1.2, z1 - 1.2],
        [x1 - 1.2, z1 - 1.2],
      ].map(([x, z]) => (
        <mesh key={`${x},${z}`} position={[x, TABLE_Y + 0.125, z]} raycast={() => null}>
          <cylinderGeometry args={[0.5, 0.5, 0.25, 12]} />
          <meshStandardMaterial color="#2A2D30" roughness={0.8} />
        </mesh>
      ))}

      {headers.map(({ z, sockets }) => {
        const xs = sockets.map((s) => s.x);
        return (
          <group key={`${xs[0]},${z}`}>
            <mesh position={[(Math.min(...xs) + Math.max(...xs)) / 2, UNO_TOP + HEADER_H / 2, z]} castShadow>
              <boxGeometry args={[xs.length, HEADER_H, 0.95]} />
              <meshStandardMaterial color="#1A1C1E" roughness={0.7} />
            </mesh>
            {sockets.map((s) => {
              const hole = holeAt.get(`${s.x},${s.z}`);
              const lit = hole ? glow.get(hole) : undefined;
              return (
                <mesh key={s.x} position={[s.x, UNO_SOCKET_TOP + 0.005, s.z]} raycast={() => null}>
                  <boxGeometry args={[0.42, 0.02, 0.42]} />
                  <meshStandardMaterial color={lit ?? (hole ? "#08090A" : "#2A2D30")} emissive={lit ?? "#000000"} emissiveIntensity={lit ? 0.8 : 0} />
                </mesh>
              );
            })}
          </group>
        );
      })}

      {/* USB-B socket and the power jack at the end of the board, the main chip, the crystal and the reset button. */}
      <Box bench={bench} u={[-2.4, 3.9]} v={[12.2, 16.8]} h={1.2} color="#C2C8CC" metal />
      <Box bench={bench} u={[-1.6, 4.4]} v={[1.4, 5]} h={1.15} color="#1F2225" />
      <Box bench={bench} u={[13.2, 26.4]} v={[5.4, 8.6]} h={0.38} color="#22252A" />
      <Box bench={bench} u={[9.2, 10.8]} v={[10.4, 11.4]} h={0.3} color="#B3BAC0" metal />
      <Box bench={bench} u={[1.4, 3]} v={[18.2, 19.8]} h={0.3} color="#B3BAC0" metal />
      <Box bench={bench} u={[1.75, 2.65]} v={[18.55, 19.45]} h={0.45} color="#2A2D30" />
      <BoardLed bench={bench} />
    </group>
  );
}
