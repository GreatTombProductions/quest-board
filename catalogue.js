/* Progressive enhancement: available cards remain readable without this script.
 * Search vocabulary is the rendered card plus optional manifest search_terms.
 * No network requests, model, storage or second catalogue. */
(function () {
    'use strict';

    // Question scaffolding, not subject vocabulary (e.g. keep lead, care, pay).
    const stop = new Set(('a an the and or of to for in on at by with from about ' +
        'i me my we our you your is are was were be been being do does did ' +
        'can could would should will has have had how what which who where when ' +
        'whether if it its this that these those there any some find check show ' +
        'want need know see get look looking near').split(' '));

    function words(value) {
        const tokens = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase().match(/[a-z0-9]+/g) || [];
        return [...new Set(tokens.filter(t => !stop.has(t)).map(t => {
            if (t.length > 4 && t.endsWith('ies')) return t.slice(0, -3) + 'y';
            if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss')) return t.slice(0, -1);
            return t;
        }))];
    }

    function matches(query, text) {
        const haystack = new Set(words(text));
        return words(query).every(t => haystack.has(t));
    }

    if (typeof module !== 'undefined' && module.exports) module.exports = {words, matches};
    if (typeof document === 'undefined') return;

    const controls = document.getElementById('catalogue-search');
    const input = document.getElementById('tool-query');
    if (!controls || !input) return;
    // Never search leads or retirement notices as though they were usable tools.
    const cards = Array.from(document.querySelectorAll('#released .card.released')).map(card => ({
        card,
        text: card.textContent + ' ' + (card.dataset.searchTerms || '')
    }));
    const count = document.getElementById('search-count');
    const empty = document.getElementById('search-empty');
    function update() {
        let found = 0;
        cards.forEach(({card, text}) => {
            card.hidden = !matches(input.value, text);
            if (!card.hidden) found++;
        });
        count.textContent = words(input.value).length
            ? found + ' of ' + cards.length + ' available tools match.'
            : 'Showing all ' + cards.length + ' available tools.';
        empty.hidden = found !== 0;
    }
    input.addEventListener('input', update);
    // Native search-field clear controls can emit a search event as well.
    input.addEventListener('search', update);
    document.getElementById('clear-search').addEventListener('click', () => {
        input.value = '';
        update();
        input.focus();
    });
    update();
    controls.hidden = false;
}());
