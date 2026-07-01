export function translateError(message: string | null | undefined): string {
  if (!message) return 'Terjadi kesalahan yang tidak diketahui';
  const msg = message.toLowerCase();

  if (msg.includes('invalid login credentials') || msg.includes('invalid credentials') || msg.includes('invalid login')) {
    return 'Email atau kata sandi salah. Silakan periksa kembali.';
  }
  if (msg.includes('user already registered') || msg.includes('already exists') || msg.includes('email already in use')) {
    return 'Email sudah terdaftar. Silakan gunakan email lain atau masuk ke akun Anda.';
  }
  if (msg.includes('email not confirmed') || msg.includes('email_not_confirmed')) {
    return 'Email belum dikonfirmasi. Silakan verifikasi email Anda terlebih dahulu.';
  }
  if (msg.includes('password should be at least')) {
    return 'Kata sandi minimal harus terdiri dari 6 karakter.';
  }
  if (msg.includes('invalid email')) {
    return 'Format email tidak valid.';
  }
  if (msg.includes('unauthorized') || msg.includes('jwt expired') || msg.includes('session expired') || msg === 'unauthorized') {
    return 'Sesi Anda telah berakhir. Silakan masuk kembali.';
  }
  if (msg.includes('row-level security') || msg.includes('permission denied')) {
    return 'Akses ditolak. Anda tidak memiliki izin untuk melakukan tindakan ini.';
  }

  return message;
}
