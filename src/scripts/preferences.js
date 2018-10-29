// Dependencies:
//   * storage.js

const defaultPostHistoryLength = 3;

// Class representing current preferences for extension.
// Loads/synchronizes with extension's storage
class Preferences {
	constructor() {
		this._postHistoryLength = defaultPostHistoryLength;
		this._ignoredUsers = [];

		// Load stored preferences from storage, initializing the
		// data in this object. When load is complete, callback is called
		this._loadData = storage.getPreferences()
			.then(prefs => {
				this._postHistoryLength = prefs.postHistory || this._postHistoryLength;
				this._ignoredUsers = prefs.ignoredUsers || this._ignoredUsers;
			});
	}

	getIgnoredUsers() {
		return this._loadData
			.then(() => this._ignoredUsers);
	}

	// Gets the # of days of post history to retain
	getPostHistoryLength() {
		return this._loadData
			.then(() => this._postHistoryLength);
	}

	// Marks the specified user for ignore
	ignoreUser(userName) {
		return this._loadData
			.then(() => {
				if (this._ignoredUsers.indexOf(userName) !== -1)
					return;

				this._ignoredUsers.push(userName);
				this._save();
			});
	};

	// Sets the # of days of post history to retain
	setPostHistoryLength(length) {
		this._postHistoryLength = Math.floor(length) || this._postHistoryLength;
		this._save();
	}

	// Removes specified user from ignore list
	unIgnoreUser(userName) {
		return this._loadData
			.then(() => {
				const index = this._ignoredUsers.indexOf(userName);
				if (index === -1)
					return;

				this._ignoredUsers.splice(index, 1);
				this._save();
			});
	};

	// Saves current state of preferenes to extension's storage
	_save() {
		storage.storePreferences({
			postHistory: this._postHistoryLength,
			ignoredUsers: this._ignoredUsers
		});
	}
}

