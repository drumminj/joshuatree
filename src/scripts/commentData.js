// Dependencies:
//   * storage.js

// Class representing current post comment state/data for extension.
// Loads/synchronizes with extension's Storage
class CommentData {
    constructor(postId) {
        this._postId = postId;
        this._origReadComments = [];
        this._newReadComments = [];

        this._loadData = storage.getReadComments(this._postId)
            .then(commentArray => {
                this._origReadComments = commentArray;
                return commentArray;
            });
    }

    // Returns a promise which when resulve returns array of read comment IDs
    getReadComments() {
        return this._loadData
            .then(readComments => readComments.concat(this._newReadComments));
    }

    // Sets/stores the set of newly read comments from this session,
    // saving them to extension storage
    setReadComments(readComments) {
        if (!readComments)
            return;

        this._newReadComments = readComments;
        this._save();
    }

    // Saves the current read comment state to extension storage
    _save() {
        this._loadData
            .then(readComments => {
                storage.storeReadComments(this._postId, readComments.concat(this._newReadComments));
            });
    };
}
