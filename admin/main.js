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
    toPostContainer() {
        const container = new PostContainer();
        container.UUID = this.uuid;
        container.Name = this.name;
        container.Type = this.type;
        container.Date = this.date;
        container.Dir = this.dir;
        return container;
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
    clone() {
        const clone = new Post();
        clone.uuid = this.uuid;
        clone.name = this.name;
        clone.type = this.type;
        clone.date = this.date;
        clone.dir = this.dir;
        return clone;
    }
}
class PostListContainer {
    constructor() {
        this.Posts = [];
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
        this.listEntries = new Map();
        this.draggingEntry = null;
        const listDiv = mustGetElementById('post-list');
        this.listDiv = listDiv;
        this.oldPosts = new Map();
        this.newPosts = new Map();
        const submitButton = mustGetElementById('submit-button');
        submitButton.onclick = () => __awaiter(this, void 0, void 0, function* () {
            yield this.submit();
        });
    }
    setPostList(oldPosts, newPosts) {
        this.oldPosts = oldPosts;
        this.newPosts = newPosts;
        const addedPosts = new Map();
        for (const p of newPosts.values()) {
            if (!oldPosts.has(p.uuid)) {
                addedPosts.set(p.uuid, p);
            }
        }
        const deletedPosts = new Map();
        for (const p of oldPosts.values()) {
            if (!newPosts.has(p.uuid)) {
                deletedPosts.set(p.uuid, p);
            }
        }
        const allPosts = new Map();
        for (const p of oldPosts.values()) {
            allPosts.set(p.uuid, p);
        }
        for (const p of addedPosts.values()) {
            allPosts.set(p.uuid, p);
        }
        for (let post of allPosts.values()) {
            const markedForDeletion = deletedPosts.has(post.uuid);
            this.addEntry(post.clone(), markedForDeletion);
        }
    }
    addEntry(post, markedForDeletion) {
        const f = new BomFactory();
        let containerDiv;
        let nameInput;
        let dateInput;
        let dateStatus;
        let deleteStatus;
        let dragHandle;
        let listOverlay;
        containerDiv = f.create('div').classes('list-container-div').add((f.create('div').classes('list-content-div').add(f.create('label').text('name'), (nameInput = f.create('div').classes('list-name-input').set('contenteditable', 'plaintext-only').html), f.create('label').text('YYYY/MM/DD ').add((dateInput = f.create('input').classes('date-input').set('type', 'text').set('size', '15').html), (dateStatus = f.create('span').text('\u2705').html)), (deleteStatus = f.create('p').text('DELETED').html)).html), (dragHandle = f.create('div').set('draggable', 'true').classes('list-handle', 'noselect').text(':::').html), (listOverlay = f.create('div').classes('list-overlay').html)).set('post-uuid', post.uuid).html;
        this.listDiv.appendChild(containerDiv);
        const entry = {
            id: getNewPostListEntryId(),
            post: post,
            containerDiv: containerDiv,
            markedForDeletion: markedForDeletion
        };
        // this.listEntries.push(entry)
        this.listEntries.set(entry.post.uuid, entry);
        // add name input
        {
            nameInput.innerText = post.name;
            let oldInnerText = nameInput.innerText;
            nameInput.addEventListener('input', (e) => {
                const inputEvent = e;
                if (inputEvent.inputType === "insertLineBreak") {
                    nameInput.innerText = nameInput.innerText.replace(/\n/g, "");
                    nameInput.blur();
                }
            });
            nameInput.addEventListener('focusout', (e) => {
                const newName = nameInput.innerText.trim();
                if (oldInnerText !== newName) {
                    console.log(newName);
                    post.name = newName;
                }
                oldInnerText = newName;
                nameInput.innerText = newName;
            });
        }
        // add date input
        {
            // TODO : this code is wrong
            // we are not accounting for the time zone.
            // Some post might have been written in America, while other post might have been written in Korea.
            // But javascript will convert everything to current browser's timezone.
            // So if your post is submitted in America on January 31, it might be February in Korea.
            // And Date calculation needs to happen relative to post's timezone.
            //
            // When user says change Post's date from January 12 to January 13, they probably mean January 1 of where that post was written.
            //
            // So use Day.js or something later.
            const padZero = (numStr, howMany) => {
                while (numStr.length < howMany) {
                    numStr = "0" + numStr;
                }
                return numStr;
            };
            const setDateInputValueToPostDate = () => {
                let date = new Date(post.date);
                dateInput.value = `${date.getFullYear()}/${padZero((date.getMonth() + 1).toString(), 2)}/${padZero(date.getDate().toString(), 2)}`;
            };
            setDateInputValueToPostDate();
            const validateDateString = (str) => {
                const re = /^\s*(\d\d\d\d)[ /-](\d\d?)[ /-](\d\d?)\s*$/;
                const match = str.match(re);
                if (match === null) {
                    return null;
                }
                const yearStr = match[1];
                const monthStr = match[2];
                const dateStr = match[3];
                if (yearStr === undefined || monthStr === undefined || dateStr === undefined) {
                    return null;
                }
                const year = parseInt(yearStr);
                const month = parseInt(monthStr);
                const date = parseInt(dateStr);
                if (isNaN(year) || isNaN(month) || isNaN(date)) {
                    return null;
                }
                if (!(1 <= month && month <= 12)) {
                    return null;
                }
                if (!(1 <= date)) {
                    return null;
                }
                return {
                    year: year,
                    month: month,
                    date: date
                };
            };
            dateInput.addEventListener('input', (e) => {
                const res = validateDateString(dateInput.value);
                if (res === null) {
                    dateStatus.innerText = '\u274C';
                }
                else {
                    dateStatus.innerText = '\u2705';
                }
            });
            dateInput.addEventListener('change', (e) => {
                const res = validateDateString(dateInput.value);
                let date = new Date(post.date);
                if (res !== null) {
                    date.setFullYear(res.year);
                    date.setMonth(res.month - 1);
                    date.setDate(res.date);
                    post.date = date.toISOString();
                    console.log(`set post date to ${date.toISOString()}`);
                }
                setDateInputValueToPostDate();
                dateStatus.innerText = '\u2705';
            });
        }
        // add delete status
        {
            deleteStatus.style.color = 'red';
            if (!entry.markedForDeletion) {
                deleteStatus.style.display = "none";
            }
        }
        // add drag logic
        {
            const clearDragHoverStyle = () => {
                listOverlay.classList.remove('list-overlay-hl-top', 'list-overlay-hl-bottom');
            };
            dragHandle.addEventListener('dragstart', (e) => {
                containerDiv.classList.add('list-cotainer-div-dragged');
                this.draggingEntry = entry;
                if (e.dataTransfer !== null) {
                    const handleRect = dragHandle.getBoundingClientRect();
                    const containerRect = containerDiv.getBoundingClientRect();
                    const offsetX = e.clientX - handleRect.x;
                    const offsetY = e.clientY - handleRect.y;
                    e.dataTransfer.setDragImage(containerDiv, handleRect.x - containerRect.x + offsetX, handleRect.y - containerRect.y + offsetY);
                }
            });
            containerDiv.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (this.draggingEntry !== null &&
                    entry.id === this.draggingEntry.id) {
                    return;
                }
                const rect = entry.containerDiv.getBoundingClientRect();
                let appendBefore = true;
                if (e.clientY > rect.y + rect.height * 0.5) {
                    appendBefore = false;
                }
                clearDragHoverStyle();
                if (appendBefore) {
                    listOverlay.classList.add('list-overlay-hl-top');
                }
                else {
                    listOverlay.classList.add('list-overlay-hl-bottom');
                }
            });
            containerDiv.addEventListener('dragleave', (e) => {
                e.preventDefault();
                if (e.relatedTarget instanceof Element &&
                    containerDiv.contains(e.relatedTarget)) {
                    return;
                }
                clearDragHoverStyle();
            });
            containerDiv.addEventListener('drop', (e) => {
                e.preventDefault();
                clearDragHoverStyle();
                if (this.draggingEntry === null) {
                    return;
                }
                if (this.draggingEntry.id === entry.id) {
                    return;
                }
                const rect = containerDiv.getBoundingClientRect();
                let appendBefore = true;
                if (e.clientY > rect.y + rect.height * 0.5) {
                    appendBefore = false;
                }
                if (appendBefore) {
                    containerDiv.before(this.draggingEntry.containerDiv);
                }
                else {
                    containerDiv.after(this.draggingEntry.containerDiv);
                }
            });
            dragHandle.addEventListener('dragend', (e) => {
                containerDiv.classList.remove('list-cotainer-div-dragged');
                this.draggingEntry = null;
            });
        }
    }
    submit() {
        return __awaiter(this, void 0, void 0, function* () {
            const containers = [];
            for (let i = 0; i < this.listDiv.children.length; i++) {
                const div = this.listDiv.children[i];
                const uuid = div.getAttribute('post-uuid');
                if (uuid === null) {
                    continue;
                }
                const listEntry = this.listEntries.get(uuid);
                if (listEntry === undefined) {
                    continue;
                }
                if (listEntry.markedForDeletion) {
                    continue;
                }
                containers.push(listEntry.post.toPostContainer());
            }
            const postList = new PostListContainer();
            postList.Posts = containers;
            const res = yield fetch('/api/update-posts', {
                method: 'PUT',
                headers: {
                    'Content-type': 'application/json'
                },
                body: JSON.stringify(postList)
            });
            if (res.status !== 200) {
                // TODO : report error better
                console.error('request failed');
                if (res.headers.get('Content-Type') === 'application/json') {
                    const json = yield res.json();
                    console.error(json);
                }
                return;
            }
            let json = yield res.json();
            // for (let i = 0; i < this.listDiv.children.length; i++) {
            //     this.listDiv.children[i].remove()
            // }
            while (this.listDiv.children.length > 0) {
                this.listDiv.children[0].remove();
            }
            this.oldPosts.clear();
            this.newPosts.clear();
            const dummyContainer = new PostContainer();
            for (const p of json.PostList.Posts) {
                if (objHasMatchingKeys(p, dummyContainer, false)) {
                    const post = new Post();
                    post.setFromPostContainer(p);
                    this.oldPosts.set(post.uuid, post);
                    this.newPosts.set(post.uuid, post);
                    this.addEntry(post, false);
                }
            }
        });
    }
}
(() => __awaiter(void 0, void 0, void 0, function* () {
    const postList = new PostList();
    const res = yield fetch('/api/get-posts');
    if (res.status !== 200) {
        // TODO : report error better
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
        postList.setPostList(oldPosts, newPosts);
    }
    else {
        console.error(json);
    }
    console.log(json);
}))();
