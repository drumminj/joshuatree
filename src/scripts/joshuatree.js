// Dependencies:
//   * commentData.js
//   * commentProcessor.js
//   * contextMenu.js
//   * editorEnhancements.js
//   * loadIndicator.js
//   * preferences.js
//   * toolbar.js
//   * utility.js

class JoshuaTreeExtension {
    constructor(contentDocument) {
        this._postId = -1;
        this._commentData = null;
        this._contextMenu = null;
        this._prefs = null;
        this._toolbar = null;
        this._commentProcessor = null;
        this._document = contentDocument;
        this._unreadComments = [];
        this._editorEnhancements = null;

        this._init(contentDocument);
    }

    // Initializes the extension object
    _init(contentDocument) {
        // create load indicator to show we're working here
        const loadIndicator = new LoadIndicator(contentDocument);

        this._postId = this._parsePostId(contentDocument);
        this._contextMenu = new ContextMenu(contentDocument);
        this._toolbar = new Toolbar(
            contentDocument,
            this._contextMenu,
            this._updateReadCommentIndex.bind(this));

        this._commentData = new CommentData(this._postId);
        this._prefs = new Preferences();
        this._commentProcessor = new CommentProcessor(contentDocument, this._commentData, this._prefs);

        // override wpex comment scroll animation settings and handle scrolling ourselves
        Utility.injectScript('wpexLocalize.scrollToHash = false;');
        this._scrollToPageItem('comments', 'easeInOutSine');

        this._commentProcessor.processDocument()
            .then(unreadComments => {
                // update comment count in toolbar
                this._unreadComments = unreadComments;
                this._toolbar.setCommentCount(unreadComments.length);

                // ensure all links contained in comments open in new tab
                this._addBlankTargetToLinks(contentDocument); // dependent on comment processor

                // add context menu handler for ignore/unignore users (relies on prefs)
                contentDocument
                    .getElementById('comments')
                    .addEventListener('contextmenu', this._onContextMenu.bind(this), false);

                loadIndicator.hide();
            });

        this._editorEnhancements = new EditorEnhancements(contentDocument);
    };

    // Displays context menu with option to ignore/unignore user
    _showIgnoreMenu(userName, pos) {
        this._prefs.getIgnoredUsers()
            .then(ignoredUsers => {
                const ignored = ignoredUsers
                    .map(user => user.toLowerCase())
                    .indexOf(userName.toLowerCase()) !== -1;

                // create a tree of content for the menu item, with formatted text
                // items (see ContextMenu::createMenu() for format/details)
                let itemText = {};
                const usernameItem = { style: 'bold', textContent: userName };
                if (ignored) {
                    itemText.childContent = [
                        'Remove ',
                        usernameItem,
                        ' from Ignore List'
                        ];
                }
                else {
                    itemText.childContent = [
                        'Add ',
                        usernameItem,
                        ' to Ignore List'
                        ];
                }

                const menuItem = {
                    text: itemText,
                    url: '',
                    callback: () => {
                        let prefsAction;
                        if (ignored) {
                            prefsAction = this._prefs.unIgnoreUser(userName);
                        } else {
                            prefsAction = this._prefs.ignoreUser(userName);
                        }

                        // re-process document with new ignore state
                        prefsAction
                            .then(() => this._commentProcessor.processDocument(true));
                    }
                };

                this._contextMenu.show([ menuItem ], pos,'topLeft', null);
            });
    };

    _onContextMenu(evt) {
        this._contextMenu.close();

        // find the comment-meta tag/element to ensure we're in a comment
        let node = evt.target;
        while (node && !node.classList.contains('comment-meta'))
            node = node.parentNode;

        if (!node)
            return;

        const author = Comment.parseAuthor(node);
        if (author) {
            Utility.killEvent(evt);
            this._showIgnoreMenu(author, {'x': (evt.clientX + 2), 'y': (evt.clientY + 2) });
        }
    }

    // Adds "target=_blank" to all links contained in posts so they open in new tab/window
    _addBlankTargetToLinks(contentDocument) {
        const location = contentDocument.location;
        const postUrl = `${location.origin}${location.pathname}${location.search}`
        const allLinks = contentDocument.getElementById('comments').getElementsByTagName('A');

        for (const link of Array.from(allLinks)) {
            if (link.href && !link.href.startsWith(postUrl)) {
                link.target = '_blank';
            }
        }
    };

    // Returns the post ID from the document's URL
    _parsePostId(contentDocument) {
        const matches = joshuaTreeResources.postRegExp.exec(contentDocument.location.href);
        return matches && matches[1];
    };

    _scrollToPageItem(itemId, easing) {
        // blog has a 'sticky' header at top when scrolled past top bar, so check for that
        // and account for it when scrolling
        // NOTE: for now, just assume always scrolled past it
        const header = this._document.getElementById('site-header');
        const headerHeight = header.offsetHeight;
        Utility.scrollToElement(this._document, itemId, easing, -headerHeight - 8);
    }

    // Updates the index of the current read comment
    _updateReadCommentIndex(newIndex) {
        const commentId = this._unreadComments[newIndex];
        this._scrollToPageItem(`comment-${commentId}`);
        this._commentData.setReadComments(this._unreadComments.slice(0,newIndex + 1));
    };
}

const joshuaTree = new JoshuaTreeExtension(document);
