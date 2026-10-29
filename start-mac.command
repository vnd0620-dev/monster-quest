#!/bin/bash
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js가 설치되어 있지 않아요. https://nodejs.org 에서 LTS 버전을 설치해 주세요."
  open https://nodejs.org; read -p "엔터를 누르면 닫혀요"; exit 1
fi
[ -d node_modules ] || npm install --omit=dev
(sleep 1.5; open http://localhost:3000/teacher.html) &
node server.js
