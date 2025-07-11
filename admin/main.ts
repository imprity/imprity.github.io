enum PostStatus {
    Normal,
    Added,
    Deleted,
    Changed,
}

const ColorError = 'var(--red)'
const ColorSuccess = 'var(--dark-green)'

function report(text: string, color: string) {
    const reportText = document.getElementById('report-text')
    if (reportText !== null) {
        reportText.innerText = text
        reportText.style.color = color
    }
}

interface PostListEntry {
    id: number

    post: Post
    postStatus: PostStatus

    containerDiv: HTMLElement
}

let PostListEntryIdMax = -1

function getNewPostListEntryId(): number {
    PostListEntryIdMax += 1
    return PostListEntryIdMax
}

class PostList {
    listEntries: Map<string, PostListEntry> = new Map()

    listDiv: HTMLElement

    draggingEntry: PostListEntry | null = null

    savedOldPosts: Map<string, Post>
    savedNewPosts: Map<string, Post>

    savedAllPosts: Map<string, Post>

    constructor() {
        const listDiv = mustGetElementById('post-list')
        this.listDiv = listDiv

        this.savedOldPosts = new Map()
        this.savedNewPosts = new Map()
        this.savedAllPosts = new Map()

        const submitButton = mustGetElementById('submit-button')
        submitButton.onclick = async () => {
            await this.submit()
        }
    }

    setPostList(oldPosts: Map<string, Post>, newPosts: Map<string, Post>) {
        while (this.listDiv.children.length > 0) {
            this.listDiv.children[0].remove()
        }

        this.savedAllPosts.clear()

        this.savedOldPosts = oldPosts
        this.savedNewPosts = newPosts

        const addedPosts: Map<string, Post> = new Map()
        for (const p of newPosts.values()) {
            if (!this.savedOldPosts.has(p.uuid)) {
                addedPosts.set(p.uuid, p)
            }
        }

        const deletedPosts: Map<string, Post> = new Map()
        for (const p of oldPosts.values()) {
            if (!newPosts.has(p.uuid)) {
                deletedPosts.set(p.uuid, p)
            }
        }

        for (const p of addedPosts.values()) {
            this.savedAllPosts.set(p.uuid, p)
        }
        for (const p of this.savedOldPosts.values()) {
            this.savedAllPosts.set(p.uuid, p)
        }

        for (let post of this.savedAllPosts.values()) {
            let postStatus = PostStatus.Normal

            if (
                this.savedOldPosts.has(post.uuid) &&
                this.savedNewPosts.has(post.uuid) &&
                this.savedOldPosts.get(post.uuid)!.hasChanged(this.savedNewPosts.get(post.uuid)!)
            ) {
                postStatus = PostStatus.Changed
            }

            if (addedPosts.has(post.uuid)) {
                postStatus = PostStatus.Added
            }

            if (deletedPosts.has(post.uuid)) {
                postStatus = PostStatus.Deleted
            }

            if (this.savedNewPosts.has(post.uuid)) {
                this.addEntry(this.savedNewPosts.get(post.uuid)!.clone(), postStatus)
            } else {
                this.addEntry(this.savedOldPosts.get(post.uuid)!.clone(), postStatus)
            }
        }
    }

    addEntry(post: Post, postStatus: PostStatus) {
        const f = new BomFactory()

        let containerDiv: HTMLElement
        let nameInput: HTMLElement
        let dateInput: HTMLInputElement
        let dateStatus: HTMLElement
        let postStatusDisplay: HTMLParagraphElement
        let handle: HTMLElement
        let listOverlay: HTMLElement

        containerDiv = f.create('div').classes('list-container-div').add(
            (f.create('div').classes('list-content-div').add(
                f.create('label').text('name'),
                (nameInput = f.create('div').classes('list-name-input').set('contenteditable', 'plaintext-only').html),
                f.create('label').text('YYYY/MM/DD ').add(
                    (dateInput = f.create('input').classes('date-input').set('type', 'text').set('size', '15').html as HTMLInputElement),
                    (dateStatus = f.create('span').text('\u2705').html),
                ),
                f.create('p').text(`dir: ${post.dir}`),
                (postStatusDisplay = f.create('p').classes('post-status-display').text('DELETED').html as HTMLParagraphElement)
            ).html),
            (handle = f.create('div').set('tabindex', '0').classes('list-handle', 'noselect').text(':::::').html),
            (listOverlay = f.create('div').classes('list-overlay').html)
        ).set('post-uuid', post.uuid).html

        this.listDiv.appendChild(containerDiv)

            ; (listOverlay);

        const entry: PostListEntry = {
            id: getNewPostListEntryId(),

            post: post,
            postStatus: postStatus,

            containerDiv: containerDiv,
        }

        this.listEntries.set(entry.post.uuid, entry)

        const checkChange = () => {
            if (this.userModifiedPost()) {
                report('Changed', 'black')
            } else {
                report('', 'black')
            }
        }

        // add order changing input
        {
            handle.addEventListener('focus', (e) => {
                if (e.target === handle) {
                    containerDiv.classList.add('list-container-div-hl')
                }
            })
            handle.addEventListener('click', (e) => {
                if (e.target === handle) {
                    handle.focus()
                    containerDiv.classList.add('list-container-div-hl')
                }
            })

            handle.addEventListener('focusout', (e) => {
                containerDiv.classList.remove('list-container-div-hl')
            })

            handle.addEventListener('keydown', (e) => {
                if (e.target === handle) {

                    const nextSibling = containerDiv.nextSibling as HTMLElement
                    const prevSibling = containerDiv.previousSibling as HTMLElement

                    if (e.ctrlKey && e.code === 'ArrowDown') {
                        nextSibling?.after(containerDiv)
                        handle.focus()
                        e.preventDefault()
                        checkChange()
                    }
                    if (e.ctrlKey && e.code === 'ArrowUp') {
                        prevSibling?.before(containerDiv)
                        handle.focus()
                        e.preventDefault()
                        checkChange()
                    }

                    if (!e.ctrlKey && e.code === 'ArrowDown') {
                        const nextHandle = nextSibling?.querySelector('.list-handle') as HTMLElement
                        nextHandle?.focus()
                        e.preventDefault()
                    }

                    if (!e.ctrlKey && e.code === 'ArrowUp') {
                        const prevHandle = prevSibling?.querySelector('.list-handle') as HTMLElement
                        prevHandle?.focus()
                        e.preventDefault()
                    }
                }
            })
        }

        // add name input
        {
            nameInput.innerText = post.name

            let oldInnerText = nameInput.innerText

            nameInput.addEventListener('input', (e) => {
                const inputEvent = e as InputEvent
                if (inputEvent.inputType === "insertLineBreak") {
                    nameInput.innerText = nameInput.innerText.replace(/\n/g, "")
                    nameInput.blur()
                }
            })

            nameInput.addEventListener('focusout', (e) => {
                const newName = nameInput.innerText.trim()

                if (oldInnerText !== newName) {
                    console.log(`set post name from ${post.name} to ${newName}`)
                    post.name = newName
                    checkChange()
                }
                oldInnerText = newName
                nameInput.innerText = newName
            })
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

            const padZero = (numStr: string, howMany: number): string => {
                while (numStr.length < howMany) {
                    numStr = "0" + numStr
                }
                return numStr
            }

            const setDateInputValueToPostDate = () => {
                let date = new Date(post.date)
                dateInput.value = `${date.getFullYear()}/${padZero((date.getMonth() + 1).toString(), 2)}/${padZero(date.getDate().toString(), 2)}`
            }

            setDateInputValueToPostDate()

            const validateDateString = (str: string): (null | { year: number; month: number, date: number }) => {
                const re = /^\s*(\d\d\d\d)[ /-](\d\d?)[ /-](\d\d?)\s*$/
                const match = str.match(re)

                if (match === null) {
                    return null
                }

                const yearStr = match[1]
                const monthStr = match[2]
                const dateStr = match[3]

                if (yearStr === undefined || monthStr === undefined || dateStr === undefined) {
                    return null
                }

                const year = parseInt(yearStr)
                const month = parseInt(monthStr)
                const date = parseInt(dateStr)

                if (isNaN(year) || isNaN(month) || isNaN(date)) {
                    return null
                }

                if (!(1 <= month && month <= 12)) {
                    return null
                }

                if (!(1 <= date)) {
                    return null
                }

                return {
                    year: year,
                    month: month,
                    date: date
                }
            }

            dateInput.addEventListener('input', (e) => {
                const res = validateDateString(dateInput.value)
                if (res === null) {
                    dateStatus.innerText = '\u274C'
                } else {
                    dateStatus.innerText = '\u2705'
                }
            })

            dateInput.addEventListener('change', (e) => {
                const res = validateDateString(dateInput.value)
                let date = new Date(post.date)

                if (res !== null) {
                    date.setFullYear(res.year)
                    date.setMonth(res.month - 1)
                    date.setDate(res.date)

                    post.date = date.toISOString()
                    console.log(`set post date to ${date.toISOString()}`)
                    checkChange()
                }

                setDateInputValueToPostDate()

                dateStatus.innerText = '\u2705'
            })
        }

        // setup postStatusDisplay
        {
            switch (entry.postStatus) {
                case PostStatus.Normal: {
                    postStatusDisplay.style.display = "none"
                } break
                case PostStatus.Added: {
                    postStatusDisplay.style.backgroundColor = 'var(--green)'
                    postStatusDisplay.innerText = 'ADDED'
                } break
                case PostStatus.Deleted: {
                    postStatusDisplay.style.backgroundColor = 'var(--red)'
                    postStatusDisplay.innerText = 'DELETED'
                } break
                case PostStatus.Changed: {
                    postStatusDisplay.style.backgroundColor = 'var(--blue)'
                    postStatusDisplay.innerText = "CHANGED"
                } break
                default: {
                    postStatusDisplay.style.backgroundColor = 'var(--red)'
                    postStatusDisplay.innerText = "UNKNOWN"
                } break
            }
        }
    }

    userModifiedPost(): boolean {
        const postEntryPosts: Map<string, Post> = new Map()

        for (let i = 0; i < this.listDiv.children.length; i++) {
            const div = this.listDiv.children[i]

            const uuid = div.getAttribute('post-uuid')
            if (uuid === null) {
                continue
            }

            const listEntry = this.listEntries.get(uuid)
            if (listEntry === undefined) {
                continue
            }

            postEntryPosts.set(listEntry.post.uuid, listEntry.post)
        }

        if (postEntryPosts.size !== this.savedAllPosts.size) {
            throw new Error('post entry size and known post size is different!')
        }

        // compare post order
        {
            const postsA = postEntryPosts.values()
            const postsB = this.savedAllPosts.values()

            while (true) {
                const a = postsA.next()
                const b = postsB.next()

                if (a.done || b.done) {
                    break
                }

                if (a.value.uuid !== b.value.uuid) {
                    return true
                }
            }
        }

        for (const post of this.savedAllPosts.values()) {
            if (post.hasChanged(postEntryPosts.get(post.uuid)!)) {
                return true
            }
        }

        return false
    }

    async submit() {
        {
            const changeStatusText = document.getElementById('change-status-text')
            if (changeStatusText !== null) {
                changeStatusText.innerText = ""
            }
        }

        const containers: Array<PostContainer> = []

        for (let i = 0; i < this.listDiv.children.length; i++) {
            const div = this.listDiv.children[i]

            const uuid = div.getAttribute('post-uuid')
            if (uuid === null) {
                continue
            }

            const listEntry = this.listEntries.get(uuid)
            if (listEntry === undefined) {
                continue
            }

            if (listEntry.postStatus === PostStatus.Deleted) {
                continue
            }

            containers.push(listEntry.post.toPostContainer())
        }

        const postList = new PostListContainer()
        postList.Posts = containers

        const makeRequest = async (): Promise<any> => {
            const res = await fetch('/api/update-posts', {
                method: 'PUT',
                headers: {
                    'Content-type': 'application/json'
                },
                body: JSON.stringify(postList)
            });

            if (res.status !== 200) {
                if (res.headers.get('Content-Type') === 'application/json') {
                    const json = await res.json()
                    throw new Error(`request failed ${json}`)
                }
            }

            const json = await res.json()
            if (json.Result !== 'success') {
                throw new Error(`request failed ${json}`)
            }

            return json
        }

        let json
        let posts: Map<string, Post>

        try {
            json = await makeRequest()

            posts = parsePostListJsonOrThrow(json.PostList)

        } catch (err) {
            console.error(err)
            report('submit failed, check console for details', ColorError)
            return
        }

        this.setPostList(posts, posts)

        report('SUCCESS', ColorSuccess)
    }
}

(async () => {
    // copy pasted from https://stackoverflow.com/questions/43043113/how-to-force-reloading-a-page-when-using-browser-back-button
    // force window to reload if user got here with browser back or forward button
    window.addEventListener("pageshow", function(event) {
        var historyTraversal = event.persisted ||
            (typeof window.performance != "undefined" &&
                window.performance.navigation.type === 2);
        if (historyTraversal) {
            // Handle page restore.
            window.location.reload();
        }
    });

    const postList = new PostList()

    const makeRequest = async (): Promise<any> => {
        const res = await fetch('/api/get-posts')

        if (res.status !== 200) {
            if (res.headers.get('Content-Type') === 'application/json') {
                const json = await res.json()
                throw new Error(`request failed ${json}`)
            }
        }

        const json = await res.json()
        if (json.Result !== 'success') {
            throw new Error(`request failed ${json}`)
        }

        return json
    }

    let json

    let oldPosts: Map<string, Post>
    let newPosts: Map<string, Post>
    try {
        json = await makeRequest()

        oldPosts = parsePostListJsonOrThrow(json.Old)
        newPosts = parsePostListJsonOrThrow(json.New)
    } catch (err) {
        console.error(err)
        report('GET request failed, check console for details', ColorError)
        return
    }

    postList.setPostList(oldPosts, newPosts)
})()

