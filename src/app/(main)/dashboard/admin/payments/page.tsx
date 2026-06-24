import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getAllPayments } from "@/lib/db/payments";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PaymentStatusBadge } from "@/components/payments/payment-status";
import { CreditCard, ArrowLeft } from "lucide-react";
import type { Profile, PaymentStatus } from "@/types/database";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Kelola Pembayaran — Admin Jebrent",
  description: "Konfirmasi dan kelola semua pembayaran masuk",
};

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  // Auth + role check
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  const profile = data as Profile | null;
  if (!profile || profile.role !== "admin") redirect("/dashboard");

  const payments = await getAllPayments();
  const { status: filterStatus } = await searchParams;

  // Filter berdasarkan tab
  const filtered = filterStatus && filterStatus !== "all"
    ? payments.filter((p) => p.status === filterStatus)
    : payments;

  // Tab counts
  const tabs: { value: string; label: string; count: number }[] = [
    { value: "all", label: "Semua", count: payments.length },
    { value: "pending_confirmation", label: "Menunggu Konfirmasi", count: payments.filter((p) => p.status === "pending_confirmation").length },
    { value: "confirmed", label: "Terkonfirmasi", count: payments.filter((p) => p.status === "confirmed").length },
    { value: "unpaid", label: "Belum Dibayar", count: payments.filter((p) => p.status === "unpaid").length },
    { value: "refunded", label: "Dikembalikan", count: payments.filter((p) => p.status === "refunded").length },
  ];

  const activeTab = filterStatus || "all";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/admin"
          className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-primary mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard Admin
        </Link>
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <CreditCard className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Kelola Pembayaran</h1>
            <p className="text-sm text-muted">
              {payments.filter((p) => p.status === "pending_confirmation").length} pembayaran menunggu konfirmasi
            </p>
          </div>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1">
        {tabs.map((tab) => (
          <Link
            key={tab.value}
            href={`/dashboard/admin/payments${tab.value !== "all" ? `?status=${tab.value}` : ""}`}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab.value
                ? "bg-primary text-primary-fg"
                : "text-muted hover:text-foreground hover:bg-card-muted"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                activeTab === tab.value ? "bg-white/20" : "bg-card-muted"
              }`}>
                {tab.count}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* Payment list */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center">
          <CreditCard className="mx-auto h-10 w-10 text-subtle" />
          <p className="mt-3 text-sm text-muted">Tidak ada pembayaran untuk filter ini</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((payment) => {
            const booking = payment.bookings;
            const vehicle = booking?.vehicles;
            const renter = booking?.profiles;

            return (
              <Link
                key={payment.id}
                href={`/bookings/${payment.booking_id}`}
                className="block rounded-2xl border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">
                        {vehicle ? `${vehicle.brand} ${vehicle.model}` : "—"}
                      </p>
                      <PaymentStatusBadge status={payment.status as PaymentStatus} size="sm" />
                    </div>
                    <p className="mt-0.5 text-xs text-muted">
                      {renter?.full_name ?? "—"} • {vehicle?.plate_number ?? "—"}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {payment.paid_at
                        ? `Dibayar: ${new Date(payment.paid_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}`
                        : `Dibuat: ${new Date(payment.created_at).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-primary">
                      {formatCurrency(payment.amount)}
                    </p>
                    <p className="text-xs text-muted capitalize">
                      {payment.payment_method.replace("_", " ")}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
