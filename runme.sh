#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="$ROOT_DIR/.run_logs"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_LOG="$LOG_DIR/backend.log"
FRONTEND_LOG="$LOG_DIR/frontend.log"
BACKEND_PID_FILE="$LOG_DIR/backend.pid"
FRONTEND_PID_FILE="$LOG_DIR/frontend.pid"
BACKEND_PORT="${BACKEND_PORT:-8000}"
FRONTEND_PORT="${FRONTEND_PORT:-8080}"

mkdir -p "$LOG_DIR"

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

is_pid_running() {
  local pid="$1"
  kill -0 "$pid" >/dev/null 2>&1
}

stop_stale_pid_file() {
  local pid_file="$1"
  if [[ -f "$pid_file" ]]; then
    local pid
    pid="$(cat "$pid_file")"
    if [[ -n "$pid" ]] && is_pid_running "$pid"; then
      echo "A process from $pid_file is already running with PID $pid." >&2
      echo "Stop it first or remove the PID file if it is stale." >&2
      exit 1
    fi
    rm -f "$pid_file"
  fi
}

require_cmd npm

if [[ ! -d "$BACKEND_DIR" || ! -d "$FRONTEND_DIR" ]]; then
  echo "Expected backend/ and frontend/ directories under $ROOT_DIR." >&2
  exit 1
fi

stop_stale_pid_file "$BACKEND_PID_FILE"
stop_stale_pid_file "$FRONTEND_PID_FILE"

if [[ -x "$BACKEND_DIR/.venv/bin/uvicorn" ]]; then
  BACKEND_CMD=( "$BACKEND_DIR/.venv/bin/uvicorn" "economic_api.main:app" "--reload" "--port" "$BACKEND_PORT" )
elif command -v uvicorn >/dev/null 2>&1; then
  BACKEND_CMD=( "uvicorn" "economic_api.main:app" "--reload" "--port" "$BACKEND_PORT" )
else
  echo "Backend launcher not found." >&2
  echo "Create backend/.venv and install dependencies, or install uvicorn in your current environment." >&2
  echo "Expected setup:" >&2
  echo "  cd backend && python3.11 -m venv .venv && source .venv/bin/activate && pip install -e \".[dev]\"" >&2
  exit 1
fi

if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
  echo "frontend/node_modules is missing. Run 'cd frontend && npm install' first." >&2
  exit 1
fi

echo "Starting backend on http://localhost:$BACKEND_PORT"
(
  cd "$BACKEND_DIR"
  nohup env PYTHONPATH=src "${BACKEND_CMD[@]}" >"$BACKEND_LOG" 2>&1 &
  echo $! >"$BACKEND_PID_FILE"
)

echo "Starting frontend on http://localhost:$FRONTEND_PORT"
(
  cd "$FRONTEND_DIR"
  nohup npm run dev >"$FRONTEND_LOG" 2>&1 &
  echo $! >"$FRONTEND_PID_FILE"
)

sleep 2

BACKEND_PID="$(cat "$BACKEND_PID_FILE")"
FRONTEND_PID="$(cat "$FRONTEND_PID_FILE")"

if ! is_pid_running "$BACKEND_PID"; then
  echo "Backend failed to start. Check $BACKEND_LOG" >&2
  exit 1
fi

if ! is_pid_running "$FRONTEND_PID"; then
  echo "Frontend failed to start. Check $FRONTEND_LOG" >&2
  exit 1
fi

echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "Logs:"
echo "  $BACKEND_LOG"
echo "  $FRONTEND_LOG"
echo "Open:"
echo "  Frontend: http://localhost:$FRONTEND_PORT"
echo "  API:      http://localhost:$BACKEND_PORT"
echo "  Docs:     http://localhost:$BACKEND_PORT/docs"
