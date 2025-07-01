package main

import (
	"log"
	"os"
)

var (
	ErrLogger  = log.New(os.Stderr, "[ FAIL! ] : ", log.Lshortfile)
	WarnLogger = log.New(os.Stderr, "[ WARN! ] : ", log.Lshortfile)
	Logger     = log.New(os.Stdout, "", 0)
)

func main() {
	Logger.Printf("serving http://localhost:6969")

	err := StartServer()
	if err != nil {
		ErrLogger.Fatal(err)
	}
}
