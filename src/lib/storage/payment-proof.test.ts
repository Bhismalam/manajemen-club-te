import { describe, expect, it } from "vitest";

import { checkProofFile, detectProofType, isProofKeyOf, proofKeyFor } from "./payment-proof";

const UUID = "123e4567-e89b-12d3-a456-426614174000";

describe("detectProofType", () => {
  it("mengenali format dari isi file", () => {
    expect(detectProofType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpg");
    expect(detectProofType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe(
      "png",
    );
    expect(detectProofType(new TextEncoder().encode("RIFF1234WEBPVP8 "))).toBe("webp");
    expect(detectProofType(new TextEncoder().encode("%PDF-1.7"))).toBe("pdf");
  });

  it("menolak isi lain", () => {
    expect(detectProofType(new TextEncoder().encode("bukan gambar"))).toBeNull();
    expect(detectProofType(new TextEncoder().encode("RIFF1234WAVEfmt "))).toBeNull();
    expect(detectProofType(new TextEncoder().encode("<svg xmlns="))).toBeNull();
    expect(detectProofType(new Uint8Array())).toBeNull();
  });
});

describe("checkProofFile", () => {
  it("menerima foto & PDF sampai 10 MB", () => {
    expect(checkProofFile({ size: 1000, type: "image/jpeg" })).toEqual({
      ok: true,
      extension: "jpg",
    });
    expect(checkProofFile({ size: 10 * 1024 * 1024, type: "application/pdf" }).ok).toBe(true);
  });

  it("menolak jenis lain, file kosong, dan file terlalu besar", () => {
    expect(checkProofFile({ size: 1000, type: "image/svg+xml" }).ok).toBe(false);
    expect(checkProofFile({ size: 1000, type: "" }).ok).toBe(false);
    expect(checkProofFile({ size: 0, type: "image/png" }).ok).toBe(false);
    expect(checkProofFile({ size: 10 * 1024 * 1024 + 1, type: "image/png" }).ok).toBe(false);
  });
});

describe("key bukti", () => {
  it("terikat pada atlet dan bulan", () => {
    const key = proofKeyFor("athlete-1", "2026-11", "jpg", UUID);
    expect(key).toBe(`spp/athlete-1/2026-11/${UUID}.jpg`);
    expect(isProofKeyOf(key, "athlete-1", "2026-11")).toBe(true);
    expect(isProofKeyOf(key, "athlete-2", "2026-11")).toBe(false);
    expect(isProofKeyOf(key, "athlete-1", "2026-10")).toBe(false);
  });

  it("menolak key yang dimanipulasi", () => {
    expect(isProofKeyOf(`spp/a/2026-11/../b/${UUID}.jpg`, "a", "2026-11")).toBe(false);
    expect(isProofKeyOf(`spp/a/2026-11/${UUID}.exe`, "a", "2026-11")).toBe(false);
    expect(isProofKeyOf("competitions/x/y.pdf", "a", "2026-11")).toBe(false);
  });
});
