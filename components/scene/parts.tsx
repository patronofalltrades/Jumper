"use client";

import { useMemo } from "react";
import { CatmullRomCurve3, CubicBezierCurve3, Quaternion, Vector3 } from "three";
import type { Hole } from "@/lib/circuit/bench";
import type { LegPart } from "@/lib/circuit/parts";

// Wires, resistors, LEDs and the speaker, made from code shapes as in reference/breadboard-prototype.html.

const LEG = { color: "#B9BFC5", metalness: 0.7, roughness: 0.3 };
const UP = new Vector3(0, 1, 0);

/** The end of a leg: a hole, or the top of a screw terminal, `lift` above the bench. */
export type End = Pick<Hole, "id" | "x" | "z"> & { lift?: number };
const at = (h: End, y: number) => new Vector3(h.x, (h.lift ?? 0) + y, h.z);

function Leg({ points }: { points: Vector3[] }) {
  const curve = useMemo(() => new CatmullRomCurve3(points, false, "centripetal"), [points]);
  return (
    <mesh castShadow>
      <tubeGeometry args={[curve, 24, 0.045, 8, false]} />
      <meshStandardMaterial {...LEG} />
    </mesh>
  );
}

/** Red glow on a part that the Remove tool points at. */
const removeTint = (hot: boolean) => (hot ? { emissive: "#c9412f", emissiveIntensity: 0.6 } : {});

export function PartMesh({ part, a, b, hot }: { part: LegPart; a: End; b: End; hot: boolean }) {
  const shape = useMemo(() => {
    const dir = new Vector3(b.x - a.x, 0, b.z - a.z);
    const length = dir.length();
    dir.normalize();
    const mid = new Vector3((a.x + b.x) / 2, 0, (a.z + b.z) / 2);
    return { dir, length, mid, q: new Quaternion().setFromUnitVectors(UP, dir) };
  }, [a, b]);

  if (part.type === "wire") return <Wire a={a} b={b} color={part.color ?? "#D63A2F"} hot={hot} length={shape.length} />;
  if (part.type === "resistor") return <Resistor a={a} b={b} hot={hot} {...shape} />;
  if (part.type === "speaker") return <Speaker a={a} b={b} hot={hot} {...shape} />;
  return <Led a={a} b={b} hot={hot} {...shape} />;
}

function Wire({ a, b, color, hot, length }: { a: End; b: End; color: string; hot: boolean; length: number }) {
  const curve = useMemo(() => {
    const h = Math.min(0.9 + length * 0.14, 3.6);
    return new CubicBezierCurve3(at(a, 0.5), at(a, h + 0.6), at(b, h + 0.6), at(b, 0.5));
  }, [a, b, length]);
  return (
    <group>
      <mesh castShadow>
        <tubeGeometry args={[curve, 56, 0.12, 10, false]} />
        <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} {...removeTint(hot)} />
      </mesh>
      {[a, b].map((h) => (
        <mesh key={h.id} position={at(h, 0.3)} castShadow>
          <boxGeometry args={[0.34, 0.55, 0.34]} />
          <meshStandardMaterial color="#1B1E21" roughness={0.7} {...removeTint(hot)} />
        </mesh>
      ))}
    </group>
  );
}

type Shape = { a: End; b: End; hot: boolean; dir: Vector3; length: number; mid: Vector3; q: Quaternion };

const BANDS: [string, number][] = [
  ["#C8302A", -0.3],
  ["#C8302A", -0.15],
  ["#6B3A1E", 0],
  ["#C9A646", 0.3],
];

/** A 220 Ω resistor: red, red, brown, gold. */
function Resistor({ a, b, hot, dir, length, mid, q }: Shape) {
  const body = Math.min(2.0, length * 0.55);
  const y = 0.62;
  const legs = useMemo(() => {
    const ea = mid.clone().addScaledVector(dir, -body / 2).setY(y);
    const eb = mid.clone().addScaledVector(dir, body / 2).setY(y);
    return [
      [at(a, 0.02), at(a, 0.45), ea],
      [at(b, 0.02), at(b, 0.45), eb],
    ];
  }, [a, b, dir, mid, body]);
  return (
    <group>
      {legs.map((points, i) => (
        <Leg key={i} points={points} />
      ))}
      <mesh position={[mid.x, y, mid.z]} quaternion={q} castShadow>
        <cylinderGeometry args={[0.27, 0.27, body, 16]} />
        <meshStandardMaterial color="#D3BE93" roughness={0.6} {...removeTint(hot)} />
      </mesh>
      {BANDS.map(([color, f], i) => {
        const p = mid.clone().addScaledVector(dir, f * body);
        return (
          <mesh key={i} position={[p.x, y, p.z]} quaternion={q}>
            <cylinderGeometry args={[0.285, 0.285, 0.11, 16]} />
            <meshStandardMaterial color={color} roughness={0.5} metalness={i === 3 ? 0.6 : 0.05} />
          </mesh>
        );
      })}
    </group>
  );
}

/** A red 5 mm LED. The + leg (anode, in hole a) is longer and bent, and a red + badge marks it. */
function Led({ a, b, hot, dir, mid }: Shape) {
  const baseY = 1.15;
  const legs = useMemo(() => {
    const ma = mid.clone().addScaledVector(dir, -0.17).setY(baseY);
    const mb = mid.clone().addScaledVector(dir, 0.17).setY(baseY);
    const kink = at(a, 0.75).lerp(ma, 0.45).add(new Vector3(0, 0.05, 0)).addScaledVector(dir, -0.12);
    return [
      [at(a, 0.02), at(a, 0.5), kink, ma],
      [at(b, 0.02), at(b, 0.6), mb],
    ];
  }, [a, b, dir, mid]);
  const lens = { color: "#E2392A", emissive: hot ? "#c9412f" : "#FF2A12", emissiveIntensity: hot ? 0.6 : 0.05, roughness: 0.25, transparent: true, opacity: 0.88 };
  const plus = at(a, 0.95).addScaledVector(dir, -0.45);
  return (
    <group>
      {legs.map((points, i) => (
        <Leg key={i} points={points} />
      ))}
      <mesh position={[mid.x, baseY + 0.06, mid.z]} castShadow>
        <cylinderGeometry args={[0.47, 0.47, 0.12, 24]} />
        <meshStandardMaterial {...lens} />
      </mesh>
      <mesh position={[mid.x, baseY + 0.43, mid.z]} castShadow>
        <cylinderGeometry args={[0.4, 0.4, 0.62, 24]} />
        <meshStandardMaterial {...lens} />
      </mesh>
      <mesh position={[mid.x, baseY + 0.74, mid.z]} castShadow>
        <sphereGeometry args={[0.4, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial {...lens} />
      </mesh>
      <mesh position={plus} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.28, 24]} />
        <meshBasicMaterial color="#C8302A" />
      </mesh>
      <mesh position={[plus.x, plus.y + 0.01, plus.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.3, 0.07]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[plus.x, plus.y + 0.01, plus.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.07, 0.3]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

/** A small 8 Ω speaker on two leads: red to the + hole (a), black to the − hole (b). It sits above the board, or above
 *  the terminal that holds its leads. */
function Speaker({ a, b, hot, mid }: Shape) {
  const y = 2.4 + Math.max(a.lift ?? 0, b.lift ?? 0);
  const leads = useMemo(() => {
    const top = (side: number) => mid.clone().add(new Vector3(side * 0.4, y - 0.35, 0));
    return [
      { color: "#D63A2F", curve: new CatmullRomCurve3([at(a, 0.02), at(a, 0.9), top(-1)]) },
      { color: "#25292D", curve: new CatmullRomCurve3([at(b, 0.02), at(b, 0.9), top(1)]) },
    ];
  }, [a, b, mid, y]);
  return (
    <group>
      {leads.map((l, i) => (
        <mesh key={i} castShadow>
          <tubeGeometry args={[l.curve, 24, 0.08, 8, false]} />
          <meshStandardMaterial color={l.color} roughness={0.5} {...removeTint(hot)} />
        </mesh>
      ))}
      <mesh position={[mid.x, y, mid.z]} castShadow>
        <cylinderGeometry args={[1.5, 1.3, 0.6, 32]} />
        <meshStandardMaterial color="#2A2D30" roughness={0.6} metalness={0.3} {...removeTint(hot)} />
      </mesh>
      <mesh position={[mid.x, y + 0.31, mid.z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.2, 32]} />
        <meshStandardMaterial color="#4A4F54" roughness={0.9} />
      </mesh>
    </group>
  );
}
