import {assert} from 'chai';

import '../src/dbp-bulletin-view-job-offers';
import '../src/dbp-bulletin-career-profile.js';
import '../src/dbp-bulletin-job-offer-detail.js';
import {BulletinAppShell} from '../src/dbp-bulletin.js';
import JobOfferModule, {
    JobOfferFormElement,
    getJobApplicationDataFeedSchema,
    grantJobOfferAccess,
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
import HoursRangeElement, {isHoursRangeValid} from '../src/modules/hoursRangeElement.js';
import {COMPANY_FIELDS, pickCompanyData} from '../src/modules/companyForm.js';
import {apiCreateForm} from '../vendor/formalize/src/manage-forms-api.js';
import {setFeatureFlag} from '@dbp-toolkit/common';
import {
    ADMIN_TOOLS_FEATURE_FLAG,
    CAREER_PROFILES_FEATURE_FLAG,
    EXTERNAL_JOBS_FEATURE_FLAG,
} from '../src/featureFlags.js';

suite('dbp-bulletin-view-job-offers basics', () => {
    let node;

    suiteSetup(async () => {
        setFeatureFlag(EXTERNAL_JOBS_FEATURE_FLAG, true);
        node = document.createElement('dbp-bulletin-view-job-offers');
        document.body.appendChild(node);
        await node.updateComplete;
    });

    suiteTeardown(() => {
        node.remove();
        setFeatureFlag(EXTERNAL_JOBS_FEATURE_FLAG, false);
    });

    test('should render', () => {
        assert(!!node.shadowRoot);
    });

    test('should hide external jobs and the career starter preset when disabled', async () => {
        const element = document.createElement('dbp-bulletin-view-job-offers');
        element._i18n = {t: (key) => key, changeLanguage: () => {}};
        element.isAuthPending = () => false;
        element.isLoggedIn = () => true;
        element._jobOffers = [
            {
                identifier: 'internal-job',
                title: 'Internal job',
                jobOfferType: 'internal',
                areasOfInterest: [],
                description: '',
            },
            {
                identifier: 'external-job',
                title: 'External job',
                jobOfferType: 'external',
                areasOfInterest: [],
                description: '',
            },
        ];
        setFeatureFlag(EXTERNAL_JOBS_FEATURE_FLAG, false);
        document.body.appendChild(element);
        await element.updateComplete;

        assert.deepEqual(
            element.getFilteredJobs().map((job) => job.identifier),
            ['internal-job'],
        );
        assert.isNull(element.shadowRoot.querySelector('option[value="career-entry"]'));

        element.remove();
        setFeatureFlag(EXTERNAL_JOBS_FEATURE_FLAG, true);
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

    test('should search all full-text job fields', () => {
        node.clearFilters();
        node.universityShortName = 'TU Graz';
        node._i18n = {
            t: (key) =>
                ({
                    'manage-job-offers.job-category-internship': 'Unique Internship Category',
                    'manage-job-offers.area-of-interest-engineering': 'Engineering',
                })[key] ?? key,
            changeLanguage: () => {},
        };
        node.lang = 'de';
        node._jobOffers = [
            {
                identifier: 'external-job',
                title: 'Unique Position Title',
                jobOfferType: 'external',
                companyName: 'Unique Company',
                description: 'Unique Job Description',
                jobCategory: 'internship',
                organizationalUnit: 'Unique Organizational Unit',
                requirements: ['First requirement', 'Unique Admission Requirement'],
                requiredQualification: ['Unique Required Qualification'],
                responsibilities: ['Unique Responsibility'],
                weOffer: ['Unique Employee Benefit'],
                workLocations: [{country: 'AT', region: 'styria', city: 'leoben'}],
                areasOfInterest: [],
                publishedAt: '2026-01-02',
            },
            {
                identifier: 'internal-job',
                title: 'Internal Position',
                jobOfferType: 'internal',
                description: '',
                workLocations: [{country: 'AT', region: 'vienna', city: 'vienna-city'}],
                areasOfInterest: ['engineering'],
                publishedAt: '2026-01-01',
            },
        ];

        const searches = [
            ['position title', 'external-job'],
            ['company', 'external-job'],
            ['job description', 'external-job'],
            ['internship category', 'external-job'],
            ['organizational unit', 'external-job'],
            ['admission requirement', 'external-job'],
            ['required qualification', 'external-job'],
            ['responsibility', 'external-job'],
            ['employee benefit', 'external-job'],
            ['leoben', 'external-job'],
            ['tu graz', 'internal-job'],
        ];

        for (const [query, expectedIdentifier] of searches) {
            node.searchQuery = query;
            assert.deepEqual(
                node.getFilteredJobs().map((job) => job.identifier),
                [expectedIdentifier],
                `Expected "${query}" to match ${expectedIdentifier}`,
            );
        }

        node.searchQuery = 'TU Graz engineering Wien';
        assert.deepEqual(
            node.getFilteredJobs().map((job) => job.identifier),
            ['internal-job'],
        );

        node.searchQuery = 'TU Graz engineering Wien missing';
        assert.lengthOf(node.getFilteredJobs(), 0);

        node.searchQuery = '  UNIQUE REQUIRED QUALIFICATION  ';
        assert.deepEqual(
            node.getFilteredJobs().map((job) => job.identifier),
            ['external-job'],
        );
        node.clearFilters();
    });

    test('should search fields in the current language with primary-language fallback', () => {
        node.clearFilters();
        node._i18n = {t: (key) => key, changeLanguage: () => {}};
        node.lang = 'en';
        node._jobOffers = [
            {
                identifier: 'localized-job',
                title: 'Primary Position',
                titleEn: 'English Position',
                jobOfferType: 'internal',
                description: 'Primary Description',
                descriptionEn: 'English Description',
                organizationalUnit: 'Fallback Organizational Unit',
                organizationalUnitEn: '',
                requirements: ['Primary Requirement'],
                requirementsEn: ['English Requirement'],
                requiredQualification: ['Fallback Qualification'],
                requiredQualificationEn: [],
                responsibilities: [],
                weOffer: [],
                areasOfInterest: [],
                publishedAt: '2026-01-01',
            },
        ];

        for (const query of [
            'english position',
            'english description',
            'english requirement',
            'fallback organizational unit',
            'fallback qualification',
        ]) {
            node.searchQuery = query;
            assert.lengthOf(node.getFilteredJobs(), 1, `Expected "${query}" to match`);
        }

        for (const query of ['primary position', 'primary description', 'primary requirement']) {
            node.searchQuery = query;
            assert.lengthOf(node.getFilteredJobs(), 0, `Expected "${query}" not to match`);
        }

        node.lang = 'de';
        node.clearFilters();
    });

    test('should combine full-text search with the selected work location', () => {
        node.clearFilters();
        node._i18n = {t: (key) => key, changeLanguage: () => {}};
        node.lang = 'de';
        node._jobOffers = [
            {
                identifier: 'vienna-job',
                title: 'Vienna Position',
                description: 'Collaboration with the Graz office',
                workLocations: [{country: 'AT', region: 'wien', city: 'wien'}],
                areasOfInterest: [],
                publishedAt: '2026-01-02',
            },
            {
                identifier: 'graz-job',
                title: 'Graz Position',
                description: 'Based in Graz',
                workLocations: [{country: 'AT', region: 'styria', city: 'graz'}],
                areasOfInterest: [],
                publishedAt: '2026-01-01',
            },
        ];
        node.filterWorkLocation = 'AT|wien|wien';
        node.searchQuery = 'graz';

        assert.deepEqual(
            node.getFilteredJobs().map((job) => job.identifier),
            ['vienna-job'],
        );
        node.clearFilters();
    });

    test('should include remote jobs only when requested', () => {
        node._i18n = {t: (key) => key};
        node.clearFilters();
        node._jobOffers = [
            {
                identifier: 'on-site-job',
                title: 'On-site job',
                areasOfInterest: [],
                description: '',
                remote: false,
                publishedAt: '2026-01-01',
            },
            {
                identifier: 'remote-job',
                title: 'Remote job',
                areasOfInterest: [],
                description: '',
                remote: true,
                publishedAt: '2026-01-02',
            },
        ];

        node.filterIncludeRemote = false;
        assert.deepEqual(
            node.getFilteredJobs().map((job) => job.identifier),
            ['on-site-job'],
        );

        node.filterIncludeRemote = true;
        assert.deepEqual(
            node.getFilteredJobs().map((job) => job.identifier),
            ['remote-job', 'on-site-job'],
        );
        node.clearFilters();
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

    test('should not show the search query as an active filter marker', () => {
        node.clearFilters();
        node.searchQuery = 'matching job';

        assert.deepEqual(
            node._getActiveFilterMarkers((key) => key),
            [],
        );
        node.clearFilters();
    });

    test('should keep filters collapsed and show markers after selecting a dream job', async () => {
        const element = document.createElement('dbp-bulletin-view-job-offers');
        element._i18n = {t: (key) => key, changeLanguage: () => {}};
        element.isAuthPending = () => false;
        element.isLoggedIn = () => true;

        element.onDreamJobChange({target: {value: 'study-accompanying'}});
        document.body.appendChild(element);
        await element.updateComplete;

        assert.isFalse(element._filtersOpen);
        assert.isNull(element.shadowRoot.querySelector('.filters-row'));
        assert.lengthOf(element.shadowRoot.querySelectorAll('.ais-CurrentRefinements-category'), 2);

        element.toggleFilters();
        await element.updateComplete;

        const areaOfInterestField = element.shadowRoot.querySelector('.area-of-interest-field');
        const hoursInput = element.shadowRoot
            .querySelector('dbp-hours-range-element')
            .shadowRoot.querySelector('.input');
        assert.isNotNull(areaOfInterestField);
        assert.equal(getComputedStyle(areaOfInterestField).gridColumnStart, '1');
        assert.equal(getComputedStyle(areaOfInterestField).gridColumnEnd, '-1');
        assert.equal(getComputedStyle(hoursInput).maxWidth, '150px');
        element.remove();
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

    test('should mark and link premium companies in job cards', async () => {
        const element = document.createElement('dbp-bulletin-view-job-offers');
        element._i18n = {t: (key) => key, changeLanguage: () => {}};
        element.isAuthPending = () => false;
        element.isLoggedIn = () => true;
        element._jobOffers = [
            {
                identifier: 'premium-job',
                title: 'Premium job',
                jobOfferType: 'external',
                companyName: 'Premium Company',
                companyData: {url: 'https://company.example/profile'},
                isFromPartnerCompany: true,
                areasOfInterest: [],
                description: '',
                publishedAt: '2026-02-01',
            },
            {
                identifier: 'regular-job',
                title: 'Regular job',
                jobOfferType: 'external',
                companyName: 'Regular Company',
                companyData: {url: 'https://regular.example/profile'},
                isFromPartnerCompany: false,
                areasOfInterest: [],
                description: '',
                publishedAt: '2026-01-01',
            },
        ];
        document.body.appendChild(element);
        await element.updateComplete;

        const cards = [...element.shadowRoot.querySelectorAll('.job-card')];
        const premiumCard = cards.find((card) => card.textContent.includes('Premium job'));
        const regularCard = cards.find((card) => card.textContent.includes('Regular job'));
        const companyLink = premiumCard.querySelector('.partner-company-link');

        assert.isNotNull(
            premiumCard.querySelector('.partner-company-marker dbp-icon[name="star"]'),
        );
        assert.equal(companyLink.textContent.trim(), 'Premium Company');
        assert.equal(companyLink.href, 'https://company.example/profile');
        assert.equal(companyLink.target, '_blank');
        assert.isNull(regularCard.querySelector('.partner-company-marker'));
        assert.isNull(regularCard.querySelector('.partner-company-link'));
        assert.include(regularCard.textContent, 'Regular Company');

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

suite('dbp-bulletin-job-offer-detail basics', () => {
    test('should show remote status in the job description', async () => {
        const element = document.createElement('dbp-bulletin-job-offer-detail');
        element.job = {
            title: 'Remote job',
            description: 'Job description',
            remote: true,
            areasOfInterest: [],
            publishedAt: '2026-01-01',
            deadline: '2026-12-31',
        };
        document.body.appendChild(element);
        await element.updateComplete;

        const descriptionText =
            element.shadowRoot.querySelector('.apply-submit-wrapper').textContent;
        assert.include(descriptionText, element._i18n.t('job-offer-detail.remote'));
        assert.include(descriptionText, element._i18n.t('job-offer-detail.yes'));

        element.remove();
    });

    test('should show company sectors and employee information', async () => {
        const element = document.createElement('dbp-bulletin-job-offer-detail');
        element.job = {
            title: 'External job',
            description: 'Job description',
            jobOfferType: 'external',
            companyName: 'Example Ltd',
            companyData: {
                name: 'Example Ltd',
                branchen: ['19', '20'],
                mitarbeiter_national: '2750',
                mitarbeiter_gesamt: '6200',
                fe_beschaeftigte: '2000',
            },
            areasOfInterest: [],
            publishedAt: '2026-01-01',
            deadline: '2026-12-31',
        };
        document.body.appendChild(element);
        await element.updateComplete;

        const companyInformation =
            element.shadowRoot.querySelector('.company-info-list').textContent;
        assert.include(companyInformation, element._i18n.t('company-form.industry-19'));
        assert.include(companyInformation, element._i18n.t('company-form.industry-20'));
        assert.include(companyInformation, '2750');
        assert.include(companyInformation, '6200');
        assert.include(companyInformation, '2000');

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

    test('should hide activities whose feature flag is disabled', () => {
        const element = new BulletinAppShell();
        element.routes = [
            'career-profile',
            'generate-career-profiles',
            'generate-jobs',
            'manage-fields',
            'import-companies',
        ];
        element.metadata = {
            'career-profile': {
                visible: true,
                disabled: false,
                required_roles: [],
                feature_flag: CAREER_PROFILES_FEATURE_FLAG,
            },
            'generate-career-profiles': {
                visible: true,
                disabled: false,
                required_roles: [],
                feature_flag: ADMIN_TOOLS_FEATURE_FLAG,
            },
            'generate-jobs': {
                visible: true,
                disabled: false,
                required_roles: [],
                feature_flag: ADMIN_TOOLS_FEATURE_FLAG,
            },
            'manage-fields': {
                visible: true,
                disabled: false,
                required_roles: [],
                feature_flag: EXTERNAL_JOBS_FEATURE_FLAG,
            },
            'import-companies': {
                visible: true,
                disabled: false,
                required_roles: [],
                feature_flag: ADMIN_TOOLS_FEATURE_FLAG,
            },
        };

        setFeatureFlag(CAREER_PROFILES_FEATURE_FLAG, false);
        setFeatureFlag(EXTERNAL_JOBS_FEATURE_FLAG, false);
        setFeatureFlag(ADMIN_TOOLS_FEATURE_FLAG, false);
        element._updateVisibleRoutes();
        assert.deepEqual(element.visibleRoutes, []);

        setFeatureFlag(CAREER_PROFILES_FEATURE_FLAG, true);
        element._updateVisibleRoutes();
        assert.deepEqual(element.visibleRoutes, [{name: 'career-profile', disabled: false}]);

        setFeatureFlag(ADMIN_TOOLS_FEATURE_FLAG, true);
        element._updateVisibleRoutes();
        assert.deepEqual(element.visibleRoutes, [
            {name: 'career-profile', disabled: false},
            {name: 'generate-career-profiles', disabled: false},
            {name: 'generate-jobs', disabled: false},
            {name: 'import-companies', disabled: false},
        ]);

        setFeatureFlag(CAREER_PROFILES_FEATURE_FLAG, false);
        setFeatureFlag(ADMIN_TOOLS_FEATURE_FLAG, false);
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

suite('company data handling', () => {
    test('should retain only supported company fields', () => {
        const companyData = Object.fromEntries(COMPANY_FIELDS.map((field) => [field, field]));
        companyData.sort_order = 1;

        assert.deepEqual(Object.keys(pickCompanyData(companyData)), COMPANY_FIELDS);
        assert.notProperty(pickCompanyData(companyData), 'sort_order');
    });

    test('should canonicalize supported legacy company fields', () => {
        assert.deepEqual(
            pickCompanyData({
                companyName: 'Example Ltd',
                department: 'Research',
                relation_partner_branchen: ['19', '20'],
                country: 'AT',
            }),
            {name: 'Example Ltd', abteilung: 'Research', branchen: ['19', '20']},
        );
    });
});

suite('jobOfferForm validation', () => {
    test('should only offer TU Graz jobs for creation when external jobs are disabled', () => {
        const tagName = 'test-job-offer-edit-form-element';
        const JobOfferEditFormElement = new JobOfferModule().getEditFormComponent();
        if (!customElements.get(tagName)) {
            customElements.define(tagName, JobOfferEditFormElement);
        }
        const element = document.createElement(tagName);
        const t = (key) => key;

        setFeatureFlag(EXTERNAL_JOBS_FEATURE_FLAG, false);
        assert.deepEqual(Object.keys(element._getJobTypeItems(t)), ['internal']);

        setFeatureFlag(EXTERNAL_JOBS_FEATURE_FLAG, true);
        assert.deepEqual(Object.keys(element._getJobTypeItems(t)), ['internal', 'external']);

        setFeatureFlag(EXTERNAL_JOBS_FEATURE_FLAG, false);
    });

    test('should require an absolute HTTP(S) external job URL', () => {
        const tagName = 'test-job-offer-edit-form-element';
        const JobOfferEditFormElement = new JobOfferModule().getEditFormComponent();
        if (!customElements.get(tagName)) {
            customElements.define(tagName, JobOfferEditFormElement);
        }
        const element = document.createElement(tagName);

        element._externalJobUrl = 'www.test.at';
        assert.isFalse(element._isExternalJobUrlValid());

        element._externalJobUrl = 'https://www.test.at';
        assert.isTrue(element._isExternalJobUrlValid());

        element._externalJobUrl = 'http://www.test.at';
        assert.isTrue(element._isExternalJobUrlValid());
    });

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
    test('should accept numeric values in the rendered inputs', async () => {
        const tagName = 'test-hours-range-element';
        if (!customElements.get(tagName)) {
            customElements.define(tagName, HoursRangeElement);
        }
        const element = document.createElement(tagName);
        element.min = '20';
        element.max = '40';
        element.required = true;
        document.body.appendChild(element);
        await element.updateComplete;

        assert.isTrue(element.checkValidity());
        element.remove();
    });

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
    test('should grant public read and creator manage access to a new form', async () => {
        const originalFetch = globalThis.fetch;
        const requests = [];

        globalThis.fetch = async (url, options) => {
            requests.push({url, options});
            return {ok: true};
        };

        try {
            const granted = await grantJobOfferAccess(
                {
                    auth: {token: 'token', 'user-id': 'creator-identifier'},
                    entryPointUrl: 'https://example.invalid',
                },
                'form-identifier',
            );

            assert.isTrue(granted);
        } finally {
            globalThis.fetch = originalFetch;
        }

        assert.lengthOf(requests, 2);
        requests.forEach(({url, options}) => {
            assert.equal(url, 'https://example.invalid/authorization/resource-action-grants');
            assert.equal(options.method, 'POST');
            assert.equal(options.headers['Content-Type'], 'application/ld+json');
            assert.equal(options.headers.Authorization, 'Bearer token');
        });
        assert.deepEqual(
            requests.map(({options}) => JSON.parse(options.body)),
            [
                {
                    resourceClass: 'DbpRelayFormalizeForm',
                    resourceIdentifier: 'form-identifier',
                    action: 'read',
                    dynamicGroupIdentifier: 'everybody',
                },
                {
                    resourceClass: 'DbpRelayFormalizeForm',
                    resourceIdentifier: 'form-identifier',
                    action: 'manage',
                    userIdentifier: 'creator-identifier',
                },
            ],
        );
    });
});

suite('jobOfferForm application submission', () => {
    test('should define all fields submitted by the application form', () => {
        const schema = JSON.parse(getJobApplicationDataFeedSchema());

        assert.hasAllKeys(schema.properties, [
            'givenName',
            'familyName',
            'studyField',
            'email',
            'title',
            'personIdentifier',
            'freeText',
        ]);
    });

    test('should define PDF attachments in the application schema', () => {
        const schema = JSON.parse(getJobApplicationDataFeedSchema());

        assert.deepEqual(schema.files.attachments, {
            minNumber: 0,
            maxNumber: 5,
            maxSizeMb: 10,
            allowedMimeTypes: ['application/pdf'],
        });
    });

    test('should render the attachment upload without a loaded schema', () => {
        const tagName = 'test-job-offer-form-element';
        if (!customElements.get(tagName)) {
            customElements.define(tagName, JobOfferFormElement);
        }

        const element = document.createElement(tagName);
        const template = element.render();

        assert.include(template.strings.join(''), 'class="file-upload-container"');
    });

    test('should submit selected attachments without a loaded schema', async () => {
        const tagName = 'test-job-offer-form-element';
        if (!customElements.get(tagName)) {
            customElements.define(tagName, JobOfferFormElement);
        }

        const element = document.createElement(tagName);
        const attachment = new File(['application'], 'application.pdf', {
            type: 'application/pdf',
        });
        element.entryPointUrl = 'https://example.invalid';
        element.formIdentifier = 'job-1';
        element.auth = {token: 'token'};
        element._getAttachmentGroupData().filesToSubmit.set('attachment-1', attachment);

        const originalFetch = globalThis.fetch;
        let requestBody;
        globalThis.fetch = async (_url, options) => {
            requestBody = options.body;
            return {ok: true};
        };

        try {
            await element._handleSubmission({formData: {}, submissionId: null});
        } finally {
            globalThis.fetch = originalFetch;
        }

        assert.deepEqual(requestBody.getAll('attachments[]'), [attachment]);
    });

    test('should request only supported applicant local data', async () => {
        const tagName = 'test-job-offer-form-element';
        if (!customElements.get(tagName)) {
            customElements.define(tagName, JobOfferFormElement);
        }

        const element = document.createElement(tagName);
        const originalFetch = globalThis.fetch;
        let requestUrl;
        globalThis.fetch = async (url) => {
            requestUrl = url;
            return {
                ok: true,
                json: async () => ({
                    givenName: 'Ada',
                    familyName: 'Lovelace',
                    localData: {
                        email: 'applicant@example.com',
                        matriculationNumber: '12345678',
                    },
                }),
            };
        };

        try {
            element.entryPointUrl = 'https://example.invalid';
            element.auth = {'user-id': 'user-1', token: 'token'};
            await element._loadLoggedInUserData();
        } finally {
            globalThis.fetch = originalFetch;
        }

        assert.equal(
            requestUrl,
            'https://example.invalid/base/people/user-1?includeLocal=email,matriculationNumber',
        );
        assert.equal(element._getLoggedInEmail(), 'applicant@example.com');
    });

    test('should submit study field and free text', async () => {
        const tagName = 'test-job-offer-form-element';
        if (!customElements.get(tagName)) {
            customElements.define(tagName, JobOfferFormElement);
        }

        const element = document.createElement(tagName);
        let submittedData;
        element.entryPointUrl = 'https://example.invalid';
        element.formIdentifier = 'job-1';
        element.auth = {token: 'token'};
        element._prefilledEmail = 'applicant@example.com';
        element._applicationDataFeedSchema = getJobApplicationDataFeedSchema();
        element._studyFieldRef = {value: {value: 'Computer Science'}};
        element._messageRef = {value: {value: 'Application message'}};
        element._validateApplicationForm = () => true;
        element._handleSubmission = async ({formData}) => {
            submittedData = formData;
        };

        await element._onApplySubmit({preventDefault() {}});

        assert.equal(submittedData.email, 'applicant@example.com');
        assert.equal(submittedData.studyField, 'Computer Science');
        assert.equal(submittedData.freeText, 'Application message');
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

    test('should display an invalid website error in the field and notification', async () => {
        const element = document.createElement(tagName);
        let notificationDetail = null;
        const notificationHandler = (event) => {
            notificationDetail = event.detail;
            event.preventDefault();
        };
        element.lang = 'de';
        element._summary = 'Profil';
        element._contactEmail = 'student@example.com';
        element._website = 'example.invalid';
        document.body.appendChild(element);
        await element.updateComplete;
        window.addEventListener('dbp-notification-send', notificationHandler, {capture: true});

        try {
            assert.isNull(await element.submit());
        } finally {
            window.removeEventListener('dbp-notification-send', notificationHandler, {
                capture: true,
            });
        }

        const websiteField = element.shadowRoot.querySelector('[name="website"]');
        await websiteField.updateComplete;
        assert.deepEqual(websiteField.errorMessages, [
            'Bitte geben Sie eine gültige Website-URL ein.',
        ]);
        assert.equal(
            websiteField.shadowRoot.querySelector('.validation-errors')?.textContent.trim(),
            'Bitte geben Sie eine gültige Website-URL ein.',
        );
        assert.equal(notificationDetail?.summary, 'Fehler');
        assert.equal(notificationDetail?.body, 'Bitte geben Sie eine gültige Website-URL ein.');
        assert.equal(notificationDetail?.targetNotificationId, 'career-profile-form-notification');
        assert.equal(notificationDetail?.type, 'warning');
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

    test('should clear saved profile values before creating another profile', async () => {
        const element = document.createElement(tagName);
        element.currentStudentStudies = [{key: 'bachelor', name: 'Computer Science'}];
        element.existingForm = {
            additionalData: {
                summary: 'Saved summary',
                teaser: 'Saved teaser',
                workLocations: [{country: 'AT', region: 'styria', city: 'graz'}],
            },
        };
        document.body.appendChild(element);
        await element.updateComplete;

        element.resetForCreate();

        assert.equal(element._summary, '');
        assert.equal(element._teaser, '');
        assert.deepEqual(element.workLocations, []);
        assert.deepEqual(element._getDisplayStudies(), element.currentStudentStudies);
        element.remove();
    });

    test('should limit the optional teaser to 100 characters without a validation error', async () => {
        const element = document.createElement(tagName);
        document.body.appendChild(element);
        await element.updateComplete;
        const teaserField = element.shadowRoot.querySelector('[name="teaser"]');
        const textarea = teaserField.shadowRoot.querySelector('textarea');
        textarea.value = 'a'.repeat(101);

        textarea.dispatchEvent(new Event('input', {bubbles: true, composed: true}));
        await element.updateComplete;
        await teaserField.updateComplete;

        assert.lengthOf(element._teaser, 100);
        assert.lengthOf(textarea.value, 100);
        assert.deepEqual(teaserField.errorMessages, []);
        element.remove();
    });

    test('should ignore another submit while profile creation is pending', async () => {
        const element = document.createElement(tagName);
        const originalFetch = globalThis.fetch;
        let createRequests = 0;
        let resolveCreate;
        element.auth = {token: 'token'};
        element.entryPointUrl = 'https://example.invalid';
        element._summary = 'Profile';
        element._contactEmail = 'student@example.com';
        globalThis.fetch = async (url) => {
            if (url.endsWith('/formalize/forms')) {
                createRequests += 1;
                return new Promise((resolve) => {
                    resolveCreate = resolve;
                });
            }
            return {ok: true};
        };

        try {
            const firstSubmit = element.submit();
            const secondSubmit = element.submit();
            assert.isNull(await secondSubmit);
            assert.equal(createRequests, 1);
            resolveCreate({ok: true, json: async () => ({identifier: 'profile-1'})});
            await firstSubmit;
        } finally {
            globalThis.fetch = originalFetch;
        }
    });

    test('should keep profile input open when granting read access fails', async () => {
        const element = document.createElement(tagName);
        const originalFetch = globalThis.fetch;
        let savedEvent = null;
        element.auth = {token: 'token'};
        element.entryPointUrl = 'https://example.invalid';
        element._summary = 'Profile';
        element._contactEmail = 'student@example.com';
        element.addEventListener('dbp-edit-form-saved', (event) => {
            savedEvent = event.detail;
        });
        globalThis.fetch = async (url) =>
            url.endsWith('/formalize/forms')
                ? {ok: true, json: async () => ({identifier: 'profile-1'})}
                : {ok: false, status: 403};

        try {
            const result = await element.submit();
            assert.isNull(result);
        } finally {
            globalThis.fetch = originalFetch;
        }

        assert.isNull(savedEvent);
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
