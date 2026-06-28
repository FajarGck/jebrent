import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import ProfileForm from '@/components/dashboard/profile-form';
import type { Metadata } from 'next';
import type { Profile } from '@/types/database';

export const metadata: Metadata = {
  title: 'Profil Saya — Jebrent',
  description: 'Kelola data profil dan verifikasi identitas Anda',
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?redirect=/dashboard/profile');
  }

  // Ambil data profile dari DB
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profil Saya</h1>
        <p className="mt-1 text-sm text-muted">
          Kelola informasi data pribadi dan verifikasi akun Anda
        </p>
      </div>

      <ProfileForm profile={profile as Profile} />
    </div>
  );
}
