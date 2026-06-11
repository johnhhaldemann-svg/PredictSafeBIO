import { describe, expect, it, vi } from "vitest";
import {
  detectFormat,
  extractDocumentText,
  MAX_EXTRACTED_CHARS,
  MIN_USABLE_CHARS,
  normalizeText
} from "./extract";

const bytes = (text: string) => new TextEncoder().encode(text);

describe("detectFormat", () => {
  it("prefers MIME type when present", () => {
    expect(detectFormat("file.bin", "application/pdf")).toBe("pdf");
    expect(
      detectFormat(null, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")
    ).toBe("docx");
    expect(detectFormat(null, "text/markdown")).toBe("md");
    expect(detectFormat(null, "text/plain")).toBe("txt");
  });

  it("falls back to the filename extension", () => {
    expect(detectFormat("Biosafety Manual.pdf")).toBe("pdf");
    expect(detectFormat("plan.docx")).toBe("docx");
    expect(detectFormat("notes.md")).toBe("md");
    expect(detectFormat("readme.txt")).toBe("txt");
    expect(detectFormat("page.html")).toBe("html");
  });

  it("returns 'unknown' when neither MIME nor extension is recognized", () => {
    expect(detectFormat("mystery", "application/octet-stream")).toBe("unknown");
    expect(detectFormat(null, null)).toBe("unknown");
  });
});

describe("normalizeText", () => {
  it("normalizes line endings and whitespace while preserving internal spaces", () => {
    const raw = "Heading One\r\n\r\n\r\n  Biosafety\t\tManual   \n";
    expect(normalizeText(raw)).toBe("Heading One\n\nBiosafety Manual");
  });

  it("strips non-printable control characters", () => {
    const raw = "abc\x00\x07\x1Fdef\x7f";
    expect(normalizeText(raw)).toBe("abcdef");
  });

  it("preserves paragraph breaks but collapses excessive blank lines", () => {
    expect(normalizeText("a\n\n\n\n\nb")).toBe("a\n\nb");
  });
});

describe("extractDocumentText", () => {
  it("extracts and normalizes plain text", async () => {
    const result = await extractDocumentText({
      buffer: bytes("Chemical Hygiene Plan\n\n\n  reviewed annually."),
      filename: "chp.txt"
    });
    expect(result.status).toBe("ok");
    expect(result.format).toBe("txt");
    expect(result.text).toBe("Chemical Hygiene Plan\n\nreviewed annually.");
    expect(result.chars).toBe(result.text.length);
  });

  it("strips tags from HTML before normalizing", async () => {
    const result = await extractDocumentText({
      buffer: bytes("<h1>Spill Response</h1><p>Use 10% bleach for biological spills.</p>"),
      mimeType: "text/html"
    });
    expect(result.status).toBe("ok");
    expect(result.text).toContain("Spill Response");
    expect(result.text).toContain("10% bleach");
    expect(result.text).not.toContain("<");
  });

  it("routes binary formats to the injected parser", async () => {
    const pdf = vi.fn().mockResolvedValue("Exposure Control Plan updated within the past 12 months.");
    const result = await extractDocumentText({
      buffer: bytes("%PDF-1.7 fake bytes"),
      filename: "ecp.pdf",
      parsers: { pdf }
    });
    expect(pdf).toHaveBeenCalledOnce();
    expect(result.status).toBe("ok");
    expect(result.format).toBe("pdf");
    expect(result.text).toContain("Exposure Control Plan");
  });

  it("reports failure (not a throw) when a binary parser errors", async () => {
    const docx = vi.fn().mockRejectedValue(new Error("corrupt zip"));
    const result = await extractDocumentText({
      buffer: bytes("PK fake docx"),
      filename: "plan.docx",
      parsers: { docx }
    });
    expect(result.status).toBe("failed");
    expect(result.reason).toContain("corrupt zip");
  });

  it("treats an empty file as failed", async () => {
    const result = await extractDocumentText({ buffer: new Uint8Array(), filename: "x.txt" });
    expect(result.status).toBe("failed");
    expect(result.reason).toContain("empty");
  });

  it("flags a near-empty PDF as a likely scanned/image-only document", async () => {
    const pdf = vi.fn().mockResolvedValue("   \n  ");
    const result = await extractDocumentText({
      buffer: bytes("%PDF scan"),
      filename: "scan.pdf",
      parsers: { pdf }
    });
    expect(result.status).toBe("failed");
    expect(result.reason).toContain("scanned");
    expect(result.chars).toBeLessThan(MIN_USABLE_CHARS);
  });

  it("truncates over-long documents and marks them partial", async () => {
    const long = "a".repeat(MAX_EXTRACTED_CHARS + 5_000);
    const result = await extractDocumentText({ buffer: bytes(long), filename: "big.txt" });
    expect(result.status).toBe("partial");
    expect(result.chars).toBe(MAX_EXTRACTED_CHARS);
    expect(result.reason).toContain("truncated");
  });

  it("rejects unsupported file types", async () => {
    const result = await extractDocumentText({
      buffer: bytes("binary"),
      filename: "archive.zip"
    });
    expect(result.status).toBe("failed");
    expect(result.reason).toContain("Unsupported");
  });
});
