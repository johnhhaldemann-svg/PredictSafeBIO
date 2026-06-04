/**
 * GET /api/reports/assessment/[id]?format=pdf|docx
 *
 * Generates a professional Risk Assessment report.
 * Requires: authenticated org member with access to the assessment.
 */

import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { AssessmentReportPDF } from "@/lib/reports/pdf-assessment";
import { buildAssessmentDocx } from "@/lib/reports/docx-builder";
import { getAssessmentReportData } from "@/lib/reports/report-service";

export const dynamic = "force-dynamic";

function asResponseBody(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const format = req.nextUrl.searchParams.get("format") ?? "pdf";

  if (!["pdf", "docx"].includes(format)) {
    return NextResponse.json({ error: "format must be pdf or docx" }, { status: 400 });
  }

  const data = await getAssessmentReportData(id);
  if (!data) {
    return NextResponse.json({ error: "Assessment not found or unauthorised" }, { status: 404 });
  }

  const safeName = data.workflow.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 60);
  const timestamp = new Date().toISOString().slice(0, 10);

  if (format === "docx") {
    const buffer = await buildAssessmentDocx(data);
    return new NextResponse(asResponseBody(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${safeName}-${timestamp}.docx"`,
        "Cache-Control": "no-store",
        "X-Report-Type": "assessment",
        "X-Report-Format": "docx",
        "X-Report-Status": "draft",
      },
    });
  }

  // PDF
  const pdfBuffer = await renderToBuffer(
    React.createElement(AssessmentReportPDF, { data }) as Parameters<typeof renderToBuffer>[0]
  );

  return new NextResponse(asResponseBody(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}-${timestamp}.pdf"`,
      "Cache-Control": "no-store",
      "X-Report-Type": "assessment",
      "X-Report-Format": "pdf",
      "X-Report-Status": "draft",
    },
  });
}
