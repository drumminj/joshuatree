// Dependencies:
//   * preferences.js
//   * storage.js

class OptionsPage {
	constructor(contentDocument) {
		this._document = contentDocument;
		this._clearDataButton = null;
		this._ignoreList = null;
		this._lifetimeInput = null;
		this._removeUserButton = null;

		this._prefs = new Preferences();
		this._init();
	}

	_init() {
		this._clearDataButton = this._document.getElementById('clearDataButton');
		this._clearDataButton.addEventListener('click', storage.clearPostData);

		// update 'remove' button state as user selects items
		this._ignoreList = this._document.getElementById('ignoreList');
		this._ignoreList.addEventListener('change', () => this._updateRemoveButtonState());

		this._lifetimeInput = this._document.getElementById('lifetimeInput');
		this._lifetimeInput.addEventListener('change', () => {

			// coerce value to range
			let val = this._lifetimeInput.value;
			val = Math.min(val, this._lifetimeInput.max);
			val = Math.max(val, this._lifetimeInput.min);
			this._lifetimeInput.value = val;

			this._prefs.setPostHistoryLength(val);
		});

		this._removeUserButton = this._document.getElementById('removeButton');
		this._removeUserButton.addEventListener('click', () => this._unIgnoreSelectedUser());

		this._updateIgnoreList();
		this._prefs.getPostHistoryLength()
			.then(length => {
				this._lifetimeInput.value = length;
			});
	}

	// Remove the selected user from the ignore list
	_unIgnoreSelectedUser() {
		const index = this._ignoreList.selectedIndex;
		const userName = this._ignoreList.options[index].label;
		this._prefs.unIgnoreUser(userName);
		this._updateIgnoreList();
	};

	// Re-populate the ignore list from preferences
	_updateIgnoreList() {
		this._prefs.getIgnoredUsers()
			.then(ignoredUsers => {
				// first clear
				while (this._ignoreList.length > 0)
					this._ignoreList.remove(0);

				// then add items
				for (const user of ignoredUsers) {
					const opt = this._document.createElement('option');

					// firefox seems to need this rather than just set label
					opt.textContent = user;
					opt.label = user;
					this._ignoreList.add(opt);
				}

				this._ignoreList.disabled = this._ignoreList.length === 0;
				this._updateRemoveButtonState();
			});
	};

	_updateRemoveButtonState() {
		this._removeUserButton.disabled = this._ignoreList.selectedIndex === -1;
	};
}

let options;
document.addEventListener('DOMContentLoaded', (objEvent) => { options = new OptionsPage(objEvent.target); });
