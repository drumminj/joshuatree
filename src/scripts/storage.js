// Dependencies:
//  * utility.js

const separator = ';';
const msInDay = 24 * 60 * 60 * 1000;

// Enum + keys for storage
// Used to specify which to store as well as key to use
const StorageItem = {
    Prefs: 'prefs',
    PostData: 'p_'
}

class Storage {
    constructor() {
        // cache of data saved in chrome storage
        this._prefs = {};
        this._postData = {};

        // track whether we're making a change to storage to skip
        // processing the 'change' event
        this._modifyingStorage = false;

        // try to use synced storage. If not supported then use local
        this._storage = chrome.storage;
        this._storageArea = this._storage.sync || this._storage.local;

        // set up listener to know when storage changes out from underneath us
        this._storage.onChanged.addListener(this._onStorageChange.bind(this));

        // start load
        this._loadData = this._readFromStorage();

        // ensure we save no more than once every 1.5s to make Google happy (can't
        // write to synced storage more than once every 2s over course of an hour)
        this._pendingSaveData = null;
        this._throttledSaveToStorage = Utility.throttle(this._saveToStorage.bind(this), 1500);
    }

    // Removes all comment history data
    clearPostData() {
        this._modifyingStorage = true;
        this._storageArea.remove(Object.keys(this._postData));
        this._postData = {};
    }

    // Returns a promise which resolves to extension preferences
    getPreferences() {
        return this._loadData
            .then(() => this._prefs);
    }

    // Returns a promise which resolves to an array of read comments for the given post
    // data is stored as array of integer Ids
    getReadComments(postId) {
        const key = StorageItem.PostData + postId;
        return this._loadData
            .then(() => {
                const postDataStr = this._postData[key] ? this._postData[key].readComments  : '';
                return Storage._decodeCommentData(postDataStr);
            });
    }

    // Stores extension preferences
    storePreferences(prefs) {
        this._prefs = {
            postHistory: prefs.postHistory,
            ignoredUsers: prefs.ignoredUsers,
        };
        this._storeData(StorageItem.Prefs);

        // may have changed with new preferences
        this._checkForExpiredData();
    }

    // Stores list of read comments for the given post
    storeReadComments(postId, readComments) {
        if (!postId || !readComments || !Array.isArray(readComments))
            return;

        const key = StorageItem.PostData + postId;
        this._postData[key] = {
            readComments: Storage._encodeCommentData(readComments),
            time: Date.now()
        }
        this._storeData(StorageItem.PostData);
    }

    // Given a string representing an encoded list of read comments,
    // decode the string, returning an array of comment Ids
    static _decodeCommentData(postDataStr) {
        if (!postDataStr) {
            return [];
        }

        // make a pass through the array to 'un-minimize' the data
        const comments = postDataStr.split(separator);
        if (comments.length > 0) {
            comments[0] = parseInt(comments[0]);
            const rootVal = comments[0];
            for (let i = 1; i < comments.length; i++) {
                comments[i] = parseInt(comments[i]) + rootVal;
            }
        }

        return comments;
    }

    // Given an array of comment Ids, encodes/compresses them
    // to a string
    static _encodeCommentData(comments) {
        if (!comments || comments.length === 0) {
            return '';
        }

        // make a pass through the array to 'minimize' the data
        if (comments.length > 1) {
            // make a clone as we're going to modify the array
            comments = comments.slice(0);
            const rootVal = comments[0];
            for (let i = 1; i < comments.length; i++) {
                comments[i] = comments[i] - rootVal;
            }
        }
        return comments.join(separator);
    }

    // Checks for any post data older than the 'postHistory' preference
    // and removes it
    _checkForExpiredData() {
        // check for any expired data
        if (this._prefs.postHistory) {
            const lifetimeInMS = this._prefs.postHistory * msInDay;
            const now = Date.now();

            const toRemove = [];
            for (const postId of Object.keys(this._postData)) {
                const postData = this._postData[postId];
                if (postData.time && (now - postData.time) > lifetimeInMS) {
                    delete this._postData[postId];
                    toRemove.push(postId);
                }
            }

            // batch remove from storage
            if (toRemove.length) {
                this._modifyingStorage = true;
                this._storageArea.remove(toRemove);
            }
        }
    }

    // Loads extension data from extension's storage, returning a promise
    _readFromStorage() {
        // NOTE: storage.get() should return a promise according to MDN, but
        // Chrome doesn't seem to implement it that way
        return new Promise((resolve, _) => {
            this._storageArea.get(null, obj => {
                this._parseData(obj);
                this._checkForExpiredData();
                resolve();
            });
        });
    }

    // Handler for storage change events, which re-loads the extension
    // data
    _onStorageChange(_, areaName) {
        if (areaName !== 'sync' && areaName !== 'local') {
            return;
        }

        // if it was us who triggered this event, then we don't
        // want/need to re-parse the data
        if (this._modifyingStorage) {
            this._modifyingStorage = false;
            return;
        }

        // Reload data, mainly so that changes to posts other than
        // the current one don't get overwritten with stale data
        this._loadData = this._readFromStorage();
    };

    // Parses the extension data returned from storage and
    // loads values into local cache
    _parseData(obj) {
        if (!obj) {
            return;
        }

        // parse preferences
        const prefs = obj[StorageItem.Prefs];
        this._prefs = prefs ? JSON.parse(prefs) : {};

        // parse read comments
        // we store each post as a separate item in storage,
        // however it's useful to hold them together for easy
        // lookup, so parse them into a separate object
        this._postData = {};
        for (const key of Object.keys(obj)) {
            if (key.substr(0,2) === StorageItem.PostData)
                this._postData[key] = obj[key];
        }
    }

    // Store cached extension data to synced storage
    _storeData(what) {
        this._pendingSaveData = this._pendingSaveData || {};
        if (!what || what === StorageItem.Prefs)
            this._pendingSaveData[StorageItem.Prefs] = JSON.stringify(this._prefs);

        // don't store this if incognito mode
        if (!chrome.extension.inIncognitoContext) {
            // rather than store a single object with all post data
            // (which may run up against the storage limits of 8k)
            // have an individual item per post
            if (!what || what === StorageItem.PostData) {
                for (const postId of Object.keys(this._postData)) {
                    this._pendingSaveData[postId] = this._postData[postId];
                }
            }
        }

        this._throttledSaveToStorage();
    }

    // Helper to be wrapped in a throttle call which actually saves the data
    // to storage
    _saveToStorage() {
        if (this._pendingSaveData && Object.keys(this._pendingSaveData).length !== 0) {
            this._modifyingStorage = true;
            this._storageArea.set(this._pendingSaveData);
            this._pendingSaveData = null;
        }
    }
}

// singleton instance
const storage = new Storage();
