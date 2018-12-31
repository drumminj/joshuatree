// Dependencies: NONE

class Utility {
    // Creates an anchor element in the DOM of contentDocument
    static createAnchor(contentDocument, text, href, className, clickHandler) {
        const anchorElt = Utility.createElement(contentDocument, 'a', className);
        anchorElt.href = href;
        anchorElt.text = text;
        if (clickHandler) {
            anchorElt.addEventListener('click', clickHandler, false);
        }
        return anchorElt;
    }

    // Creates an element of nodetype in the DOM of contentDocument, with classname, and Id provided
    static createElement(contentDocument, nodeType, className, id) {
        const elt = contentDocument.createElement(nodeType);
        elt.className = className;
        if (id) {
            elt.setAttribute('id', id);
        }
        return elt;
    }

    // Fades in the given element, ending at 'endOpacity' and calling 'callback' when done
    static fadeIn(element, endOpacity, callback) {
        element.style.opacity = 0.0;
        element.style.visibility = 'visible';
        const setOpacity = opacity => element.style.opacity = opacity;
        animationManager.createAnimation(0.0, endOpacity, 0.25, 'easeOutSine', setOpacity, callback);
    }

    // Fades out the given element, starting at 'startOpacity' and calling 'callback' when done
    static fadeOut(element, startOpacity, callback) {
        const setOpacity = opacity => element.style.opacity = opacity;
        const onFadeOut = () => {
            element.style.visibility = 'hidden';
            if (callback) {
                callback();
            }
        };

        animationManager.createAnimation(startOpacity, 0.0, 0.25, 'easeOutSine', setOpacity, onFadeOut);
    }

    // Given a DOM element, give it's relative offset from the top of the page
    static getRelativeOffset(element, side, parentID) {
        let offset = 0;
        while (element) {
            offset += element['offset' + side];
            element = element.offsetParent;
            if (element && parentID && element.id === parentID)
                break;
        }

        return offset;
    }

    // BEWARE: Here be dragons.
    // Injects script into content document which will execute immediately
    static injectScript(scriptStr, keep) {
        const script = document.createElement('script');
        script.textContent = '(function(){' + scriptStr + '})();';
        (document.head || document.documentElement).appendChild(script);

        if (!keep) {
            script.parentNode.removeChild(script);
        }
    }

    // Function for killing propogation/default handling of the provided event
    static killEvent(objEvent) {
        if (objEvent) {
            objEvent.preventDefault();
            objEvent.stopPropagation();
        }
    }

    // Scrolls document to show the element with elementID
    static scrollToElement(contentDocument, elementID, easing, addlOffset) {
        easing = easing || 'easeOutSine';
        addlOffset = addlOffset || 0;
        if (contentDocument && elementID) {
            const elt = contentDocument.getElementById(elementID);
            if (elt) {
                const offset = Utility.getRelativeOffset(elt, 'Top') + addlOffset;
                if (offset != -1) {
                    const setOffsetCallback = newOffset => window.scrollTo(0, Math.floor(newOffset));
                    const scrollY = window.scrollY;

                    // scroll at ~1600px/s, with min of 250ms and max of 750ms
                    let duration = Math.abs(offset - scrollY) / 1600;
                    duration = Math.max(duration, 0.25);
                    duration = Math.min(duration, 0.75);

                    // animate scroll
                    animationManager.createAnimation(scrollY, offset, duration, easing, setOffsetCallback);
                }
            }
        }
    }
}
