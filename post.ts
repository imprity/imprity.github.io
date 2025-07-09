class PostListContainer {
    Posts: Array<PostContainer> = []
}

class PostContainer {
    UUID: string = ""

    FileHash: string = ""

    Name: string = ""
    Type: string = ""
    Date: string = ""
    Dir: string = ""

    HasThumbnail: boolean = false
    Thumbnail: string = ""
}

class Post {
    uuid: string = ""

    fileHash: string = ""

    name: string = ""
    type: string = ""
    date: string = ""
    dir: string = ""

    hasThumbnail: boolean = false
    thumbnail: string = ""

    setFromPostJsonOrThrow(json: any) {
        const expect = (
            value: any,
            type: ("string" | "boolean" | "number"),
            must: boolean
        ): any => {
            if (!must && (value === null || value === undefined)) {
                switch (type) {
                    case "string": return ""
                    case "boolean": return false
                    case "number": return 0
                }
            }

            const actualType = typeof value
            if (actualType !== type) {
                throw new Error(`wrong type, expected ${type}, got ${actualType}`)
            }

            return value
        }

        this.uuid = expect(json.UUID, 'string', true)

        this.fileHash = expect(json.FileHash, 'string', true)

        this.name = expect(json.Name, 'string', true)
        this.type = expect(json.Type, 'string', true)
        this.date = expect(json.Date, 'string', true)
        this.dir = expect(json.Dir, 'string', true)

        this.hasThumbnail = expect(json.HasThumbnail, 'boolean', false)
        this.thumbnail = expect(json.Thumbnail, 'string', false)
    }

    toPostContainer(): PostContainer {
        const container = new PostContainer()

        container.UUID = this.uuid

        container.FileHash = this.fileHash

        container.Name = this.name
        container.Type = this.type
        container.Date = this.date
        container.Dir = this.dir

        container.HasThumbnail = this.hasThumbnail
        container.Thumbnail = this.thumbnail

        return container
    }

    clone(): Post {
        const clone = new Post()

        for (const key of Object.keys(this)) {
            const val = this[key as keyof Post]

            const valType = typeof val

            if (valType === 'object' || Array.isArray(val)) {
                throw new Error('TODO: support cloning of object or array')
            }

            if (valType === "string" || valType === "number" || valType === "boolean") {
                (clone as any)[key as keyof Post] = val
            }
        }

        return clone
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
