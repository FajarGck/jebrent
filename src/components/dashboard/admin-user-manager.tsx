'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createUserByAdminAction, verifyUserKtpAction, editUserByAdminAction, deleteUserByAdminAction } from '@/actions/auth';
import { Users, PlusCircle, Loader2, AlertCircle, CheckCircle2, User, Phone, Tag, Eye, Check, X, Edit2, Trash2 } from 'lucide-react';
import type { Profile, UserRole } from '@/types/database';

type AdminUserManagerProps = {
  profiles: Profile[];
};

export default function AdminUserManager({ profiles }: AdminUserManagerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<UserRole>('owner');
  
  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [phone, setPhone] = useState('');

  const filteredProfiles = profiles.filter((p) => p.role === activeTab);

  function handleKtpVerify(userId: string, status: 'verified' | 'rejected') {
    setVerifyError(null);
    startTransition(async () => {
      const res = await verifyUserKtpAction(userId, status);
      if (res.error) {
        setVerifyError(res.error);
      } else {
        router.refresh();
      }
    });
  }

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editPhone, setEditPhone] = useState('');

  function startEditing(profile: Profile) {
    setEditingUserId(profile.id);
    setEditFullName(profile.full_name || '');
    setEditPhone(profile.phone || '');
  }

  function handleEditSubmit(userId: string) {
    if (!editFullName.trim()) {
      setError('Nama lengkap wajib diisi');
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await editUserByAdminAction(userId, editFullName, editPhone);
      if (res.error) {
        setError(res.error);
      } else {
        setEditingUserId(null);
        router.refresh();
      }
    });
  }

  function handleDelete(userId: string) {
    if (!confirm('Apakah Anda yakin ingin menghapus pengguna ini secara permanen? Seluruh data sewa/booking terkait akan ikut terhapus.')) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await deleteUserByAdminAction(userId);
      if (res.error) {
        setError(res.error);
      } else {
        router.refresh();
      }
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (activeTab === 'driver' && !phone) {
      setError('Nomor WhatsApp wajib diisi untuk Pengantar');
      return;
    }

    const formData = new FormData();
    formData.set('email', email);
    formData.set('password', password);
    formData.set('full_name', fullName);
    formData.set('phone', phone);
    formData.set('role', activeTab);

    startTransition(async () => {
      const res = await createUserByAdminAction(formData);
      if (res.error) {
        setError(res.error);
      } else {
        setSuccess(true);
        setEmail('');
        setPassword('');
        setFullName('');
        setPhone('');
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-1.5 border-b border-border pb-3 overflow-x-auto">
        {(['owner', 'driver', 'admin', 'renter'] as UserRole[]).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setError(null);
              setSuccess(false);
              setEditingUserId(null);
            }}
            className={`rounded-xl px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-all ${
              activeTab === tab
                ? 'bg-primary text-primary-fg shadow-md'
                : 'text-muted hover:bg-card-muted'
            }`}
          >
            {tab === 'owner' ? 'Pemilik (Owner)' : tab === 'driver' ? 'Pengantar (Driver)' : tab === 'admin' ? 'Admin' : 'Penyewa (Renter)'}
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Side: Users List (Col span 2) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <h3 className="font-bold text-sm flex items-center gap-1.5 border-b border-border pb-2 capitalize">
              <Users className="h-4 w-4 text-muted" /> Daftar Pengguna: {activeTab === 'owner' ? 'Pemilik' : activeTab === 'driver' ? 'Pengantar' : activeTab === 'admin' ? 'Admin' : 'Penyewa'}
            </h3>
            
            {verifyError && (
              <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-2.5 text-xs text-danger mb-3">
                {verifyError}
              </div>
            )}

            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {filteredProfiles.length === 0 ? (
                <p className="text-xs text-muted text-center py-8">Belum ada data untuk kategori ini.</p>
              ) : (
                filteredProfiles.map((p) => {
                  const isRenterProfile = p.role === 'renter';
                  const verificationStatus = (p as any).verification_status || 'unverified';
                  const ktpUrl = (p as any).ktp_url;
                  const isEditing = editingUserId === p.id;

                  return (
                    <div key={p.id} className="p-3.5 rounded-xl border border-border bg-card-muted flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      {isEditing ? (
                        <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <input
                            type="text"
                            value={editFullName}
                            onChange={(e) => setEditFullName(e.target.value)}
                            placeholder="Nama Lengkap"
                            className="flex-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs transition-colors focus:border-primary focus:outline-none"
                          />
                          <input
                            type="text"
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            placeholder="No WhatsApp / Telepon"
                            className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs transition-colors focus:border-primary focus:outline-none w-full sm:w-44"
                          />
                          <div className="flex gap-1.5 shrink-0 justify-end">
                            <button
                              onClick={() => handleEditSubmit(p.id)}
                              disabled={isPending}
                              title="Simpan"
                              className="p-1.5 rounded-lg bg-success text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                            >
                              {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                            </button>
                            <button
                              onClick={() => setEditingUserId(null)}
                              disabled={isPending}
                              title="Batal"
                              className="p-1.5 rounded-lg bg-subtle/10 text-muted hover:bg-subtle/20 transition-colors disabled:opacity-50"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <div className="rounded-full bg-primary/10 p-2 text-primary shrink-0">
                              <User className="h-4 w-4" />
                            </div>
                            <div className="space-y-0.5">
                              <h4 className="font-bold text-xs">{p.full_name || 'N/A'}</h4>
                              <p className="text-[10px] text-muted font-mono">{p.id.slice(0, 8).toUpperCase()}</p>
                              {isRenterProfile && (
                                <p className="text-[10px] text-muted">
                                  NIK: <span className="font-semibold text-foreground">{p.nik || 'Belum diisi'}</span>
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <div className="flex items-center gap-1.5 flex-wrap justify-end">
                              {isRenterProfile && (
                                <span className={`inline-flex items-center text-[9px] px-2 py-0.5 rounded-full font-medium border ${
                                  verificationStatus === 'verified' ? 'bg-success/15 text-success border-success/30' :
                                  verificationStatus === 'pending' ? 'bg-warning/15 text-warning border-warning/30' :
                                  verificationStatus === 'rejected' ? 'bg-danger/15 text-danger border-danger/30' :
                                  'bg-card border-border text-muted'
                                }`}>
                                  {verificationStatus === 'verified' ? 'Terverifikasi' :
                                   verificationStatus === 'pending' ? 'Menunggu Verifikasi' :
                                   verificationStatus === 'rejected' ? 'Ditolak' : 'Belum Upload KTP'}
                                </span>
                              )}
                              <span className="inline-flex items-center gap-1 text-[9px] bg-card border border-border px-2 py-0.5 rounded-full text-muted">
                                <Tag className="h-3 w-3" /> {p.role.toUpperCase()}
                              </span>
                            </div>
                            {p.phone && (
                              <p className="flex items-center gap-1 text-[10px] text-muted justify-end">
                                <Phone className="h-3 w-3" /> {p.phone}
                              </p>
                            )}
                            {/* KTP Document View */}
                            {isRenterProfile && ktpUrl && (
                              <div className="flex items-center gap-2 mt-1">
                                <a href={ktpUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-semibold">
                                  <Eye className="h-3 w-3" /> Lihat KTP
                                </a>
                                {verificationStatus === 'pending' && (
                                  <div className="flex items-center gap-1 ml-2">
                                    <button
                                      onClick={() => handleKtpVerify(p.id, 'verified')}
                                      disabled={isPending}
                                      title="Setujui Verifikasi"
                                      className="p-1 rounded-md bg-success/20 text-success hover:bg-success/35 transition-colors disabled:opacity-50"
                                    >
                                      <Check className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => handleKtpVerify(p.id, 'rejected')}
                                      disabled={isPending}
                                      title="Tolak Verifikasi"
                                      className="p-1 rounded-md bg-danger/20 text-danger hover:bg-danger/35 transition-colors disabled:opacity-50"
                                    >
                                      <X className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Edit / Delete actions for admin-managed users */}
                            {p.role !== 'admin' && (
                              <div className="flex items-center gap-2 mt-1.5">
                                <button
                                  onClick={() => startEditing(p)}
                                  disabled={isPending}
                                  title="Edit Pengguna"
                                  className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline font-semibold"
                                >
                                  <Edit2 className="h-3 w-3" /> Edit
                                </button>
                                <span className="text-[10px] text-border">|</span>
                                <button
                                  onClick={() => handleDelete(p.id)}
                                  disabled={isPending}
                                  title="Hapus Pengguna"
                                  className="inline-flex items-center gap-1 text-[10px] text-danger hover:underline font-semibold"
                                >
                                  <Trash2 className="h-3 w-3" /> Hapus
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Create Form (Only for owner/admin tabs) */}
        <div>
          {activeTab !== 'renter' ? (
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <h3 className="font-bold text-sm flex items-center gap-1.5 border-b border-border pb-2">
                <PlusCircle className="h-4 w-4 text-muted" /> Tambah {activeTab === 'owner' ? 'Pemilik' : activeTab === 'driver' ? 'Pengantar (Driver)' : 'Admin'} Baru
              </h3>
              
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs transition-colors focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted">
                    No. WhatsApp / Telepon {activeTab === 'driver' ? '(Wajib)' : '(Opsional)'}
                  </label>
                  <input
                    type="tel"
                    required={activeTab === 'driver'}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Contoh: 0812xxxxxxxx"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs transition-colors focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="budi@email.com"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs transition-colors focus:border-primary focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs transition-colors focus:border-primary focus:outline-none"
                  />
                </div>

                {error && (
                  <div className="flex items-start gap-1.5 rounded-xl border border-danger/30 bg-danger/5 p-2 text-xs text-danger">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {success && (
                  <div className="flex items-start gap-1.5 rounded-xl border border-success/30 bg-success/5 p-2 text-xs text-success">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Registrasi berhasil ditambahkan!</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary py-2.5 text-xs font-bold text-primary-fg shadow-md transition-all hover:bg-primary-hover disabled:opacity-50"
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Daftarkan Akun
                </button>
              </form>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-5 text-center text-muted">
              <Users className="mx-auto h-8 w-8 text-subtle mb-2" />
              <h4 className="text-xs font-bold">Informasi Akun Penyewa</h4>
              <p className="text-[11px] mt-1.5 leading-relaxed">
                Akun dengan hak akses Penyewa (Renter) terdaftar secara mandiri melalui menu registrasi publik. Admin hanya memiliki izin untuk memantau data profil penyewa saja.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
