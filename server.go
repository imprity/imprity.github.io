package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"time"
)

func StartServer() error {
	fileServer := http.FileServer(http.Dir("./"))
	http.Handle("/", LogReqest(NoCache(fileServer)))
	http.Handle("/api/", LogReqest(&AdminAPIHandler{}))

	if FlagTest {
		testSever := http.FileServer(http.Dir("./test"))
		http.Handle("/post-list.json", testSever)
		http.Handle("/public/", testSever)
	}

	err := http.ListenAndServe(":6969", nil)
	if err != nil {
		return err
	}

	return nil
}

// copy pasted from https://stackoverflow.com/questions/33880343/go-webserver-dont-cache-files-using-timestamp

var noCacheHeaders = map[string]string{
	"Expires":         time.Unix(0, 0).Format(time.RFC1123),
	"Cache-Control":   "no-cache, private, max-age=0",
	"Pragma":          "no-cache",
	"X-Accel-Expires": "0",
}

var etagHeaders = []string{
	"ETag",
	"If-Modified-Since",
	"If-Match",
	"If-None-Match",
	"If-Range",
	"If-Unmodified-Since",
}

func LogReqest(h http.Handler) http.Handler {
	fn := func(w http.ResponseWriter, r *http.Request) {
		Logger.Printf("request : %v - %v", r.URL.String(), r.Method)

		h.ServeHTTP(w, r)
	}

	return http.HandlerFunc(fn)
}

// func ProperMimeType(dir http.Dir) http.Handler {
// 	fn := func(w http.ResponseWriter, r *http.Request) {
// 		http.ServeContent(w, r, )
// 	}
//
// 	return http.HandlerFunc(fn)
// }

func NoCache(h http.Handler) http.Handler {
	fn := func(w http.ResponseWriter, r *http.Request) {
		// Delete any ETag headers that may have been set
		for _, v := range etagHeaders {
			if r.Header.Get(v) != "" {
				r.Header.Del(v)
			}
		}

		// Set our NoCache headers
		for k, v := range noCacheHeaders {
			w.Header().Set(k, v)
		}

		h.ServeHTTP(w, r)
	}

	return http.HandlerFunc(fn)
}

type AdminAPIHandler struct{}

var (
	PostListPath = "post-list.json"
	PostsPath    = "posts"
	PostsOutPath = "public"
)

func (aa *AdminAPIHandler) ServeHTTP(
	res http.ResponseWriter,
	req *http.Request,
) {
	for k, v := range noCacheHeaders {
		res.Header().Set(k, v)
	}

	res.Header().Set("Content-Type", "application/json")

	getErrResponse := func(err error) []byte {
		var resStruct struct {
			Result string
			Error  string
		}

		resStruct.Result = "fail"
		resStruct.Error = err.Error()

		resBytes, marshalErr := json.Marshal(resStruct)
		if marshalErr != nil {
			ErrLogger.Fatal(marshalErr)
		}

		return resBytes
	}

	getResponse := func() ([]byte, int) {
		if req.URL.Path == "/api/get-posts" {
			if req.Method != "GET" {
				return getErrResponse(
					fmt.Errorf("wrong method %s, should be GET", req.Method),
				), 400
			}

			oldPosts, err := LoadPostList(PostListPath)
			if err != nil {
				return getErrResponse(err), 500
			}

			newPosts, err := GenerateUpdatedPostList(PostsPath, oldPosts)
			if err != nil {
				return getErrResponse(err), 500
			}

			var resStruct struct {
				Result string

				Old PostList
				New PostList
			}

			resStruct.Result = "success"
			resStruct.Old = oldPosts
			resStruct.New = newPosts

			resBytes, err := json.MarshalIndent(resStruct, "", "  ")
			if err != nil {
				return getErrResponse(err), 500
			}

			return resBytes, 200
		} else if req.URL.Path == "/api/update-posts" {
			if req.Method != "PUT" {
				return getErrResponse(
					fmt.Errorf("wrong method %s, should be PUT", req.Method),
				), 400
			}

			body, err := io.ReadAll(req.Body)
			defer req.Body.Close()
			if err != nil {
				return getErrResponse(err), 500
			}

			var updatedPostList PostList

			err = json.Unmarshal(body, &updatedPostList)
			if err != nil {
				return getErrResponse(err), 500
			}

			for i, post := range updatedPostList.Posts {
				post.Dir = filepath.Base(post.Dir)
				updatedPostList.Posts[i] = post
			}

			err = CompileBlog(PostsPath, updatedPostList, PostsOutPath)
			if err != nil {
				return getErrResponse(err), 500
			}

			var resStruct struct {
				Result string

				PostList PostList
			}

			resStruct.Result = "success"
			resStruct.PostList = updatedPostList

			resBytes, err := json.Marshal(resStruct)
			if err != nil {
				return getErrResponse(err), 500
			}

			err = SavePostList(updatedPostList, PostListPath)
			if err != nil {
				return getErrResponse(err), 500
			}

			return resBytes, 200
		} else {
			return getErrResponse(fmt.Errorf("unknown api %v", req.URL)), 400
		}
	}

	toWrite, code := getResponse()

	res.Header().Set("Content-Length", fmt.Sprintf("%d", len(toWrite)))

	res.WriteHeader(code)

	written := 0

	for written < len(toWrite) {
		w, err := res.Write(toWrite[written:])
		if err != nil {
			ErrLogger.Printf("failed to write to client")
			break
		}
		written += w
	}
}
