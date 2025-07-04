interface PostListEntry {
    id: number

    post: Post

    containerDiv: HTMLElement

    markedForDeletion: boolean
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

    oldPosts: Map<string, Post>
    newPosts: Map<string, Post>

    constructor() {
        const listDiv = mustGetElementById('post-list')
        this.listDiv = listDiv

        this.oldPosts = new Map()
        this.newPosts = new Map()

        const submitButton = mustGetElementById('submit-button')
        submitButton.onclick = async () => {
            await this.submit()
        }
    }

    setPostList(oldPosts: Map<string, Post>, newPosts: Map<string, Post>) {
        this.oldPosts = oldPosts
        this.newPosts = newPosts

        const addedPosts: Map<string, Post> = new Map()
        for (const p of newPosts.values()) {
            if (!oldPosts.has(p.uuid)) {
                addedPosts.set(p.uuid, p)
            }
        }

        const deletedPosts: Map<string, Post> = new Map()
        for (const p of oldPosts.values()) {
            if (!newPosts.has(p.uuid)) {
                deletedPosts.set(p.uuid, p)
            }
        }

        const allPosts: Map<string, Post> = new Map()
        for (const p of oldPosts.values()) {
            allPosts.set(p.uuid, p)
        }
        for (const p of addedPosts.values()) {
            allPosts.set(p.uuid, p)
        }

        for (let post of allPosts.values()) {
            const markedForDeletion = deletedPosts.has(post.uuid)
            this.addEntry(post.clone(), markedForDeletion)
        }
    }

    addEntry(post: Post, markedForDeletion: boolean) {
        const f = new BomFactory()

        let containerDiv: HTMLElement
        let nameInput: HTMLElement
        let dateInput: HTMLInputElement
        let dateStatus: HTMLElement
        let deleteStatus: HTMLParagraphElement
        let dragHandle: HTMLElement
        let listOverlay: HTMLElement

        containerDiv = f.create('div').classes('list-container-div').add(
            (f.create('div').classes('list-content-div').add(
                f.create('label').text('name'),
                (nameInput = f.create('div').classes('list-name-input').set('contenteditable', 'plaintext-only').html),
                f.create('label').text('YYYY/MM/DD ').add(
                    (dateInput = f.create('input').classes('date-input').set('type', 'text').set('size', '15').html as HTMLInputElement),
                    (dateStatus = f.create('span').text('\u2705').html),
                ),
                (deleteStatus = f.create('p').text('DELETED').html as HTMLParagraphElement)
            ).html),
            (dragHandle = f.create('div').set('draggable', 'true').classes('list-handle', 'noselect').text(':::').html),
            (listOverlay = f.create('div').classes('list-overlay').html)
        ).set('post-uuid', post.uuid).html

        this.listDiv.appendChild(containerDiv)

        const entry = {
            id: getNewPostListEntryId(),
            post: post,
            containerDiv: containerDiv,
            markedForDeletion: markedForDeletion
        }

        // this.listEntries.push(entry)
        this.listEntries.set(entry.post.uuid, entry)

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
                    console.log(newName)
                    post.name = newName
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
                }

                setDateInputValueToPostDate()

                dateStatus.innerText = '\u2705'
            })
        }

        // add delete status
        {
            deleteStatus.style.color = 'red'
            if (!entry.markedForDeletion) {
                deleteStatus.style.display = "none"
            }
        }

        // add drag logic
        {
            const clearDragHoverStyle = () => {
                listOverlay.classList.remove(
                    'list-overlay-hl-top',
                    'list-overlay-hl-bottom',
                )
            }

            dragHandle.addEventListener('dragstart', (e) => {
                containerDiv.classList.add('list-cotainer-div-dragged')
                this.draggingEntry = entry
                if (e.dataTransfer !== null) {
                    const handleRect = dragHandle.getBoundingClientRect()
                    const containerRect = containerDiv.getBoundingClientRect()
                    const offsetX = e.clientX - handleRect.x
                    const offsetY = e.clientY - handleRect.y
                    e.dataTransfer.setDragImage(containerDiv,
                        handleRect.x - containerRect.x + offsetX,
                        handleRect.y - containerRect.y + offsetY,
                    )
                }
            })

            containerDiv.addEventListener('dragover', (e) => {
                e.preventDefault()

                if (
                    this.draggingEntry !== null &&
                    entry.id === this.draggingEntry.id
                ) {
                    return
                }

                const rect = entry.containerDiv.getBoundingClientRect()

                let appendBefore = true
                if (e.clientY > rect.y + rect.height * 0.5) {
                    appendBefore = false
                }

                clearDragHoverStyle()

                if (appendBefore) {
                    listOverlay.classList.add('list-overlay-hl-top')
                } else {
                    listOverlay.classList.add('list-overlay-hl-bottom')
                }
            })

            containerDiv.addEventListener('dragleave', (e) => {
                e.preventDefault()
                if (
                    e.relatedTarget instanceof Element &&
                    containerDiv.contains(e.relatedTarget)
                ) {
                    return
                }
                clearDragHoverStyle()
            })

            containerDiv.addEventListener('drop', (e) => {
                e.preventDefault()

                clearDragHoverStyle()

                if (this.draggingEntry === null) {
                    return
                }
                if (this.draggingEntry.id === entry.id) {
                    return
                }

                const rect = containerDiv.getBoundingClientRect()

                let appendBefore = true
                if (e.clientY > rect.y + rect.height * 0.5) {
                    appendBefore = false
                }

                if (appendBefore) {
                    containerDiv.before(this.draggingEntry.containerDiv)
                } else {
                    containerDiv.after(this.draggingEntry.containerDiv)
                }
            })

            dragHandle.addEventListener('dragend', (e) => {
                containerDiv.classList.remove('list-cotainer-div-dragged')
                this.draggingEntry = null
            })
        }
    }

    async submit() {
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

            if (listEntry.markedForDeletion) {
                continue
            }

            containers.push(listEntry.post.toPostContainer())
        }

        const postList = new PostListContainer()
        postList.Posts = containers

        const res = await fetch('/api/update-posts', {
            method: 'PUT',
            headers: {
                'Content-type': 'application/json'
            },
            body: JSON.stringify(postList)
        });

        if (res.status !== 200) {
            // TODO : report error better
            console.error('request failed')

            if (res.headers.get('Content-Type') === 'application/json') {
                const json = await res.json()
                console.error(json)
            }

            return
        }

        let json = await res.json()

        // for (let i = 0; i < this.listDiv.children.length; i++) {
        //     this.listDiv.children[i].remove()
        // }
        while (this.listDiv.children.length > 0) {
            this.listDiv.children[0].remove()
        }

        this.oldPosts.clear()
        this.newPosts.clear()

        const dummyContainer = new PostContainer()

        for (const p of json.PostList.Posts) {
            if (objHasMatchingKeys(p, dummyContainer, false)) {
                const post = new Post()
                post.setFromPostContainer(p)

                this.oldPosts.set(post.uuid, post)
                this.newPosts.set(post.uuid, post)

                this.addEntry(post, false)
            }
        }
    }
}

(async () => {
    const postList = new PostList()

    const res = await fetch('/api/get-posts')
    if (res.status !== 200) {
        // TODO : report error better
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

        postList.setPostList(oldPosts, newPosts)
    } else {
        console.error(json)
    }

    console.log(json)
})()

