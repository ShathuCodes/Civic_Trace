@echo off
echo ===================================================
echo Starting Civic Trace Platform
echo ===================================================
echo.
echo 1. Starting FastAPI Backend on http://localhost:8000 ...
start cmd /k "python -m uvicorn backend.app.main:app --reload --port 8000"

echo 2. Starting React + TypeScript Frontend on http://localhost:5173 ...
cd frontend
start cmd /k "npm run dev"

echo.
echo All services launched!
echo - Frontend: http://localhost:5173
echo - Backend API Docs: http://localhost:8000/docs
echo ===================================================
