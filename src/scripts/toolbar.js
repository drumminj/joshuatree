// Dependencies:
//   * resources.js
//   * utility.js

const chromeUrl = 'https://chrome.google.com/webstore/detail/joshuatree/bpijogddiefkbkfjnlejhkeemoeapiim';
const firefoxUrl = 'https://addons.mozilla.org/en-US/firefox/addon/joshua-tree-extension/';

class Toolbar {
    constructor(contentDocument, contextMenu, navigateCallback) {
        this._navigateCallback = navigateCallback;
        this._commentCount = 0;
        this._commentIndex = -1;

        // cached off dom element references
        this._menuButton = null;
        this._nextButton = null;
        this._nextButtonLabel = null;
        this._prevButton = null;
        this._prevButtonLabel = null;
        this._statusElt = null;
        this._toolbar = null;

        this._contextMenu = contextMenu;
        this._menuShowing = false;

        this._create(contentDocument);
    }

    // Sets total number of comments (range of toolbar)
    setCommentCount(count) {
        this._commentCount = count;

        // update display
        if (this._statusElt) {
            this._statusElt.textContent = `${joshuaTreeResources.toolbarPostText} ${count}`;
        }

        this._updateNavigationButtons();
    }

    // Add toolbar/footer
    _create(contentDocument) {

        // make icon link to main page
        const icon = Utility.createElement(contentDocument, 'img', 'jt-toolbar-icon');
        icon.src = joshuaTreeResources.iconURL;

        const iconAnchor = Utility.createElement(contentDocument, 'a', 'jt-icon-link');
        iconAnchor.href = '/'; // link back to root URL
        iconAnchor.appendChild(icon);

        // add "header" label
        const version = joshuaTreeResources.version;
        const headerText = `${joshuaTreeResources.toolbarHeaderText}${version ? ' v' + version : ''}`;

        const headerTextElt = Utility.createElement(contentDocument, 'span', 'jt-toolbar-header-text');
        headerTextElt.textContent = headerText;

        const menuButton = Utility.createElement(contentDocument, 'img', 'jt-toolbar-menubutton');
        menuButton.src = joshuaTreeResources.menuButtonURL;
        menuButton.addEventListener('click', this._onMenuButtonClick.bind(this), false);
        menuButton.addEventListener('mouseover', this._updateMenuButtonState.bind(this, 'active'), false);
        menuButton.addEventListener('mouseout', this._updateMenuButtonState.bind(this, 'normal'), false);
        this._menuButton = menuButton;

        const headerElt = Utility.createElement(contentDocument, 'div', 'jt-toolbar-header');
        headerElt.appendChild(headerTextElt);
        headerElt.appendChild(this._menuButton);

        this._statusElt = Utility.createElement(contentDocument, 'div', 'jt-toolbar-status');

        // create container for text fields to float left
        const textElt = Utility.createElement(contentDocument, 'div', 'jt-toolbar-text');
        textElt.appendChild(headerElt);
        textElt.appendChild(this._statusElt);

        // create 'previous' navigation button
        const prevButtonArrows = document.createElement('span');
        prevButtonArrows.textContent = '<<';

        this._prevButtonLabel = Utility.createElement(contentDocument, 'span', 'jt-toolbar-button-label', 'jt-toolbar-prev-label');

        const prevButton = Utility.createElement(contentDocument, 'button', 'jt-toolbar-button', 'jt-toolbar-prev');
        prevButton.addEventListener('click', () => this._setCommentIndex(this._commentIndex - 1), false);
        prevButton.appendChild(prevButtonArrows);
        prevButton.appendChild(this._prevButtonLabel);
        this._prevButton = prevButton;

        // create 'next' navigation button
        const nextButtonArrows = document.createElement('span');
        nextButtonArrows.textContent = '>>';

        this._nextButtonLabel = Utility.createElement(contentDocument, 'span', 'jt-toolbar-button-label', 'jt-toolbar-next-label');

        const nextButton = Utility.createElement(contentDocument, 'button', 'jt-toolbar-button', 'jt-toolbar-next');
        nextButton.addEventListener('click', () => this._setCommentIndex(this._commentIndex + 1), false);
        nextButton.addEventListener('contextmenu', evt => this._showContextMenu(evt), false);
        nextButton.appendChild(this._nextButtonLabel);
        nextButton.appendChild(nextButtonArrows);
        this._nextButton = nextButton;

        // create container for nav buttons to float right
        const navElt = Utility.createElement(contentDocument, 'div', 'jt-toolbar-nav-container');
        navElt.appendChild(prevButton);
        navElt.appendChild(nextButton);

        const footerElt = Utility.createElement(contentDocument, 'div', 'jt-toolbar', 'jt-toolbar');
        footerElt.appendChild(iconAnchor);
        footerElt.appendChild(textElt);
        footerElt.appendChild(navElt);
        this._toolbar = footerElt;

        contentDocument.body.appendChild(this._toolbar);

        // initialize dynamic state of status/buttons
        this.setCommentCount(this._commentCount);

        // Firefox won't measure height correctly until we pop the stack
        window.setTimeout(() => {
            contentDocument.body.style.paddingBottom = `${this._toolbar.offsetHeight}px`;
        }, 0);
    };

    // Handler for click on toolbar menu button
    _onMenuButtonClick(evt) {
        Utility.killEvent(evt);

        // if menu already showing, close it and do no more
        if (this._menuShowing) {
            this._contextMenu.close();
            return;
        }

        // build items for menu
        var homePageUrl = !!window.chrome ? chromeUrl : firefoxUrl;
        const menuItems = [
            {'text': 'JoshuaTree Home Page', 'url': homePageUrl, 'callback': null},
            null,
            {'text': 'Options', 'url': '', 'callback': () => chrome.runtime.sendMessage({action: 'showOptions'}) }
        ];

        const closeCallback = () => {
            this._menuShowing = false;
            this._updateMenuButtonState('normal');
        };

        const xPos = Utility.getRelativeOffset(this._menuButton, 'Left');
        const yPos = this._toolbar.offsetHeight - Utility.getRelativeOffset(this._menuButton, 'Top', 'jt-toolbar');
        this._contextMenu.show(menuItems, {'x': xPos, 'y': yPos}, 'bottomLeft', closeCallback);
        this._menuShowing = true;
        this._updateMenuButtonState();
    };

    // Set index of current comment
    _setCommentIndex(index) {
        // pin to [0, commentCount-1]
        this._commentIndex = Math.min(Math.max(0, index), this._commentCount - 1);
        this._updateNavigationButtons();

        if (this._navigateCallback) {
            this._navigateCallback(this._commentIndex);
        }
    }

    // Handler for context menu on 'next' navigation button
    _showContextMenu(evt) {
        Utility.killEvent(evt);

        // 'mark all comments read' popup menu item
        const allReadMenuItems = [{
            text: 'Mark All Comments Read',
            url: '',
            callback: () => this._setCommentIndex(this._commentCount)
        }];

        // because we're positioning relative to bottom-right,
        // need to offset client coords by content width/height
        const xPos = window.innerWidth - evt.clientX + 2;
        const yPos = window.innerHeight - evt.clientY + 2;

        this._contextMenu.show(allReadMenuItems, {'x': xPos, 'y': yPos}, 'bottomRight', null);
    }

    // update menu button's image/state
    _updateMenuButtonState(state) {
        this._menuButton.src = (this._menuShowing || state === 'active') ?
            joshuaTreeResources.menuButtonActiveURL :
            joshuaTreeResources.menuButtonURL;
    }

    // Update text/state of toolbar navigation buttons
    _updateNavigationButtons() {
        const remainingCount = this._commentCount - this._commentIndex - 1;
        let nextButtonText = `${joshuaTreeResources.nextButtonText} (${remainingCount })`;
        let prevButtonText = joshuaTreeResources.prevButtonText;

        // really convoluted way of keeping the two buttons roughly the same size
        // make sure we pad the "smaller" button with spaces to give roughly the same appearance
        while (prevButtonText.length < nextButtonText.length) {
            prevButtonText += '\u00A0';
        }
        while (nextButtonText.length < prevButtonText.length) {
            nextButtonText = '\u00A0' + nextButtonText;
        }

        this._nextButtonLabel.textContent = nextButtonText;
        this._nextButton.disabled = (remainingCount === 0);

        this._prevButtonLabel.textContent = prevButtonText;
        this._prevButton.disabled = (this._commentIndex <= 0);
    }
}
