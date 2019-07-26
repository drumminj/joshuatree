// Dependencies:
//   * comment.js
//   * prefs.js

// Object which processes the document, identifying/saving off comments and
// marking them as new or ignored as appropriate
class CommentProcessor {
    constructor(contentDocument, commentData, prefs) {
        this._commentLookup = new Map;  // Mapping from commentID to comment
        this._unreadCommentIds = [];    // Array of IDs of unread comments
        this._document = contentDocument;
        this._commentData = commentData;
        this._prefs = prefs;

        this._parseComments(contentDocument);
    }

    // Returns comment object for given id, if it exists
    getComment(id) {
        return this._commentLookup.get(id);
    }
    
    // Process the document, identifying and modifying display
    // of new and ignored comments
    processDocument(ignoreOnly = false) {
        let readComments = [];
        return this._commentData.getReadComments()
            .then(comments => {
                readComments = comments;
                return this._prefs.getIgnoredUsers();
            })
            .then(ignoredUsers => {
                ignoredUsers = ignoredUsers.map(user => user.toLowerCase());
                const readCommentLookup = new Set(readComments);
                for (const comment of Array.from(this._commentLookup.values())) {
                    if (!ignoreOnly && !readCommentLookup.has(comment.id)) {
                        comment.markAsNew(true);
                        this._unreadCommentIds.push(comment.id);
                    }

                    // const isIgnored = ignoredUsers && ignoredUsers.indexOf(comment.author.toLowerCase()) !== -1;
                    let isIgnored = false;
                    for (const user of ignoredUsers) {
                        // handle case of users who cycle through iterations of screen names.
                        // Not 100% accurate, but checking for common substring that has ~70%
                        // overlap is hopefully a close enough approximation
                        const fragmentLength = (user.length >= 8) ?
                                Math.floor(user.length * .7) :
                                Math.round(user.length * .75);

                        const lowerAuthor = comment.author.toLowerCase();
                        if ((lowerAuthor.startsWith(user.substr(0, fragmentLength)) || lowerAuthor.endsWith(user.substr(user.length - fragmentLength))) &&
                            (fragmentLength / lowerAuthor.length) > 0.5) {
                            isIgnored = true;
                            break;
                        }
                    }
                    comment.markAsIgnored(isIgnored);
                }

                return this._unreadCommentIds;
            });
    }

    // Walks DOM and identifies all comment DIVs, adding them to lookup
    _parseComments(contentDocument) {
        const allComments = contentDocument
            .getElementById('comments')
            .getElementsByClassName('comment');
        for (const commentElt of Array.from(allComments)) {
            const comment = new Comment(commentElt);
            this._commentLookup.set(comment.id, comment);
        }
    };
}
