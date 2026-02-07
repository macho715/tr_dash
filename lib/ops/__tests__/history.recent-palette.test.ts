// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import {
  loadRecentPaletteItems,
  saveRecentPaletteItem,
  type RecentPaletteItem,
} from "@/lib/ops/agi/history";

function makeItem(id: string, timestamp: number): RecentPaletteItem {
  return {
    kind: "command",
    id,
    label: id,
    timestamp,
  };
}

describe("recent palette history", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("moves duplicate item to top and keeps uniqueness", () => {
    saveRecentPaletteItem(makeItem("/shift", 1000));
    saveRecentPaletteItem(makeItem("/bulk", 1001));
    saveRecentPaletteItem(makeItem("/shift", 1002));

    const result = loadRecentPaletteItems();
    expect(result.length).toBe(2);
    expect(result[0].id).toBe("/shift");
    expect(result[1].id).toBe("/bulk");
  });

  it("keeps only 10 most recent items", () => {
    for (let i = 0; i < 12; i++) {
      saveRecentPaletteItem(makeItem(`/cmd-${i}`, 1000 + i));
    }
    const result = loadRecentPaletteItems();
    expect(result.length).toBe(10);
    expect(result[0].id).toBe("/cmd-11");
    expect(result[9].id).toBe("/cmd-2");
  });
});
