import { describe, expect, it } from "vitest";

import {
  attachmentKeyFor,
  checkPdfFile,
  isAttachmentKeyOf,
  isPdfBytes,
  PDF_MAX_BYTES,
  sanitizeFileName,
} from "./pdf";

const encode = (text: string) => new TextEncoder().encode(text);

describe("isPdfBytes", () => {
  it("mengenali header %PDF-", () => {
    expect(isPdfBytes(encode("%PDF-1.7\n..."))).toBe(true);
  });

  it("menolak file lain yang diberi nama .pdf", () => {
    expect(isPdfBytes(encode("hello world"))).toBe(false);
    expect(isPdfBytes(encode("%PD"))).toBe(false);
    expect(isPdfBytes(new Uint8Array())).toBe(false);
  });
});

describe("attachment key", () => {
  const uuid = "3f1c2b9e-8a7d-4c5e-9f01-23456789abcd";

  it("dibuat dari id event, bukan nama file user", () => {
    expect(attachmentKeyFor("comp1", uuid)).toBe(`competitions/comp1/${uuid}.pdf`);
    expect(attachmentKeyFor("comp1")).toMatch(/^competitions\/comp1\/[0-9a-f-]{36}\.pdf$/);
  });

  it("key hanya diterima untuk event yang sama", () => {
    const key = attachmentKeyFor("comp1", uuid);
    expect(isAttachmentKeyOf(key, "comp1")).toBe(true);
    expect(isAttachmentKeyOf(key, "comp2")).toBe(false);
    expect(isAttachmentKeyOf(`competitions/comp1/../comp2/${uuid}.pdf`, "comp1")).toBe(false);
    expect(isAttachmentKeyOf("competitions/comp1/file.pdf", "comp1")).toBe(false);
  });
});

describe("checkPdfFile", () => {
  it("menerima PDF sampai 10 MB", () => {
    expect(checkPdfFile({ name: "Handbook.PDF", size: 1000, type: "application/pdf" }).ok).toBe(
      true,
    );
    expect(checkPdfFile({ name: "a.pdf", size: PDF_MAX_BYTES, type: "" }).ok).toBe(true);
  });

  it("menolak format lain, file kosong, atau terlalu besar", () => {
    expect(checkPdfFile({ name: "a.docx", size: 10, type: "application/pdf" }).ok).toBe(false);
    expect(checkPdfFile({ name: "a.pdf", size: 10, type: "text/plain" }).ok).toBe(false);
    expect(checkPdfFile({ name: "a.pdf", size: 0, type: "application/pdf" }).ok).toBe(false);
    expect(checkPdfFile({ name: "a.pdf", size: PDF_MAX_BYTES + 1, type: "" }).ok).toBe(false);
  });
});

describe("sanitizeFileName", () => {
  it("membuang path dan karakter kontrol", () => {
    expect(sanitizeFileName("C:\\Users\\x\\Technical Handbook.pdf")).toBe("Technical Handbook.pdf");
    expect(sanitizeFileName('../../"evil"\n.pdf')).toBe("evil.pdf");
    expect(sanitizeFileName("   ")).toBe("dokumen.pdf");
  });
});
