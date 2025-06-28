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
	postList, err := LoadPostList("post-list.json")
	if err != nil {
		ErrLogger.Fatal(err)
	}

	for _, post := range postList.Posts {
		println("------------------")
		post.Dump()
	}

	err = CompileBlog("posts", postList, "public")
	if err != nil {
		ErrLogger.Fatal(err)
	}

	err = StartServer()
	if err != nil {
		ErrLogger.Fatal(err)
	}
}
