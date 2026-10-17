import { describe, expect, it } from "vitest";

import { niceTimeTicks } from "./chart";

describe("niceTimeTicks", () => {
  it("kelipatan bulat yang mencakup data", () => {
    const { ticks, min, max } = niceTimeTicks(30980, 32800);
    expect(ticks).toEqual([30500, 31000, 31500, 32000, 32500, 33000]);
    expect(min).toBeLessThanOrEqual(30980);
    expect(max).toBeGreaterThanOrEqual(32800);
  });

  it("rentang sempit memakai langkah kecil", () => {
    expect(niceTimeTicks(31400, 31600).ticks).toEqual([31400, 31500, 31600]);
  });

  it("rentang menit memakai langkah besar", () => {
    const { ticks } = niceTimeTicks(65000, 75000);
    expect(ticks).toEqual([65000, 70000, 75000]);
  });

  it("satu nilai tepat di garis", () => {
    expect(niceTimeTicks(31000, 31000).ticks).toHaveLength(3);
  });
});
