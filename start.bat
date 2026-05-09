@echo off
title AideaCreative - Dev Server
color 0A

echo ============================================
echo   AideaCreative Studio Foto - Local Dev
echo ============================================
echo.

:: Cek apakah pnpm tersedia
where pnpm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] pnpm tidak ditemukan!
    echo Jalankan dulu: npm install -g pnpm
    echo.
    pause
    exit /b 1
)

:: Cek apakah node_modules sudah ada
if not exist "node_modules\" (
    echo [INFO] Menginstall dependencies...
    pnpm install
    if %errorlevel% neq 0 (
        echo [ERROR] Install gagal. Cek koneksi internet.
        pause
        exit /b 1
    )
    echo.
)

:: Cek apakah .env ada di api-server
if not exist "artifacts\api-server\.env" (
    echo [PERINGATAN] File .env tidak ditemukan di artifacts\api-server\
    echo.
    echo Buat file: artifacts\api-server\.env
    echo Isi dengan:
    echo   DATABASE_URL=postgresql://...
    echo   SESSION_SECRET=isi_bebas_asal_panjang
    echo   PORT=8099
    echo.
    echo Tekan tombol apa saja untuk tetap lanjut (tanpa database)...
    pause >nul
)

echo [INFO] Menjalankan Backend di port 8099...
start "AideaCreative - Backend (port 8099)" cmd /k "title Backend ^& cd /d %~dp0 ^& pnpm --filter @workspace/api-server run dev:app"

:: Tunggu sebentar biar backend start duluan
timeout /t 3 /nobreak >nul

echo [INFO] Menjalankan Frontend di port 5000...
start "AideaCreative - Frontend (port 5000)" cmd /k "title Frontend ^& cd /d %~dp0 ^& set PORT=5000 && pnpm --filter @workspace/aidea-creative run dev:app"

:: Tunggu frontend ready
timeout /t 5 /nobreak >nul

echo.
echo ============================================
echo   Aplikasi berjalan!
echo   Buka browser: http://localhost:5000
echo ============================================
echo.
echo Tekan tombol apa saja untuk membuka browser...
pause >nul

start http://localhost:5000
