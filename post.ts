class PostListContainer {
    Posts: Array<PostContainer> = []
}

class PostContainer {
    UUID: string = ""

    Name: string = ""
    Type: string = ""
    Date: string = ""
    Dir: string = ""
}

class Post {
    uuid: string = ""

    name: string = ""
    type: string = ""
    date: string = ""
    dir: string = ""

    setFromPostJsonOrThrow(json: any) {
        this.uuid = json.UUID

        this.name = json.Name
        this.type = json.Type
        this.date = json.Date
        this.dir = json.Dir
    }

    toPostContainer(): PostContainer {
        const container = new PostContainer()

        container.UUID = this.uuid

        container.Name = this.name
        container.Type = this.type
        container.Date = this.date
        container.Dir = this.dir

        return container
    }

    getDateTimestamp(): number {
        return Date.parse(this.date)
    }

    hasChanged(otherPost: Post): boolean {
        if (this.uuid !== otherPost.uuid) {
            throw new Error(`this ${this.name} post and other post ${otherPost.name} uuid does not match`)
        }

        for (const key of Object.keys(this)) {
            const val = this[key as keyof Post]
            if (typeof val === "string" || typeof val === "number" || typeof val === "boolean") {
                if (val !== otherPost[key as keyof Post]) {
                    return true
                }
            }
        }

        return false
    }

    clone(): Post {
        const clone = new Post()
        clone.uuid = this.uuid

        clone.name = this.name
        clone.type = this.type
        clone.date = this.date
        clone.dir = this.dir

        return clone
    }
}

function parsePostListJsonOrThrow(json: any): Map<string, Post> {
    let posts: Map<string, Post> = new Map()

    if (json.Posts === null) {
        return posts
    }

    for (const p of json.Posts) {
        const post = new Post()
        post.setFromPostJsonOrThrow(p)
        posts.set(post.uuid, post)
    }

    return posts
}
