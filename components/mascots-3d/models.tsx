"use client";

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode } from "react";
import { CatmullRomCurve3, Quaternion, SplineCurve, Vector2, Vector3, type Group } from "three";
import { ARMS, poseMotion } from "@/lib/game/band";
import type { Pose } from "@/lib/game/mascot";
import type { MascotId } from "@/lib/game/project-mascot";

// The four Jumper mascots in 3D (Volt, Bulb, Coil, Knob), from the shapes and colors of the 2D mascots
// (components/art/volt.tsx and public/mascots/). The draft is in design/mascots-3d/. Each mascot stands on y = 0,
// looks to +z and is about 6 units tall. The face and the arms change with the pose, like the 2D mascots.

const C = {
  ink: "#13202a", light: "#e6edf1", steel: "#c9d4da", joint: "#9fb0ba", slate: "#566874", yellow: "#eab308",
  red: "#c9412f", green: "#22d66b", copper: "#c47a3a", glass: "#fbeab0", drop: "#7cc4e8", tongue: "#e8606a", core: "#3b4850",
};

/** A soft vinyl look: matte, with a little clearcoat. */
function Vinyl({ color, glow = 0, rough = 0.5, metal = 0 }: { color: string; glow?: number; rough?: number; metal?: number }) {
  return <meshPhysicalMaterial color={color} roughness={rough} metalness={metal} clearcoat={0.3} clearcoatRoughness={0.45} emissive={glow ? color : "#000"} emissiveIntensity={glow} />;
}

type Surface = (x: number, y: number) => { p: Vector3; n: Vector3 };
const flat = (z: number): Surface => (x, y) => ({ p: new Vector3(x, y, z), n: new Vector3(0, 0, 1) });
const sphere = (R: number, sy = 1): Surface => (x, y) => {
  const dy = y / sy;
  const z = Math.sqrt(Math.max(0.01, R * R - x * x - dy * dy));
  return { p: new Vector3(x, y, z), n: new Vector3(x, dy, z).normalize() };
};
const Z = new Vector3(0, 0, 1);

/** Puts its children on a surface, turned to face out along the surface normal. */
function OnSurface({ surf, x, y, lift = 0, children }: { surf: Surface; x: number; y: number; lift?: number; children: ReactNode }) {
  const { position, quaternion } = useMemo(() => {
    const { p, n } = surf(x, y);
    return { position: p.addScaledVector(n, lift), quaternion: new Quaternion().setFromUnitVectors(Z, n) };
  }, [surf, x, y, lift]);
  return (
    <group position={position} quaternion={quaternion}>
      {children}
    </group>
  );
}

/**
 * An open eye in the style of a friendly game mascot: a big dark pupil that fills most of the eye, with two shine dots,
 * so the eye looks soft and not like a stare. The eye blinks every few seconds; `phase` puts the blinks out of step.
 */
function OpenEye({ s, sx, pupil, phase }: { s: number; sx: number; pupil: [number, number, number]; phase: number }) {
  const ref = useRef<Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const k = (state.clock.elapsedTime + phase * 1.7) % 3.6;
    ref.current.scale.y = k < 0.14 ? 0.12 + Math.abs(k - 0.07) * 12.5 : 1;
  });
  return (
    <group ref={ref}>
      <mesh scale={[1, 1.22, 0.45]}>
        <sphereGeometry args={[0.34 * s, 32, 24]} />
        <Vinyl color="#ffffff" rough={0.2} />
      </mesh>
      <mesh position={[sx * 0.015 * s, -0.03 * s, 0.1 * s]} scale={pupil}>
        <sphereGeometry args={[0.27 * s, 32, 20]} />
        <meshPhysicalMaterial color={C.ink} roughness={0.15} clearcoat={1} />
      </mesh>
      <mesh position={[0.09 * s, 0.1 * s, 0.25 * s]}>
        <sphereGeometry args={[0.085 * s, 16, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-0.07 * s, -0.12 * s, 0.24 * s]}>
        <sphereGeometry args={[0.04 * s, 12, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

type FaceSpec = { surf: Surface; eyeX: number; eyeY: number; mouthY: number; s: number };

function Face({ surf, eyeX, eyeY, mouthY, s, pose, phase }: FaceSpec & { pose: Pose; phase: number }) {
  const happy = pose === "happy" || pose === "cheer";
  const wavy = useMemo(() => {
    const pts = Array.from({ length: 25 }, (_, i) => new Vector3((i / 24 - 0.5) * 0.7 * s, Math.sin((i / 24) * Math.PI * 3) * 0.05 * s, 0));
    return new CatmullRomCurve3(pts);
  }, [s]);
  const pupil: [number, number, number] = pose === "oops" ? [0.72, 0.82, 0.5] : [1, 1.12, 0.5];
  return (
    <>
      {[-1, 1].map((sx) => (
        <OnSurface key={sx} surf={surf} x={sx * eyeX} y={eyeY} lift={happy ? 0.03 : 0}>
          {happy ? (
            <mesh position={[0, -0.05 * s, 0]}>
              <torusGeometry args={[0.24 * s, 0.065 * s, 12, 32, Math.PI]} />
              <Vinyl color={C.ink} rough={0.2} />
            </mesh>
          ) : (
            <OpenEye s={s} sx={sx} pupil={pupil} phase={phase} />
          )}
        </OnSurface>
      ))}
      {pose === "idle" && (
        <OnSurface surf={surf} x={0} y={mouthY + 0.18 * s} lift={0.01}>
          <mesh rotation={[0, 0, Math.PI]}>
            <torusGeometry args={[0.3 * s, 0.06 * s, 12, 32, Math.PI]} />
            <Vinyl color={C.ink} rough={0.2} />
          </mesh>
        </OnSurface>
      )}
      {happy && (
        <OnSurface surf={surf} x={0} y={mouthY + 0.08 * s} lift={-0.02}>
          <group scale={pose === "cheer" ? 1.25 : 1}>
            <mesh scale={[1, 0.85, 0.3]}>
              <sphereGeometry args={[0.4 * s, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
              <Vinyl color={C.ink} rough={0.3} />
            </mesh>
            <mesh position={[0, -0.22 * s, 0.08 * s]} scale={[1.3, 0.55, 0.35]}>
              <sphereGeometry args={[0.17 * s, 16, 12]} />
              <Vinyl color={C.tongue} />
            </mesh>
          </group>
        </OnSurface>
      )}
      {pose === "oops" && (
        <OnSurface surf={surf} x={0} y={mouthY} lift={0.02}>
          <mesh>
            <tubeGeometry args={[wavy, 48, 0.05 * s, 8]} />
            <Vinyl color={C.ink} rough={0.2} />
          </mesh>
        </OnSurface>
      )}
    </>
  );
}

function Arm({ armRef, at, len }: { armRef: React.RefObject<Group | null>; at: [number, number, number]; len: number }) {
  return (
    <group ref={armRef} position={at}>
      <mesh position={[0, -len / 2, 0]}>
        <capsuleGeometry args={[0.2, len, 8, 16]} />
        <Vinyl color={C.slate} />
      </mesh>
      <mesh position={[0, -len - 0.2, 0]}>
        <sphereGeometry args={[0.38, 24, 16]} />
        <Vinyl color={C.joint} />
      </mesh>
    </group>
  );
}

function SweatDrop({ at }: { at: [number, number, number] }) {
  return (
    <group position={at}>
      <mesh>
        <sphereGeometry args={[0.17, 16, 12]} />
        <meshPhysicalMaterial color={C.drop} roughness={0.1} clearcoat={1} />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <coneGeometry args={[0.15, 0.3, 16]} />
        <meshPhysicalMaterial color={C.drop} roughness={0.1} clearcoat={1} />
      </mesh>
    </group>
  );
}

type RigSpec = {
  /** The parts of the body under the head. */
  body: ReactNode;
  /** The head parts, in the head's own space; the face goes on top. */
  head: (pose: Pose) => ReactNode;
  headY: number;
  face: FaceSpec;
  shoulder: [number, number, number];
  armLen: number;
  sweat: [number, number, number];
};

/** Moves a mascot: the body hops and tilts with the pose, the arms go to the pose, and the head turns to the pointer. */
function Rig({ spec, pose, phase, still }: { spec: RigSpec; pose: Pose; phase: number; still: boolean }) {
  const body = useRef<Group>(null);
  const head = useRef<Group>(null);
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const m = still ? { lift: 0, squash: 1, tilt: 0 } : poseMotion(pose, t, phase);
    if (body.current) {
      body.current.position.y = m.lift;
      body.current.rotation.z = m.tilt;
      const side = 1 / Math.sqrt(m.squash);
      body.current.scale.set(side, m.squash, side);
    }
    const [l, r] = ARMS[pose];
    const wave = still ? 0 : pose === "happy" ? Math.sin(t * 9 + phase) * 0.35 : pose === "cheer" ? Math.sin(t * 4.4 + phase) * 0.15 : 0;
    if (left.current) left.current.rotation.z += (-(l + (pose === "cheer" ? wave : 0)) - left.current.rotation.z) * 0.15;
    if (right.current) right.current.rotation.z += (r + wave - right.current.rotation.z) * 0.15;
    if (head.current && !still) {
      head.current.rotation.y += (state.pointer.x * 0.35 - head.current.rotation.y) * 0.06;
      head.current.rotation.x += (-state.pointer.y * 0.12 - head.current.rotation.x) * 0.06;
    }
  });
  const [sx, sy, sz] = spec.shoulder;
  return (
    <group ref={body}>
      {spec.body}
      <Arm armRef={left} at={[-sx, sy, sz]} len={spec.armLen} />
      <Arm armRef={right} at={[sx, sy, sz]} len={spec.armLen} />
      <group ref={head} position={[0, spec.headY, 0]}>
        {spec.head(pose)}
        <Face {...spec.face} pose={pose} phase={phase} />
        {pose === "oops" && <SweatDrop at={spec.sweat} />}
      </group>
    </group>
  );
}

const VOLT: RigSpec = {
  body: (
    <>
      {[-1, 1].map((sx) => (
        <RoundedBox key={sx} args={[0.8, 0.5, 1.1]} radius={0.22} position={[sx * 0.6, 0.25, 0.1]}>
          <Vinyl color={C.slate} />
        </RoundedBox>
      ))}
      <RoundedBox args={[2.5, 1.5, 1.8]} radius={0.4} position={[0, 1.3, 0]}>
        <Vinyl color={C.steel} />
      </RoundedBox>
      {([[-0.6, C.yellow], [0, C.red], [0.6, C.green]] as const).map(([x, color]) => (
        <RoundedBox key={x} args={[0.38, 0.38, 0.2]} radius={0.08} position={[x, 1.42, 0.9]}>
          <Vinyl color={color} glow={0.5} rough={0.3} />
        </RoundedBox>
      ))}
      <mesh position={[0, 2.2, 0]}>
        <cylinderGeometry args={[0.42, 0.42, 0.45, 24]} />
        <Vinyl color={C.joint} />
      </mesh>
    </>
  ),
  head: (pose) => (
    <>
      <RoundedBox args={[3.6, 2.9, 2.6]} radius={0.7} smoothness={5}>
        <Vinyl color={C.light} />
      </RoundedBox>
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * 1.88, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.34, 0.34, 0.3, 24]} />
          <Vinyl color={C.joint} />
        </mesh>
      ))}
      <mesh position={[0, 1.85, 0]}>
        <cylinderGeometry args={[0.07, 0.07, 0.9, 12]} />
        <Vinyl color={C.ink} />
      </mesh>
      <mesh position={[0, 2.4, 0]}>
        <sphereGeometry args={[0.32, 24, 16]} />
        <Vinyl color={pose === "oops" ? C.red : C.yellow} glow={0.7} rough={0.3} />
      </mesh>
    </>
  ),
  headY: 3.55,
  face: { surf: flat(1.3), eyeX: 0.72, eyeY: 0.25, mouthY: -0.72, s: 1.25 },
  shoulder: [1.3, 1.6, 0],
  armLen: 0.8,
  sweat: [1.6, 1.3, 1.0],
};

const BULB_PROFILE = new SplineCurve(
  [[0.78, 0], [0.9, 0.35], [1.3, 0.85], [1.85, 1.55], [2.08, 2.35], [1.95, 3.15], [1.45, 3.8], [0.75, 4.15], [0.001, 4.25]].map(([x, y]) => new Vector2(x, y)),
).getPoints(60);
const bulbRadius = (y: number) => BULB_PROFILE.reduce((best, p) => (Math.abs(p.y - y) < Math.abs(best.y - y) ? p : best)).x;
const bulbSurf: Surface = (x, y) => {
  const r = bulbRadius(y);
  const z = Math.sqrt(Math.max(0.01, r * r - x * x));
  return { p: new Vector3(x, y, z), n: new Vector3(x, 0.1, z).normalize() };
};
const BULB_SHINE = new CatmullRomCurve3(
  Array.from({ length: 13 }, (_, i) => {
    const y = 2.75 + i * 0.05;
    const r = bulbRadius(y) + 0.02;
    const a = -0.95 + i * 0.03;
    return new Vector3(Math.sin(a) * r, y, Math.cos(a) * r);
  }),
);

const BULB: RigSpec = {
  body: (
    <>
      {[-1, 1].map((sx) => (
        <RoundedBox key={sx} args={[0.7, 0.45, 0.95]} radius={0.2} position={[sx * 0.45, 0.22, 0.1]}>
          <Vinyl color={C.slate} />
        </RoundedBox>
      ))}
      <mesh position={[0, 0.45, 0]} rotation={[Math.PI, 0, 0]} scale={[1, 0.5, 1]}>
        <sphereGeometry args={[0.62, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <Vinyl color={C.slate} />
      </mesh>
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.72, 0.7, 0.95, 32]} />
        <Vinyl color={C.joint} rough={0.35} metal={0.4} />
      </mesh>
      {[0, 1, 2].map((i) => (
        <mesh key={i} position={[0, 0.6 + i * 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.72 - i * 0.02, 0.17, 12, 32]} />
          <Vinyl color={C.joint} rough={0.35} metal={0.4} />
        </mesh>
      ))}
    </>
  ),
  head: () => (
    <>
      <mesh>
        <latheGeometry args={[BULB_PROFILE, 64]} />
        <meshPhysicalMaterial color={C.glass} emissive="#ffcc33" emissiveIntensity={0.3} roughness={0.22} clearcoat={1} clearcoatRoughness={0.1} />
      </mesh>
      <mesh>
        <tubeGeometry args={[BULB_SHINE, 24, 0.07, 8]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </>
  ),
  headY: 1.35,
  face: { surf: bulbSurf, eyeX: 0.62, eyeY: 2.45, mouthY: 1.6, s: 1.05 },
  shoulder: [1.15, 2.6, 0.2],
  armLen: 0.9,
  sweat: [1.7, 3.6, 0.6],
};

const COIL: RigSpec = {
  body: (
    <>
      <RoundedBox args={[2.2, 0.75, 1.6]} radius={0.3} position={[0, 0.38, 0]}>
        <Vinyl color={C.slate} />
      </RoundedBox>
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.9, 0.9, 2.4, 32]} />
        <Vinyl color={C.core} />
      </mesh>
      {[1.38, 1.55, 1.55, 1.38].map((r, i) => (
        <mesh key={i} position={[0, 1.05 + i * 0.64, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r, 0.34, 20, 48]} />
          <meshPhysicalMaterial color={C.copper} metalness={0.55} roughness={0.32} clearcoat={0.6} />
        </mesh>
      ))}
    </>
  ),
  head: () => (
    <>
      <RoundedBox args={[2.6, 1.55, 1.8]} radius={0.6} smoothness={5}>
        <Vinyl color={C.steel} />
      </RoundedBox>
      {[-1, 1].map((sx) => (
        <mesh key={sx} position={[sx * 0.28, 1.12, 0]} rotation={[0, 0, sx * 0.62]}>
          <cylinderGeometry args={[0.06, 0.06, 0.9, 10]} />
          <Vinyl color={C.ink} />
        </mesh>
      ))}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.24, 20, 14]} />
        <Vinyl color={C.yellow} glow={0.6} rough={0.3} />
      </mesh>
    </>
  ),
  headY: 4.15,
  face: { surf: flat(0.9), eyeX: 0.5, eyeY: 0.18, mouthY: -0.42, s: 0.95 },
  shoulder: [1.75, 2.3, 0],
  armLen: 0.85,
  sweat: [1.35, 0.9, 0.6],
};

/** The knob on top of Knob turns while Knob is happy. */
function TurningKnob({ turning }: { turning: boolean }) {
  const ref = useRef<Group>(null);
  useFrame((_, dt) => {
    if (ref.current && turning) ref.current.rotation.y += dt * 2.5;
  });
  return (
    <group ref={ref} position={[0, 2.45, 0]}>
      <mesh>
        <cylinderGeometry args={[0.85, 0.92, 0.65, 40]} />
        <Vinyl color={C.slate} />
      </mesh>
      {Array.from({ length: 20 }, (_, i) => {
        const a = (i / 20) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.9, 0, Math.sin(a) * 0.9]} rotation={[0, -a, 0]}>
            <boxGeometry args={[0.1, 0.55, 0.1]} />
            <Vinyl color="#48585f" />
          </mesh>
        );
      })}
      <RoundedBox args={[0.16, 0.08, 0.7]} radius={0.04} position={[0, 0.34, 0.35]}>
        <Vinyl color={C.yellow} glow={0.5} rough={0.3} />
      </RoundedBox>
    </group>
  );
}

const KNOB_R = 2;
const KNOB: RigSpec = {
  body: (
    <>
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <mesh position={[sx * 0.75, 0.6, 0]}>
            <capsuleGeometry args={[0.28, 0.4, 8, 16]} />
            <Vinyl color={C.slate} />
          </mesh>
          <RoundedBox args={[0.75, 0.4, 1]} radius={0.18} position={[sx * 0.75, 0.2, 0.15]}>
            <Vinyl color={C.slate} />
          </RoundedBox>
        </group>
      ))}
    </>
  ),
  head: (pose) => (
    <>
      <mesh scale={[1, 0.95, 1]}>
        <sphereGeometry args={[KNOB_R, 64, 48]} />
        <Vinyl color={C.light} />
      </mesh>
      <mesh position={[0, 1.95, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.5, 16]} />
        <Vinyl color={C.ink} />
      </mesh>
      <TurningKnob turning={pose === "happy" || pose === "cheer"} />
    </>
  ),
  headY: 2.75,
  face: { surf: sphere(KNOB_R, 0.95), eyeX: 0.72, eyeY: -0.15, mouthY: -0.9, s: 1.15 },
  shoulder: [1.85, 2.5, 0],
  armLen: 0.85,
  sweat: [1.4, 1.5, 1.0],
};

const SPECS: Record<MascotId, RigSpec> = { volt: VOLT, bulb: BULB, coil: COIL, knob: KNOB };

/** One mascot in 3D. `phase` puts mascots out of step; `still` stops the motion (reduced motion). */
export function Mascot3D({ id, pose, phase = 0, still = false }: { id: MascotId; pose: Pose; phase?: number; still?: boolean }) {
  return <Rig spec={SPECS[id]} pose={pose} phase={phase} still={still} />;
}
