(function (root) {
    'use strict';

    // Optional note kinds. The value stored on the issue stays the manifest
    // token; the label is what a person sees. Unknown tokens stay readable.
    var KIND_LABELS = {
        'bug': 'Something on the page broke',
        'bug report': 'Something on the page broke',
        'general': 'Something else',
        'rule-correction': 'A rule or a date looks wrong',
        'data-issue': 'The records look wrong',
        'data': 'The records look wrong',
        'data accuracy': 'The records look wrong',
        'data_issue': 'The records look wrong',
        'feature-request': 'Something the page should do',
        'feature request': 'Something the page should do',
        'feature_request': 'Something the page should do',
        'feature': 'Something the page should do',
        'methodology': 'How it counts looks wrong',
        'source-drift': 'A source it uses has changed',
        'useful': 'This was useful',
        'not_useful': 'This was not useful',
        'missing-company': 'A company is missing',
        'missing-employer': 'An employer is missing',
        'missing-facility': 'A facility is missing',
        'missing-drug': 'A drug is missing',
        'missing-route': 'A route is missing',
        'missing-vehicle': 'A vehicle is missing',
        'missing-bank': 'A bank is missing',
        'missing-dam': 'A dam is missing',
        'missing-record': 'A record is missing',
        'wrong-system': 'The wrong system came up',
        'school information': 'A school looks wrong'
    };

    function normalizeProject(value) {
        return /^[a-z0-9][a-z0-9-]{0,79}$/.test(value || '') ? value : '';
    }

    function projectLabel(slug) {
        return slug
            .split('-')
            .map(function (word) {
                return word ? word.charAt(0).toUpperCase() + word.slice(1) : '';
            })
            .join(' ');
    }

    function kindLabel(raw) {
        if (KIND_LABELS[raw]) {
            return KIND_LABELS[raw];
        }
        return String(raw || '').replace(/[-_]+/g, ' ');
    }

    function createIssuePayload(values) {
        var asymmetry = values.asymmetry.trim();
        var dataSource = values.dataSource.trim();
        var dissolution = values.dissolution.trim();
        var origin = normalizeProject(values.origin);
        var titleSummary = asymmetry.split(/\r?\n/)[0].replace(/\s+/g, ' ').slice(0, 72);
        var body = [
            '## Information asymmetry',
            asymmetry,
            '',
            '## Data source or link',
            dataSource,
            '',
            '## Proposed tool',
            dissolution,
            '',
            '## Origin',
            origin ? 'Related tool: ' + origin : 'Quest Board'
        ].join('\n');

        return {
            title: titleSummary ? 'Lead: ' + titleSummary : 'Suggest a lead',
            body: body
        };
    }

    function createAnswerPayload(values) {
        var words = String(values.words || '').trim();
        var origin = normalizeProject(values.origin);
        var kind = String(values.kind || '').trim();
        var name = String(values.name || '').trim();
        var titleSummary = words.split(/\r?\n/)[0].replace(/\s+/g, ' ').slice(0, 72);
        var toolLines = [origin || 'unknown'];
        if (name && name !== origin) {
            toolLines.push(name);
        }
        var lines = ['## Tool'].concat(toolLines).concat(['', '## What they said', words]);
        if (kind) {
            var label = kindLabel(kind);
            lines.push('', '## Kind', label === kind ? kind : label + ' (' + kind + ')');
        }
        lines.push('', 'What they wrote is public. No promise that anyone answers.');
        return {
            title: titleSummary || ('A note about ' + (origin || 'a tool')),
            body: lines.join('\n')
        };
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            createIssuePayload: createIssuePayload,
            createAnswerPayload: createAnswerPayload,
            normalizeProject: normalizeProject,
            projectLabel: projectLabel,
            kindLabel: kindLabel
        };
    }

    if (typeof document === 'undefined') {
        return;
    }

    var form = document.getElementById('lead-form');
    if (!form) {
        return;
    }

    var params = new URLSearchParams(window.location.search);
    var origin = normalizeProject(params.get('project'));
    var originInput = document.getElementById('origin-project');
    var catalog = {};
    var catalogEl = document.getElementById('answer-projects');
    if (catalogEl) {
        try {
            catalog = JSON.parse(catalogEl.textContent);
        } catch (error) {
            catalog = {};
        }
    }

    function setPlainLabel() {
        var label = document.getElementById('label-asymmetry');
        if (!label) {
            return;
        }
        label.textContent = 'In your own words ';
        var star = document.createElement('span');
        star.setAttribute('aria-hidden', 'true');
        star.textContent = '*';
        label.appendChild(star);
    }

    function showCategories(categories) {
        var fieldset = document.getElementById('answer-categories');
        var choices = document.getElementById('answer-category-choices');
        if (!fieldset || !choices) {
            return;
        }
        choices.textContent = '';
        (categories || []).forEach(function (cat) {
            if (typeof cat !== 'string' || !cat) {
                return;
            }
            var label = document.createElement('label');
            var input = document.createElement('input');
            input.type = 'radio';
            input.name = 'answer-kind';
            input.value = cat;
            label.appendChild(input);
            label.appendChild(document.createTextNode(' ' + kindLabel(cat)));
            choices.appendChild(label);
        });
        fieldset.hidden = !choices.childElementCount;
    }

    function showAnswerBack(slug) {
        var record = catalog[slug] || null;
        var name = record && record.name ? record.name : projectLabel(slug);
        var heading = document.getElementById('suggest-heading');
        if (heading) {
            heading.textContent = 'Say something about ' + name;
        }
        var intro = document.getElementById('suggest-intro');
        if (intro) {
            intro.hidden = true;
        }
        var warning = document.getElementById('answer-warning');
        if (warning) {
            warning.hidden = false;
        }
        ['group-data-source', 'group-dissolution'].forEach(function (id) {
            var group = document.getElementById(id);
            if (!group) {
                return;
            }
            group.hidden = true;
            var field = group.querySelector('textarea');
            if (field) {
                field.required = false;
                field.disabled = true;
            }
        });
        setPlainLabel();
        var box = document.getElementById('lead-asymmetry');
        if (box) {
            box.placeholder = 'What was wrong, confusing, or useful? One or two sentences is enough.';
        }
        showCategories(record && record.categories);
        var note = document.getElementById('suggest-note');
        if (note) {
            note.textContent = 'No promise that anyone answers. This is not a help line, and nothing you type here is sent until you publish the GitHub issue yourself.';
        }
        var elsewhere = document.getElementById('answer-else');
        if (elsewhere) {
            elsewhere.hidden = false;
            var link = elsewhere.querySelector('a');
            if (link) {
                var clean = new URL(window.location.href);
                clean.search = '';
                clean.hash = 'suggest';
                link.href = clean.pathname + clean.hash;
            }
        }
        form.dataset.mode = 'answer';
        form.dataset.toolName = name;
    }

    if (origin) {
        originInput.value = origin;
        showAnswerBack(origin);
    }

    form.addEventListener('submit', function () {
        var payload;
        if (form.dataset.mode === 'answer') {
            var selected = form.querySelector('input[name="answer-kind"]:checked');
            payload = createAnswerPayload({
                words: document.getElementById('lead-asymmetry').value,
                origin: originInput.value,
                name: form.dataset.toolName || '',
                kind: selected ? selected.value : ''
            });
            form.querySelectorAll('#answer-categories input').forEach(function (input) {
                input.disabled = true;
            });
        } else {
            payload = createIssuePayload({
                asymmetry: document.getElementById('lead-asymmetry').value,
                dataSource: document.getElementById('lead-data-source').value,
                dissolution: document.getElementById('lead-dissolution').value,
                origin: originInput.value
            });
        }

        document.getElementById('issue-title').value = payload.title;
        document.getElementById('issue-body').value = payload.body;
    });
}(typeof globalThis !== 'undefined' ? globalThis : this));
