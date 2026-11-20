// Memuat .env jika ada (di CI, variabel sudah diberikan lewat environment).
try {
  process.loadEnvFile('.env');
} catch {
  // tidak ada file .env, tidak masalah
}
