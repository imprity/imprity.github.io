interface PostListEntry {
    id: number

    containerDiv: HTMLElement
    contentDiv: HTMLElement
}

let PostListEntryIdMax = -1

function getNewPostListEntryId(): number {
    PostListEntryIdMax += 1
    return PostListEntryIdMax
}

class PostList {
    listEntries: Array<PostListEntry> = []
    draggingEntry: PostListEntry | null = null
    listDiv: HTMLElement

    constructor() {
        const listDiv = document.getElementById('post-list')
        if (listDiv === null) {
            throw new Error('could not find post-list')
        }
        this.listDiv = listDiv
    }

    addEntry(post: Post) {
        const clearDragHoverStyle = (entry: PostListEntry) => {
            entry.containerDiv.style.backgroundColor = 'transparent'
        }

        // =======================
        // create entry
        // =======================

        const entry = {
            id: getNewPostListEntryId(),

            containerDiv: document.createElement('div'),
            contentDiv: document.createElement('div'),
        }

        entry.containerDiv.classList.add('list-container-div')
        entry.contentDiv.classList.add('list-content-div')

        entry.containerDiv.appendChild(entry.contentDiv)

        // add things in post
        {
            const addP = (text: string) => {
                const p = document.createElement('p')
                p.innerText = text
                p.style.margin = '10px'

                entry.contentDiv.appendChild(p)
            }

            addP(post.name)
            addP(post.type)

            const d = new Date(post.date)
            addP(`${d.getFullYear()}/${d.getMonth()}/${d.getDate()}`)

            addP(post.dir)
        }

        this.listDiv.appendChild(entry.containerDiv)
        // =======================================
        // attach drag handling logic
        // =======================================

        entry.contentDiv.draggable = true

        entry.contentDiv.addEventListener('dragstart', () => {
            this.draggingEntry = entry
        })

        entry.containerDiv.addEventListener('dragover', (e) => {
            e.preventDefault()

            if (
                this.draggingEntry !== null &&
                entry.id === this.draggingEntry.id
            ) {
                return
            }

            let appendBefore = true

            const rect = entry.containerDiv.getBoundingClientRect()

            if (e.clientY > rect.y + rect.height * 0.5) {
                appendBefore = false
            }

            if (appendBefore) {
                entry.containerDiv.style.backgroundColor = 'red'
            } else {
                entry.containerDiv.style.backgroundColor = 'blue'
            }
        })

        entry.containerDiv.addEventListener('dragleave', (e) => {
            clearDragHoverStyle(entry)
        })

        entry.containerDiv.addEventListener('drop', (e) => {
            e.preventDefault()

            clearDragHoverStyle(entry)

            console.log(e)

            if (this.draggingEntry === null) {
                return
            }

            if (this.draggingEntry.id === entry.id) {
                return
            }

            const rect = entry.containerDiv.getBoundingClientRect()

            let appendBefore = true

            if (e.clientY > rect.y + rect.height * 0.5) {
                appendBefore = false
            }

            if (appendBefore) {
                entry.containerDiv.before(this.draggingEntry.containerDiv)
            } else {
                entry.containerDiv.after(this.draggingEntry.containerDiv)
            }
        })
    }
}

(async () => {
    const postList = new PostList()

    const res = await fetch('/api/get-posts')
    if (res.status !== 200) {
        console.error('request failed')

        if (res.headers.get('Content-Type') === 'application/json') {
            const json = await res.json()
            console.error(json)
        }
    }

    const json = await res.json()

    console.log(json)

    if (json.Result === 'success') {
        var oldPosts: Map<string, Post> = new Map()
        var newPosts: Map<string, Post> = new Map()

        {
            const dummyContainer = new PostContainer()

            for (const p of json.Old.Posts) {
                if (objHasMatchingKeys(p, dummyContainer, false)) {
                    const post = new Post()
                    post.setFromPostContainer(p)
                    oldPosts.set(post.uuid, post)
                }
            }

            for (const p of json.New.Posts) {
                if (objHasMatchingKeys(p, dummyContainer, false)) {
                    const post = new Post()
                    post.setFromPostContainer(p)
                    newPosts.set(post.uuid, post)
                }
            }
        }

        // TODO: mark changed posts
        const addedPosts: Map<string, Post> = new Map()

        for (const p of newPosts.values()) {
            if (!oldPosts.has(p.uuid)) {
                addedPosts.set(p.uuid, p)
            }
        }

        for (const p of oldPosts.values()) {
            postList.addEntry(p)
        }
        for (const p of addedPosts.values()) {
            postList.addEntry(p)
        }
    } else {
        console.error(json)
    }

    console.log(json)
})()

