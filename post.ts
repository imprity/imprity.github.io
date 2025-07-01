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

    setFromPostContainer(container: PostContainer) {
        this.uuid = container.UUID

        this.name = container.Name
        this.type = container.Type
        this.date = container.Date
        this.dir = container.Dir
    }

    getDateTimestamp(): number {
        return Date.parse(this.date)
    }

    hasChanged(otherPost: Post): boolean {
        if (this.uuid !== otherPost.uuid) {
            throw new Error(`this ${this.name} post and other post ${otherPost.name} uuid does not match`)
        }

        for (const key in this) {
            if (this[key as keyof Post] !== otherPost[key as keyof Post]) {
                return true
            }
        }

        return false
    }
}
