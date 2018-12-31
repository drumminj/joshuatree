// Dependencies:
//   * commentData.js
//   * loadIndicator.js

class JoshuaTreeExtension {
    constructor(contentDocument) {
        this._init(contentDocument);
    }

    _init(contentDocument) {
        if (!contentDocument) {
            return;
        }

        const loadIndicator = new LoadIndicator(contentDocument); // show load indicator
        this._hideCategory(contentDocument);                    // hide category indicators
        this._modifyCommentCount(contentDocument);                // update comment count with "new" count
        loadIndicator.hide();                                     // done loading -- hide indicator
    }

    _hideCategory(contentDocument) {
        if (!contentDocument) {
            return;
        }

        // shrink width of category to zero while fading out
        const allCategory = contentDocument.body.getElementsByClassName('meta-category');
        for (const category of allCategory) {
            category.style.maxWidth = `${category.offsetWidth}px`;
            category.classList.add('shrink');
        }
    }

    // Walks the document and update the comment count text to show new comments since
    // last visit
    _modifyCommentCount(contentDocument) {
        // may be singular 'Comment' or plural 'Comments'
        const commentRegExp = /(\d+) Comment/
        const noOp = () => {};

        // Loop through all links to comments for each post, modifying
        // the text to show the # of new comments since we last viewed the post.
        const commentLinks = contentDocument.body.getElementsByClassName('comments-link');
        for (const link of Array.from(commentLinks)) {
            const commentMatches = commentRegExp.exec(link.textContent);
            if (commentMatches) {
                const totalComments = commentMatches[1];
                const postMatches = joshuaTreeResources.postRegExp.exec(link.href);

                if (totalComments === 0) {
                    // don't modify text if no comments at all
                    continue;
                }

                if (postMatches) {
                    // Retrieve the stored data associated with this post
                    // If it exists, modify the comment count
                    new CommentData(postMatches[1])
                        .getReadComments()
                        .then(readComments => {
                            // grow width of item to allow room for comment count
                            const parent = link.parentNode;
                            parent.style.maxWidth = `${parent.offsetWidth}px`;
                            parent.classList.add('grow');

                            const newCommentCount = Math.max(0, totalComments - readComments.length);
                            link.textContent = `${totalComments} ${totalComments > 1 ? 'Comments' : 'Comment'}` +
                                               ` (${newCommentCount} New)`;
                            if (newCommentCount) {
                                parent.classList.add('new-comments');
                            }
                        }).catch(noOp);
                }
            }
        };
    }
}

const joshuaTree = new JoshuaTreeExtension(document);
