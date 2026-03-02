#!/bin/bash
# Run auth service - excludes venv from watch to prevent constant reloads
cd "$(dirname "$0")"
source venv/bin/activate
uvicorn auth.main:app --host 0.0.0.0 --port 8001 --reload --reload-exclude 'venv/*' --reload-exclude '.git/*'
