"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
class BomHTML {
    constructor(element) {
        this.html = element;
    }
    add(...elements) {
        for (const e of elements) {
            if (e instanceof BomHTML) {
                this.html.appendChild(e.html);
            }
            else {
                this.html.appendChild(e);
            }
        }
        return this;
    }
    set(key, value) {
        this.html.setAttribute(key, value);
        return this;
    }
    text(str) {
        const textNode = document.createTextNode(str);
        this.html.appendChild(textNode);
        return this;
    }
    id(id) {
        this.html.id = id;
        return this;
    }
    classes(...classes) {
        for (const c of classes) {
            this.html.classList.add(c);
        }
        return this;
    }
    act(f) {
        f(this.html);
        return this;
    }
}
class BomFactory {
    constructor() {
        this.map = new Map();
    }
    create(htmlElement, name = null) {
        let bom = new BomHTML(document.createElement(htmlElement));
        if (name !== null) {
            this.map.set(name, bom);
        }
        return bom;
    }
    get(name) {
        let bom = this.map.get(name);
        if (bom === undefined) {
            throw new Error(`there is no bom named ${name}`);
        }
        return bom;
    }
}
class PostListContainer {
    constructor() {
        this.Posts = [];
    }
}
class PostContainer {
    constructor() {
        this.UUID = "";
        this.FileHash = "";
        this.Name = "";
        this.Type = "";
        this.Date = "";
        this.Dir = "";
        this.HasThumbnail = false;
        this.Thumbnail = "";
    }
}
class Post {
    constructor() {
        this.uuid = "";
        this.fileHash = "";
        this.name = "";
        this.type = "";
        this.date = "";
        this.dir = "";
        this.hasThumbnail = false;
        this.thumbnail = "";
    }
    setFromPostJsonOrThrow(json) {
        const expect = (value, type, must) => {
            if (!must && (value === null || value === undefined)) {
                switch (type) {
                    case "string": return "";
                    case "boolean": return false;
                    case "number": return 0;
                }
            }
            const actualType = typeof value;
            if (actualType !== type) {
                throw new Error(`wrong type, expected ${type}, got ${actualType}`);
            }
            return value;
        };
        this.uuid = expect(json.UUID, 'string', true);
        this.fileHash = expect(json.FileHash, 'string', true);
        this.name = expect(json.Name, 'string', true);
        this.type = expect(json.Type, 'string', true);
        this.date = expect(json.Date, 'string', true);
        this.dir = expect(json.Dir, 'string', true);
        this.hasThumbnail = expect(json.HasThumbnail, 'boolean', false);
        this.thumbnail = expect(json.Thumbnail, 'string', false);
    }
    toPostContainer() {
        const container = new PostContainer();
        container.UUID = this.uuid;
        container.FileHash = this.fileHash;
        container.Name = this.name;
        container.Type = this.type;
        container.Date = this.date;
        container.Dir = this.dir;
        container.HasThumbnail = this.hasThumbnail;
        container.Thumbnail = this.thumbnail;
        return container;
    }
    clone() {
        const clone = new Post();
        for (const key of Object.keys(this)) {
            const val = this[key];
            const valType = typeof val;
            if (valType === 'object' || Array.isArray(val)) {
                throw new Error('TODO: support cloning of object or array');
            }
            if (valType === "string" || valType === "number" || valType === "boolean") {
                clone[key] = val;
            }
        }
        return clone;
    }
    getDateTimestamp() {
        return Date.parse(this.date);
    }
    hasChanged(otherPost) {
        if (this.uuid !== otherPost.uuid) {
            throw new Error(`this ${this.name} post and other post ${otherPost.name} uuid does not match`);
        }
        for (const key of Object.keys(this)) {
            const val = this[key];
            if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
                if (val !== otherPost[key]) {
                    return true;
                }
            }
        }
        return false;
    }
}
function parsePostListJsonOrThrow(json) {
    let posts = new Map();
    if (json.Posts === null) {
        return posts;
    }
    for (const p of json.Posts) {
        const post = new Post();
        post.setFromPostJsonOrThrow(p);
        posts.set(post.uuid, post);
    }
    return posts;
}
class Stack {
    constructor() {
        this.buffer = new Array(512);
        this.length = 0;
    }
    push(thing) {
        if (this.length >= this.buffer.length) {
            let cap = this.buffer.length;
            while (cap <= this.length) {
                cap *= 2;
            }
            this.buffer.length = cap;
        }
        this.buffer[this.length] = thing;
        this.length++;
    }
    pop() {
        const toReturn = this.buffer[this.length - 1];
        this.length--;
        return toReturn;
    }
    peekAt(at) {
        return this.buffer[at];
    }
    clear() {
        this.length = 0;
    }
}
class ArrayView {
    constructor(data, start, length) {
        this.start = start;
        this.length = length;
        this.data = data;
    }
    get(at) {
        if (!(0 <= at && at < this.length)) {
            throw new Error(`index ${at} out of bound, length: ${this.length}`);
        }
        at -= this.start;
        return this.data[at];
    }
}
class LinkedList {
    constructor(value) {
        this.next = null;
        this.value = value;
    }
}
class ByteBuffer {
    constructor(type) {
        this._length = 0;
        this._buffer = new type(512);
        this._type = type;
    }
    length() {
        return this._length;
    }
    setLength(length) {
        if (this._buffer.length < length) {
            let capacity = this._buffer.length;
            while (capacity < length) {
                capacity *= 2;
            }
            this._buffer = new this._type(capacity);
        }
        this._length = length;
    }
    get(at) {
        return this._buffer[at];
    }
    set(at, value) {
        // if (!(0 <= at && at < this._length)) {
        //     throw new Error(`index out of bound !(0 <= at < ${this._length})`)
        // }
        this._buffer[at] = value;
    }
    cast(type, elementCount = this._length) {
        let view = new type(this._buffer.buffer);
        return view.subarray(0, elementCount);
    }
}
function arrayRemove(array, toRemove) {
    if (!(0 <= toRemove && toRemove < array.length)) {
        return array;
    }
    for (let i = toRemove; i + 1 < array.length; i++) {
        array[i] = array[i + 1];
    }
    array.length -= 1;
    return array;
}
function arrayRemoveFast(array, toRemove) {
    if (!(0 <= toRemove && toRemove < array.length)) {
        return array;
    }
    array[toRemove] = array[array.length - 1];
    array.length -= 1;
    return array;
}
function fuzzyMatch(str, sub) {
    if (sub.length === 0 || str.length === 0) {
        return {
            start: 0,
            length: 0,
            distance: 0
        };
    }
    const width = str.length + 1;
    const height = sub.length + 1;
    const matrix = new Array(width * height).fill(0);
    const get = (x, y) => {
        return matrix[x + y * width];
    };
    const set = (x, y, to) => {
        matrix[x + y * width] = to;
    };
    // fill the first column
    for (let y = 1; y < height; y++) {
        set(0, y, y);
    }
    for (let y = 1; y < height; y++) {
        for (let x = 1; x < width; x++) {
            const c = str[x - 1];
            const subC = sub[y - 1];
            if (c === subC) {
                set(x, y, get(x - 1, y - 1));
            }
            else {
                set(x, y, 1 + Math.min(get(x, y - 1), get(x - 1, y), get(x - 1, y - 1)));
            }
        }
    }
    let minCol = 0;
    let minDidst = Number.MAX_SAFE_INTEGER;
    for (let x = 0; x < width; x++) {
        let dist = get(x, height - 1);
        if (dist < minDidst) {
            minCol = x;
            minDidst = dist;
        }
    }
    // there is no matching word
    if (minCol === 0) {
        return {
            start: 0,
            length: 0,
            distance: minDidst
        };
    }
    let posX = minCol;
    let posY = height - 1;
    while (true) {
        let diag = get(posX - 1, posY - 1);
        let cur = get(posX, posY);
        if (diag === cur) {
            posX -= 1;
            posY -= 1;
        }
        else {
            let up = get(posX, posY - 1);
            let left = get(posX - 1, posY);
            let min = Math.min(up, left, diag);
            if (up === min) {
                posY -= 1;
            }
            else if (diag === min) {
                posX -= 1;
                posY -= 1;
            }
            else { // left === min
                posX -= 1;
            }
        }
        if (posX <= 0 || posY <= 0) {
            break;
        }
    }
    return {
        start: posX,
        length: minCol - posX,
        distance: minDidst
    };
}
function mustGetElementById(id) {
    const elem = document.getElementById(id);
    if (elem === null) {
        throw new Error(`failed to get ${id}`);
    }
    return elem;
}
function blurItAndChildren(element) {
    const toRecurse = (e) => {
        e.blur();
        //@ts-expect-error
        for (const child of e.children) {
            toRecurse(child);
        }
    };
    toRecurse(element);
}
class Gallery {
    constructor(gallerySection) {
        this.images = [];
        this.selectedImg = 0;
        this.isDragging = false;
        this.touchID = 0;
        this.touchPrevX = 0;
        this.touchOffset = 0;
        this.galleryDots = [];
        this.animation = null;
        this.gallerySection = gallerySection;
        // ======================
        // get child elements
        // ======================
        const mustSelect = (toSelect) => {
            const toReturn = gallerySection.querySelector(toSelect);
            if (toReturn === null) {
                throw new Error(`failed to get ${toSelect}`);
            }
            return toReturn;
        };
        const mustSelectAll = (toSelect) => {
            return gallerySection.querySelectorAll(toSelect);
        };
        this.galleryDiv = mustSelect('.gallery-div');
        const galleryContainer = mustSelect('.gallery-img-container');
        const galleryImages = mustSelectAll('.gallery-img');
        this.galleryContainer = galleryContainer;
        for (let i = 0; i < galleryImages.length; i++) {
            const img = galleryImages[i];
            this.images.push(img);
        }
        const leftButton = mustSelect('.gallery-button-left');
        const rightButton = mustSelect('.gallery-button-right');
        const dotContainer = mustSelect('.gallery-dot-container');
        // ======================
        // set up button logic
        // ======================
        leftButton.onclick = () => {
            if (this.images.length <= 0) {
                return;
            }
            if (this.selectedImg <= 0) {
                this.animateStuck(true);
            }
            else {
                this.showPrev(false);
            }
        };
        rightButton.onclick = () => {
            if (this.images.length <= 0) {
                return;
            }
            if (this.selectedImg === this.images.length - 1) {
                this.animateStuck(false);
            }
            else {
                this.showNext(false);
            }
        };
        // ======================
        // set up dots
        // ======================
        for (let i = 0; i < this.images.length; i++) {
            const dot = document.createElement('div');
            dot.classList.add('gallery-dot');
            dot.onclick = () => {
                console.log(`clicked ${i}`);
                this.selectImage(i, false);
            };
            dotContainer.appendChild(dot);
            this.galleryDots.push(dot);
        }
        // ======================
        // set up resizing
        // ======================
        window.addEventListener('resize', () => {
            this.onResize();
        });
        // ======================
        // set up touch logic
        // ======================
        this.galleryDiv.addEventListener('touchstart', (e) => {
            var _a, _b;
            if (this.isDragging) {
                return;
            }
            if (!(e.target instanceof Element)) {
                return;
            }
            if (!((_a = e.target) === null || _a === void 0 ? void 0 : _a.classList.contains('gallery-button-left')) &&
                !((_b = e.target) === null || _b === void 0 ? void 0 : _b.classList.contains('gallery-button-right'))) {
                if (e.touches.length === 1) {
                    this.skipAnimation();
                    this.isDragging = true;
                    this.touchOffset = 0;
                    this.touchID = e.touches[0].identifier;
                    this.touchPrevX = e.touches[0].clientX;
                }
            }
        });
        this.galleryDiv.addEventListener('touchmove', (e) => {
            if (!this.isDragging) {
                return;
            }
            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                if (touch.identifier === this.touchID) {
                    this.touchOffset += touch.clientX - this.touchPrevX;
                    this.touchPrevX = touch.clientX;
                    this.galleryContainer.style.transform = `translateX(${this.touchOffset}px)`;
                    return;
                }
            }
        });
        const onTouchEnd = (e) => {
            if (!this.isDragging) {
                return;
            }
            let foundTouch = false;
            for (let i = 0; i < e.touches.length; i++) {
                const touch = e.touches[i];
                if (touch.identifier === this.touchID) {
                    foundTouch = true;
                    break;
                }
            }
            if (!foundTouch) {
                console.log('touch ended');
                if (Math.abs(this.touchOffset) > 50) {
                    if (this.touchOffset < 0) {
                        this.showNext(true);
                    }
                    else {
                        this.showPrev(true);
                    }
                }
                this.galleryContainer.style.transform = `translateX(0px)`;
                this.isDragging = false;
                this.touchOffset = 0;
            }
        };
        this.galleryDiv.addEventListener('touchend', (e) => {
            onTouchEnd(e);
        });
        this.galleryDiv.addEventListener('touchcancel', (e) => {
            onTouchEnd(e);
        });
        // ===============================================
        // wait for images to load then determine layout
        // ===============================================
        const waitImageLoading = (img) => {
            //TODO : handle error
            return new Promise((res, rej) => {
                if (img.complete) {
                    res();
                }
                else {
                    img.addEventListener('load', () => {
                        console.log('loaded');
                        res();
                    });
                }
            });
        };
        const waitAndResize = () => __awaiter(this, void 0, void 0, function* () {
            const promises = [];
            for (const img of this.images) {
                promises.push(waitImageLoading(img));
            }
            yield Promise.all(promises);
            this.onResize();
        });
        waitAndResize();
    }
    skipAnimation() {
        if (this.animation !== null) {
            this.animation.finish();
            this.animation.commitStyles();
            this.animation.cancel();
        }
        this.animation = null;
    }
    onResize() {
        const galleryRect = this.galleryDiv.getBoundingClientRect();
        for (const img of this.images) {
            const scaleX = galleryRect.width / img.naturalWidth;
            const scaleY = galleryRect.height / img.naturalHeight;
            const scale = Math.min(scaleX, scaleY);
            let w = img.naturalWidth * scale;
            let h = img.naturalHeight * scale;
            w -= Gallery.GalleryMargin;
            h -= Gallery.GalleryMargin;
            w = Math.max(w, 0);
            h = Math.max(h, 0);
            img.style.width = `${w}px`;
            img.style.minWidth = `${w}px`;
            img.style.maxWidth = `${w}px`;
            img.style.height = `${h}px`;
            img.style.minHeight = `${h}px`;
            img.style.maxHeight = `${h}px`;
        }
        this.selectImage(this.selectedImg, true);
    }
    selectImage(index, noAnimation) {
        if (this.images.length <= 0) {
            return;
        }
        this.skipAnimation();
        index = Math.min(index, this.images.length - 1);
        index = Math.max(index, 0);
        this.selectedImg = index;
        const img = this.images[this.selectedImg];
        const imgRect = img.getBoundingClientRect();
        const galleryRect = this.galleryDiv.getBoundingClientRect();
        const galleryCenterX = galleryRect.x + galleryRect.width * 0.5;
        const imgCenterX = imgRect.x + imgRect.width * 0.5;
        const containerRect = this.galleryContainer.getBoundingClientRect();
        const newX = containerRect.x + (galleryCenterX - imgCenterX) - galleryRect.x;
        if (noAnimation) {
            this.galleryContainer.style.left = `${newX}px`;
        }
        else {
            this.animation = this.galleryContainer.animate([
                {
                    left: `${containerRect.x - galleryRect.x}px`
                },
                {
                    left: `${newX}px`
                },
            ], {
                fill: "forwards",
                duration: 60,
                easing: "ease-out"
            });
        }
        for (const dot of this.galleryDots) {
            dot.classList.remove('gallery-dot-selected');
        }
        if (0 <= this.selectedImg && this.selectedImg < this.galleryDots.length) {
            this.galleryDots[this.selectedImg].classList.add('gallery-dot-selected');
        }
    }
    showNext(noAnimation) {
        this.selectImage(this.selectedImg + 1, noAnimation);
    }
    showPrev(noAnimation) {
        this.selectImage(this.selectedImg - 1, noAnimation);
    }
    animateStuck(left) {
        this.skipAnimation();
        const keyframes = [];
        const galleryRect = this.galleryDiv.getBoundingClientRect();
        const containerRect = this.galleryContainer.getBoundingClientRect();
        const currentX = containerRect.x - galleryRect.x;
        const amount = 5;
        keyframes.push({ left: `${currentX}px` });
        if (left) {
            keyframes.push({ left: `${currentX + amount}px` });
        }
        else {
            keyframes.push({ left: `${currentX - amount}px` });
        }
        keyframes.push({ left: `${currentX}px` });
        this.animation = this.galleryContainer.animate(keyframes, {
            fill: "forwards",
            duration: 200,
            easing: "ease-out"
        });
    }
}
Gallery.GalleryMargin = 10; // constant
const gallerySections = document.getElementsByClassName('gallery-section');
for (let i = 0; i < gallerySections.length; i++) {
    const section = gallerySections[i];
    new Gallery(section);
}
