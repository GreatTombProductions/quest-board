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
        'want need know see get look looking near please help tell learn ' +
        'compare comparing choose choosing before after am trying would like ' +
        'mother father parent mom mum dad family town ' +
        'grandmother grandfather grandma grandpa grandparent wife husband ' +
        'so why going go much many very really just also more most lot one ' +
        'they them their us here take keep keeps live place house ' +
        'didn t don doesn isn wasn s m ve re ll d best good bad').split(' '));

    // Light suffix folding so ordinary inflections meet card wording
    // (contaminated/contamination, releasing/release, graduates/graduation).
    // Applied identically to cards and questions; not a dictionary.
    function stem(t) {
        if (t.length > 4 && t.endsWith('ies')) t = t.slice(0, -3) + 'y';
        else if (t.length > 3 && t.endsWith('s') && !/(ss|us|is)$/.test(t)) t = t.slice(0, -1);
        for (const suffix of ['ion', 'ing', 'ed', 'e']) {
            if (t.length - suffix.length >= 4 && t.endsWith(suffix)) return t.slice(0, -suffix.length);
        }
        return t;
    }

    function words(value) {
        const tokens = value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
            .toLowerCase().match(/[a-z0-9]+/g) || [];
        return [...new Set(tokens.filter(t => !stop.has(t)).map(stem).filter(t => !stop.has(t)))];
    }

    function matches(query, text) {
        const haystack = new Set(words(text));
        return words(query).every(t => haystack.has(t));
    }

    // Rebuilt from the actual cards, never a project-specific matching table.
    function createSearch(records) {
        const entries = records.map((r, index) => ({
            index, tokens: new Set(words(r.text)), title: new Set(words(r.title || ''))
        }));
        const frequency = new Map();
        entries.forEach(e => e.tokens.forEach(t => frequency.set(t, (frequency.get(t) || 0) + 1)));
        const weight = t => Math.log(1 + entries.length / (frequency.get(t) || 1));

        return function search(query) {
            const tokens = words(query);
            // Display the visitor's own word, not its folded stem ("seattle").
            const typed = new Map();
            for (const raw of query.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().match(/[a-z0-9]+/g) || []) {
                words(raw).forEach(t => { if (!typed.has(t)) typed.set(t, raw); });
            }
            if (!tokens.length) {
                // A blank/scaffolding-only question is not a topic match.
                return query.trim() ? [] : entries.map(e => ({index: e.index, kind: 'all', missing: []}));
            }
            // Conservative literal constraints, not a geography/date parser.
            // Keep terms in explicitly introduced location/time phrases, every
            // number, and every capitalized word no card contains (Seattle,
            // Toronto): those fail closed. Unrecognized phrasing still gets
            // missing-word disclosure below; no result asserts applicability.
            const required = new Set(tokens.filter(t => /\d/.test(t)));
            for (const m of query.matchAll(/\b(?:in|near|within|from|during|since)\s+([^,;?.!]+)/gi)) {
                const phrase = m[1].split(/\b(?:and|but|with|for|that|where|which|is|are|was|were)\b/i)[0];
                words(phrase).forEach(t => required.add(t));
            }
            for (const raw of query.match(/\b[A-Z][A-Za-z]*/g) || []) {
                words(raw).forEach(t => { if (!frequency.has(t)) required.add(t); });
            }
            if ([...required].some(t => !frequency.has(t))) return [];

            // Other unseen lowercase words (grandmother, faucet) neither gate
            // nor vanish: they are scored as absent and disclosed as not
            // matched, and their results are only ever "related".
            const known = tokens.filter(t => frequency.has(t));
            const unknown = tokens.filter(t => !frequency.has(t));
            // Mostly-unrecognized input (markup, another topic) stays empty.
            if (!known.length || unknown.length > known.length) return [];
            const totalWeight = known.reduce((sum, t) => sum + weight(t), 0);
            const ranked = entries.map(e => {
                const hit = known.filter(t => e.tokens.has(t));
                const missing = tokens.filter(t => !e.tokens.has(t));
                const coverage = hit.reduce((sum, t) => sum + weight(t), 0) / totalWeight;
                const score = coverage + hit.reduce((sum, t) => sum + (e.title.has(t) ? weight(t) : 0), 0) / totalWeight;
                const exactKnown = hit.length === known.length;
                return {index: e.index, kind: missing.length ? 'related' : 'match', missing,
                    missingWords: missing.map(t => typed.get(t) || t), score,
                    eligible: [...required].every(t => e.tokens.has(t)) &&
                        (exactKnown && !unknown.length ? true
                            : hit.length >= 2 && (exactKnown || coverage >= 0.65))};
            }).filter(r => r.eligible).sort((a, b) => b.score - a.score || a.index - b.index);
            const exact = ranked.filter(r => r.kind === 'match');
            if (exact.length) return exact;
            // Only a short, high-coverage fallback; a lone common word cannot
            // admit a card. Specific rare words outweigh shared boilerplate.
            return ranked.filter(r => r.score >= ranked[0].score * 0.7).slice(0, 5);
        };
    }

    if (typeof module !== 'undefined' && module.exports) module.exports = {words, matches, createSearch};
    if (typeof document === 'undefined') return;

    const controls = document.getElementById('catalogue-search');
    const input = document.getElementById('tool-query');
    if (!controls || !input) return;
    // Never search leads or retirement notices as though they were usable tools.
    const cards = Array.from(document.querySelectorAll('#released .card.released')).map(card => {
        const record = {card, title: card.querySelector('h3').textContent,
            text: card.textContent + ' ' + (card.dataset.searchTerms || '')};
        // Capture source text before adding result annotations. User input is
        // only ever assigned as text, never HTML or a URL.
        record.note = document.createElement('p');
        record.note.className = 'detail search-result-note';
        record.note.hidden = true;
        card.insertBefore(record.note, card.querySelector('.links'));
        return record;
    });
    const search = createSearch(cards);
    const count = document.getElementById('search-count');
    const empty = document.getElementById('search-empty');
    function update() {
        const results = search(input.value);
        cards.forEach(({card, note}) => { card.hidden = true; note.hidden = true; });
        results.forEach(r => {
            const {card, note} = cards[r.index];
            card.hidden = false;
            note.hidden = r.kind !== 'related';
            note.textContent = r.kind === 'related'
                ? 'Related topic only — not matched: ' + r.missingWords.join(', ') + '. Check the tool’s coverage and dates.'
                : '';
            // DOM order follows ranking, so keyboard and visual order agree.
            card.parentNode.appendChild(card);
        });
        const related = results.some(r => r.kind === 'related');
        count.textContent = !input.value.trim()
            ? 'Showing all ' + cards.length + ' available tools.'
            : related
                ? results.length + ' of ' + cards.length + ' available tools have related topics, not a full match. Check coverage and dates.'
                : results.length + ' of ' + cards.length + ' available tools match.';
        empty.hidden = results.length !== 0;
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
