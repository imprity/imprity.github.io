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
        column.className = 'post_column';

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

function generatePostBoxFromPost(post: Post) {
    let childDiv = document.createElement('div');

    childDiv.className = 'post_box';

    let href = "/public/" + post.dir + "/"

    let onclick = () => {
        window.location.pathname = href;
    }

    if (post.hasThumbnail) {
        console.log(`creating thumbnail for ${post.name}`)
        let thumbnail = document.createElement('img');
        thumbnail.src = "/public/" + post.dir + "/" + post.thumbnail
        thumbnail.onclick = onclick;
        thumbnail.className = 'post_thumbnail'

        childDiv.append(thumbnail);
    }

    let title = document.createElement('p');
    title.classList = 'post_title';
    let titleLink = document.createElement('a');
    titleLink.innerText = post.name;
    titleLink.href = href;
    titleLink.className = 'post_title';

    title.appendChild(titleLink);

    childDiv.append(title);

    return childDiv;
}


(async () => {
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
        errorDiv.style.visibility = 'visible';
        errorDiv.innerText = 'Failed to get posts'
    }

    onResize();
})();
