import {assert} from 'chai';

import '../src/dbp-bulletin-view-job-offers';
import '../src/dbp-bulletin-career-profile.js';
import {BulletinAppShell} from '../src/dbp-bulletin.js';
import JobOfferModule, {
    JobOfferFormElement,
    grantJobOfferReadAccess,
    hasSubmissionCheckContextChanged,
    normalizeAreaOfInterestValues,
    normalizePartnerCompanyValue,
} from '../src/modules/jobOfferForm.js';
import {
    formatStudentStudies as formatCareerProfileStudies,
    grantCareerProfileReadAccess,
    getLocalizedStudentStudyLabel,
    CareerProfileEditFormElement,
    mergeLocalizedStudentStudies,
} from '../src/modules/careerProfileForm.js';
import {WorkLocationsElement} from '../src/modules/workLocationsElement.js';
import {isHoursRangeValid} from '../src/modules/hoursRangeElement.js';
import {apiCreateForm} from '../vendor/formalize/src/manage-forms-api.js';

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

    test('should load another batch of job offers when requested', async () => {
        const element = document.createElement('dbp-bulletin-view-job-offers');
        element._i18n = {t: (key) => key, changeLanguage: () => {}};
        element.isAuthPending = () => false;
        element.isLoggedIn = () => true;
        element._jobOffers = Array.from({length: 13}, (_, index) => ({
            identifier: `job-${index}`,
            title: `Job ${index}`,
            jobOfferType: 'external',
            isFromPartnerCompany: true,
            areasOfInterest: [],
            description: '',
            publishedAt: `2026-01-${String(index + 1).padStart(2, '0')}`,
        }));
        document.body.appendChild(element);
        await element.updateComplete;

        assert.lengthOf(element.shadowRoot.querySelectorAll('.job-card'), 12);
        assert.lengthOf(element.shadowRoot.querySelectorAll('.partner-company-marker'), 12);
        const loadMoreButton = element.shadowRoot.querySelector('.load-more-button');
        assert.isNotNull(loadMoreButton);

        loadMoreButton.click();
        await element.updateComplete;

        assert.lengthOf(element.shadowRoot.querySelectorAll('.job-card'), 13);
        assert.isNull(element.shadowRoot.querySelector('.load-more-button'));
        element.remove();
    });

    test('should show total and filtered job counts', async () => {
        const element = document.createElement('dbp-bulletin-view-job-offers');
        element._i18n = {
            t: (key, options) =>
                key === 'view-job-offers.position-count'
                    ? `(${options.total} total, ${options.filtered} filtered)`
                    : key,
            changeLanguage: () => {},
        };
        element.isAuthPending = () => false;
        element.isLoggedIn = () => true;
        element._jobOffers = [
            {
                identifier: 'matching-job',
                title: 'Matching job',
                areasOfInterest: [],
                description: '',
                publishedAt: '2026-01-01',
            },
            {
                identifier: 'other-job',
                title: 'Other job',
                areasOfInterest: [],
                description: '',
                publishedAt: '2026-01-02',
            },
        ];
        element.searchQuery = 'matching';
        document.body.appendChild(element);
        await element.updateComplete;

        assert.include(
            element.shadowRoot.querySelector('.section-header h2').textContent,
            '(2 total, 1 filtered)',
        );
        element.remove();
    });
});

suite('dbp-bulletin app shell', () => {
    test('should show an activity when any required role matches', () => {
        const element = new BulletinAppShell();
        element.routes = ['view-job-offers'];
        element.metadata = {
            'view-job-offers': {
                visible: true,
                disabled: false,
                required_roles: [],
                required_any_roles: [
                    'ROLE_BULLETIN_JOB_OFFER_USER',
                    'ROLE_BULLETIN_JOB_OFFER_MANAGER',
                ],
            },
        };

        element._roles = ['ROLE_BULLETIN_JOB_OFFER_MANAGER'];
        element._updateVisibleRoutes();
        assert.deepEqual(element.visibleRoutes, [{name: 'view-job-offers', disabled: false}]);

        element._roles = ['ROLE_BULLETIN_CAREER_PROFILE_USER'];
        element._updateVisibleRoutes();
        assert.deepEqual(element.visibleRoutes, []);
    });
});

suite('jobOfferForm area normalization', () => {
    test('should normalize legacy single values to canonical arrays', () => {
        assert.deepEqual(normalizeAreaOfInterestValues('Science'), ['natural-sciences']);
        assert.deepEqual(normalizeAreaOfInterestValues('Wissenschaft'), ['natural-sciences']);
        assert.deepEqual(normalizeAreaOfInterestValues(['IT', 'Management']), ['it', 'management']);
    });
});

suite('jobOfferForm partner company handling', () => {
    test('should normalize company partner flags', () => {
        assert.isTrue(normalizePartnerCompanyValue(true));
        assert.isTrue(normalizePartnerCompanyValue(1));
        assert.isTrue(normalizePartnerCompanyValue('true'));
        assert.isTrue(normalizePartnerCompanyValue('ja'));
        assert.isFalse(normalizePartnerCompanyValue(false));
        assert.isFalse(normalizePartnerCompanyValue(0));
        assert.isFalse(normalizePartnerCompanyValue('false'));
        assert.isFalse(normalizePartnerCompanyValue(undefined));
    });

    test('should show when selected company data belongs to a partner', async () => {
        const tagName = 'test-job-offer-edit-form-element';
        const JobOfferEditFormElement = new JobOfferModule().getEditFormComponent();
        if (!customElements.get(tagName)) {
            customElements.define(tagName, JobOfferEditFormElement);
        }
        const element = document.createElement(tagName);
        element._jobOfferType = 'external';
        document.body.appendChild(element);

        element._setCompanyData({name: 'Partner GmbH', partnerunternehmen: 'true'});
        await element.updateComplete;
        assert.isTrue(element._isFromPartnerCompany);
        assert.isNotNull(element.shadowRoot.querySelector('.partner-company-status'));

        element._setCompanyData({name: 'Other GmbH', partnerunternehmen: false});
        await element.updateComplete;
        assert.isFalse(element._isFromPartnerCompany);
        assert.isNull(element.shadowRoot.querySelector('.partner-company-status'));
        element.remove();
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

        element._weeklyHoursMin = '40';
        element._weeklyHoursMax = '20';
        assert.isFalse(element._isFormValid);
    });
});

suite('hours range validation', () => {
    test('should reject a minimum greater than the maximum', () => {
        assert.isTrue(isHoursRangeValid('', '20'));
        assert.isTrue(isHoursRangeValid('20', ''));
        assert.isTrue(isHoursRangeValid('20', '20'));
        assert.isTrue(isHoursRangeValid('20', '40'));
        assert.isFalse(isHoursRangeValid('40', '20'));
    });
});

suite('jobOfferForm error notifications', () => {
    test('should target create errors at the edit dialog notification', async () => {
        const originalFetch = globalThis.fetch;
        let notificationDetail = null;
        const notificationHandler = (event) => {
            notificationDetail = event.detail;
            event.preventDefault();
        };

        globalThis.fetch = async () => ({
            ok: false,
            status: 403,
            json: async () => ({}),
        });
        window.addEventListener('dbp-notification-send', notificationHandler, {capture: true});

        try {
            await apiCreateForm(
                {
                    auth: {token: 'token'},
                    entryPointUrl: 'https://example.invalid',
                    _i18n: {t: (key) => key},
                },
                {
                    name: 'Job offer',
                    localizedNames: [],
                    frontendKey: 'job-offer',
                },
                {errorNotificationTargetId: 'edit-form-dialog-notification'},
            );
        } finally {
            window.removeEventListener('dbp-notification-send', notificationHandler, {
                capture: true,
            });
            globalThis.fetch = originalFetch;
        }

        assert.equal(notificationDetail?.targetNotificationId, 'edit-form-dialog-notification');
        assert.equal(notificationDetail?.type, 'danger');
    });
});

suite('jobOfferForm authorization grants', () => {
    test('should grant everybody read access to a newly created form', async () => {
        const originalFetch = globalThis.fetch;
        let requestUrl;
        let requestOptions;

        globalThis.fetch = async (url, options) => {
            requestUrl = url;
            requestOptions = options;
            return {ok: true};
        };

        try {
            const granted = await grantJobOfferReadAccess(
                {
                    auth: {token: 'token'},
                    entryPointUrl: 'https://example.invalid',
                },
                'form-identifier',
            );

            assert.isTrue(granted);
        } finally {
            globalThis.fetch = originalFetch;
        }

        assert.equal(requestUrl, 'https://example.invalid/authorization/resource-action-grants');
        assert.equal(requestOptions.method, 'POST');
        assert.equal(requestOptions.headers['Content-Type'], 'application/ld+json');
        assert.equal(requestOptions.headers.Authorization, 'Bearer token');
        assert.deepEqual(JSON.parse(requestOptions.body), {
            resourceClass: 'DbpRelayFormalizeForm',
            resourceIdentifier: 'form-identifier',
            action: 'read',
            dynamicGroupIdentifier: 'everybody',
        });
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
    const tagName = 'test-career-profile-edit-form-element';

    suiteSetup(() => {
        if (!customElements.get(tagName)) {
            customElements.define(tagName, CareerProfileEditFormElement);
        }
    });

    test('should format multiple fetched studies for the saved profile', () => {
        const studies = [
            {key: 'UF 874', name: 'Telematik'},
            {name: '066 937 Software Engineering and Management (Masterstudium)'},
        ];

        assert.equal(
            formatCareerProfileStudies({studies}),
            'Telematik, 066 937 Software Engineering and Management (Masterstudium)',
        );
        assert.equal(
            formatCareerProfileStudies({studies}, 'de', true),
            'UF 874 - Telematik, 066 937 Software Engineering and Management (Masterstudium)',
        );
        assert.equal(getLocalizedStudentStudyLabel(studies[0]), 'UF 874 - Telematik');
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

    test('should fetch English names when current studies only contain German names', async () => {
        const element = document.createElement(tagName);
        const originalFetch = globalThis.fetch;
        const requestedLanguages = [];
        element.lang = 'en';
        element.auth = {'user-id': 'student-1', token: 'token'};
        element.entryPointUrl = 'https://example.invalid';
        element.currentStudentStudies = [{key: 'UF 874', name: 'Telematik'}];
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
                                key: 'UF 874',
                                name: language === 'en' ? 'Telematics' : 'Telematik',
                            },
                        ],
                    },
                }),
            };
        };

        try {
            await element._prefillStudentData();
            document.body.appendChild(element);
            await element.updateComplete;
        } finally {
            globalThis.fetch = originalFetch;
        }

        const studyField = element.shadowRoot.querySelector('[name="study-program"]');
        assert.deepEqual(requestedLanguages, ['de', 'en']);
        assert.deepEqual(studyField.items, {'key:UF 874': 'UF 874 - Telematics'});
        element.remove();
    });

    test('should select multiple fetched studies for the profile', async () => {
        const element = document.createElement(tagName);
        element.lang = 'de';
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

        let studyField = element.shadowRoot.querySelector('[name="study-program"]');
        assert.isNotNull(studyField);
        assert.deepEqual(studyField.items, {
            'key:bachelor': 'bachelor - Informatik (Bachelorstudium)',
            'key:master': 'master - Softwareentwicklung (Masterstudium)',
        });

        element.lang = 'en';
        await element.updateComplete;
        studyField = element.shadowRoot.querySelector('[name="study-program"]');
        await studyField.updateComplete;

        assert.deepEqual(studyField.items, {
            'key:bachelor': 'bachelor - Computer Science (Bachelor programme)',
            'key:master': 'master - Software Engineering (Master programme)',
        });
        assert.deepEqual(
            [...studyField.shadowRoot.querySelectorAll('.select2-selection__choice')].map(
                (choice) => choice.title,
            ),
            [
                'bachelor - Computer Science (Bachelor programme)',
                'master - Software Engineering (Master programme)',
            ],
        );
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
        globalThis.fetch = async (url, options) => {
            if (url.endsWith('/formalize/forms')) {
                requestBody = JSON.parse(options.body);
            }
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

suite('career profile authorization grants', () => {
    test('should grant read access to staff and the career-profile reader group', async () => {
        const originalFetch = globalThis.fetch;
        const requests = [];

        globalThis.fetch = async (url, options) => {
            requests.push({url, options});
            return {ok: true};
        };

        try {
            const granted = await grantCareerProfileReadAccess(
                {
                    auth: {token: 'token'},
                    entryPointUrl: 'https://example.invalid',
                },
                'profile-identifier',
            );

            assert.isTrue(granted);
        } finally {
            globalThis.fetch = originalFetch;
        }

        assert.lengthOf(requests, 2);
        for (const request of requests) {
            assert.equal(
                request.url,
                'https://example.invalid/authorization/resource-action-grants',
            );
            assert.equal(request.options.method, 'POST');
            assert.equal(request.options.headers['Content-Type'], 'application/ld+json');
            assert.equal(request.options.headers.Authorization, 'Bearer token');
        }
        assert.deepEqual(
            requests.map(({options}) => JSON.parse(options.body)),
            [
                {
                    resourceClass: 'DbpRelayFormalizeForm',
                    resourceIdentifier: 'profile-identifier',
                    action: 'read',
                    dynamicGroupIdentifier: 'staff',
                },
                {
                    resourceClass: 'DbpRelayFormalizeForm',
                    resourceIdentifier: 'profile-identifier',
                    action: 'read',
                    groupIdentifier: '/authorization/groups/019fa767-6f5d-7216-b92c-d82218ec38df',
                },
            ],
        );
    });
});

suite('dbp-bulletin-career-profile routing', () => {
    let node;

    suiteSetup(async () => {
        node = document.createElement('dbp-bulletin-career-profile');
        document.body.appendChild(node);
        await node.updateComplete;
    });

    suiteTeardown(() => {
        node.remove();
    });

    test('should switch between the overview, the profile detail and the submissions view', async () => {
        node.auth = {token: 'token', 'user-id': 'me', person_id: 'me'};
        node._profilesLoaded = true;
        node._profiles = [
            {
                identifier: 'abc',
                formName: 'Test profile',
                additionalData: {studentCreatorId: 'me', teaser: 'profile-teaser-text'},
            },
        ];
        await node.updateComplete;

        node.routingUrl = 'profile/abc';
        await node.updateComplete;
        await node.updateComplete;
        assert.isNotNull(node.shadowRoot.querySelector('.profile-detail'));

        node.routingUrl = 'profile/abc/submissions';
        await node.updateComplete;
        await node.updateComplete;
        assert.isNull(node.shadowRoot.querySelector('.profile-detail'));
        assert.isNotNull(node.shadowRoot.querySelector('.submissions-view'));

        // The back navigation of the submissions view leads to the profile overview
        node.routingUrl = '/';
        await node.updateComplete;
        await node.updateComplete;
        assert.isNull(node.shadowRoot.querySelector('.submissions-view'));
        assert.isNotNull(node.shadowRoot.querySelector('.profile-list'));
    });
});
