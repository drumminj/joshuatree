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

                    const isIgnored = ignoredUsers && ignoredUsers.indexOf(comment.author.toLowerCase()) !== -1;
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
