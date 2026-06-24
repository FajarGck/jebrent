"use client";
// components/payments/payment-confirm.tsx — Dev B ONLY
// Tombol konfirmasi/tolak payment untuk admin/owner

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { confirmPayment, rejectPayment } from "@/actions/payments";
import { PaymentStatusBadge } from "./payment-status";
import type { Payment } from "@/types/database";

type PaymentConfirmProps = {
  payment: Payment;
};

export default function PaymentConfirm({ payment }: PaymentConfirmProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAction(
    action: string,
    fn: () => Promise<{ error?: string; success?: boolean }>
  ) {
    setError(null);
    setActiveAction(action);
    startTransition(async () => {
      const result = await fn();
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
      setActiveAction(null);
    });
  }

  const showActions = payment.status === "pending_confirmation";

  return (
    <div className="space-y-3">
      {/* Info payment */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted">Status</span>
          <PaymentStatusBadge status={payment.status} size="sm" />
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Jumlah</span>
          <span className="font-semibold">{formatCurrency(payment.amount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted">Metode</span>
          <span className="font-medium capitalize">
            {payment.payment_method.replace("_", " ")}
          </span>
        </div>
        {payment.paid_at && (
          <div className="flex justify-between">
            <span className="text-muted">Tanggal Bayar</span>
            <span className="font-medium">
              {new Date(payment.paid_at).toLocaleString("id-ID", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          </div>
        )}
      </div>

      {/* Preview bukti bayar */}
      {payment.proof_image_url && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted">Bukti Pembayaran</p>
          <a
            href={payment.proof_image_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block"
          >
            <div className="relative overflow-hidden rounded-xl border border-border">
              <img
                src={payment.proof_image_url}
                alt="Bukti pembayaran"
                className="max-h-48 w-full object-contain bg-white"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="inline-flex items-center gap-1 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-medium">
                  <ExternalLink className="h-3 w-3" />
                  Buka gambar
                </span>
              </div>
            </div>
          </a>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Action buttons */}
      {showActions && (
        <div className="flex gap-2">
          <button
            onClick={() => handleAction("confirm", () => confirmPayment(payment.id))}
            disabled={isPending}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-success px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-success/25 transition-all hover:opacity-90 disabled:opacity-50"
          >
            {activeAction === "confirm" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Konfirmasi
          </button>
          <button
            onClick={() => handleAction("reject", () => rejectPayment(payment.id))}
            disabled={isPending}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
          >
            {activeAction === "reject" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Tolak
          </button>
        </div>
      )}

      {/* Status confirmed */}
      {payment.status === "confirmed" && payment.confirmed_at && (
        <div className="rounded-xl bg-success/5 border border-success/20 px-3 py-2 text-xs text-success">
          Dikonfirmasi pada{" "}
          {new Date(payment.confirmed_at).toLocaleString("id-ID", {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </div>
      )}
    </div>
  );
}
