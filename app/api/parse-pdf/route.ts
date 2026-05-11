import { createRequire } from "node:module";
import { NextResponse } from "next/server";

import { PDF_MACHINE_READABLE_END, PDF_MACHINE_READABLE_START } from "@/lib/pdf-machine-readable";

export const runtime = "nodejs";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse/lib/pdf-parse.js") as (dataBuffer: Buffer) => Promise<{ text?: string }>;

function isPdfBuffer(buffer: Buffer) {
  return buffer.length >= 4 && buffer.subarray(0, 4).toString("utf8") === "%PDF";
}

async function parseWithPdfParse(buffer: Buffer) {
  const parsed = await pdfParse(buffer);
  return (parsed.text ?? "").trim();
}

async function parseWithPdfJs(buffer: Buffer) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
  const doc = await loadingTask.promise;

  try {
    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= doc.numPages; pageNum += 1) {
      const page = await doc.getPage(pageNum);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => {
          if ("str" in item && typeof item.str === "string") {
            return item.str;
          }
          return "";
        })
        .join(" ")
        .trim();

      if (text) {
        pageTexts.push(text);
      }
    }

    return pageTexts.join("\n\n").trim();
  } finally {
    await doc.destroy();
  }
}

function extractMachineReadableText(text: string) {
  const start = text.indexOf(PDF_MACHINE_READABLE_START);
  if (start === -1) {
    return "";
  }

  const payloadStart = start + PDF_MACHINE_READABLE_START.length;
  const end = text.indexOf(PDF_MACHINE_READABLE_END, payloadStart);
  if (end === -1) {
    return "";
  }

  const payload = text
    .slice(payloadStart, end)
    .replace(/[^A-Za-z0-9+/=]/g, "")
    .trim();

  if (!payload) {
    return "";
  }

  try {
    return Buffer.from(payload, "base64").toString("utf8").trim();
  } catch {
    return "";
  }
}

function scoreExtractedText(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }

  const signalChars = (trimmed.match(/[A-Za-z0-9\u4E00-\u9FFF]/g) ?? []).length;
  const lineCount = trimmed.split(/\n+/).filter(Boolean).length;

  return signalChars + lineCount * 8;
}

function normalizeExtractedText(text: string) {
  const embeddedText = extractMachineReadableText(text);
  const normalized = (embeddedText || text).trim();

  return {
    text: normalized,
    hasEmbeddedText: Boolean(embeddedText),
    score: scoreExtractedText(normalized),
  };
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "Missing PDF file in form field 'file'." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (!isPdfBuffer(buffer)) {
      return NextResponse.json({ error: "文件不是有效 PDF（缺少 %PDF 文件头）。" }, { status: 400 });
    }

    let primaryError: unknown = null;
    let fallbackError: unknown = null;
    const candidates: Array<{ text: string; score: number; hasEmbeddedText: boolean }> = [];

    try {
      const parsed = normalizeExtractedText(await parseWithPdfParse(buffer));
      if (parsed.text) {
        candidates.push(parsed);
      }
    } catch (error) {
      primaryError = error;
    }

    try {
      const parsed = normalizeExtractedText(await parseWithPdfJs(buffer));
      if (parsed.text) {
        candidates.push(parsed);
      }
    } catch (error) {
      fallbackError = error;
    }

    const bestCandidate = [...candidates].sort((left, right) => {
      if (left.hasEmbeddedText !== right.hasEmbeddedText) {
        return Number(right.hasEmbeddedText) - Number(left.hasEmbeddedText);
      }

      return right.score - left.score;
    })[0];

    if (!bestCandidate?.text.trim()) {
      if (primaryError || fallbackError) {
        const first = primaryError ? toErrorMessage(primaryError) : "unknown";
        const second = fallbackError ? toErrorMessage(fallbackError) : "unknown";

        return NextResponse.json(
          {
            error:
              `PDF 解析失败。可能原因：文件损坏/加密，或该 PDF 为扫描件图片无可提取文本。` +
              ` primary=${first}; fallback=${second}`,
          },
          { status: 422 },
        );
      }

      return NextResponse.json(
        {
          error: "未从 PDF 中提取到文本。该文件可能是扫描件图片版，建议先用 OCR 后再上传。",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({ text: bestCandidate.text });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to parse PDF.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
