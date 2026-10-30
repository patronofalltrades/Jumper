import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import text from "@/content/ui/build.json";
import { ConnectionList } from "@/components/build/connection-list";
import type { Rules } from "@/lib/circuit/check";

// Issue #112: the connection list opens and closes from its header, as the task list does.
// Laptop: it starts open. Phone: it starts closed, with a short count in the header.

const rules: Rules = { require: [{ a: "esp.3V3", b: "L+" }], forbid: [] };
const render = (laptop: boolean, small = false) => renderToStaticMarkup(createElement(ConnectionList, { rules, laptop, small }));
const fill = (template: string) => template.replace("{done}", "0").replace("{total}", "1");

describe("connection list header", () => {
  it("starts open on a laptop: the header button says it is open, and the list shows", () => {
    const html = render(true);
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain(`title="${text.connections.hide}"`);
    expect(html).toContain(fill(text.connections.title));
    expect(html).toContain("<ol");
  });

  it("starts closed on a phone: the header shows the short count, and the list does not show", () => {
    const html = render(false);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain(`title="${text.connections.show}"`);
    expect(html).toContain(fill(text.connections.chip));
    expect(html).not.toContain("<ol");
  });

  it("starts closed on a laptop when the code panel is open", () => {
    const html = render(true, true);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain(fill(text.connections.chip));
    expect(html).not.toContain("<ol");
  });
});
