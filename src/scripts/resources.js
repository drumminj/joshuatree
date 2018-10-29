// static resources/strings for extension
const joshuaTreeResources = {
    version: chrome.runtime.getManifest().version, // get version from manifest
    toolbarHeaderText: 'Joshua Tree Extension',
    toolbarPostText: 'New Comments:',
    prevButtonText: 'Previous',
    nextButtonText: 'Next',
    loadIndicatorText: 'Inserting JoshuaTree...',

    iconURL: chrome.extension.getURL('images/joshuatree.png'),
    loadAnimationURL: chrome.extension.getURL('images/load-animation.gif'),
    menuButtonURL: chrome.extension.getURL('images/menubutton.png'),
    menuButtonActiveURL: chrome.extension.getURL('images/menubutton_active.png'),
    overlayBgURL: chrome.extension.getURL('images/overlay.png'),

    postRegExp: /^https?:\/\/(?:\w+\.)*housingbubble.blog\/\?p=(\d+)/,
};
