"use client";

import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type MistakeBar = { label: string; count: number };

const ROW = 44;
const failedText = (n: number, one: string, many: string) => (n === 1 ? one : many.replace("{n}", String(n)));

/**
 * The mistakes that the learner makes most, as one bar for each mistake type (PLAN.md feature 10). One series, so one
 * color and no legend. The count is at the end of each bar, and a list gives the same data to screen readers.
 */
export function MistakeChart({ data, one, many }: { data: MistakeBar[]; one: string; many: string }) {
  return (
    <>
      <div aria-hidden="true" style={{ height: data.length * ROW + 8 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ top: 4, right: 36, bottom: 4, left: 0 }} barCategoryGap={2}>
            <XAxis type="number" hide allowDecimals={false} domain={[0, "dataMax"]} />
            <YAxis
              type="category"
              dataKey="label"
              width={150}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--ink)", fontSize: 13, fontWeight: 600 }}
            />
            <Tooltip
              cursor={{ fill: "var(--panel-2)" }}
              formatter={(value) => [failedText(Number(value), one, many), null]}
              contentStyle={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 12, color: "var(--ink)", fontSize: 13 }}
              labelStyle={{ fontWeight: 700 }}
            />
            <Bar dataKey="count" fill="var(--danger)" radius={[0, 4, 4, 0]} maxBarSize={24} isAnimationActive={false}>
              <LabelList dataKey="count" position="right" style={{ fill: "var(--ink)", fontFamily: "var(--font-plex-mono)", fontSize: 13, fontWeight: 600 }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ul className="sr-only">
        {data.map((d) => (
          <li key={d.label}>
            {d.label}: {failedText(d.count, one, many)}
          </li>
        ))}
      </ul>
    </>
  );
}
