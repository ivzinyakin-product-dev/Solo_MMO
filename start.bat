@echo off
title Solo MMO: Midgard Camp
echo ==============================================
echo   Starting Solo MMO: Midgard Camp...
echo ==============================================

cd /d "%~dp0"
call npm.cmd run dev -- --open

pause
