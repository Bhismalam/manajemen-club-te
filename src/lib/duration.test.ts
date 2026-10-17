import { describe, expect, it } from "vitest";

import { formatDelta, formatDuration, parseDuration } from "./duration";

describe("parseDuration", () => {
  it.each([
    ["58.27", 58270],
    ["58.2", 58200],
    ["58", 58000],
    ["0:58.27", 58270],
    ["1:05.32", 65320],
    ["1:5.3", 65300],
    ["12:34.56", 754560],
    ["31,40", 31400],
    [" 25.09 ", 25090],
  ])("%s → %i ms", (input, expected) => {
    expect(parseDuration(input)).toBe(expected);
  });

  it.each(["", "abc", "0", "0.00", "1:60.00", "58.271", "-5", "1:2:3", "60:00.00", "99"])(
    "menolak %s",
    (input) => {
      expect(parseDuration(input)).toBeNull();
    },
  );
});

describe("formatDuration", () => {
  it("di bawah satu menit tanpa menit", () => {
    expect(formatDuration(58270)).toBe("58.27");
    expect(formatDuration(5090)).toBe("5.09");
  });

  it("satu menit atau lebih", () => {
    expect(formatDuration(65320)).toBe("1:05.32");
    expect(formatDuration(754560)).toBe("12:34.56");
  });

  it("bolak-balik dengan parseDuration", () => {
    for (const ms of [21870, 31450, 60000, 65320, 600010]) {
      expect(parseDuration(formatDuration(ms))).toBe(ms);
    }
  });

  it("selisih bertanda", () => {
    expect(formatDelta(-450)).toBe("−0.45");
    expect(formatDelta(1200)).toBe("+1.20");
  });
});
