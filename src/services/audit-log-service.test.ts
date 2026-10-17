import { describe, expect, it } from "vitest";

import { diffForAudit } from "./audit-log-service";

describe("diffForAudit", () => {
  it("hanya mencatat field yang berubah", () => {
    expect(
      diffForAudit(
        {
          fullName: "Bima",
          phone: null,
          isActive: true,
          birthDate: new Date("2011-04-12T00:00:00Z"),
        },
        {
          fullName: "Bima A.",
          phone: null,
          isActive: false,
          birthDate: new Date("2011-04-12T00:00:00Z"),
        },
      ),
    ).toEqual({
      fullName: { from: "Bima", to: "Bima A." },
      isActive: { from: "true", to: "false" },
    });
  });

  it("kosong jika tidak ada perubahan", () => {
    expect(diffForAudit({ a: "x" }, { a: "x" })).toEqual({});
  });
});
