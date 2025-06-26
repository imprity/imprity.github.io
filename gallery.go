package main

import (
	"strings"
	"fmt"

	"github.com/yuin/goldmark"
	gast "github.com/yuin/goldmark/ast"
	"github.com/yuin/goldmark/parser"
	"github.com/yuin/goldmark/renderer"
	"github.com/yuin/goldmark/renderer/html"
	"github.com/yuin/goldmark/text"
	"github.com/yuin/goldmark/util"
)

// ==================================
// node
// ==================================

type GalleryImage struct {
	AltText []byte
	ImageSource []byte
}

type Gallery struct {
	gast.BaseBlock

	Images []GalleryImage
}

func (g *Gallery) Dump(source []byte, level int) {
	gast.DumpHelper(g, source, level, nil, nil) 
}

// KindDefinitionList is a NodeKind of the DefinitionList node.
var KindGallery = gast.NewNodeKind("Gallery")

// Kind implements Node.Kind.
func (g *Gallery) Kind() gast.NodeKind {
	return KindGallery
}

func NewGallery() *Gallery {
	return &Gallery{}
}

// ==================================
// parser
// ==================================

type galleryParser struct {
}

var defaultGalleryParser = &galleryParser{}

func NewGalleryParser() parser.BlockParser {
	return defaultGalleryParser
}

func (g *galleryParser) Trigger() []byte {
	return []byte{'<'}
}

func (b *galleryParser) Open(
	parent gast.Node, 
	reader text.Reader, 
	pc parser.Context,
) (gast.Node, parser.State) {
	if _, isDocument := parent.(*gast.Document); !isDocument {
		return nil, parser.NoChildren
	}

	line, _ := reader.PeekLine()

	lineStr := string(line)
	lineStr = strings.TrimSpace(lineStr)
	if (lineStr == "<gallery>") {
		println("opening gallery")

		reader.AdvanceToEOL()
		return NewGallery(), parser.HasChildren
	}

	return nil, parser.NoChildren
}

func (b *galleryParser) Continue(
	node gast.Node, 
	reader text.Reader, 
	pc parser.Context,
) parser.State {
	line, _ := reader.PeekLine()

	lineStr := string(line)
	lineStr = strings.TrimSpace(lineStr)
	if (lineStr == "</gallery>") {
		println("continuing gallery")

		reader.AdvanceToEOL()
		return parser.Close
	}

	return parser.Continue | parser.HasChildren
}

func (b *galleryParser) Close(node gast.Node, reader text.Reader, pc parser.Context) {
	// nothing to do
}

func (b *galleryParser) CanInterruptParagraph() bool {
	return true
}

func (b *galleryParser) CanAcceptIndentedLine() bool {
	return false
}

// ==================================
// renderer
// ==================================

type GalleryHTMLRenderer struct {
	html.Config
}

func NewGalleryHTMLRenderer(opts ...html.Option) renderer.NodeRenderer {
	r := &GalleryHTMLRenderer{
		Config: html.NewConfig(),
	}
	for _, opt := range opts {
		opt.SetHTMLOption(&r.Config)
	}
	return r
}

// RegisterFuncs implements renderer.NodeRenderer.RegisterFuncs.
func (r *GalleryHTMLRenderer) RegisterFuncs(reg renderer.NodeRendererFuncRegisterer) {
	reg.Register(KindGallery, r.renderGallery)
}

// DefinitionListAttributeFilter defines attribute names which dl elements can have.
// var DefinitionListAttributeFilter = html.GlobalAttributeFilter

func (r *GalleryHTMLRenderer) renderGallery(
	w util.BufWriter, 
	source []byte, 
	n gast.Node, 
	entering bool,
) (gast.WalkStatus, error) {
	if entering {
		_, _ = w.WriteString("<gallery-open>\n")

		if gallery, isGallery := n.(*Gallery); isGallery{
			for _, img := range gallery.Images {
				w.WriteString(fmt.Sprintf("![%s](%s)\n", img.AltText, img.ImageSource))
			}
		}
	} else {
		_, _ = w.WriteString("<gallery-close>\n")
	}
	return gast.WalkContinue, nil
}

// ==================================
// extender
// ==================================

type galleryExtender struct {}

var GalleryExtender = &galleryExtender{}

func (e *galleryExtender) Extend(m goldmark.Markdown) {
	m.Parser().AddOptions(
		parser.WithBlockParsers(
			util.Prioritized(NewGalleryParser(), 420),
		),
		parser.WithASTTransformers(
			util.Prioritized(NewGalleryItemASTTransformer(), 999),
		),
	)
	m.Renderer().AddOptions(renderer.WithNodeRenderers(
		util.Prioritized(NewGalleryHTMLRenderer(), 420),
	))
}
