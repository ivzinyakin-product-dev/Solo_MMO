@echo off
title Solo MMO: Midgard Camp - Release Automation
echo ======================================================
echo   Solo MMO: Midgard Camp - Release Manager
echo ======================================================

cd /d "%~dp0"
node scripts/release.cjs %*

pause
