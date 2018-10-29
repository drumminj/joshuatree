// Dependencies: NONE

// Helper "class" which will validate HTML via validate() method
// validate() returns an array of error strings
class HtmlValidator {
    // Validates the given HTML string, returning an array of error strings
    static validate(htmlString) {
        const openRegExp = /<([A-Z]+)(?:\s+\w+\s*=\s*(?:(?:"[^"]+")|(?:'[^']+')))*\s*>/i;
        const closeRegExp = /<\s*\/([A-Z]+)\s*>/i;

        const errorArray = [];
        const tagArray = [];
        
        while (htmlString) {
            let openTag = '';
            const openPos = htmlString.search(openRegExp);
            if (openPos !== -1) {
                const matches = openRegExp.exec(htmlString);
                if (matches) {
                    openTag = matches[1];
                }
            }

            let closeTag = '';
            const closePos = htmlString.search(closeRegExp);
            if (closePos !== -1) {
                const matches = closeRegExp.exec(htmlString);
                if (matches) {
                    closeTag = matches[1];
                }
            }

            if (!openTag && !closeTag) {
                break; // no more to be done
            }

            // if we found the open tag first
            if (closePos === -1 || (openPos !== -1 && openPos < closePos)) {
                if (HtmlValidator._tagRequiresClose(openTag)) {
                    tagArray.push(openTag);
                }
                htmlString = htmlString.substring(openPos + openTag.length);
            } else {
                // find open tag that matches this close tag
                let found = false;
                for (let i = tagArray.length - 1; i >= 0; i--) {
                    if (tagArray[i] === closeTag) {
                        found = true;
                        for (let j = i + 1; j < tagArray.length; j++) {
                            errorArray.push(HtmlValidator._unClosedTagError(tagArray[j]));
                        }
                        tagArray.splice(i, tagArray.length - i);
                        break;
                    }
                }

                if (!found) {
                    // unmatched close tag
                    errorArray.push(HtmlValidator._unExpectedTagError(closeTag));
                }
                htmlString = htmlString.substring(closePos + closeTag.length);
            }
        }
        
        for (const tag of tagArray) {
            errorArray.push(HtmlValidator._unClosedTagError(tag));
        }

        return errorArray;
    }

    // Returns whether the specified HTML tag requires a close tag
    static _tagRequiresClose(htmlTag) {
        const upperTag = htmlTag.toUpperCase();
        return !(upperTag === 'IMG' || upperTag === 'BR');
    };

    // Returns error string for provided unclosed tag
    static _unClosedTagError(htmlTag) {
        return 'Unclosed HTML tag: \'' + htmlTag + '\'';
    }

    // Returns error string for provided unexpected tag
    static _unExpectedTagError(htmlTag) {
        return 'Unexpected HTML close tag: \'' + htmlTag + '\'';
    }
}
