package main

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"time"

	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/renderer/html"

	"github.com/google/uuid"
)

type PostType int

const (
	PostTypeNone PostType = iota
	PostTypeHTML
	PostTypeMarkDown
	PostTypeCount
)

var PostTypeStrs = [PostTypeCount]string{
	"None",
	"HTML",
	"Markdown",
}

func (pt PostType) String() string {
	if 0 <= pt && pt < PostTypeCount {
		return PostTypeStrs[pt]
	}

	return fmt.Sprintf("unknown PostType(%d)", pt)
}

func (pt PostType) MarshalJSON() ([]byte, error) {
	if 0 <= pt && pt < PostTypeCount {
		return []byte("\"" + PostTypeStrs[pt] + "\""), nil
	}

	return nil, fmt.Errorf("unknow PostType(%d)", pt)
}

func (pt *PostType) UnmarshalJSON(jsonValue []byte) error {
	if len(jsonValue) < 2 {
		return fmt.Errorf("unknow PostType(%s)", string(jsonValue))
	}

	jsonValue = jsonValue[1 : len(jsonValue)-1]

	for i, str := range PostTypeStrs {
		if str == string(jsonValue) {
			*pt = PostType(i)
			return nil
		}
	}

	return fmt.Errorf("unknow PostType(%s)", string(jsonValue))
}

type Post struct {
	UUID uuid.UUID

	Name string
	Type PostType
	Date time.Time
	Dir  string
}

func (p Post) Clone() Post {
	clone := p

	clone.Name = strings.Clone(p.Name)
	clone.Dir = strings.Clone(p.Dir)

	return clone
}

func (p *Post) Dump() {
	fmt.Printf("UUID : %v\n", p.UUID)

	fmt.Printf("Name : %v\n", p.Name)
	fmt.Printf("Type : %v\n", p.Type)
	fmt.Printf("Date : %v\n", p.Date)
	fmt.Printf("Dir  : %v\n", p.Dir)
}

type PostList struct {
	Posts []Post
}

func (pl *PostList) Clone() PostList {
	clone := PostList{}

	for _, p := range pl.Posts {
		clone.Posts = append(clone.Posts, p.Clone())
	}

	return clone
}

const PostUUIDFileName = "post-uuid.txt"

func GetPostTypeFromDir(postDir string) (PostType, error) {
	dirents, err := os.ReadDir(postDir)
	if err != nil {
		return PostTypeNone, err
	}

	for _, dirent := range dirents {
		if !dirent.Type().IsRegular() {
			continue
		}

		if dirent.Name() == "index.html" {
			return PostTypeHTML, nil
		}

		if dirent.Name() == "index.md" {
			return PostTypeMarkDown, nil
		}
	}

	return PostTypeNone, nil
}

func GetPostUUIDFromDir(postDir string) (uuid.UUID, bool, error) {
	dirents, err := os.ReadDir(postDir)
	if err != nil {
		return uuid.UUID{}, false, err
	}

	for _, dirent := range dirents {
		if !dirent.Type().IsRegular() {
			continue
		}

		if dirent.Name() == PostUUIDFileName {
			uuidPath := filepath.Join(postDir, dirent.Name())
			uuidFile, err := os.ReadFile(uuidPath)
			if err != nil {
				return uuid.UUID{}, false, err
			}

			postUUID, err := uuid.Parse(string(uuidFile))
			if err != nil {
				return uuid.UUID{}, false, err
			}

			return postUUID, true, nil
		}
	}

	return uuid.UUID{}, false, nil
}

// try to load post list
// file not existing isn't an error
func LoadPostList(postListPath string) (PostList, error) {
	// check if file exists
	info, err := os.Stat(postListPath)

	if err == nil { // file exists
		mode := info.Mode()
		if !mode.IsRegular() {
			return PostList{}, fmt.Errorf("%s is not regular", postListPath)
		}

		file, err := os.ReadFile(postListPath)
		if err != nil {
			return PostList{}, err
		}

		var postList PostList

		err = json.Unmarshal(file, &postList)
		if err != nil {
			return PostList{}, err
		}

		return postList, nil
	} else if errors.Is(err, os.ErrNotExist) { // file does not exists
		return PostList{}, nil
	} else { // unable to check if file exists or not
		return PostList{}, err
	}
}

func GenerateUpdatedPostList(postRoot string, oldPosts PostList) (PostList, error) {
	var updatedPosts []Post
	var newPosts []Post

	var postDirs []os.DirEntry

	postDirs, err := os.ReadDir(postRoot)
	if err != nil {
		return PostList{}, err
	}

	now := time.Now()

	for _, postDir := range postDirs {
		if !postDir.IsDir() {
			continue
		}

		postDirPath := filepath.Join(postRoot, postDir.Name())

		postType, err := GetPostTypeFromDir(postDirPath)
		if err != nil {
			return PostList{}, err
		}

		if postType == PostTypeNone {
			continue
		}

		postUUID, foundUUIDFile, err := GetPostUUIDFromDir(postDirPath)
		if err != nil {
			return PostList{}, err
		}

		if !foundUUIDFile {
			postUUID = uuid.New()
			uuidPath := filepath.Join(postDirPath, PostUUIDFileName)

			err := os.WriteFile(uuidPath, []byte(postUUID.String()), 0664)
			if err != nil {
				return PostList{}, err
			}
		}

		// check if there already is a post with same uuid
		alreadyExists := false
		var alreadyExistingOldPost Post

		for _, otherPost := range oldPosts.Posts {
			if otherPost.UUID == postUUID {
				alreadyExists = true
				alreadyExistingOldPost = otherPost
				break
			}
		}

		var post Post

		post.UUID = postUUID

		if alreadyExists {
			post.Name = alreadyExistingOldPost.Name
			post.Date = alreadyExistingOldPost.Date
		} else {
			post.Name = postDir.Name()
			post.Date = now
		}

		post.Type = postType
		post.Dir = postDir.Name()

		if alreadyExists {
			updatedPosts = append(updatedPosts, post)
		} else {
			newPosts = append(newPosts, post)
		}
	}

	// sort updated posts
	originalIndicies := make(map[uuid.UUID]int)
	for i, post := range oldPosts.Posts {
		originalIndicies[post.UUID] = i
	}
	slices.SortFunc(updatedPosts, func(a, b Post) int {
		return originalIndicies[a.UUID] - originalIndicies[b.UUID]
	})

	// sort newPosts
	slices.SortFunc(newPosts, func(a, b Post) int {
		return strings.Compare(a.Name, b.Name)
	})

	updatedPosts = append(updatedPosts, newPosts...)

	return PostList{Posts: updatedPosts}, nil
}

func CompileBlog(postRoot string, postList PostList, outDir string) error {
	tmpOutDir, err := os.MkdirTemp("./", "out_tmp")
	if err != nil {
		return err
	}

	copyPostsToTmp := func() error {
		generatePostErr := func(post Post, err error) error {
			return fmt.Errorf("post \"%s\" in \"%s\": %w", post.Name, post.Dir, err)
		}

		for _, post := range postList.Posts {
			postDirPath := filepath.Join(postRoot, post.Dir)

			// ======================================
			// check if we know about post corretly
			// ======================================
			actualType, err := GetPostTypeFromDir(postDirPath)
			if err != nil {
				return generatePostErr(post, err)
			}

			actualUUID, foundUUIDFile, err := GetPostUUIDFromDir(postDirPath)

			if err != nil {
				return generatePostErr(post, err)
			}
			if !foundUUIDFile {
				return generatePostErr(post, fmt.Errorf("could not find %s", PostUUIDFileName))
			}

			if post.UUID != actualUUID {
				return generatePostErr(post, fmt.Errorf("UUID does not match"))
			}

			if post.Type != actualType {
				return generatePostErr(post, fmt.Errorf("post type does not match"))
			}

			postOutDir := filepath.Join(tmpOutDir, post.Dir)

			// ===========================================
			// if post type is html, just copy directory
			// ===========================================
			if post.Type == PostTypeHTML {
				postFS := os.DirFS(postDirPath)
				err := os.CopyFS(postOutDir, postFS)
				if err != nil {
					return generatePostErr(post, err)
				}
			}

			// =======================================================
			// if post type is markdown, convert it to html
			// =======================================================
			if post.Type == PostTypeMarkDown {
				err := os.Mkdir(postOutDir, 0755)
				if err != nil {
					return generatePostErr(post, err)
				}

				dirents, err := os.ReadDir(postDirPath)
				if err != nil {
					return generatePostErr(post, err)
				}

				for _, dirent := range dirents {
					direntPath := filepath.Join(postDirPath, dirent.Name())
					direntOutPath := filepath.Join(postOutDir, dirent.Name())

					if dirent.Type().IsRegular() {
						if dirent.Name() == "index.md" {
							fileBytes, err := os.ReadFile(direntPath)
							if err != nil {
								return generatePostErr(post, err)
							}

							htmlBytes, err := ConvertMarkdown(fileBytes)
							if err != nil {
								return generatePostErr(post, err)
							}

							err = os.WriteFile(
								filepath.Join(postOutDir, "index.html"),
								htmlBytes,
								0644,
							)
							if err != nil {
								return generatePostErr(post, err)
							}
						} else {
							err = CopyFile(
								direntPath, direntOutPath,
							)

							if err != nil {
								return generatePostErr(post, err)
							}
						}
					}

					if dirent.IsDir() {
						dirFS := os.DirFS(direntPath)
						err := os.CopyFS(direntOutPath, dirFS)
						if err != nil {
							return generatePostErr(post, err)
						}
					}
				}
			}
		}

		return nil
	}

	err = copyPostsToTmp()
	if err != nil {
		removeErr := os.RemoveAll(tmpOutDir)
		if removeErr != nil {
			WarnLogger.Printf("failed to remove %s, %s", tmpOutDir, removeErr)
		}

		return err
	}

	err = os.RemoveAll(outDir)
	if err != nil {
		return err
	}

	os.Rename(tmpOutDir, outDir)

	return nil
}

var markdownConverter = goldmark.New(
	goldmark.WithExtensions(
		GalleryExtender,
	),
	goldmark.WithRendererOptions(
		html.WithUnsafe(),
	),
)

func ConvertMarkdown(markdownBytes []byte) ([]byte, error) {
	var byteBuf bytes.Buffer
	err := markdownConverter.Convert(markdownBytes, &byteBuf)
	if err != nil {
		return nil, err
	}

	return byteBuf.Bytes(), nil
}
