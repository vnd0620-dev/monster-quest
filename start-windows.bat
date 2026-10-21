@echo off
chcp 65001 > nul
title 협력 몬스터 퀴즈 서버
cd /d "%~dp0"
where node > nul 2>&1
if errorlevel 1 (
  echo.
  echo  Node.js가 설치되어 있지 않아요.
  echo  https://nodejs.org 에서 LTS 버전을 설치한 뒤 이 파일을 다시 더블클릭해 주세요.
  echo.
  start https://nodejs.org
  pause
  exit /b
)
if not exist node_modules (
  echo  처음 한 번만 필요한 파일을 받는 중이에요...
  call npm install --omit=dev
)
start "" http://localhost:3000/teacher.html
node server.js
pause
