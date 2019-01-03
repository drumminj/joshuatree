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
        this._postId = -1;                  // id of post currently being viewed
        this._commentData = null;
        this._contextMenu = null;
        this._prefs = null;
        this._toolbar = null;
        this._commentProcessor = null;
        this._document = contentDocument;   // cached reference to current DOM document
        this._unreadComments = [];          // list of IDs of unread comments
        this._editorEnhancements = null;
        this._scrolling = false;            // whether or not we're currently scrolling/animating
        this._commentIndex = -1;            // current index into unread comments

        this._init(contentDocument);
    }

    // Helper which gets the amount of pixels to offset any scroll positions, based on presence
    // of sticky header, any any 'slop' we want to add
    _getScrollOffsetAmount() {
        // blog has a 'sticky' header at top when scrolled past top bar, so check for that
        // and account for it when scrolling
        // NOTE: For now, just assume always scrolled past it, though it doesn't show in
        // 'mobile' layout with breakpoint at 960px.
        // Ideally we'd inspect the header to see if it's sticky, but we can't do that on
        // initial load/scroll
        const header = this._document.getElementById('site-header');
        const headerHeight = window.innerWidth >= 960 ? header.offsetHeight : 0;
        return headerHeight + 8;
    }

    // Callback to handle scroll events, which looks at the current
    // scroll position and updates the current navigated comment
    _handleScroll() {
        // if we triggered this scroll, ignore the event/no-op
        if (this._scrolling) {
            return;
        }

        // Look at current scroll position and compare it to each comment, seeing which one
        // is currently at the top. Update the 'read' comment state then based on which
        // the user has scrolled to
        const scrollPos = (window.scrollY || window.pageYOffset) + this._getScrollOffsetAmount();
        let newIndex = this._unreadComments.length - 1;
        for (let i = 0; i < this._unreadComments.length; i++) {
            const comment = this._commentProcessor.getComment(this._unreadComments[i]);
            if (comment) {
                const offset = Utility.getRelativeOffset(comment.node, 'Top');
                if (scrollPos < offset) {
                    newIndex = i-1;
                    break;
                }
            }
        }

        // Only update toolbar and storage if the actual index changed. This is important
        // for throttling writes to synced storage, else Google gets grumpy
        if (newIndex !== this._commentIndex) {
            this._commentIndex = newIndex;
            this._toolbar.setCommentIndex(newIndex);
            this._commentData.setReadComments(this._unreadComments.slice(0, newIndex + 1));
        }
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

        // Scroll to appropriate element based on hash in the url.
        // Must do this on a timeout to ensure it happens after the browser
        // navigates to any anchor tag
        window.setTimeout(() => {
            const hash = (location.hash.charAt(0) === '#') ? location.hash.substring(1) : location.hash;
            const scrollToId = (hash === 'view_comments' || hash === 'comments_reply') ? 'comments' : hash;
            this._scrollToPageItem(scrollToId, 'easeInOutSine');
        }, 100);

        // Set up scroll event listener to update the toolbar based on current scroll location 
        window.addEventListener("scroll", Utility.throttle(() => this._handleScroll(), 150));

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

    // Helper/wrapper to scroll to the document element with the given id, using the specified
    // easing function for the animation
    _scrollToPageItem(eltId, easing) {
        // set flag to ignore scroll events while we're the ones scrolling
        this._scrolling = true;
        Utility.scrollToElement(
            this._document,
            eltId,
            easing,
            -this._getScrollOffsetAmount(),
            () => this._scrolling = false);
    }

    // Updates the index of the current read comment and scrolls to the comment
    _updateReadCommentIndex(newIndex) {
        if (newIndex !== this._commentIndex) {
            this._commentIndex = newIndex;
            const commentId = this._unreadComments[newIndex];
            this._scrollToPageItem(`comment-${commentId}`);
            this._commentData.setReadComments(this._unreadComments.slice(0,newIndex + 1));
        }
    };
}

const joshuaTree = new JoshuaTreeExtension(document);
