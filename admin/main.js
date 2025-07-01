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
class PostContainer {
    constructor() {
        this.UUID = "";
        this.Name = "";
        this.Type = "";
        this.Date = "";
        this.Dir = "";
    }
}
class Post {
    constructor() {
        this.uuid = "";
        this.name = "";
        this.type = "";
        this.date = "";
        this.dir = "";
    }
    setFromPostContainer(container) {
        this.uuid = container.UUID;
        this.name = container.Name;
        this.type = container.Type;
        this.date = container.Date;
        this.dir = container.Dir;
    }
    getDateTimestamp() {
        return Date.parse(this.date);
    }
    hasChanged(otherPost) {
        if (this.uuid !== otherPost.uuid) {
            throw new Error(`this ${this.name} post and other post ${otherPost.name} uuid does not match`);
        }
        for (const key in this) {
            if (this[key] !== otherPost[key]) {
                return true;
            }
        }
        return false;
    }
}
function objHasMatchingKeys(obj, instance, forgiveMissingProperties) {
    const keys = Reflect.ownKeys(instance);
    for (const key of keys) {
        const instanceType = typeof instance[key];
        const objType = typeof obj[key];
        if (forgiveMissingProperties && objType === 'undefined') {
            continue;
        }
        if (instanceType !== objType) {
            return false;
        }
        if (instanceType == "object") {
            if (Array.isArray(instance[key])) {
                if (!Array.isArray(obj[key])) {
                    return false;
                }
            }
            else {
                if (!objHasMatchingKeys(instance[key], obj[key], forgiveMissingProperties)) {
                    return false;
                }
            }
        }
    }
    return true;
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
let PostListEntryIdMax = -1;
function getNewPostListEntryId() {
    PostListEntryIdMax += 1;
    return PostListEntryIdMax;
}
class PostList {
    constructor() {
        this.listEntries = [];
        this.draggingEntry = null;
        const listDiv = document.getElementById('post-list');
        if (listDiv === null) {
            throw new Error('could not find post-list');
        }
        this.listDiv = listDiv;
    }
    addEntry(post) {
        const clearDragHoverStyle = (entry) => {
            entry.containerDiv.style.backgroundColor = 'transparent';
        };
        // =======================
        // create entry
        // =======================
        const entry = {
            id: getNewPostListEntryId(),
            containerDiv: document.createElement('div'),
            contentDiv: document.createElement('div'),
        };
        entry.containerDiv.classList.add('list-container-div');
        entry.contentDiv.classList.add('list-content-div');
        entry.containerDiv.appendChild(entry.contentDiv);
        // add things in post
        {
            const addP = (text) => {
                const p = document.createElement('p');
                p.innerText = text;
                p.style.margin = '10px';
                entry.contentDiv.appendChild(p);
            };
            addP(post.name);
            addP(post.type);
            const d = new Date(post.date);
            addP(`${d.getFullYear()}/${d.getMonth()}/${d.getDate()}`);
            addP(post.dir);
        }
        this.listDiv.appendChild(entry.containerDiv);
        // =======================================
        // attach drag handling logic
        // =======================================
        entry.contentDiv.draggable = true;
        entry.contentDiv.addEventListener('dragstart', () => {
            this.draggingEntry = entry;
        });
        entry.containerDiv.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (this.draggingEntry !== null &&
                entry.id === this.draggingEntry.id) {
                return;
            }
            let appendBefore = true;
            const rect = entry.containerDiv.getBoundingClientRect();
            if (e.clientY > rect.y + rect.height * 0.5) {
                appendBefore = false;
            }
            if (appendBefore) {
                entry.containerDiv.style.backgroundColor = 'red';
            }
            else {
                entry.containerDiv.style.backgroundColor = 'blue';
            }
        });
        entry.containerDiv.addEventListener('dragleave', (e) => {
            clearDragHoverStyle(entry);
        });
        entry.containerDiv.addEventListener('drop', (e) => {
            e.preventDefault();
            clearDragHoverStyle(entry);
            console.log(e);
            if (this.draggingEntry === null) {
                return;
            }
            if (this.draggingEntry.id === entry.id) {
                return;
            }
            const rect = entry.containerDiv.getBoundingClientRect();
            let appendBefore = true;
            if (e.clientY > rect.y + rect.height * 0.5) {
                appendBefore = false;
            }
            if (appendBefore) {
                entry.containerDiv.before(this.draggingEntry.containerDiv);
            }
            else {
                entry.containerDiv.after(this.draggingEntry.containerDiv);
            }
        });
    }
}
(() => __awaiter(void 0, void 0, void 0, function* () {
    const postList = new PostList();
    const res = yield fetch('/api/get-posts');
    if (res.status !== 200) {
        console.error('request failed');
        if (res.headers.get('Content-Type') === 'application/json') {
            const json = yield res.json();
            console.error(json);
        }
    }
    const json = yield res.json();
    console.log(json);
    if (json.Result === 'success') {
        var oldPosts = new Map();
        var newPosts = new Map();
        {
            const dummyContainer = new PostContainer();
            for (const p of json.Old.Posts) {
                if (objHasMatchingKeys(p, dummyContainer, false)) {
                    const post = new Post();
                    post.setFromPostContainer(p);
                    oldPosts.set(post.uuid, post);
                }
            }
            for (const p of json.New.Posts) {
                if (objHasMatchingKeys(p, dummyContainer, false)) {
                    const post = new Post();
                    post.setFromPostContainer(p);
                    newPosts.set(post.uuid, post);
                }
            }
        }
        // TODO: mark changed posts
        const addedPosts = new Map();
        for (const p of newPosts.values()) {
            if (!oldPosts.has(p.uuid)) {
                addedPosts.set(p.uuid, p);
            }
        }
        for (const p of oldPosts.values()) {
            postList.addEntry(p);
        }
        for (const p of addedPosts.values()) {
            postList.addEntry(p);
        }
    }
    else {
        console.error(json);
    }
    console.log(json);
}))();
