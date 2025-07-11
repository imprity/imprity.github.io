class BomHTML {
    html: HTMLElement

    constructor(element: HTMLElement) {
        this.html = element
    }

    add(...elements: Array<BomHTML | HTMLElement>): BomHTML {
        for (const e of elements) {
            if (e instanceof BomHTML) {
                this.html.appendChild(e.html)
            } else {
                this.html.appendChild(e)
            }
        }

        return this
    }

    set(key: string, value: string): BomHTML {
        this.html.setAttribute(key, value)
        return this
    }

    text(str: string): BomHTML {
        const textNode = document.createTextNode(str)
        this.html.appendChild(textNode)
        return this
    }

    id(id: string): BomHTML {
        this.html.id = id
        return this
    }

    classes(...classes: Array<string>): BomHTML {
        for (const c of classes) {
            this.html.classList.add(c)
        }
        return this
    }

    act(f: (html: HTMLElement) => void): BomHTML {
        f(this.html)
        return this
    }
}

class BomFactory {
    map: Map<string, BomHTML> = new Map()

    create(htmlElement: string, name: string | null = null): BomHTML {
        let bom = new BomHTML(document.createElement(htmlElement))
        if (name !== null) {
            this.map.set(name, bom)
        }

        return bom
    }

    get(name: string): BomHTML {
        let bom = this.map.get(name)
        if (bom === undefined) {
            throw new Error(`there is no bom named ${name}`)
        }
        return bom
    }
}

