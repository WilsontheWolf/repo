// eslint-disable-next-line no-control-regex
const fullRegex = /^(?:[^\x00-\x20#-](?:[\x21-\x39]|[\x3B-\x7E])+):\s*(?:(?:.|(?:\n\s))*)/gm;
const lineRegex = /^((?:[\x21-\x39]|[\x3B-\x7E])+):\s*((?:.|(?:\n\s))*)$/;

/**
 * Parse a control data input.
 * @param {String} input - Required. The text to parse
 * @param {Object} [options] - The parsing options
 * @param {Boolean} [options.multi=false] - Whether or not to support multiple paragraphs
 */
module.exports = (input, {
    multi = false
} = {}) => {
    if (typeof input !== 'string')
        throw new Error('The input provided was not a string. Please provide a string.');
    input = input.trim();
    // A file can have multiple paragraphs.
    // Each is considered its own entry.
    // This is used for things like Packages
    // or Release. A control file will only 
    // have one so it doesn't need to do it
    if (!multi && input.match(/\n{2,}/))
        throw new Error('The provided input has multiple paragraphs but you have specified that you only want one line. Please choose an input with only one paragraph or set the `multi` option to true.');
    let processing;
    if (multi)
        processing = input.split(/\n{2,}/);
    else
        processing = [input];
    let res = processing.map(paragraph => {
        const match = paragraph.match(fullRegex);
        if (!match) return null;
        const map = new Map();
        match.forEach(line => {
            const m = line.match(lineRegex);
            if (!m) return;
            const [, name, content] = m;
            map.set(name, content);
        });
        return map;
    })
        .filter(v => v);
    if (!multi)
        return res[0];
    return res;
};