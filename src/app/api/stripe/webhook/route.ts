import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  // Stripe webhook handler - implementation pending
  return NextResponse.json({ received: true });
}
