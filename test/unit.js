import {assert} from 'chai';

import '../src/dbp-bulletin-view-job-offers';
import '../src/dbp-bulletin.js';

suite('dbp-bulletin-view-job-offers basics', () => {
    let node;

    suiteSetup(async () => {
        node = document.createElement('dbp-bulletin-view-job-offers');
        document.body.appendChild(node);
        await node.updateComplete;
    });

    suiteTeardown(() => {
        node.remove();
    });

    test('should render', () => {
        assert(!!node.shadowRoot);
    });

    test('should sort equal deadlines by publication date', () => {
        node._i18n = {t: (key) => key};
        node._jobOffers = [
            {
                identifier: 'older-published',
                title: 'Older publication',
                jobCategory: 'student-job',
                areaOfInterest: 'it',
                description: '',
                deadline: '2030-01-01',
                publishedAt: '2026-01-15',
            },
            {
                identifier: 'newer-published',
                title: 'Newer publication',
                jobCategory: 'student-job',
                areaOfInterest: 'it',
                description: '',
                deadline: '2030-01-01',
                publishedAt: '2026-03-15',
            },
        ];

        node.sortOrder = 'date-asc';
        assert.deepEqual(
            node.getFilteredJobs().map((job) => job.identifier),
            ['older-published', 'newer-published'],
        );

        node.sortOrder = 'date-desc';
        assert.deepEqual(
            node.getFilteredJobs().map((job) => job.identifier),
            ['newer-published', 'older-published'],
        );
    });
});
