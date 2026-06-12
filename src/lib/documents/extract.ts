// ---------------------------------------------------------------------------
// Document Intelligence — Text extraction
//
// Pulls plain text out of an uploaded safety document so it can be graded
// against a rubric (see rubric.ts). The uploaded file already lands in the
// `biotech-documents` storage bucket (document-service.ts); this reads its
// bytes and returns normalized, length-capped text plus an extraction status.
//
// The orchestration (format detection, normalization, capping, status) is pure
// and fully unit-tested. Binary parsing (PDF, DOCX) is isolated behind an
// injectable `ParserRegistry` so tests stay fast and deterministic; the default
// parsers lazy-load their libraries only when actually invoked at runtime.
// ---------------------------------------------------------------------------

export type ExtractionStatus = "ok" | "partial" | "failed";

export type ExtractedFormat = "txt" | "md" | "html" | "pdf" | "docx" | "unknown";

export type ExtractedDocument = {
  text: string;
  /** Character count of `text` after normalization. */
  chars: number;
  status: ExtractionStatus;
  format: ExtractedFormat;
  /** Present when status is "partial" or "failed" — explains what happened. */
  reason?: string;
};

/** Parses a binary document buffer into raw text. Throwing is acceptable — the
 * orchestrator catches it and reports a "failed" extraction. */
export type BinaryParser = (buffer: Uint8Array) => Promise<string>;

export type ParserRegistry = {
  pdf?: BinaryParser;
  docx?: BinaryParser;
};

export type ExtractInput = {
  buffer: Uint8Array;
  filename?: string | null;
  mimeType?: string | null;
  /** Override the binary parsers — primarily for tests. */
  parsers?: ParserRegistry;
};

/** Upper bound on text fed to the grader. Keeps prompt size and cost bounded;
 * a single SOP well under this. Text beyond the cap is truncated → "partial". */
export const MAX_EXTRACTED_CHARS = 200_000;

/** Below this, treat extraction as failed (e.g. a scanned, image-only PDF). */
export const MIN_USABLE_CHARS = 20;

// ---------------------------------------------------------------------------
// Format detection
// ---------------------------------------------------------------------------

export function detectFormat(filename?: string | null, mimeType?: string | null): ExtractedFormat {
  const mime = (mimeType ?? "").toLowerCase();
  if (mime.includes("pdf")) return "pdf";
  if (mime.includes("wordprocessingml") || mime === "application/msword") return "docx";
  if (mime === "text/html") return "html";
  if (mime === "text/markdown") return "md";
  if (mime.startsWith("text/")) return "txt";

  const ext = (filename ?? "").toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  switch (ext) {
    case "pdf":
      return "pdf";
    case "docx":
    case "doc":
      return "docx";
    case "htm":
    case "html":
      return "html";
    case "md":
    case "markdown":
      return "md";
    case "txt":
    case "text":
      return "txt";
    default:
      return "unknown";
  }
}

// ---------------------------------------------------------------------------
// Normalization
// ---------------------------------------------------------------------------

// Control chars to strip: everything 0x00-0x1F except tab (0x09) and newline
// (0x0A), plus DEL (0x7F).
const CONTROL_CHARS = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/**
 * Collapse extracted text into a clean, compact form: normalize line endings,
 * strip non-printable control characters, collapse runs of spaces/tabs and
 * excessive blank lines, and trim. Deterministic and pure.
 */
export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_CHARS, "")
    // Collapse horizontal whitespace runs.
    .replace(/[ \t]+/g, " ")
    // Strip horizontal whitespace on both sides of line breaks.
    .replace(/ ?\n ?/g, "\n")
    // Collapse 3+ newlines down to a paragraph break.
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripHtml(raw: string): string {
  return raw
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

// ---------------------------------------------------------------------------
// Default binary parsers (lazy-loaded; only run when a binary file is supplied)
// ---------------------------------------------------------------------------

const defaultDocxParser: BinaryParser = async (buffer) => {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  return result.value ?? "";
};

const defaultPdfParser: BinaryParser = async (buffer) => {
  // Legacy build is the Node-friendly entrypoint for pdfjs in a serverless runtime.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({
    data: buffer,
    // No worker in serverless.
    useWorkerFetch: false,
    useSystemFonts: true
  });
  const pdf = await loadingTask.promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => (typeof (item as { str?: unknown }).str === "string" ? (item as { str: string }).str : ""))
      .join(" ");
    pages.push(pageText);
  }
  return pages.join("\n\n");
};

function resolveParsers(overrides?: ParserRegistry): Required<ParserRegistry> {
  return {
    pdf: overrides?.pdf ?? defaultPdfParser,
    docx: overrides?.docx ?? defaultDocxParser
  };
}

// ---------------------------------------------------------------------------
// Orchestrator
// ---------------------------------------------------------------------------

function decodeUtf8(buffer: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
}

function finalize(rawText: string, format: ExtractedFormat): ExtractedDocument {
  const normalized = normalizeText(rawText);

  if (normalized.length < MIN_USABLE_CHARS) {
    return {
      text: normalized,
      chars: normalized.length,
      status: "failed",
      format,
      reason:
        format === "pdf"
          ? "No extractable text found — the file may be a scanned or image-only PDF."
          : "No extractable text found in the document."
    };
  }

  if (normalized.length > MAX_EXTRACTED_CHARS) {
    const text = normalized.slice(0, MAX_EXTRACTED_CHARS);
    return {
      text,
      chars: text.length,
      status: "partial",
      format,
      reason: `Document truncated to the first ${MAX_EXTRACTED_CHARS.toLocaleString()} characters for grading.`
    };
  }

  return { text: normalized, chars: normalized.length, status: "ok", format };
}

/**
 * Extract normalized text from an uploaded document. Never throws — binary
 * parser failures are caught and reported as a "failed" `ExtractedDocument`.
 */
export async function extractDocumentText(input: ExtractInput): Promise<ExtractedDocument> {
  const format = detectFormat(input.filename, input.mimeType);

  if (!input.buffer || input.buffer.byteLength === 0) {
    return { text: "", chars: 0, status: "failed", format, reason: "The uploaded file is empty." };
  }

  switch (format) {
    case "txt":
    case "md":
      return finalize(decodeUtf8(input.buffer), format);
    case "html":
      return finalize(stripHtml(decodeUtf8(input.buffer)), format);
    case "pdf":
    case "docx": {
      const parser = resolveParsers(input.parsers)[format];
      try {
        const raw = await parser(input.buffer);
        return finalize(raw, format);
      } catch (error) {
        return {
          text: "",
          chars: 0,
          status: "failed",
          format,
          reason: `Could not read ${format.toUpperCase()} content: ${
            error instanceof Error ? error.message : "unknown error"
          }`
        };
      }
    }
    default:
      return {
        text: "",
        chars: 0,
        status: "failed",
        format,
        reason: "Unsupported file type. Upload a PDF, DOCX, TXT, or Markdown document."
      };
  }
}
