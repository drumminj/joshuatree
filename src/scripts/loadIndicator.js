// Dependencies:
//   * animation.js
//   * resources.js
//   * utility.js

// Class for displaying "loading" widget in top-right of document window
class LoadIndicator {
    constructor(contentDocument) {
        this._document = contentDocument;
        this._domNode = this._create(contentDocument);
    }

    // Fades out the indicator and removes it from the DOM once done
    hide() {
        const setOpacity = opacity => this._domNode.style.opacity = opacity;
        const removeLoadIndicator = () => {
            this._document.body.removeChild(this._domNode);
            this._domNode = null;
        };

        // create fade-out animation
        animationManager.createAnimation(1.0, 0.0, 1.0, 'easeInQuint', setOpacity, removeLoadIndicator);
    }

    _create(contentDocument) {
        if (!contentDocument)
            return null;

        const loadAnimation = Utility.createElement(contentDocument, 'img', 'load-animation');
        loadAnimation.src = joshuaTreeResources.loadAnimationURL;

        const loadText = contentDocument.createElement('div');
        loadText.textContent = joshuaTreeResources.loadIndicatorText;

        const loadIndicator = Utility.createElement(contentDocument, 'div', 'load-indicator');
        loadIndicator.appendChild(loadAnimation);
        loadIndicator.appendChild(loadText);

        contentDocument.body.appendChild(loadIndicator);
        return loadIndicator;
    }
}
