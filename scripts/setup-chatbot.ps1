# Script setup Chatbot AI - chạy 1 lần để deploy function và set API key
# Cách dùng: .\scripts\setup-chatbot.ps1
# Hoặc với API key: .\scripts\setup-chatbot.ps1 -OpenAIKey "sk-xxx"

param(
    [string]$OpenAIKey = $env:OPENAI_API_KEY
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)

Write-Host "=== Setup AI Tutor Chatbot ===" -ForegroundColor Cyan
Write-Host ""

# 1. Kiểm tra Supabase CLI (supabase hoac npx supabase)
$SupabaseCmd = "supabase"
if (-not (Get-Command supabase -ErrorAction SilentlyContinue)) {
    $SupabaseCmd = "npx supabase"
    Write-Host "Dung npx supabase (Supabase CLI chua cai global)." -ForegroundColor Yellow
}

Set-Location $ProjectRoot

# 2. Lấy OpenAI API Key nếu chưa có
if (-not $OpenAIKey) {
    Write-Host "Nhap OpenAI API Key (lay tai https://platform.openai.com/api-keys):" -ForegroundColor Yellow
    $OpenAIKey = Read-Host -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($OpenAIKey)
    $OpenAIKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($BSTR)
}

if (-not $OpenAIKey -or $OpenAIKey -eq "") {
    Write-Host "Loi: Can OpenAI API Key." -ForegroundColor Red
    exit 1
}

# 3. Set secret
Write-Host "Dang set OPENAI_API_KEY vao Supabase..." -ForegroundColor Green
try {
    $env:OPENAI_API_KEY = $OpenAIKey
    & $SupabaseCmd secrets set OPENAI_API_KEY="$OpenAIKey" --project-ref qxwwwgbhqgnmbbnjqluu
    Write-Host "  OK - Secret da duoc set." -ForegroundColor Green
} catch {
    Write-Host "  Canh bao: Set secret that bai. Ban co dang nhap Supabase chua? Chay: supabase login" -ForegroundColor Yellow
}

# 4. Deploy function
Write-Host ""
Write-Host "Dang deploy function chat-gpt..." -ForegroundColor Green
try {
    & $SupabaseCmd functions deploy chat-gpt --project-ref qxwwwgbhqgnmbbnjqluu --no-verify-jwt
    Write-Host "  OK - Function da duoc deploy." -ForegroundColor Green
} catch {
    Write-Host "  Loi deploy. Thu chay tay: supabase functions deploy chat-gpt --no-verify-jwt" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Xong ===" -ForegroundColor Cyan
Write-Host "Chay app: npm run dev" -ForegroundColor White
Write-Host "Mo trang chu, keo xuong phan Gia su AI de dung chatbot." -ForegroundColor White
