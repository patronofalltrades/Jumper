"use client";

import { useRouter } from "next/navigation";
import { boxClass } from "@/components/snapshots/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import text from "@/content/ui/snapshots.json";
import { findHref, readFind, type Find } from "@/lib/snapshots/find";
import type { View } from "@/lib/snapshots/stars";

const t = text.find;
const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k]));
const selectClass = `${boxClass} h-11 py-0`;

/**
 * The search box, the filters and the sort (issue #42). It is a GET form, so it works before the script loads.
 * With the script, it opens the short URL from `findHref`, and a change to a select applies at once.
 */
export function FindForm({ find, view, levels }: { find: Find; view: View; levels: { id: number; position: number; title: string }[] }) {
  const router = useRouter();

  const go = (form: HTMLFormElement) => {
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    router.push(findHref(readFind(data), view));
  };

  return (
    <form
      role="search"
      aria-label={t.label}
      action="/snapshots"
      onSubmit={(e) => {
        e.preventDefault();
        go(e.currentTarget);
      }}
      onChange={(e) => {
        if (e.target instanceof HTMLSelectElement) go(e.currentTarget);
      }}
      className="flex flex-col gap-2 rounded-2xl bg-black/50 p-2 backdrop-blur"
    >
      {view === "starred" && <input type="hidden" name="view" value="starred" />}
      <div className="flex gap-2">
        <label htmlFor="find-q" className="sr-only">
          {t.search}
        </label>
        <Input id="find-q" name="q" type="search" defaultValue={find.q} placeholder={t.search_hint} maxLength={100} autoComplete="off" />
        <Button type="submit">{t.submit}</Button>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <label htmlFor="find-level" className="sr-only">
          {t.level}
        </label>
        <select id="find-level" name="level" defaultValue={find.level ?? ""} className={selectClass}>
          <option value="">{t.all_levels}</option>
          {levels.map((l) => (
            <option key={l.id} value={l.id}>
              {fill(text.list.level, { level: l.position })} · {l.title}
            </option>
          ))}
        </select>
        <label htmlFor="find-result" className="sr-only">
          {t.result}
        </label>
        <select id="find-result" name="result" defaultValue={find.result} className={selectClass}>
          <option value="all">{t.all_results}</option>
          <option value="passed">{t.passed}</option>
          <option value="not_checked">{t.not_checked}</option>
        </select>
        <label htmlFor="find-sort" className="sr-only">
          {t.sort}
        </label>
        <select id="find-sort" name="sort" defaultValue={find.sort} className={selectClass}>
          <option value="newest">{t.newest}</option>
          <option value="mistakes">{t.mistakes}</option>
        </select>
      </div>
    </form>
  );
}
