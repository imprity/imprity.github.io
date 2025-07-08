@echo off

gofmt -w -s .
call npm run tsfmt -- --replace --useTsconfig admin-tsconfig.json
call npm run tsfmt -- --replace --useTsconfig main-page-tsconfig.json
