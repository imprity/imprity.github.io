package main

import (
	"bytes"
	"github.com/yuin/goldmark"
	"github.com/yuin/goldmark/renderer/html"
	"os"
)

func main() {
	fileBytes, err := os.ReadFile("test.md")
	if err != nil {
		panic(err)
	}
	markdown := goldmark.New(
		goldmark.WithExtensions(
			GalleryExtender,
		),
		goldmark.WithRendererOptions(
			html.WithUnsafe(),
		),
	)

	var byteBuf bytes.Buffer

	err = markdown.Convert(fileBytes, &byteBuf)
	if err != nil {
		panic(err)
	}

	os.WriteFile("out.text", byteBuf.Bytes(), 0664)
}
