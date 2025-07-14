class Gallery {
    static GalleryMargin: number = 10 // constant

    images: Array<HTMLImageElement> = []

    selectedImg: number = 0

    gallerySection: HTMLElement
    galleryDiv: HTMLElement
    galleryContainer: HTMLElement

    isDragging: boolean = false;
    touchID: number = 0
    touchPrevX: number = 0
    touchOffset: number = 0;

    galleryDots: Array<HTMLElement> = []

    animation: Animation | null = null

    constructor(gallerySection: HTMLElement) {
        this.gallerySection = gallerySection

        // ======================
        // get child elements
        // ======================
        const mustSelect = (toSelect: string): HTMLElement => {
            const toReturn = gallerySection.querySelector(toSelect)
            if (toReturn === null) {
                throw new Error(`failed to get ${toSelect}`)
            }
            return toReturn as HTMLElement
        }

        const mustSelectAll = (toSelect: string): NodeList => {
            return gallerySection.querySelectorAll(toSelect)
        }

        this.galleryDiv = mustSelect('.gallery-div')

        const galleryContainer = mustSelect('.gallery-img-container')
        const galleryImages = mustSelectAll('.gallery-img')

        this.galleryContainer = galleryContainer as HTMLElement
        for (let i = 0; i < galleryImages.length; i++) {
            const img = galleryImages[i]
            this.images.push(img as HTMLImageElement)
        }

        const leftButton = mustSelect('.gallery-button-left')
        const rightButton = mustSelect('.gallery-button-right')

        const dotContainer = mustSelect('.gallery-dot-container')

        // ======================
        // set up button logic
        // ======================
        leftButton.onclick = () => {
            if (this.images.length <= 0) {
                return
            }
            if (this.selectedImg <= 0) {
                this.animateStuck(true)
            } else {
                this.showPrev(false)
            }
        }

        rightButton.onclick = () => {
            if (this.images.length <= 0) {
                return
            }
            if (this.selectedImg === this.images.length - 1) {
                this.animateStuck(false)
            } else {
                this.showNext(false)
            }
        }

        // ======================
        // set up dots
        // ======================
        for (let i = 0; i < this.images.length; i++) {
            const dot = document.createElement('div')
            dot.classList.add('gallery-dot')
            dot.onclick = () => {
                console.log(`clicked ${i}`)
                this.selectImage(i, false)
            }

            dotContainer.appendChild(dot)
            this.galleryDots.push(dot)
        }

        // ======================
        // set up resizing
        // ======================
        window.addEventListener('resize', () => {
            this.onResize()
        })

        // ======================
        // set up touch logic
        // ======================
        this.galleryDiv.addEventListener('touchstart', (e) => {
            if (this.isDragging) {
                return
            }

            if (!(e.target instanceof Element)) {
                return
            }

            if (
                !e.target?.classList.contains('gallery-button-left') &&
                !e.target?.classList.contains('gallery-button-right')
            ) {
                if (e.touches.length === 1) {
                    this.skipAnimation()

                    this.isDragging = true
                    this.touchOffset = 0
                    this.touchID = e.touches[0].identifier
                    this.touchPrevX = e.touches[0].clientX
                }
            }
        })

        this.galleryDiv.addEventListener('touchmove', (e) => {
            if (!this.isDragging) {
                return
            }

            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i]
                if (touch.identifier === this.touchID) {
                    this.touchOffset += touch.clientX - this.touchPrevX
                    this.touchPrevX = touch.clientX

                    this.galleryContainer.style.transform = `translateX(${this.touchOffset}px)`

                    return
                }
            }
        })

        const onTouchEnd = (e: TouchEvent) => {
            if (!this.isDragging) {
                return
            }

            let foundTouch = false

            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i]
                if (touch.identifier === this.touchID) {
                    foundTouch = true
                    break
                }
            }

            if (!foundTouch) {
                console.log('touch ended')

                if (Math.abs(this.touchOffset) > 50) {
                    if (this.touchOffset < 0) {
                        this.showNext(true)
                    } else {
                        this.showPrev(true)
                    }
                }

                this.galleryContainer.style.transform = `translateX(0px)`

                this.isDragging = false
                this.touchOffset = 0
            }
        }

        this.galleryDiv.addEventListener('touchend', (e) => {
            onTouchEnd(e)
        })

        this.galleryDiv.addEventListener('touchcancel', (e) => {
            onTouchEnd(e)
        })

        // ===============================================
        // wait for images to load then determine layout
        // ===============================================
        this.onResize()

        const waitImageLoading = (img: HTMLImageElement): Promise<void> => {
            return new Promise((res, rej) => {
                if (img.complete) {
                    res()
                } else {
                    img.addEventListener('load', () => {
                        res()
                    })
                    img.addEventListener('error', () => {
                        // we just resolve it even though error occured loading
                        res()
                    })
                }
            })
        }

        const waitAndResize = async () => {
            const promises = []

            for (const img of this.images) {
                promises.push(waitImageLoading(img))
            }

            await Promise.all(promises)

            console.log('done waiting')

            this.onResize()
        }

        waitAndResize()
    }

    skipAnimation() {
        if (this.animation !== null) {
            this.animation.finish()
            this.animation.commitStyles()
            this.animation.cancel()
        }
        this.animation = null
    }

    onResize() {
        const galleryRect = this.galleryDiv.getBoundingClientRect()

        for (const img of this.images) {
            let imgWidth = img.naturalWidth
            let imgHeight = img.naturalHeight

            // handle missing image
            if (imgWidth === 0 && imgHeight === 0) {
                const half = Math.min(galleryRect.width, galleryRect.height) * 0.5

                img.style.width = `${half}px`
                img.style.minWidth = `${half}px`
                img.style.maxWidth = `${half}px`

                img.style.height = `auto`
                img.style.maxHeight = `${half}px`

                continue;
            }

            if (imgWidth < 1) {
                imgWidth = Math.min(galleryRect.width, galleryRect.height) * 0.5
            }
            if (imgHeight < 1) {
                imgHeight = Math.min(galleryRect.width, galleryRect.height) * 0.5
            }

            const scaleX = galleryRect.width / imgWidth
            const scaleY = galleryRect.height / imgHeight

            const scale = Math.min(scaleX, scaleY)

            let w = imgWidth * scale
            let h = imgHeight * scale

            w -= Gallery.GalleryMargin;
            h -= Gallery.GalleryMargin;

            w = Math.max(w, 0)
            h = Math.max(h, 0)

            img.style.width = `${w}px`
            img.style.minWidth = `${w}px`
            img.style.maxWidth = `${w}px`

            img.style.height = `${h}px`
            img.style.minHeight = `${h}px`
            img.style.maxHeight = `${h}px`
        }

        this.selectImage(this.selectedImg, true)
    }

    selectImage(index: number, noAnimation: boolean) {
        if (this.images.length <= 0) {
            return
        }

        this.skipAnimation()

        index = Math.min(index, this.images.length - 1)
        index = Math.max(index, 0)

        this.selectedImg = index

        const img = this.images[this.selectedImg]

        const imgRect = img.getBoundingClientRect()
        const galleryRect = this.galleryDiv.getBoundingClientRect()

        const galleryCenterX = galleryRect.x + galleryRect.width * 0.5
        const imgCenterX = imgRect.x + imgRect.width * 0.5

        const containerRect = this.galleryContainer.getBoundingClientRect()

        const newX = containerRect.x + (galleryCenterX - imgCenterX) - galleryRect.x

        if (noAnimation) {
            this.galleryContainer.style.left = `${newX}px`
        } else {
            this.animation = this.galleryContainer.animate(
                [
                    {
                        left: `${containerRect.x - galleryRect.x}px`
                    },
                    {
                        left: `${newX}px`
                    },
                ],
                {
                    fill: "forwards",
                    duration: 60,
                    easing: "ease-out"
                }
            )
        }

        for (const dot of this.galleryDots) {
            dot.classList.remove('gallery-dot-selected')
        }

        if (0 <= this.selectedImg && this.selectedImg < this.galleryDots.length) {
            this.galleryDots[this.selectedImg].classList.add('gallery-dot-selected')
        }
    }

    showNext(noAnimation: boolean) {
        this.selectImage(this.selectedImg + 1, noAnimation)
    }

    showPrev(noAnimation: boolean) {
        this.selectImage(this.selectedImg - 1, noAnimation)
    }

    animateStuck(left: boolean) {
        this.skipAnimation()

        const keyframes: Array<Keyframe> = []

        const galleryRect = this.galleryDiv.getBoundingClientRect()
        const containerRect = this.galleryContainer.getBoundingClientRect()

        const currentX = containerRect.x - galleryRect.x
        const amount = 5

        keyframes.push({ left: `${currentX}px` })
        if (left) {
            keyframes.push({ left: `${currentX + amount}px` })
        } else {
            keyframes.push({ left: `${currentX - amount}px` })
        }
        keyframes.push({ left: `${currentX}px` })

        this.animation = this.galleryContainer.animate(
            keyframes,
            {
                fill: "forwards",
                duration: 200,
                easing: "ease-out"
            }
        )
    }
}

const gallerySections = document.getElementsByClassName('gallery-section')

for (let i = 0; i < gallerySections.length; i++) {
    const section = gallerySections[i]
    new Gallery(section as HTMLElement)
}
