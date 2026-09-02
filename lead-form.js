(function (root) {
    'use strict';

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

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = {
            createIssuePayload: createIssuePayload,
            normalizeProject: normalizeProject,
            projectLabel: projectLabel
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
    var originNote = document.getElementById('lead-origin-note');

    if (origin) {
        originInput.value = origin;
        originNote.textContent = 'Your suggestion will be marked as related to ' + projectLabel(origin) + '.';
        originNote.hidden = false;
    }

    form.addEventListener('submit', function () {
        var payload = createIssuePayload({
            asymmetry: document.getElementById('lead-asymmetry').value,
            dataSource: document.getElementById('lead-data-source').value,
            dissolution: document.getElementById('lead-dissolution').value,
            origin: originInput.value
        });

        document.getElementById('issue-title').value = payload.title;
        document.getElementById('issue-body').value = payload.body;
    });
}(typeof globalThis !== 'undefined' ? globalThis : this));
