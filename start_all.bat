@echo off
setlocal

echo ===================================================
echo  Civic Trace Platform – Startup Script
echo ===================================================
echo.

REM ── Backend ─────────────────────────────────────────
echo [1/2] Starting FastAPI backend on http://localhost:8000 ...
echo       Environment: backend\.env (auto-loaded by python-dotenv)
echo.
start "Civic Trace – Backend" cmd /k ^
  "cd /d %~dp0 && python -m uvicorn backend.app.main:app --reload --port 8000"

REM ── Frontend ─────────────────────────────────────────
echo [2/2] Starting Vite + React frontend on http://localhost:5173 ...
echo       Environment: frontend\.env (loaded by Vite)
echo.
start "Civic Trace – Frontend" cmd /k ^
  "cd /d %~dp0\frontend && npm run dev"

echo.
echo ===================================================
echo  All services launched in separate windows.
echo.
echo  Frontend:     http://localhost:5173
echo  Backend API:  http://localhost:8000
echo  API Docs:     http://localhost:8000/docs
echo ===================================================
echo.
echo  Tip: Edit backend\.env to switch DATA_MODE between
echo       "demo" and "mongodb", or change CORS_ORIGINS.
echo.

endlocal
