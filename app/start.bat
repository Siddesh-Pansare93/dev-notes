@echo off
cd /d "%~dp0"
echo Starting Tutorial Viewer...
start "" http://localhost:4000
node server.js
