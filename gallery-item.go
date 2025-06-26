package main
//
import (
	//"github.com/yuin/goldmark"
	gast "github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/parser"
	//"github.com/yuin/goldmark/renderer"
	//"github.com/yuin/goldmark/renderer/html"
	"github.com/yuin/goldmark/text"
	//"github.com/yuin/goldmark/util"

	"fmt"
)

type galleryItemASTTransformer struct {
}

var defaultGalleryItemASTTransformer = &galleryItemASTTransformer{}

// NewFootnoteASTTransformer returns a new parser.ASTTransformer that
// insert a footnote list to the last of the document.
func NewGalleryItemASTTransformer() parser.ASTTransformer {
	return defaultGalleryItemASTTransformer
}

func (t *galleryItemASTTransformer) Transform(
	document *gast.Document, 
	reader text.Reader, 
	pc parser.Context,
) {
	fmt.Printf("BEFORE =====================\n")
	document.Dump(reader.Source(), 0)

	var galleries []*Gallery

	var walkFunc func(node gast.Node, parentGallery *Gallery)

	walkFunc = func(node gast.Node, parentGallery *Gallery) {
		var nextGallery *Gallery = nil

		if parentGallery != nil {
			nextGallery = parentGallery

			if img, isImage := node.(*gast.Image); isImage {
				fmt.Printf("text: \"%s\", dest: \"%s\"\n", img.Text(reader.Source()), img.Destination)
				parentGallery.Images = append(parentGallery.Images, GalleryImage{
					AltText : img.Text(reader.Source()),
					ImageSource : img.Destination,
				})
			}
		} else {
			if gallery, isGallery := node.(*Gallery); isGallery {
				fmt.Printf("found gallery\n")
				galleries = append(galleries, gallery)
				nextGallery = gallery
			}
		}

		child := node.FirstChild()

		for range node.ChildCount() {
			walkFunc(child, nextGallery)
			child = child.NextSibling()
		}
	}

	walkFunc(document, nil)

	fmt.Printf("found %d galleries\n", len(galleries))

	for _, g := range galleries {
		g.RemoveChildren(g)
	}

	fmt.Printf("AFTER =====================\n")
	document.Dump(reader.Source(), 0)
}
