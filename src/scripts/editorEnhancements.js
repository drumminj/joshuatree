// Dependencies:
//   * htmlValidator.js
//   * utility.js

// Class adding niceities to comment/reply editor
class EditorEnhancements {
    constructor(contentDocument) {
        this._document = contentDocument;
        this._onFormatButtonClick = this._onFormatButtonClick.bind(this);
        this._addQuoteHandlers(contentDocument);
        this._addCommentValidation(contentDocument);
        this._addFormatButtons(contentDocument);
        this._tweakCommentForm(contentDocument);
    }

    _addCommentValidation(contentDocument) {
        const submitButton = contentDocument.getElementById('submit');
        if (!submitButton) {
            return;
        }

        submitButton.addEventListener('click', evt => {
            const commentTextArea = contentDocument.getElementById('comment');
            const errors = HtmlValidator.validate(commentTextArea ? commentTextArea.value : '');
            if (errors && errors.length) {
                Utility.killEvent(evt);  // don't submit the post with errors
                let errorString = 'Failed to submit comment due to the following HTML errors:\n\n';
                for (const error of errors) {
                    errorString += '\t* ';
                    errorString += error;
                    errorString += '\n';
                }
                alert(errorString);
            }
        });
    }

    // Adds HTML formatting buttons to the comment editor
    _addFormatButtons(contentDocument) {
        if (!contentDocument.getElementById('commentform')) {
            return;
        }

        const buttonContainer = Utility.createElement(contentDocument, 'div', 'jt-format-buttons');

        const boldButton = Utility.createElement(contentDocument, 'button', 'jt-format-button', 'jt-format-bold');
        boldButton.textContent = 'Bold';
        boldButton.addEventListener('click', this._onFormatButtonClick);
        buttonContainer.appendChild(boldButton);

        const italicsButton = Utility.createElement(contentDocument, 'button', 'jt-format-button', 'jt-format-italics');
        italicsButton.textContent = 'Italics';
        italicsButton.addEventListener('click', this._onFormatButtonClick);
        buttonContainer.appendChild(italicsButton);

        const strikeButton = Utility.createElement(contentDocument, 'button', 'jt-format-button', 'jt-format-strike');
        strikeButton.textContent = 'Strikeout';
        strikeButton.addEventListener('click', this._onFormatButtonClick);
        buttonContainer.appendChild(strikeButton);

        const blockquoteButton = Utility.createElement(contentDocument, 'button', 'jt-format-button', 'jt-format-blockquote');
        blockquoteButton.textContent = 'Blockquote';
        blockquoteButton.addEventListener('click', this._onFormatButtonClick);
        buttonContainer.appendChild(blockquoteButton);

        const linkButton = Utility.createElement(contentDocument, 'button', 'jt-format-button', 'jt-format-anchor');
        linkButton.textContent = 'Link';
        linkButton.addEventListener('click', this._onLinkButtonClick.bind(this));
        buttonContainer.appendChild(linkButton);

        const commentTextArea = contentDocument.getElementById('comment');
        if (commentTextArea) {
            commentTextArea.parentNode.insertBefore(buttonContainer, commentTextArea.nextSibling);
        }
    };

    // Add event handlers to automatically quote selected text upon 'reply to this comment' click
    _addQuoteHandlers(contentDocument) {
        const commentTextArea = this._document.getElementById('comment');
        const replyLinks = contentDocument
            .getElementById('comments')
            .getElementsByClassName('comment-reply-link');

        for (const link of replyLinks) {
            // create a link that's a clone of the original, as on Chrome we can't just
            // null out the onclick handler
            const clone = Utility.createAnchor(contentDocument, link.textContent, link.href, link.className);
            clone.style = link.style;

            // save off the click handler from existing link
            const clickStr = link.getAttribute('onclick');

            // attach new handler to get document selection, 'quote' it in
            // comment form, then run the original click handling script when done
            clone.addEventListener('click', evt => {
                Utility.killEvent(evt);
                const selectedText = contentDocument.getSelection().toString();
                if (selectedText) {
                    commentTextArea.value = `<em>${selectedText.trim()}</em>\n\n`;
                }
                Utility.injectScript(clickStr);
            });

            link.parentNode.insertBefore(clone, link);
            link.parentNode.removeChild(link);
        }
    }

    // Event handler for click on format buttons
    _onFormatButtonClick(evt) {
        Utility.killEvent(evt);
        var tag = '';
        switch (evt.target.id) {
            case 'jt-format-bold':
                tag = 'strong';
                break;
            case 'jt-format-italics':
                tag = 'em';
                break;
            case 'jt-format-strike':
                tag = 'strike';
                break;
            case 'jt-format-blockquote':
                tag = 'blockquote';
                break;  
        }

        this._wrapSelectedTextInComment(`<${tag}>`, `</${tag}>`);
    }

    // Event handler for click on 'Link' button
    _onLinkButtonClick(evt) {
        Utility.killEvent(evt);
        this._promptForLink()
            .then(url => {
                if (url) {
                    this._wrapSelectedTextInComment(`<a href=\'${url}\'>`, '</a>');
                }
            }).catch(() => {});
    }

    // General/helper which shows an overlay/dialog which prompts for user input
    // TODO: move to Utility?
    _promptForInput(contentDocument, content) {
        return new Promise((resolve, reject) => {
            const overlay = Utility.createElement(contentDocument, 'div', 'jt-overlay');
            const overlayBg = Utility.createElement(contentDocument, 'div', 'jt-overlay-bg');
            overlay.appendChild(overlayBg);

            const cleanup = () => {
                contentDocument.removeEventListener('keydown', onKeyDown); 
                contentDocument.body.removeChild(overlay);
            }

            const onKeyDown = evt => {
                if (evt.key === 'Escape') {
                    cleanup();
                    reject();                }   
            };

            const buttonContainer = Utility.createElement(contentDocument, 'div', 'jt-button-container');
            const okButton = Utility.createElement(contentDocument, 'button', 'jt-input-button');
            okButton.textContent = 'Ok';
            okButton.addEventListener('click', evt => {
                Utility.killEvent(evt);
                cleanup();
                resolve();
            });
            buttonContainer.appendChild(okButton);

            const cancelButton = Utility.createElement(contentDocument, 'button', 'jt-input-button');
            cancelButton.textContent = 'Cancel';
            cancelButton.addEventListener('click', evt => {
                Utility.killEvent(evt);
                cleanup();
                reject();
            });
            buttonContainer.appendChild(cancelButton);

            const contentContainer = Utility.createElement(contentDocument, 'div', 'jt-overlay-content');
            contentContainer.appendChild(content);
            contentContainer.appendChild(buttonContainer);

            overlay.appendChild(contentContainer);
            overlay.addEventListener('click', evt => {
                if (evt.target === overlayBg) {
                    cleanup();
                    reject();
                }
            });
            contentDocument.addEventListener('keydown', onKeyDown);
            contentDocument.body.appendChild(overlay);
            Utility.fadeIn(overlay, 1.0);
        });
    }

    // Displays dialog for user to input a URL, returning a promise that resolves
    // with the url the user input
    _promptForLink() {
        const linkDialog = Utility.createElement(this._document, 'div', 'jt-link-dialog');

        const inputText = this._document.createElement('h2');
        inputText.textContent = 'Enter Link Location:';
        linkDialog.appendChild(inputText);

        const inputField = Utility.createElement(this._document, 'input', 'jt-link-input', 'jt-link-location');
        inputField.setAttribute('type','text');
        linkDialog.appendChild(inputField);

        // focus input field after calling promptForInput, to ensure elements
        // are in the DOM before focusing
        const promptPromise = this._promptForInput(this._document, linkDialog);
        inputField.focus();

        return promptPromise.then(() => inputField.value); 
    };

    // Cleans up look of comment reply form
    _tweakCommentForm(contentDocument) {
        const cancelReplyLink = contentDocument.getElementById('cancel-comment-reply-link');
        cancelReplyLink.textContent = 'Cancel';
        const commentTextArea = contentDocument.getElementById('comment');
        commentTextArea.rows = 4;
    }

    // Bookends the selected text in the comment area with beforeSelection and afterSelection,
    // such that <selectedText> => <beforeSelection> + <selectedText> + <afterSelection>
    _wrapSelectedTextInComment(beforeSelection, afterSelection) {
        const commentTextArea = this._document.getElementById('comment');
        if (!commentTextArea) {
            return;
        }

        const inputStr = commentTextArea.value;
        const begin = inputStr.substring(0, commentTextArea.selectionStart);
        const middle = inputStr.substring(commentTextArea.selectionStart, commentTextArea.selectionEnd);
        const end = inputStr.substring(commentTextArea.selectionEnd);
        
        // cache off info so we can restore the cursor and scroll position
        const oldScroll = commentTextArea.scrollTop;
        const oldSelectStart = commentTextArea.selectionStart;
        
        const newText = beforeSelection + middle + afterSelection;
        
        commentTextArea.value = begin + newText + end;
        commentTextArea.focus();
        commentTextArea.selectionStart = oldSelectStart;
        commentTextArea.selectionEnd = oldSelectStart + newText.length;
        
        // TODO: should really find way to scroll to selection rather than just restore old pos
        commentTextArea.scrollTop = oldScroll;
    }
}
