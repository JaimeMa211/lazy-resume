"use client";

import { useEffect, useState } from "react";

import {
  getCurrentSession,
  setCurrentPlan,
  subscribeAuthChange,
  type AuthSession,
} from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type RedeemCodeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type RedeemCodeResponse = {
  error?: string;
  plan?: "monthly" | "yearly" | "buyout";
  description?: string;
};

export default function RedeemCodeDialog({ open, onOpenChange }: RedeemCodeDialogProps) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSession(getCurrentSession());

    return subscribeAuthChange(() => {
      setSession(getCurrentSession());
    });
  }, []);

  const handleRedeem = async () => {
    if (!session) {
      setError("请先登录后再兑换");
      return;
    }

    if (!code.trim()) {
      setError("请输入兑换码");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/redeem-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      const payload = (await response.json().catch(() => null)) as RedeemCodeResponse | null;
      if (!response.ok || !payload?.plan || !payload.description) {
        setError(payload?.error ?? "兑换失败，请稍后重试");
        return;
      }

      const result = await setCurrentPlan(payload.plan);
      if (!result) {
        setError("兑换失败，请稍后重试");
        return;
      }

      setSuccess(`兑换成功，您已升级为 ${payload.description}`);
      setTimeout(() => {
        onOpenChange(false);
      }, 1500);
    } catch {
      setError("兑换失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={() => onOpenChange(false)} />
      <div className="relative z-10 w-full max-w-sm rounded-2xl bg-white px-6 py-8 shadow-xl">
        <h2 className="text-xl font-bold text-slate-900">输入兑换码</h2>
        <p className="mt-2 text-sm text-slate-500">请输入您获得的兑换码</p>

        <input
          type="text"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError("");
            setSuccess("");
          }}
          placeholder="请输入兑换码"
          className={cn(
            "mt-6 w-full rounded-xl border border-stone-200 px-4 py-3 text-center text-lg font-mono uppercase tracking-wider",
            "placeholder:text-stone-300 placeholder:normal-case placeholder:tracking-normal",
            "focus:border-[#b85c2c] focus:outline-none focus:ring-2 focus:ring-[#b85c2c]/20",
          )}
          disabled={loading}
        />

        {error && <p className="mt-3 text-sm font-medium text-red-500">{error}</p>}
        {success && <p className="mt-3 text-sm font-medium text-green-600">{success}</p>}

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => onOpenChange(false)}
            className="flex-1 rounded-xl border border-stone-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-stone-50"
            disabled={loading}
          >
            取消
          </button>
          <button
            onClick={handleRedeem}
            disabled={loading || !code.trim()}
            className={cn(
              "flex-1 rounded-xl bg-[#b85c2c] py-3 text-sm font-semibold text-white transition",
              "hover:bg-[#9f4d24]",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {loading ? "兑换中..." : "立即兑换"}
          </button>
        </div>
      </div>
    </div>
  );
}
