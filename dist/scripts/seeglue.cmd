@echo off
REM Get the directory of this .cmd file
set SCRIPT_DIR=%~dp0

REM Resolve root directory
set ROOT_DIR=%SCRIPT_DIR%..\..\

REM Path to bundled Deno
set DENO_EXE=%SCRIPT_DIR%..\deno\deno.exe

REM Path to main.ts
set MAIN_TS=%ROOT_DIR%main.ts

REM Call local Deno binary and forward all arguments
"%DENO_EXE%" run --unstable-raw-imports --allow-read --allow-write "%MAIN_TS%" %*