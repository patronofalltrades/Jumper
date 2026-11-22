import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import text from "@/content/ui/build.json";
import sketchText from "@/content/ui/sketch.json";
import { BoardActions } from "@/components/build/board-actions";
import { createStore } from "zustand/vanilla";
import { BoardContext, boardStore, type BoardState } from "@/lib/game/board-store";

// Issues #114 and #115: the button row at the bottom of the board has Clear, Check and, after Check, more buttons such
// as "Build it for me". The row shows while the learner builds, so "Build it for me" is there before Check is on.

const render = (ready: boolean, extra?: string) =>
  renderToStaticMarkup(
    createElement(BoardActions, { ready, empty: false, locked: false, onCheck: () => {}, onOpenCode: () => {}, extra: extra && createElement("button", { type: "button" }, extra) }),
  );

describe("board actions row", () => {
  it("shows an extra button after Check, also before the tasks are done", () => {
    const html = render(false, text.buildForMe.button);
    const check = html.indexOf(text.play.check.button);
    const extra = html.indexOf(text.buildForMe.button);
    expect(check).toBeGreaterThan(-1);
    expect(extra).toBeGreaterThan(check);
  });

  it("shows only Clear and Check with no extra button", () => {
    const html = render(true);
    expect(html).toContain(text.play.clear.button);
    expect(html).toContain(text.play.check.button);
    expect(html).not.toContain(text.buildForMe.button);
  });

  it("puts Write the sketch in the Clear and Check row, as a plain button, while Compare views is open (issue #202)", () => {
    const actions = createElement(BoardActions, { ready: true, empty: false, locked: true, onCheck: () => {}, onOpenCode: () => {} });
    const comparing = createStore<BoardState>(() => ({ ...boardStore.getState(), compare: { holes: {}, parts: {} } }));
    const button = (html: string) => html.match(new RegExp(`<button[^>]*>${sketchText.panel.open}</button>`))![0];
    expect(button(renderToStaticMarkup(actions))).toContain("bg-primary");
    const html = renderToStaticMarkup(createElement(BoardContext, { value: comparing }, actions));
    expect(button(html)).toContain("bg-card");
    expect(button(html)).not.toContain("bg-primary");
    // After Check, in the same row.
    expect(html.indexOf(sketchText.panel.open)).toBeGreaterThan(html.indexOf(text.play.check.button));
  });
});
