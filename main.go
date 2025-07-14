package main

import (
	"errors"
	"flag"
	"log"
	"os"
	"time"
)

var FlagTest bool

func init() {
	flag.BoolVar(&FlagTest, "test", false,
		"Serve test posts in posts-test rather than real posts",
	)
}

var (
	ErrLogger  = log.New(os.Stderr, "[ FAIL! ] : ", log.Lshortfile)
	WarnLogger = log.New(os.Stderr, "[ WARN! ] : ", log.Lshortfile)
	Logger     = log.New(os.Stdout, "", 0)
)

func main() {
	flag.Parse()

	// =======================
	// set up test
	// =======================
	if FlagTest {
		PostListPath = "test/docs/public/post-list.json"
		PostsPath = "test/posts-copy"
		PostsOutPath = "test/docs/posts"

		err := os.Mkdir("test", 0755)
		if err != nil && !errors.Is(err, os.ErrExist) {
			ErrLogger.Fatal(err)
		}

		// delete PostsOutPath
		if err := os.RemoveAll(PostsOutPath); err != nil {
			ErrLogger.Fatal(err)
		}

		// delete post root
		if err := os.RemoveAll(PostsPath); err != nil {
			ErrLogger.Fatal(err)
		}
		// copy test/posts to PostsPath
		if err := os.CopyFS(PostsPath, os.DirFS("test/posts")); err != nil && !errors.Is(err, os.ErrNotExist) {
			ErrLogger.Fatal(err)
		}

		// delete post list
		if err := DeleteFile(PostListPath); err != nil {
			ErrLogger.Fatal(err)
		}

		// fabricate post list
		postList, err := GenerateUpdatedPostList(PostsPath, PostList{})
		if err != nil {
			ErrLogger.Fatal(err)
		}

		// assign random creation date
		startingDate, err := time.Parse(time.DateTime, "2005-06-07 17:35:16")
		if err != nil {
			ErrLogger.Fatal(err)
		}
		for i, post := range postList.Posts {
			post.Date = startingDate
			startingDate = startingDate.Add(time.Hour*6 + time.Minute*30)
			postList.Posts[i] = post
		}

		// save post list
		err = SavePostList(postList, PostListPath)
		if err != nil {
			ErrLogger.Fatal(err)
		}

		err = CompileBlog(PostsPath, postList, PostsOutPath)
		if err != nil {
			ErrLogger.Fatal(err)
		}
	}

	// ==============================================
	// if there is no post-list, create one
	// ==============================================
	{
		exists, err := FileExists(PostListPath, false)
		if err != nil {
			ErrLogger.Fatal(err)
		}
		if !exists {
			err = SavePostList(PostList{}, PostListPath)
			if err != nil {
				ErrLogger.Fatal(err)
			}
		}
	}

	Logger.Printf("serving http://localhost:6969")

	err := StartServer()
	if err != nil {
		ErrLogger.Fatal(err)
	}
}
