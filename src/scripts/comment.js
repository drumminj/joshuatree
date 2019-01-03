// Dependencies:
//   * utility.js

// CSS classes to add to comment for state
const newCommentClass = 'jt-new-comment';
const commentIDRegExp = /^comment-(\d+)/; // match pattern of: "div-comment-1604370"

class Comment {
    constructor(elt) {
        this._isNew = false;
        this._isIgnored = false;
        this.node = elt;

        this.id = this._parseId(elt);
        this.author = Comment.parseAuthor(elt);
    }

    // Helper which parses the author's name from elt, if elt is a comment
    // TODO: revisit/refactor need for this
    static parseAuthor(elt) {
        if (!elt) {
            return '';
        }

        const authorNodes = elt.getElementsByClassName('comment-author');
        if (authorNodes && authorNodes.length) {
            const nameNodes = authorNodes[0].getElementsByClassName('fn');
            if (nameNodes && nameNodes[0]) {
                return nameNodes[0].textContent;
            }
        }

        return '';
    }

    // Mark this comment as new (update visual display)
    markAsNew(isNew) {
        this._isNew = isNew;
        this._updateClass('jt-new-comment', isNew);
    };

    // Sets the ignored state of the comment, updating the display
    markAsIgnored(isIgnored) {
        if (this._isIgnored === isIgnored) {
            // make sure we don't double-ignore comment contents
            return;
        }

        this._isIgnored = isIgnored;
        this._updateClass('jt-ignored-comment', isIgnored);
        if (isIgnored) {
            this._hideCommentBody();
        } else {
            this._showCommentBody();
        }
    };

    // Given a comment, hide the body and add a "Show Comment" link to unhide it
    _hideCommentBody() {
        const contentDocument = this.node.ownerDocument;

        let content = this.node.getElementsByClassName('comment-content');
        content = content && content[0];
        if (content) {
            // hide the content
            content.style.display = 'none';

            // add "show hidden comment" link
            const showCallback = (objEvent) => {
                Utility.killEvent(objEvent);
                this.markAsIgnored(false);
            };

            const showHiddenCommentLink = Utility.createAnchor(contentDocument, 'Show Comment', '#');
            showHiddenCommentLink.addEventListener('click', showCallback, false);

            const leftBookend = contentDocument.createElement('span');
            leftBookend.textContent = '[ '

            const rightBookend = contentDocument.createElement('span');
            rightBookend.textContent = ' ]';

            const hiddenCommentDiv = Utility.createElement(contentDocument, 'div', 'jt-hidden-comment');
            hiddenCommentDiv.appendChild(leftBookend);
            hiddenCommentDiv.appendChild(showHiddenCommentLink);
            hiddenCommentDiv.appendChild(rightBookend);

            content.parentNode.insertBefore(hiddenCommentDiv, content);
        }

        // Hide the 'reply' link
        let reply = this.node.getElementsByClassName('reply');
        if (reply && reply[0]) {
            reply[0].style.display = 'none';
        }
    };

    _parseId(elt) {
        const matches = commentIDRegExp.exec(elt.id);
        return matches && parseInt(matches[1]);
    }

    // Expands a comment if it was collapsed/had "show comment" link added
    // "Show comment" link is also removed
    _showCommentBody() {
        // remove DIV with link to "show comment" link
        const hiddenCommentDiv = this.node.getElementsByClassName('jt-hidden-comment');
        if (hiddenCommentDiv && hiddenCommentDiv[0]) {
            hiddenCommentDiv[0].parentNode.removeChild(hiddenCommentDiv[0]);
        }

        // show the comment content
        const content = this.node.getElementsByClassName('comment-content');
        if (content && content[0]) {
            content[0].style.display = '';
        }

        // show the 'reply' link
        let reply = this.node.getElementsByClassName('reply');
        if (reply && reply[0]) {
            reply[0].style.display = '';
        }
    };

    // Adds or removes the specified class to the comment
    _updateClass(className, add) {
        if (add) {
            this.node.classList.add(className);
        } else {
            this.node.classList.remove(className);
        }
    };
}
