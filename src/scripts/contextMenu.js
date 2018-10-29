// Dependencies:
//   * utility.js

// ContextMenu widget class
class ContextMenu {
    constructor(contentDocument) {
        this._domElement = null;
        this._document = contentDocument;
        this._closeCallback = null;

        // bind event handlers
        this.close = this.close.bind(this);
        this._onKeyDown = this._onKeyDown.bind(this);
    }

    // If menu is showing, removes handlers, fades out/hides the menu
    close() {
        if (!this._domElement) {
            return;
        }

        this._document.body.removeEventListener('click', this.close, false);
        this._document.removeEventListener('scroll', this.close, false);
        this._document.removeEventListener('keydown', this._onKeyDown, false);

        if (this._closeCallback) {
            this._closeCallback();
            this._closeCallback = null;
        }

        // save off reference to current menu and null out
        // class property in case we're going to immediately re-show a new menu
        const menu = this._domElement;
        this._domElement = null;

        // fade out menu, removing DOM elements when complete
        Utility.fadeOut(menu, 1.0, () => menu.parentNode.removeChild(menu));
    }

    // Creates/shows a new context menu
    // menuItems is array of objects with three fields "text", "url", and "callback"
    show(menuItems, pos, relativeTo, closeCallback) {
        this.close();

        this._closeCallback = closeCallback;

        this._document.body.addEventListener('click', this.close, false);
        this._document.addEventListener('scroll', this.close, false);
        this._document.addEventListener('keydown', this._onKeyDown, false);

        this._domElement = this._buildMenu(menuItems);
        this._document.body.appendChild(this._domElement);
        this._position(pos, relativeTo);
        Utility.fadeIn(this._domElement, 1.0);
    };

    // Given itemContent as described in show(), returns a DOM element tree representing
    // the menu item content
    _buildFormattedItemContent(itemContent) {
        const contentType = typeof itemContent;
        if (contentType === 'string') {
            // quick check -- if just given a string, create and return a text node
            return this._document.createTextNode(itemContent);
        } else if (contentType !== 'object') {
            // else we expect an object
            return null;
        }

        let contentNodeTag = 'span'; // default tag type to create for item content
        if (itemContent.style === 'bold') {
            contentNodeTag = 'strong';
        } else if (itemContent.style === 'italic') {
            contentNodeTag = 'em';
        }

        const contentNode = this._document.createElement(contentNodeTag);
        contentNode.textContent = itemContent.textContent;

        // if this item has child content, recursively process that
        const childContent = itemContent.childContent;
        if (childContent && Array.isArray(childContent)) {
            for (const contentItem of childContent) {
                const subContent = this._buildFormattedItemContent(contentItem);
                if (subContent) {
                    contentNode.appendChild(subContent);
                }
            }
        }

        return contentNode;
    };

    // menuItems is array of objects with three fields "text", "url", and "callback"
    _buildMenu(menuItems) {
        const menu = Utility.createElement(this._document, 'ul', 'context-menu');
        menu.setAttribute('id', 'jt-context-menu');
        menu.style.visibility = 'hidden';

        let prevIsSeparator = false;
        for (const menuItem of menuItems) {
            if (!menuItem) { // null|undefined = separator
                prevIsSeparator = true;
                continue;
            }

            const itemElt = Utility.createElement(this._document, 'li', 'menuItem');
            if (prevIsSeparator) {
                itemElt.classList.add('separator');
            }

            const itemLink = this._document.createElement('a');
            if (menuItem.url) {
                itemLink.href = menuItem.url;
                itemLink.target = '_blank';
            }

            if (menuItem.callback) {
                itemLink.addEventListener('click', menuItem.callback, false);
            }

            const itemContent = this._buildFormattedItemContent(menuItem.text);
            if (itemContent) {
                itemLink.appendChild(itemContent);
                itemElt.appendChild(itemLink);
                menu.appendChild(itemElt);
            }

            prevIsSeparator = false;
        }

        menu.addEventListener('contextmenu', Utility.killEvent, true);
        return menu;
    }

	_onKeyDown(evt) {
		if (evt.key === 'Escape') {
            this.close();
        }
    };
    
    // positions the menu at offset relative to corner (TL, BR, etc)
    _position(pos, relativeTo) {
        if (!this._domElement)
            return;

        const style = this._domElement.style;
        const toPx = (val) => `${val}px`;
        if (relativeTo === 'topLeft') {
            style.left = toPx(pos.x);
            style.top = toPx(pos.y);
        }
        else if (relativeTo === 'bottomLeft') {
            style.left = toPx(pos.x);
            style.bottom = toPx(pos.y);
        }
        else if (relativeTo === 'bottomRight') {
            style.right = toPx(pos.x);
            style.bottom = toPx(pos.y);
        }
        else {
            // /shrug
        }
    }
}
