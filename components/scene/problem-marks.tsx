"use client";

import { Line } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { useLayoutEffect } from "react";
import { Color } from "three";
import type { End } from "./parts";

// The marks of the problem of a failed Check (issue #90): a red ring on each end of the connection, and a dashed
// ghost wire between them. They stay until the connection is right. The red is the buzz color of build-scene.tsx.
const RED = new Color("#E5432F");

/** `color`: red for a problem; the hologram of a connection row uses the guide color (issue #113). */
export function ProblemMarks({ ends, color = RED }: { ends: End[]; color?: Color }) {
  const invalidate = useThree((s) => s.invalidate);
  useLayoutEffect(() => {
    invalidate();
  }, [ends, color, invalidate]);

  if (ends.length === 0) return null;
  const [from, to] = ends;
  return (
    <group>
      {ends.map((end) => (
        <mesh key={end.id} position={[end.x, (end.lift ?? 0) + 0.05, end.z]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
          <ringGeometry args={[0.5, 0.7, 28]} />
          <meshBasicMaterial color={color} />
        </mesh>
      ))}
      {to && (
        <Line
          points={[
            [from.x, (from.lift ?? 0) + 0.3, from.z],
            [to.x, (to.lift ?? 0) + 0.3, to.z],
          ]}
          color={color}
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
