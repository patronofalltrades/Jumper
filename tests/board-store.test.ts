import { describe, expect, it } from "vitest";
import { createBoardStore } from "@/lib/game/board-store";

const tap = (store: ReturnType<typeof createBoardStore>, ...holes: string[]) => holes.forEach((h) => store.getState().tapHole(h));

describe("board store", () => {
  it("places a wire with two taps", () => {
    const store = createBoardStore();
    tap(store, "A-a3");
    expect(store.getState().pending).toBe("A-a3");
    tap(store, "A-a9");
    expect(store.getState().parts).toEqual([{ id: "w1", type: "wire", a: "A-a3", b: "A-a9", color: "#D63A2F" }]);
    expect(store.getState().pending).toBeNull();
  });

  it("places an LED with the first tap as the + leg", () => {
    const store = createBoardStore();
    store.getState().setTool("led");
    tap(store, "A-b10", "A-b11");
    expect(store.getState().parts[0]).toMatchObject({ id: "led1", type: "led", a: "A-b10", b: "A-b11" });
  });

  it("does not start a part on an ESP32-S3 pin, and says why", () => {
    const store = createBoardStore();
    tap(store, "A-j8");
    expect(store.getState().pending).toBeNull();
    expect(store.getState().notice).toEqual({ problem: "esp_pin", hole: "A-j8" });
  });

  it("cancels the part when you tap the first hole again", () => {
    const store = createBoardStore();
    tap(store, "A-a3", "A-a3");
    expect(store.getState().pending).toBeNull();
    expect(store.getState().parts).toEqual([]);
  });

  it("removes a part by a tap on one of its holes, with the Remove tool", () => {
    const store = createBoardStore();
    tap(store, "A-a3", "A-a9");
    store.getState().setTool("remove");
    tap(store, "A-a9");
    expect(store.getState().parts).toEqual([]);
  });

  it("undoes the last action: first the remove, then the place", () => {
    const store = createBoardStore();
    tap(store, "A-a3", "A-a9");
    store.getState().removePart("w1");
    store.getState().undo();
    expect(store.getState().parts.map((p) => p.id)).toEqual(["w1"]);
    store.getState().undo();
    expect(store.getState().parts).toEqual([]);
    store.getState().undo();
    expect(store.getState().notice).toEqual({ problem: "nothing_to_undo" });
  });

  it("starts a different level with an empty bench, and keeps the parts when the same level opens again", () => {
    const store = createBoardStore();
    store.getState().open("perch/2");
    tap(store, "A-a3", "A-a9");
    store.getState().open("perch/2");
    expect(store.getState().parts).toHaveLength(1);
    store.getState().open("perch/3");
    expect(store.getState().parts).toEqual([]);
    expect(store.getState().history).toEqual([]);
  });
});
