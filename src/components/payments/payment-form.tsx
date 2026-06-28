"use client";
// components/payments/payment-form.tsx — Dev B ONLY
// Form upload bukti bayar untuk penyewa

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, X, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { uploadPaymentProof } from "@/actions/payments";
import type { PaymentMethod } from "@/types/database";

type PaymentFormProps = {
  bookingId: string;
  totalPrice: number;
  paymentType?: 'dp' | 'final' | 'fine';
};

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "bank_transfer", label: "Transfer Bank" },
  { value: "ewallet", label: "E-Wallet" },
  { value: "cash", label: "Tunai" },
];

export default function PaymentForm({ bookingId, totalPrice, paymentType = 'dp' }: PaymentFormProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleFile(f: File) {
    setError(null);
    if (!["image/jpeg", "image/png", "image/webp"].includes(f.type)) {
      setError("Format file harus JPG, PNG, atau WebP");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("Ukuran file maksimal 5MB");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function removeFile() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
  }

  function handleSubmit() {
    if (!file) {
      setError("Bukti pembayaran wajib diupload");
      return;
    }

    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("booking_id", bookingId);
      formData.set("payment_method", method);
      formData.set("proof_file", file);
      formData.set("payment_type", paymentType);
      if (paymentType === 'fine') {
        formData.set("amount", totalPrice.toString());
      }

      const result = await uploadPaymentProof(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        router.refresh();
      }
    });
  }

  // Tampilkan pesan sukses
  if (success) {
    return (
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Bukti pembayaran berhasil diupload!</p>
          <p className="text-xs mt-0.5 opacity-80">
            Menunggu konfirmasi dari pemilik kendaraan atau admin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4 rounded-xl border border-border bg-card-muted p-4">
      <p className="text-sm font-semibold">Upload Bukti Pembayaran</p>

      {/* Total yang harus dibayar */}
      <div className="flex justify-between text-sm">
        <span className="text-muted">Total Pembayaran</span>
        <span className="font-bold text-primary">{formatCurrency(totalPrice)}</span>
      </div>

      {/* Pilih metode */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted">Metode Pembayaran</label>
        <div className="flex gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMethod(m.value)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                method === m.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted hover:border-primary/30"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Upload area */}
      {!file ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
          }}
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-border p-6 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
        >
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Upload className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium">Klik atau seret bukti transfer</p>
            <p className="mt-0.5 text-xs text-muted">JPG, PNG, WebP • Maks 5MB</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </div>
      ) : (
        <div className="relative">
          <img
            src={preview!}
            alt="Bukti pembayaran"
            className="max-h-48 w-full rounded-xl border border-border object-contain bg-white"
          />
          <button
            type="button"
            onClick={removeFile}
            className="absolute right-2 top-2 rounded-lg bg-white/90 p-1 text-danger shadow-sm transition-colors hover:bg-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || !file}
        className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg shadow-lg shadow-primary/25 transition-all hover:bg-primary-hover disabled:opacity-50"
      >
        {isPending ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Mengupload...
          </span>
        ) : (
          "Kirim Bukti Pembayaran"
        )}
      </button>
    </div>
  );
}
