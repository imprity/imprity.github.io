@echo off

go build -gcflags=all="-e -N -l" .
if %ERRORLEVEL% NEQ 0 (
	GOTO :EOF
)

call npm run tsc -- -p admin-tsconfig.json
if %ERRORLEVEL% NEQ 0 (
	GOTO :EOF
)

call npm run tsc -- -p main-page-tsconfig.json
