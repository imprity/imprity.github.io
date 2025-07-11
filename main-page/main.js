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
let ColumnContainer = mustGetElementById('column-container');
let Columns = [];
let PostElements = [];
let ColumnCount = 1;
function onResize() {
    let columnCountStr = getComputedStyle(document.documentElement).getPropertyValue('--post-column-count');
    let postColumnCount = parseInt(columnCountStr);
    if (isNaN(postColumnCount)) {
        console.error('Failed to parse css --post-column-count value to number\n' +
            'Setting it to 1');
        postColumnCount = 1;
    }
    changeColumnCount(postColumnCount);
}
let changeColumnCountFirstTime = true;
let changeColumnCount = function (count) {
    if (ColumnCount === count && !changeColumnCountFirstTime) {
        return;
    }
    changeColumnCountFirstTime = true;
    ColumnCount = count;
    for (const column of Columns) {
        column.remove();
    }
    Columns.length = 0;
    for (let i = 0; i < ColumnCount; i++) {
        let column = document.createElement('div');
        column.className = 'post-column';
        ColumnContainer.appendChild(column);
        Columns.push(column);
    }
    let columnIndex = 0;
    for (const post of PostElements) {
        Columns[columnIndex].appendChild(post);
        columnIndex += 1;
        columnIndex = columnIndex % ColumnCount;
    }
};
window.onresize = onResize;
function generateExternalLinksPost() {
    const f = new BomFactory();
    const html = f.create('div').classes('post-box').add(f.create('div').classes('external-link').add(f.create('img').classes('external-link-icon')
        .set('src', 'main-page/icon-github.svg')
        .set('alt', 'github icon'), f.create('a').set('href', 'https://github.com/imprity').text('github')), f.create('div').classes('external-link').add(f.create('img').classes('external-link-icon')
        .set('src', 'main-page/icon-itchio.svg')
        .set('alt', 'itch.io icon'), f.create('a').set('href', 'https://imprity.itch.io/').text('itch.io')), f.create('div').classes('external-link').add(f.create('img').classes('external-link-icon')
        .set('src', 'main-page/icon-email.svg')
        .set('alt', 'email icon'), f.create('p').text('imprity041@gmail.com')));
    return html.html;
}
function generatePostBoxFromPost(post) {
    let childDiv = document.createElement('div');
    childDiv.className = 'post-box';
    let href = "/public/" + post.dir + "/";
    let onclick = () => {
        window.location.pathname = href;
    };
    if (post.hasThumbnail) {
        console.log(`creating thumbnail for ${post.name}`);
        let thumbnail = document.createElement('img');
        thumbnail.src = "/public/" + post.dir + "/" + post.thumbnail;
        thumbnail.onclick = onclick;
        thumbnail.className = 'post-thumbnail';
        childDiv.append(thumbnail);
    }
    let title = document.createElement('a');
    title.classList = 'post-title';
    title.innerText = post.name;
    title.href = href;
    title.className = 'post-title';
    childDiv.append(title);
    let date = document.createElement('p');
    date.classList.add('post-date');
    date.innerText = new Date(post.date).toDateString();
    childDiv.appendChild(date);
    return childDiv;
}
(() => __awaiter(void 0, void 0, void 0, function* () {
    PostElements.push(generateExternalLinksPost());
    try {
        let res = yield fetch('/post-list.json');
        let json = yield res.json();
        const posts = parsePostListJsonOrThrow(json);
        for (const post of posts.values()) {
            PostElements.push(generatePostBoxFromPost(post));
        }
        if (PostElements.length === 0) {
            mustGetElementById('empty-list').style.visibility = "visible";
        }
    }
    catch (err) {
        console.error(err);
        let errorDiv = mustGetElementById('error-message');
        errorDiv.style.display = 'block';
        errorDiv.innerText = 'Failed to get posts';
    }
    onResize();
}))();
