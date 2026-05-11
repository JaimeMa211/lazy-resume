import { NextResponse } from "next/server";

import { verifyRedeemCode } from "@/lib/redeem-codes.server";

export const runtime = "nodejs";

type RedeemRequestBody = {
  code?: string;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as RedeemRequestBody | null;

  if (!body) {
    return NextResponse.json({ error: "请求体格式不正确" }, { status: 400 });
  }

  const code = typeof body.code === "string" ? body.code : "";
  if (!code.trim()) {
    return NextResponse.json({ error: "请输入兑换码" }, { status: 400 });
  }

  const entry = verifyRedeemCode(code);
  if (!entry) {
    return NextResponse.json({ error: "兑换码无效，请检查后重试" }, { status: 400 });
  }

  return NextResponse.json({
    plan: entry.plan,
    description: entry.description,
  });
}
