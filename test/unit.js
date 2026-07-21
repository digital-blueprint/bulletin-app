import {assert} from 'chai';

import '../src/dbp-bulletin-view-job-offers';
import {BulletinAppShell} from '../src/dbp-bulletin.js';
import {
    JobOfferFormElement,
    hasSubmissionCheckContextChanged,
    normalizeAreaOfInterestValues,
} from '../src/modules/jobOfferForm.js';
import {
    formatStudentStudies as formatCareerProfileStudies,
    JobProfileEditFormElement,
} from '../src/modules/studentProfileForm.js';
import {WorkLocationsElement} from '../src/modules/workLocationsElement.js';

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
                areasOfInterest: ['it'],
                description: '',
                deadline: '2030-01-01',
                publishedAt: '2026-01-15',
            },
            {
                identifier: 'newer-published',
                title: 'Newer publication',
                jobCategory: 'student-job',
                areasOfInterest: ['it'],
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

    test('should match area filter against multi-select values', () => {
        node._i18n = {t: (key) => key};
        node._jobOffers = [
            {
                identifier: 'matching-job',
                title: 'Matching publication',
                jobCategory: 'student-job',
                areasOfInterest: ['it', 'management'],
                description: '',
                deadline: '2030-01-01',
                publishedAt: '2026-01-15',
            },
            {
                identifier: 'other-job',
                title: 'Other publication',
                jobCategory: 'student-job',
                areasOfInterest: ['research'],
                description: '',
                deadline: '2030-01-01',
                publishedAt: '2026-03-15',
            },
        ];

        node.filterAreaOfInterest = 'management';

        assert.deepEqual(
            node.getFilteredJobs().map((job) => job.identifier),
            ['matching-job'],
        );
    });

    test('should open a deep-linked job after loading job offers', async () => {
        const element = document.createElement('dbp-bulletin-view-job-offers');
        const originalFetch = globalThis.fetch;
        let openedJob = null;

        element._i18n = {t: (key) => key};
        element.auth = {token: 'token'};
        element.entryPointUrl = 'https://example.invalid';
        element.routingUrl = 'job/deep-job';
        element.openJobDialog = (job) => {
            openedJob = job;
        };
        globalThis.fetch = async () => ({
            ok: true,
            json: async () => ({
                'hydra:member': [
                    {
                        identifier: 'deep-job',
                        name: 'Deep linked job',
                        additionalData: {
                            deadline: '2030-01-01',
                            areasOfInterest: ['it'],
                        },
                    },
                ],
            }),
        });

        try {
            await element._fetchJobOffers();
        } finally {
            globalThis.fetch = originalFetch;
        }

        assert.equal(openedJob?.identifier, 'deep-job');
    });
});

suite('dbp-bulletin app shell', () => {
    test('should enable the sticky footer for the job offers view', async () => {
        const element = new BulletinAppShell();

        element.activeView = 'view-job-offers';
        element._updateStickyFooterState();

        assert.isTrue(element.classList.contains('sticky-footer-active'));

        element.activeView = 'welcome';
        element._updateStickyFooterState();

        assert.isFalse(element.classList.contains('sticky-footer-active'));
    });
});

suite('jobOfferForm area normalization', () => {
    test('should normalize legacy single values to canonical arrays', () => {
        assert.deepEqual(normalizeAreaOfInterestValues('Science'), ['natural-sciences']);
        assert.deepEqual(normalizeAreaOfInterestValues('Wissenschaft'), ['natural-sciences']);
        assert.deepEqual(normalizeAreaOfInterestValues(['IT', 'Management']), ['it', 'management']);
    });
});

suite('jobOfferForm auth refresh handling', () => {
    test('should ignore token-only auth changes for submission checks', () => {
        assert.isFalse(
            hasSubmissionCheckContextChanged(
                {'login-status': 'logged-in', 'user-id': 'user-1', subject: 'user-1', token: 'a'},
                {'login-status': 'logged-in', 'user-id': 'user-1', subject: 'user-1', token: 'b'},
            ),
        );
    });

    test('should re-check when the logged-in user changes', () => {
        assert.isTrue(
            hasSubmissionCheckContextChanged(
                {'login-status': 'logged-in', 'user-id': 'user-1', subject: 'user-1'},
                {'login-status': 'logged-in', 'user-id': 'user-2', subject: 'user-2'},
            ),
        );
    });

    test('should not re-run prior-submission checks on token refresh', async () => {
        const tagName = 'test-job-offer-form-element';
        if (!customElements.get(tagName)) {
            customElements.define(tagName, JobOfferFormElement);
        }

        const element = document.createElement(tagName);
        let checkCalls = 0;

        element.entryPointUrl = 'https://example.invalid';
        element.formIdentifier = 'job-1';
        element._checkAlreadyApplied = async () => {
            checkCalls += 1;
        };

        document.body.appendChild(element);

        element.auth = {
            'login-status': 'logged-in',
            'user-id': 'user-1',
            subject: 'user-1',
            token: 'token-1',
        };
        await element.updateComplete;

        element.auth = {
            'login-status': 'logged-in',
            'user-id': 'user-1',
            subject: 'user-1',
            token: 'token-2',
        };
        await element.updateComplete;

        element.auth = {
            'login-status': 'logged-in',
            'user-id': 'user-2',
            subject: 'user-2',
            token: 'token-3',
        };
        await element.updateComplete;

        assert.equal(checkCalls, 2);

        element.remove();
    });
});

suite('work locations country selection', () => {
    test('should hide region selection when country is cleared', async () => {
        const tagName = 'test-work-locations-element';
        if (!customElements.get(tagName)) {
            customElements.define(tagName, WorkLocationsElement);
        }

        const element = document.createElement(tagName);
        document.body.appendChild(element);
        await element.updateComplete;

        assert.isNotNull(element.shadowRoot.querySelector('[name="work-location-region"]'));

        element._region = 'styria';
        element._city = 'graz';
        element._onCountryChange({detail: {value: ''}});
        await element.updateComplete;

        assert.equal(element._country, '');
        assert.equal(element._region, '');
        assert.equal(element._city, '');
        assert.isNull(element.shadowRoot.querySelector('[name="work-location-region"]'));

        element.remove();
    });

    test('should hide region selection for a non-Austria country', async () => {
        const tagName = 'test-work-locations-element';
        if (!customElements.get(tagName)) {
            customElements.define(tagName, WorkLocationsElement);
        }

        const element = document.createElement(tagName);
        document.body.appendChild(element);
        await element.updateComplete;

        element._region = 'styria';
        element._city = 'graz';
        element._onCountryChange({detail: {value: 'DE'}});
        await element.updateComplete;

        assert.equal(element._country, 'DE');
        assert.equal(element._region, '');
        assert.equal(element._city, '');
        assert.isNull(element.shadowRoot.querySelector('[name="work-location-region"]'));

        element._addLocation();
        const [added] = element.value;
        assert.equal(added.country, 'DE');
        assert.equal(added.region, '');
        assert.equal(added.city, '');

        element.remove();
    });
});

suite('career profile student studies', () => {
    const tagName = 'test-job-profile-edit-form-element';

    suiteSetup(() => {
        if (!customElements.get(tagName)) {
            customElements.define(tagName, JobProfileEditFormElement);
        }
    });

    test('should format multiple fetched studies for the saved profile', () => {
        assert.equal(
            formatCareerProfileStudies({
                studies: [
                    {key: 'unused', name: '066 921 Computer Science (Bachelorstudium)'},
                    {name: '066 937 Software Engineering and Management (Masterstudium)'},
                ],
            }),
            '066 921 Computer Science (Bachelorstudium), 066 937 Software Engineering and Management (Masterstudium)',
        );
    });

    test('should select multiple fetched studies for the profile', async () => {
        const element = document.createElement(tagName);
        element.currentStudentStudies = [
            {key: 'bachelor', name: 'Computer Science (Bachelorstudium)'},
            {key: 'master', name: 'Software Engineering and Management (Masterstudium)'},
        ];
        document.body.appendChild(element);
        await element.updateComplete;

        const studyField = element.shadowRoot.querySelector('[name="study-program"]');
        assert.isNotNull(studyField);
        assert.deepEqual(studyField.items, {
            'Computer Science (Bachelorstudium)': 'Computer Science (Bachelorstudium)',
            'Software Engineering and Management (Masterstudium)':
                'Software Engineering and Management (Masterstudium)',
        });
        assert.deepEqual(studyField.value, [
            'Computer Science (Bachelorstudium)',
            'Software Engineering and Management (Masterstudium)',
        ]);
        assert.deepEqual(element._getDisplayStudies(), element.currentStudentStudies);

        element._selectStudies(['Software Engineering and Management (Masterstudium)']);

        assert.deepEqual(element._getDisplayStudies(), [element.currentStudentStudies[1]]);
        assert.equal(element._studyProgram, 'Software Engineering and Management (Masterstudium)');
        element.remove();
    });

    test('should preserve multiple saved studies when editing a profile', async () => {
        const element = document.createElement(tagName);
        element.currentStudentStudies = [
            {key: 'bachelor', name: 'Computer Science (Bachelorstudium)'},
            {key: 'master', name: 'Software Engineering and Management (Masterstudium)'},
            {key: 'doctoral', name: 'Computer Science (Doktoratsstudium)'},
        ];
        element.existingForm = {
            additionalData: {
                studies: [element.currentStudentStudies[0], element.currentStudentStudies[2]],
            },
        };
        document.body.appendChild(element);
        await element.updateComplete;

        assert.deepEqual(element._getDisplayStudies(), [
            element.currentStudentStudies[0],
            element.currentStudentStudies[2],
        ]);
        element.remove();
    });
});
