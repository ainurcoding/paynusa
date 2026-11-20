# Membuat database dan user per service di container PostgreSQL yang sudah berjalan.
# Jalankan dari folder root repo:
#   powershell -File infra/postgres/setup.ps1
#
# Password dibuat acak dan hanya ditampilkan SEKALI di layar. Salin ke file
# .env masing-masing service (file .env tidak boleh masuk repo). Menjalankan
# ulang skrip ini tidak mengubah role yang sudah ada, jadi password lama tetap
# berlaku dan password baru yang tercetak TIDAK dipakai.

param(
    [string]$Container = "paynusa-postgres",
    [string]$AdminUser = "postgres"
)

$ErrorActionPreference = "Stop"
$services = @("auth", "wallet", "transaction", "audit")
$psqlVars = @()
$passwords = @{}

$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
foreach ($s in $services) {
    $bytes = New-Object byte[] 24
    $rng.GetBytes($bytes)
    $pw = [Convert]::ToBase64String($bytes).Replace("+", "a").Replace("/", "b").Replace("=", "")
    $passwords[$s] = $pw
    $psqlVars += "-v"
    $psqlVars += "${s}_pw=$pw"
}

$sql = Join-Path $PSScriptRoot "create-databases.sql"
Get-Content -Raw $sql | podman exec -i $Container psql -U $AdminUser -v ON_ERROR_STOP=1 @psqlVars
if ($LASTEXITCODE -ne 0) { throw "psql gagal (kode $LASTEXITCODE)" }

Write-Host ""
Write-Host "Selesai. Salin baris berikut ke file .env service terkait (hanya valid untuk role yang baru dibuat):"
foreach ($s in $services) {
    Write-Host "  ${s}: postgres://${s}_user:$($passwords[$s])@localhost:5432/${s}_db"
}
Write-Host "  wallet (tes): postgres://wallet_user:$($passwords['wallet'])@localhost:5432/wallet_test_db"
