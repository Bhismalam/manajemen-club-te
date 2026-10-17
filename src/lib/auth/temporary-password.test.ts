import { describe, expect, it } from "vitest";

import { generateTemporaryPassword } from "./temporary-password";

describe("generateTemporaryPassword", () => {
  it("12 karakter, minimal 2 angka, tanpa karakter ambigu", () => {
    for (let i = 0; i < 200; i++) {
      const password = generateTemporaryPassword();
      expect(password).toHaveLength(12);
      expect(password.replace(/[^0-9]/g, "").length).toBeGreaterThanOrEqual(2);
      expect(password).not.toMatch(/[01OolI]/);
    }
  });

  it("acak", () => {
    const set = new Set(Array.from({ length: 50 }, () => generateTemporaryPassword()));
    expect(set.size).toBe(50);
  });
});
