package main

import (
	"text/template"

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
	AltText     []byte
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

	advance := 0

	lineStr := string(line)

	var consumed bool

	lineStr, advance = ConsumeSpace(lineStr, advance)

	if lineStr, advance, consumed = ConsumeLiteral(lineStr, advance, "<gallery"); !consumed {
		return nil, parser.NoChildren
	}

	lineStr, advance = ConsumeSpace(lineStr, advance)

	if lineStr, advance, consumed = ConsumeLiteral(lineStr, advance, ">"); !consumed {
		return nil, parser.NoChildren
	}

	reader.Advance(advance)
	return NewGallery(), parser.HasChildren
}

func (b *galleryParser) Continue(
	node gast.Node,
	reader text.Reader,
	pc parser.Context,
) parser.State {
	line, _ := reader.PeekLine()

	advance := 0

	lineStr := string(line)

	lineStr, advance = ConsumeSpace(lineStr, advance)

	var consumed bool

	if lineStr, advance, consumed = ConsumeLiteral(lineStr, advance, "</gallery>"); consumed {
		reader.Advance(advance)
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

const galleryTemplateText = `
<section class="gallery-section">
	<div class="gallery-div">
		<div class="gallery-img-container">
			{{- range .Images}}
			<img class="gallery-img" src="{{castStr .ImageSource | urlquery}}" alt="{{castStr .AltText| html}}">
			{{- end}}
		</div>

		<button class="gallery-button gallery-button-left"></button>
		<button class="gallery-button gallery-button-right"></button>
	</div>

    <div class="gallery-dot-container">
    </div>
</section>
`

var galleryTemplate *template.Template

func init() {
	castStr := func(b []byte) string {
		return string(b)
	}

	galleryTemplate = template.Must(
		template.New("galleryTemplate").
			Funcs(map[string]any{
				"castStr": castStr,
			}).
			Parse(galleryTemplateText),
	)
}

func (r *GalleryHTMLRenderer) renderGallery(
	w util.BufWriter,
	source []byte,
	n gast.Node,
	entering bool,
) (gast.WalkStatus, error) {
	if entering {
		if gallery, isGallery := n.(*Gallery); isGallery {
			err := galleryTemplate.Execute(
				w, gallery,
			)

			if err != nil {
				return gast.WalkStop, err
			}
		}
	}

	return gast.WalkContinue, nil
}

// ==================================
// transformer
// ==================================

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
	// document.Dump(reader.Source(), 0)

	var galleries []*Gallery

	var walkFunc func(node gast.Node, parentGallery *Gallery)

	walkFunc = func(node gast.Node, parentGallery *Gallery) {
		var nextGallery *Gallery = nil

		if parentGallery != nil {
			nextGallery = parentGallery

			if img, isImage := node.(*gast.Image); isImage {
				parentGallery.Images = append(parentGallery.Images, GalleryImage{
					AltText:     img.Text(reader.Source()),
					ImageSource: img.Destination,
				})
			}
		} else {
			if gallery, isGallery := node.(*Gallery); isGallery {
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

	for _, g := range galleries {
		g.RemoveChildren(g)
	}

	// document.Dump(reader.Source(), 0)
}

// ==================================
// extender
// ==================================

type galleryExtender struct{}

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
