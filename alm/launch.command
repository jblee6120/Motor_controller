#!/bin/zsh
cd "${0:A:h}" || exit 1
python3 server.py --host 127.0.0.1 --port 8765 &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null' EXIT INT TERM
sleep 1
open 'http://127.0.0.1:8765'
wait "$server_pid"
