import {assert} from 'chai';

import '../src/dbp-bulletin-view-job-offers';
import {BulletinAppShell} from '../src/dbp-bulletin.js';
import JobOfferModule, {
    JobOfferFormElement,
    hasSubmissionCheckContextChanged,
    normalizeAreaOfInterestValues,
} from '../src/modules/jobOfferForm.js';
import {
    formatStudentStudies as formatCareerProfileStudies,
    JobProfileEditFormElement,
    mergeLocalizedStudentStudies,
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

    test('should match any selected area filter against multi-select values', () => {
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

        node.filterAreasOfInterest = ['management', 'research'];

        assert.deepEqual(
            node.getFilteredJobs().map((job) => job.identifier),
            ['other-job', 'matching-job'],
        );
    });

    test('should preserve selected filters when a search has no results', () => {
        node._i18n = {t: (key) => key};
        node._jobOffers = [
            {
                identifier: 'selected-filter-job',
                title: 'Matching publication',
                areasOfInterest: ['management'],
                workLocations: [{country: 'AT', region: 'styria', city: 'graz'}],
                description: '',
                publishedAt: '2026-01-15',
            },
        ];
        node.filterAreasOfInterest = ['management'];
        node.filterWorkLocation = 'AT|styria|graz';

        node.onSearchInput({target: {value: 'no matching job'}});

        assert.deepEqual(node.filterAreasOfInterest, ['management']);
        assert.equal(node.filterWorkLocation, 'AT|styria|graz');
        assert.deepEqual(node.getAvailableAreasOfInterest({includeSelected: true}), ['management']);
        assert.deepInclude(node.getAvailableWorkLocations({includeSelected: true}), {
            country: 'AT',
            region: 'styria',
            city: 'graz',
        });
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

suite('jobOfferForm validation', () => {
    test('should allow an empty application deadline', () => {
        const tagName = 'test-job-offer-edit-form-element';
        const JobOfferEditFormElement = new JobOfferModule().getEditFormComponent();
        if (!customElements.get(tagName)) {
            customElements.define(tagName, JobOfferEditFormElement);
        }

        const element = document.createElement(tagName);
        element._title = 'Software developer';
        element._description = 'Job description';
        element._publishedAt = '2026-07-22';
        element._deadline = '2026-08-22';
        element._applicationDeadline = '';
        element._organization = 'TU Graz';

        assert.isTrue(element._isFormValid);
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

    test('should merge and format German and English study names', () => {
        const studies = mergeLocalizedStudentStudies(
            {
                studies: [
                    {key: 'bachelor', name: 'Informatik (Bachelorstudium)'},
                    {key: 'master', name: 'Softwareentwicklung (Masterstudium)'},
                ],
            },
            {
                studies: [
                    {key: 'bachelor', name: 'Computer Science (Bachelor programme)'},
                    {key: 'master', name: 'Software Engineering (Master programme)'},
                ],
            },
        );

        assert.deepEqual(studies, [
            {
                key: 'bachelor',
                name: 'Informatik (Bachelorstudium)',
                nameEn: 'Computer Science (Bachelor programme)',
            },
            {
                key: 'master',
                name: 'Softwareentwicklung (Masterstudium)',
                nameEn: 'Software Engineering (Master programme)',
            },
        ]);
        assert.equal(
            formatCareerProfileStudies({studies}, 'en'),
            'Computer Science (Bachelor programme), Software Engineering (Master programme)',
        );
    });

    test('should fetch German and English studies with Accept-Language', async () => {
        const element = document.createElement(tagName);
        const originalFetch = globalThis.fetch;
        const requestedLanguages = [];
        element.auth = {'user-id': 'student-1', token: 'token'};
        element.entryPointUrl = 'https://example.invalid';
        element.currentStudentStudies = [];
        globalThis.fetch = async (_url, options) => {
            const language = options.headers['Accept-Language'];
            requestedLanguages.push(language);
            return {
                ok: true,
                json: async () => ({
                    localData: {
                        email: language === 'de' ? 'student@example.com' : undefined,
                        studies: [
                            {
                                key: 'bachelor',
                                name:
                                    language === 'en'
                                        ? 'Computer Science (Bachelor programme)'
                                        : 'Informatik (Bachelorstudium)',
                            },
                        ],
                    },
                }),
            };
        };

        try {
            await element._prefillStudentData();
        } finally {
            globalThis.fetch = originalFetch;
        }

        assert.deepEqual(requestedLanguages, ['de', 'en']);
        assert.deepEqual(element._getDisplayStudies(), [
            {
                key: 'bachelor',
                name: 'Informatik (Bachelorstudium)',
                nameEn: 'Computer Science (Bachelor programme)',
            },
        ]);
    });

    test('should select multiple fetched studies for the profile', async () => {
        const element = document.createElement(tagName);
        element.lang = 'en';
        element.currentStudentStudies = [
            {
                key: 'bachelor',
                name: 'Informatik (Bachelorstudium)',
                nameEn: 'Computer Science (Bachelor programme)',
            },
            {
                key: 'master',
                name: 'Softwareentwicklung (Masterstudium)',
                nameEn: 'Software Engineering (Master programme)',
            },
        ];
        document.body.appendChild(element);
        await element.updateComplete;

        const studyField = element.shadowRoot.querySelector('[name="study-program"]');
        assert.isNotNull(studyField);
        assert.deepEqual(studyField.items, {
            'key:bachelor': 'Computer Science (Bachelor programme)',
            'key:master': 'Software Engineering (Master programme)',
        });
        assert.deepEqual(studyField.value, ['key:bachelor', 'key:master']);
        assert.deepEqual(element._getDisplayStudies(), element.currentStudentStudies);

        element._selectStudies(['key:master']);

        assert.deepEqual(element._getDisplayStudies(), [element.currentStudentStudies[1]]);
        assert.equal(element._studyProgram, 'Softwareentwicklung (Masterstudium)');
        element.remove();
    });

    test('should save German and English study names in the profile', async () => {
        const element = document.createElement(tagName);
        const originalFetch = globalThis.fetch;
        let requestBody;
        element.auth = {token: 'token'};
        element.entryPointUrl = 'https://example.invalid';
        element.currentStudentStudies = [
            {
                key: 'bachelor',
                name: 'Informatik (Bachelorstudium)',
                nameEn: 'Computer Science (Bachelor programme)',
            },
        ];
        document.body.appendChild(element);
        await element.updateComplete;
        element._summary = 'Profil';
        element._contactEmail = 'student@example.com';
        globalThis.fetch = async (_url, options) => {
            requestBody = JSON.parse(options.body);
            return {
                ok: true,
                json: async () => ({identifier: 'profile-1'}),
            };
        };

        try {
            await element.submit();
        } finally {
            globalThis.fetch = originalFetch;
            element.remove();
        }

        assert.deepEqual(requestBody.additionalData.studies, element.currentStudentStudies);
        assert.equal(requestBody.additionalData.studyProgram, 'Informatik (Bachelorstudium)');
        assert.equal(
            requestBody.additionalData.studyProgramEn,
            'Computer Science (Bachelor programme)',
        );
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
