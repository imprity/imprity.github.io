package main

import (
	"github.com/yuin/goldmark"
	"bytes"
	"os"
)

func main() {
	fileBytes, err := os.ReadFile("test.md")
	if (err != nil) {
		panic(err)
	}
	markdown := goldmark.New(
        goldmark.WithExtensions(
            GalleryExtender,
        ),
    )

	var byteBuf bytes.Buffer

	err = markdown.Convert(fileBytes, &byteBuf)
	if (err != nil) {
		panic(err)
	}

	os.WriteFile("out.text", byteBuf.Bytes(), 0664)
}
