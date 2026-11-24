import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import manifest from "./manifest";

describe("aset PWA TE", () => {
  it("menggunakan ikon PNG yang tersedia dengan dimensi sesuai manifest", () => {
    const icons = manifest().icons ?? [];
    expect(icons.some((icon) => icon.sizes === "192x192")).toBe(true);
    expect(icons.some((icon) => icon.sizes === "512x512" && icon.purpose === "maskable")).toBe(
      true,
    );
    for (const icon of icons) {
      const png = readFileSync(path.join(process.cwd(), "public", icon.src));
      expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`).toBe(icon.sizes);
    }
  });

  it("menyediakan Apple touch icon 180px", () => {
    const png = readFileSync(path.join(process.cwd(), "public/icons/apple-touch-icon.png"));
    expect([png.readUInt32BE(16), png.readUInt32BE(20)]).toEqual([180, 180]);
  });

  it("favicon berisi PNG RGBA 8-bit yang dapat didekode Next.js", () => {
    const ico = readFileSync(path.join(process.cwd(), "src/app/favicon.ico"));
    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    const count = ico.readUInt16LE(4);
    expect(count).toBeGreaterThan(0);
    for (let index = 0; index < count; index++) {
      const entry = 6 + index * 16;
      const length = ico.readUInt32LE(entry + 8);
      const offset = ico.readUInt32LE(entry + 12);
      expect(offset).toBeGreaterThanOrEqual(6 + count * 16);
      expect(offset + length).toBeLessThanOrEqual(ico.length);
      const png = ico.subarray(offset, offset + length);
      expect(png.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      expect(png.readUInt32BE(16)).toBe(ico[entry] || 256);
      expect(png.readUInt32BE(20)).toBe(ico[entry + 1] || 256);
      expect(png[24]).toBe(8); // IHDR bit depth.
      expect(png[25]).toBe(6); // IHDR color type: truecolor with alpha (RGBA).
    }
  });
});
