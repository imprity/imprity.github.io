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

	"golang.org/x/mod/sumdb/dirhash"
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

	FileHash string

	Name string
	Type PostType
	Date time.Time
	Dir  string

	HasThumbnail bool
	Thumbnail    string
}

func (p Post) Clone() Post {
	clone := p

	clone.FileHash = strings.Clone(p.FileHash)

	clone.Name = strings.Clone(p.Name)
	clone.Dir = strings.Clone(p.Dir)

	clone.Thumbnail = strings.Clone(p.Thumbnail)

	return clone
}

func (p *Post) Dump() {
	fmt.Printf("UUID : %v\n", p.UUID)

	fmt.Printf("FileHash: %v\n", p.FileHash)

	fmt.Printf("Name : %v\n", p.Name)
	fmt.Printf("Type : %v\n", p.Type)
	fmt.Printf("Date : %v\n", p.Date)
	fmt.Printf("Dir  : %v\n", p.Dir)
	if p.HasThumbnail {
		fmt.Printf("Thumbnail : %v\n", p.Thumbnail)
	}
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

func SavePostList(postList PostList, name string) error {
	name = filepath.Clean(name)

	dir := filepath.Dir(name)
	err := os.MkdirAll(dir, 0755)
	if err != nil {
		return err
	}

	jsonBytes, err := json.MarshalIndent(postList, "", "  ")
	if err != nil {
		return err
	}

	err = os.WriteFile(name, jsonBytes, 0644)
	if err != nil {
		return err
	}
	return nil
}

const PostUUIDFileName = "post-uuid.txt"

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

func GetPostFileHashFromDir(postDir string) (string, error) {
	return dirhash.HashDir(postDir, "", dirhash.DefaultHash)
}

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

func GetPostThumbnailFromDir(postDir string) (string, bool, error) {
	dirents, err := os.ReadDir(postDir)
	if err != nil {
		return "", false, err
	}

	for _, dirent := range dirents {
		if !dirent.Type().IsRegular() {
			continue
		}

		name := dirent.Name()

		if true &&
			name == "post-thumbnail.jpeg" ||
			name == "post-thumbnail.jpg" ||
			name == "post-thumbnail.png" ||
			name == "post-thumbnail.bmp" {

			thumbnailPath := name
			return thumbnailPath, true, nil
		}
	}

	return "", false, nil
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

	{
		exists, err := FileExists(postRoot, true)
		if err != nil {
			return PostList{}, err
		}
		if !exists {
			return PostList{}, nil
		}
	}

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

		// ===============
		var post Post
		// ===============

		// ===========================================
		// first, try to find UUID, if you couldn't
		// make one
		// ===========================================

		// try to find uuid
		postUUID, foundUUIDFile, err := GetPostUUIDFromDir(postDirPath)
		if err != nil {
			return PostList{}, err
		}

		// if we couldn't find one, create new uuid file
		if !foundUUIDFile {
			postUUID = uuid.New()
			uuidPath := filepath.Join(postDirPath, PostUUIDFileName)

			err := os.WriteFile(uuidPath, []byte(postUUID.String()), 0664)
			if err != nil {
				return PostList{}, err
			}
		}

		post.UUID = postUUID

		// =======================================================================
		// next, we need to get things that we know just by looking at directory
		// =======================================================================
		// get post dir
		post.Dir = postDir.Name()

		// get post hash
		postFileHash, err := GetPostFileHashFromDir(postDirPath)
		if err != nil {
			return PostList{}, err
		}
		post.FileHash = postFileHash

		// get post type
		postType, err := GetPostTypeFromDir(postDirPath)
		if err != nil {
			return PostList{}, err
		}
		if postType == PostTypeNone {
			continue
		}
		post.Type = postType

		// get post thumbnail
		postThumbnail, hasThumbnail, err := GetPostThumbnailFromDir(postDirPath)
		if err != nil {
			return PostList{}, err
		}
		post.Thumbnail = postThumbnail
		post.HasThumbnail = hasThumbnail

		// =======================================================================
		// check if this post is a newly created post or an old post.
		//
		// because if it's an old post,
		// we want it's creation date and name to carry over
		// =======================================================================

		// check if there already is a post with same uuid
		alreadyExists := false
		var alreadyExistingOldPost Post

		for _, otherPost := range oldPosts.Posts {
			if otherPost.UUID == post.UUID {
				alreadyExists = true
				alreadyExistingOldPost = otherPost
				break
			}
		}

		// carry over name and date
		if alreadyExists {
			post.Name = alreadyExistingOldPost.Name
			post.Date = alreadyExistingOldPost.Date
		} else {
			post.Name = postDir.Name()
			post.Date = now
		}

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
		return strings.Compare(b.Name, a.Name)
	})

	newPosts = append(newPosts, updatedPosts...)

	return PostList{Posts: newPosts}, nil
}

func CompileBlog(postRoot string, postList PostList, outDir string) error {
	outDirParent := filepath.Dir(outDir)
	if outDirParent == "." {
		return fmt.Errorf("outDir can't be a root")
	}

	tmpOutDir, err := os.MkdirTemp(outDirParent, "out_tmp")
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

	err = os.Rename(tmpOutDir, outDir)
	if err != nil {
		return err
	}

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

	page := fmt.Sprintf(markdownTemplate, string(byteBuf.Bytes()))

	return []byte(page), nil
}

const markdownTemplate = `
<!DOCTYPE html>
<html>

<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta charset="UTF-8">

    <link rel="stylesheet" href="/public/shared/water.css">
    <link rel="stylesheet" href="/public/markdown/style.css">
</head>

<body>
%s

	<script src = '/public/markdown/main.js'></script>
</body>

</html>
`
