'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfileAction } from '@/actions/auth';
import { User, Phone, ShieldCheck, ShieldAlert, Loader2, Upload, FileCheck } from 'lucide-react';
import type { Profile } from '@/types/database';

type ProfileFormProps = {
  profile: Profile;
};

export default function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [ktpFile, setKtpFile] = useState<File | null>(null);
  const [ktpPreview, setKtpPreview] = useState<string | null>(null);

  const verificationStatus = (profile as any).verification_status || 'unverified';
  const isRenter = profile.role === 'renter';

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Format file KTP harus JPG, PNG, atau WebP');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran file KTP maksimal 5MB');
      return;
    }

    if (ktpPreview) URL.revokeObjectURL(ktpPreview);
    setKtpFile(file);
    setKtpPreview(URL.createObjectURL(file));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    if (ktpFile) {
      formData.set('ktp_file', ktpFile);
    }

    startTransition(async () => {
      const result = await updateProfileAction(formData);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        router.refresh();
      }
    });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Verification Status Alert for Renter */}
      {isRenter && (
        <div className="rounded-2xl border border-border bg-card p-5 shadow-xs">
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">Status Verifikasi Identitas (KTP)</h3>
          {verificationStatus === 'verified' && (
            <div className="flex items-start gap-3 rounded-xl bg-success/5 border border-success/20 p-4 text-success">
              <ShieldCheck className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Akun Terverifikasi</p>
                <p className="text-xs text-success/80 mt-0.5">NIK dan KTP Anda telah diverifikasi oleh admin. Anda memiliki akses penuh untuk melakukan penyewaan kendaraan.</p>
              </div>
            </div>
          )}
          {verificationStatus === 'pending' && (
            <div className="flex items-start gap-3 rounded-xl bg-warning/5 border border-warning/20 p-4 text-warning">
              <Loader2 className="h-5 w-5 shrink-0 mt-0.5 animate-spin" />
              <div>
                <p className="font-semibold text-sm">Menunggu Verifikasi</p>
                <p className="text-xs text-warning/80 mt-0.5">Dokumen KTP Anda sedang ditinjau oleh Admin. Proses ini biasanya memakan waktu maksimal 1x24 jam.</p>
              </div>
            </div>
          )}
          {verificationStatus === 'rejected' && (
            <div className="flex items-start gap-3 rounded-xl bg-danger/5 border border-danger/20 p-4 text-danger">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm">Verifikasi Ditolak</p>
                <p className="text-xs text-danger/80 mt-0.5">
                  Verifikasi dokumen KTP Anda ditolak oleh admin. Silakan periksa kembali kecocokan NIK dengan nama lengkap Anda, lalu unggah ulang foto KTP yang jelas.
                </p>
              </div>
            </div>
          )}
          {verificationStatus === 'unverified' && (
            <div className="flex items-start gap-3 rounded-xl bg-card-muted p-4 text-muted border border-border">
              <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-sm text-foreground">Belum Terverifikasi</p>
                <p className="text-xs text-muted mt-0.5">Untuk dapat melakukan sewa kendaraan di Jebrent, Anda wajib mengupload foto KTP dan memasukkan NIK 16 digit yang valid.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Profile Form */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-xl font-bold tracking-tight mb-6">Informasi Profil</h2>
        {error && <div className="mb-6 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>}
        {success && <div className="mb-6 rounded-xl border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">Profil Anda berhasil diperbarui!</div>}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Full Name */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="full_name" className="text-sm font-semibold text-muted uppercase tracking-wide">
                Nama Lengkap
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  required
                  defaultValue={profile.full_name}
                  disabled={isPending}
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-11 pr-4 text-sm transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone" className="text-sm font-semibold text-muted uppercase tracking-wide">
                No. Telepon
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={profile.phone || ''}
                  disabled={isPending}
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-11 pr-4 text-sm transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>
            </div>

            {/* Emergency Phone */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="emergency_phone" className="text-sm font-semibold text-muted uppercase tracking-wide">
                No. Telepon Darurat
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
                <input
                  id="emergency_phone"
                  name="emergency_phone"
                  type="tel"
                  defaultValue={profile.emergency_phone || ''}
                  disabled={isPending}
                  className="w-full rounded-xl border border-border bg-background py-2.5 pl-11 pr-4 text-sm transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                />
              </div>
            </div>

            {/* NIK (Renter Only) */}
            {isRenter && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="nik" className="text-sm font-semibold text-muted uppercase tracking-wide">
                  NIK (16 Digit)
                </label>
                <input
                  id="nik"
                  name="nik"
                  type="text"
                  maxLength={16}
                  minLength={16}
                  placeholder="32xxxxxxxxxxxxxx"
                  defaultValue={profile.nik || ''}
                  disabled={isPending || verificationStatus === 'verified'}
                  className="w-full rounded-xl border border-border bg-background py-2.5 px-4 text-sm transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none disabled:bg-card-muted disabled:text-subtle"
                />
              </div>
            )}
          </div>

          {/* KTP Image Upload Zone (Renter Only - if not verified) */}
          {isRenter && verificationStatus !== 'verified' && (
            <div className="flex flex-col gap-1.5 border-t border-border pt-6">
              <label className="text-sm font-semibold text-muted uppercase tracking-wide">Upload Foto KTP</label>
              <div className="grid gap-4 sm:grid-cols-2 items-center">
                {/* Upload Zone */}
                <div
                  onClick={() => document.getElementById('ktp_file_input')?.click()}
                  className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-border p-6 text-center transition-all hover:border-primary/40 hover:bg-primary/5 min-h-36"
                >
                  <Upload className="h-6 w-6 text-primary" />
                  <div>
                    <p className="text-xs font-semibold text-foreground">Klik untuk upload KTP</p>
                    <p className="text-[10px] text-muted mt-1">Format: JPG, PNG, WebP (Maksimal 5MB)</p>
                  </div>
                  <input id="ktp_file_input" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} disabled={isPending} />
                </div>

                {/* Preview / Current File */}
                <div className="rounded-2xl border border-border bg-card-muted/50 p-4 flex flex-col justify-center items-center min-h-36">
                  {ktpPreview ? (
                    <div className="space-y-2 w-full text-center">
                      <p className="text-[10px] font-semibold text-success flex items-center justify-center gap-1">
                        <FileCheck className="h-3.5 w-3.5" /> File terpilih (siap dikirim)
                      </p>
                      <img src={ktpPreview} alt="Preview KTP" className="max-h-24 mx-auto rounded-lg object-contain border border-border bg-white" />
                    </div>
                  ) : (profile as any).ktp_url ? (
                    <div className="space-y-2 w-full text-center">
                      <p className="text-[10px] font-semibold text-muted">KTP Terunggah Saat Ini</p>
                      <img src={(profile as any).ktp_url} alt="KTP Terunggah" className="max-h-24 mx-auto rounded-lg object-contain border border-border bg-white" />
                    </div>
                  ) : (
                    <p className="text-xs text-muted italic">Belum ada foto KTP terpilih.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="border-t border-border pt-6 flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-fg shadow-lg shadow-primary/25 transition-all hover:bg-primary-hover disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Menyimpan...
                </>
              ) : (
                'Simpan Perubahan'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
