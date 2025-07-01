@echo off

gofmt -w -s .
npm run tsfmt -- --replace --useTsconfig admin-tsconfig.json
