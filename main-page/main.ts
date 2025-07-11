let ColumnContainer = mustGetElementById('column-container')

let Columns: Array<HTMLElement> = [];
let PostElements: Array<HTMLElement> = [];

let ColumnCount = 1;

function onResize() {
    let columnCountStr: string = getComputedStyle(document.documentElement).getPropertyValue('--post-column-count');
    let postColumnCount = parseInt(columnCountStr);
    if (isNaN(postColumnCount)) {
        console.error(
            'Failed to parse css --post-column-count value to number\n' +
            'Setting it to 1'
        );
        postColumnCount = 1;
    }
    changeColumnCount(postColumnCount);
}

let changeColumnCountFirstTime = true;
let changeColumnCount = function(count: number) {
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
}

window.onresize = onResize;

function generateExternalLinksPost(): HTMLElement {
    const f = new BomFactory()

    const html = f.create('div').classes('post-box').add(
        f.create('div').classes('external-link').add(
            f.create('img').classes('external-link-icon')
                .set('src', 'main-page/icon-github.svg')
                .set('alt', 'github icon'),
            f.create('a').set('href', 'https://github.com/imprity').text('github'),

        ),
        f.create('div').classes('external-link').add(
            f.create('img').classes('external-link-icon')
                .set('src', 'main-page/icon-itchio.svg')
                .set('alt', 'itch.io icon'),
            f.create('a').set('href', 'https://imprity.itch.io/').text('itch.io'),
        ),
        f.create('div').classes('external-link').add(
            f.create('img').classes('external-link-icon')
                .set('src', 'main-page/icon-email.svg')
                .set('alt', 'email icon'),
            f.create('p').text('imprity041@gmail.com')
        ),
    )

    return html.html
}

function generatePostBoxFromPost(post: Post): HTMLElement {
    let childDiv = document.createElement('div');

    childDiv.className = 'post-box';

    let href = "/public/" + post.dir + "/"

    let onclick = () => {
        window.location.pathname = href;
    }

    if (post.hasThumbnail) {
        console.log(`creating thumbnail for ${post.name}`)
        let thumbnail = document.createElement('img');
        thumbnail.src = "/public/" + post.dir + "/" + post.thumbnail
        thumbnail.onclick = onclick;
        thumbnail.className = 'post-thumbnail'

        childDiv.append(thumbnail);
    }

    let title = document.createElement('a');
    title.classList = 'post-title';
    title.innerText = post.name;
    title.href = href;
    title.className = 'post-title';

    childDiv.append(title);

    let date = document.createElement('p')
    date.classList.add('post-date')
    date.innerText = new Date(post.date).toDateString()

    childDiv.appendChild(date)

    return childDiv;
}


(async () => {
    PostElements.push(generateExternalLinksPost())

    try {
        let res = await fetch('/post-list.json');
        let json = await res.json();

        const posts = parsePostListJsonOrThrow(json)

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
        errorDiv.innerText = 'Failed to get posts'
    }

    onResize();
})();
