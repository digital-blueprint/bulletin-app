import {css, html} from 'lit';
import {ScopedElementsMixin} from '@dbp-toolkit/common/src/scoped/ScopedElementsMixin.js';
import {Button, DBPSelect, sendNotification} from '@dbp-toolkit/common';
import * as commonStyles from '@dbp-toolkit/common/src/styles.js';
import * as commonUtils from '@dbp-toolkit/common/utils';
import DBPBulletinLitElement from './dbp-bulletin-lit-element.js';
import JobOfferModule, {
    JOB_CATEGORIES,
    AREAS_OF_INTEREST,
    grantJobOfferReadAccess,
} from './modules/jobOfferForm.js';
import {getDefaultInternalWorkLocations} from './modules/workLocationsElement.js';

const BULLETIN_ADMIN_ROLE = 'ROLE_BULLETIN_ADMIN';
const JOB_COUNT_OPTIONS = ['5', '10', '20', '50', '100'];
const JOB_OFFER_TYPE_INTERNAL = 'internal';
const JOB_OFFER_TYPE_EXTERNAL = 'external';
// Selectable generation modes: only internal, only external, or a random mix of both.
const JOB_TYPE_MODE_INTERNAL = 'internal';
const JOB_TYPE_MODE_EXTERNAL = 'external';
const JOB_TYPE_MODE_MIXED = 'mixed';
const JOB_TYPE_MODE_OPTIONS = [JOB_TYPE_MODE_MIXED, JOB_TYPE_MODE_INTERNAL, JOB_TYPE_MODE_EXTERNAL];

// Sample building blocks for generating random but plausible job offers.
const SAMPLE_TITLES = [
    'Software Developer',
    'Research Assistant',
    'Teaching Assistant',
    'Data Analyst',
    'Project Coordinator',
    'Lab Technician',
    'Frontend Engineer',
    'Backend Engineer',
    'System Administrator',
    'UX Designer',
    'Marketing Assistant',
    'Financial Controller',
    'HR Specialist',
    'Library Assistant',
    'Sustainability Officer',
];

const SAMPLE_TITLES_DE = {
    'Software Developer': 'Softwareentwickler:in',
    'Research Assistant': 'Wissenschaftliche:r Mitarbeiter:in',
    'Teaching Assistant': 'Studienassistent:in',
    'Data Analyst': 'Datenanalyst:in',
    'Project Coordinator': 'Projektkoordinator:in',
    'Lab Technician': 'Labortechniker:in',
    'Frontend Engineer': 'Frontend-Entwickler:in',
    'Backend Engineer': 'Backend-Entwickler:in',
    'System Administrator': 'Systemadministrator:in',
    'UX Designer': 'UX-Designer:in',
    'Marketing Assistant': 'Marketingassistent:in',
    'Financial Controller': 'Finanzcontroller:in',
    'HR Specialist': 'Personalreferent:in',
    'Library Assistant': 'Bibliotheksassistent:in',
    'Sustainability Officer': 'Nachhaltigkeitsbeauftragte:r',
};

const SAMPLE_ORGANIZATIONS = [
    'Institute of Computer Science',
    'Faculty of Engineering',
    'Department of Physics',
    'Central Administration',
    'University Library',
    'Institute of Economics',
];

// Sample external companies used when generating external job offers.
const SAMPLE_COMPANIES = [
    'Acme Technologies GmbH',
    'Alpine Software AG',
    'Danube Digital GmbH',
    'Styria Systems GmbH',
    'Nordic Solutions GmbH',
    'Vienna Ventures GmbH',
];

// Valid external work locations following the {country, region, city} shape
// expected by workLocationsElement (values taken from its known region/city lists).
const SAMPLE_EXTERNAL_WORK_LOCATIONS = [
    {country: 'AT', region: 'vienna', city: 'vienna-city'},
    {country: 'AT', region: 'upper-austria', city: 'linz'},
    {country: 'AT', region: 'salzburg', city: 'salzburg-city'},
    {country: 'AT', region: 'tyrol', city: 'innsbruck'},
    {country: 'AT', region: 'carinthia', city: 'klagenfurt'},
    {country: 'AT', region: 'styria', city: 'graz'},
];

const SAMPLE_DESCRIPTIONS = [
    'We are looking for a motivated team member to support our ongoing projects.',
    'Join our team and contribute to cutting-edge research and development.',
    'Help us shape the future of our department in a dynamic environment.',
    'Support our daily operations and grow your professional skills with us.',
];

const SAMPLE_REQUIREMENTS = [
    'Relevant educational background',
    'Strong communication skills',
    'Ability to work in a team',
    'Independent and structured way of working',
    'Fluent in German and English',
];

const SAMPLE_RESPONSIBILITIES = [
    'Support ongoing projects',
    'Coordinate with internal stakeholders',
    'Document processes and results',
    'Contribute to team meetings',
];

const SAMPLE_WE_OFFER = [
    'Flexible working hours',
    'A collaborative team environment',
    'Opportunities for professional development',
    'A modern workplace',
];

// Returns a random integer in the inclusive range [min, max].
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Returns a random element from the given array.
const randomItem = (items) => items[randomInt(0, items.length - 1)];

// Returns a random subset (1..max items) from the given array.
const randomSubset = (items, max) => {
    const count = randomInt(1, Math.min(max, items.length));
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
};

// Formats a Date as an ISO date string (YYYY-MM-DD).
const toIsoDate = (date) => date.toISOString().split('T')[0];

class GenerateJobsActivity extends ScopedElementsMixin(DBPBulletinLitElement) {
    static get scopedElements() {
        return {
            'dbp-button': Button,
            'dbp-select': DBPSelect,
        };
    }

    constructor() {
        super();
        this._isGenerating = false;
        this._jobCount = '10';
        this._jobTypeMode = JOB_TYPE_MODE_MIXED;
        this._report = null;
    }

    static get properties() {
        return {
            ...super.properties,
            _isGenerating: {state: true},
            _jobCount: {state: true},
            _jobTypeMode: {state: true},
            _report: {state: true},
        };
    }

    get _isAdmin() {
        return (this.auth?._roles ?? []).includes(BULLETIN_ADMIN_ROLE);
    }

    // Builds a single random job-offer form payload compatible with apiCreateForm.
    // jobOfferType is either 'internal' (TU Graz position) or 'external' (company position).
    _buildRandomJobOffer(index, jobOfferType) {
        const titleEn = randomItem(SAMPLE_TITLES);
        const titleDe = SAMPLE_TITLES_DE[titleEn] ?? titleEn;
        // Append a unique suffix so generated titles do not collide.
        const uniqueSuffix = `#${Date.now().toString().slice(-5)}-${index + 1}`;
        const title = `${titleDe} ${uniqueSuffix}`;
        const englishTitle = `${titleEn} ${uniqueSuffix}`;

        const now = new Date();
        const publishedAt = toIsoDate(now);
        const deadline = toIsoDate(new Date(now.getTime() + randomInt(14, 90) * 86400000));
        const startDate = toIsoDate(new Date(now.getTime() + randomInt(30, 120) * 86400000));

        const jobCategory = randomItem(Object.keys(JOB_CATEGORIES));
        const areasOfInterest = randomSubset(Object.keys(AREAS_OF_INTEREST), 3);

        const isExternal = jobOfferType === JOB_OFFER_TYPE_EXTERNAL;
        const companyName = isExternal ? randomItem(SAMPLE_COMPANIES) : '';

        const additionalData = {
            title: title,
            description: randomItem(SAMPLE_DESCRIPTIONS),
            publishedAt: publishedAt,
            deadline: deadline,
            applicationDeadline: deadline,
            jobOfferType: jobOfferType,
            // Internal positions belong to a TU Graz organization; external ones do not.
            organization: isExternal ? '' : randomItem(SAMPLE_ORGANIZATIONS),
            organizationId: '',
            // External positions carry company details and a link to the company's job page.
            companySubmissionId: '',
            companyName: companyName,
            companyData: isExternal ? {name: companyName} : {},
            externalJobUrl: isExternal
                ? `https://jobs.example.org/${index + 1}-${Date.now().toString().slice(-5)}`
                : '',
            workLocations: isExternal
                ? [randomItem(SAMPLE_EXTERNAL_WORK_LOCATIONS)]
                : getDefaultInternalWorkLocations(),
            startDate: startDate,
            weeklyHours: String(randomInt(10, 40)),
            salary: `€ ${randomInt(2000, 4500)},- / month`,
            contractDuration: randomItem(['6 months', '12 months', 'unlimited']),
            jobCategory: jobCategory,
            areasOfInterest: areasOfInterest,
            linkName: '',
            linkUrl: '',
            contactInformation: 'career@example.org',
            contactInformationEn: 'career@example.org',
            requirements: randomSubset(SAMPLE_REQUIREMENTS, 3),
            responsibilities: randomSubset(SAMPLE_RESPONSIBILITIES, 3),
            requiredQualification: randomSubset(SAMPLE_REQUIREMENTS, 2),
            weOffer: randomSubset(SAMPLE_WE_OFFER, 3),
            titleEn: englishTitle,
            descriptionEn: randomItem(SAMPLE_DESCRIPTIONS),
            organizationEn: '',
            weeklyHoursEn: '',
            salaryEn: '',
            contractDurationEn: '',
            linkNameEn: '',
            linkUrlEn: '',
            requirementsEn: randomSubset(SAMPLE_REQUIREMENTS, 3),
            responsibilitiesEn: randomSubset(SAMPLE_RESPONSIBILITIES, 3),
            requiredQualificationEn: randomSubset(SAMPLE_REQUIREMENTS, 2),
            weOfferEn: randomSubset(SAMPLE_WE_OFFER, 3),
        };

        // Minimal JSON Schema for validating applications (mirrors jobOfferForm.js).
        const dataFeedSchema = JSON.stringify({
            title: 'JobApplication',
            type: 'object',
            additionalProperties: false,
            properties: {
                givenName: {type: 'string', minLength: 1},
                familyName: {type: 'string', minLength: 1},
                email: {type: 'string', minLength: 1, format: 'email'},
                personIdentifier: {type: 'string'},
            },
            required: ['givenName', 'familyName', 'personIdentifier', 'email'],
        });

        return {
            name: title,
            localizedNames: [
                {languageTag: 'de', name: title},
                {languageTag: 'en', name: englishTitle},
            ],
            frontendKey: new JobOfferModule().getFormFrontendKey(),
            additionalData: additionalData,
            dataFeedSchema: dataFeedSchema,
        };
    }

    // Creates a single job-offer form via POST /formalize/forms.
    // Kept self-contained (instead of reusing apiCreateForm) to avoid one
    // success notification per generated job offer.
    async _createJobOfferForm(formData) {
        const body = {
            name: formData.name,
            localizedNames: formData.localizedNames,
            frontendKey: formData.frontendKey,
            additionalData: formData.additionalData,
            dataFeedSchema: formData.dataFeedSchema,
        };

        const response = await fetch(this.entryPointUrl + '/formalize/forms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/ld+json',
                Authorization: 'Bearer ' + this.auth.token,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            return false;
        }

        const createdForm = await response.json();
        return grantJobOfferReadAccess(this, createdForm.identifier);
    }

    async _handleGenerate() {
        if (this._isGenerating) {
            return;
        }

        if (!this._isAdmin) {
            sendNotification({
                summary: this._i18n.t('generate-jobs.error-title'),
                body: this._i18n.t('generate-jobs.error-not-authorized'),
                type: 'danger',
                timeout: 0,
            });
            return;
        }

        if (!this.auth?.token || !this.entryPointUrl) {
            sendNotification({
                summary: this._i18n.t('generate-jobs.error-title'),
                body: this._i18n.t('generate-jobs.error-not-ready'),
                type: 'danger',
                timeout: 0,
            });
            return;
        }

        const count = Number(this._jobCount);
        this._isGenerating = true;
        this._report = null;

        const report = {created: [], errors: []};

        await commonUtils.asyncArrayForEach(Array.from({length: count}), async (_value, index) => {
            const jobOfferType = this._resolveJobOfferType();
            const formData = this._buildRandomJobOffer(index, jobOfferType);
            try {
                const created = await this._createJobOfferForm(formData);
                if (created) {
                    report.created.push(formData.name);
                } else {
                    report.errors.push(formData.name);
                }
            } catch (error) {
                console.error('Failed to generate job offer:', error);
                report.errors.push(formData.name);
            }
        });

        this._report = report;
        this._isGenerating = false;

        sendNotification({
            summary: this._i18n.t('generate-jobs.finished-title'),
            body: this._i18n.t('generate-jobs.finished-body', {
                created: report.created.length,
                errors: report.errors.length,
            }),
            type: report.errors.length > 0 ? 'warning' : 'success',
            timeout: 8,
        });
    }

    _getJobCountOptions() {
        return JOB_COUNT_OPTIONS.map((value) => ({value, label: value}));
    }

    _getJobTypeModeOptions() {
        return JOB_TYPE_MODE_OPTIONS.map((value) => ({
            value,
            label: this._i18n.t(`generate-jobs.job-type-${value}`),
        }));
    }

    // Determines the job offer type for a single generated job based on the
    // selected mode. In mixed mode, internal and external are chosen randomly.
    _resolveJobOfferType() {
        if (this._jobTypeMode === JOB_TYPE_MODE_INTERNAL) {
            return JOB_OFFER_TYPE_INTERNAL;
        }
        if (this._jobTypeMode === JOB_TYPE_MODE_EXTERNAL) {
            return JOB_OFFER_TYPE_EXTERNAL;
        }
        return Math.random() < 0.5 ? JOB_OFFER_TYPE_INTERNAL : JOB_OFFER_TYPE_EXTERNAL;
    }

    render() {
        const t = (key, opts) => this._i18n.t(key, opts);

        if (!this._isAdmin) {
            return html`
                <section class="activity-header">
                    <h2>${t('generate-jobs.title')}</h2>
                    <p>${t('generate-jobs.not-authorized')}</p>
                </section>
            `;
        }

        return html`
            <section class="activity-header">
                <h2>${t('generate-jobs.title')}</h2>
                <p>${t('generate-jobs.description')}</p>
            </section>

            <section class="generate-card">
                <div class="select-option">
                    <label for="job-count">${t('generate-jobs.count-label')}</label>
                    <p id="job-count-description">${t('generate-jobs.count-description')}</p>
                    <dbp-select
                        id="job-count"
                        align="left"
                        aria-describedby="job-count-description"
                        label="${this._jobCount}"
                        .options="${this._getJobCountOptions()}"
                        .value="${this._jobCount}"
                        ?disabled="${this._isGenerating}"
                        @change="${(event) => {
                            this._jobCount = event.detail.value;
                        }}"></dbp-select>
                </div>
                <div class="select-option">
                    <label for="job-type-mode">${t('generate-jobs.job-type-label')}</label>
                    <p id="job-type-mode-description">${t('generate-jobs.job-type-description')}</p>
                    <dbp-select
                        id="job-type-mode"
                        align="left"
                        aria-describedby="job-type-mode-description"
                        label="${t(`generate-jobs.job-type-${this._jobTypeMode}`)}"
                        .options="${this._getJobTypeModeOptions()}"
                        .value="${this._jobTypeMode}"
                        ?disabled="${this._isGenerating}"
                        @change="${(event) => {
                            this._jobTypeMode = event.detail.value;
                        }}"></dbp-select>
                </div>
                <dbp-button
                    type="is-primary"
                    value="${
                        this._isGenerating
                            ? t('generate-jobs.generating')
                            : t('generate-jobs.generate-button')
                    }"
                    ?disabled="${this._isGenerating}"
                    @click="${this._handleGenerate}"></dbp-button>
            </section>

            ${
                this._report
                    ? html`
                          <section class="report-card">
                              <h2>${t('generate-jobs.report-title')}</h2>
                              <div class="summary-grid">
                                  <div>
                                      <strong>${this._report.created.length}</strong>
                                      <span>${t('generate-jobs.summary-created')}</span>
                                  </div>
                                  <div>
                                      <strong>${this._report.errors.length}</strong>
                                      <span>${t('generate-jobs.summary-errors')}</span>
                                  </div>
                              </div>
                              ${
                                  this._report.created.length > 0
                                      ? html`
                                            <section class="report-section">
                                                <h3>
                                                    ${t('generate-jobs.created-title', {
                                                        count: this._report.created.length,
                                                    })}
                                                </h3>
                                                <ul>
                                                    ${this._report.created.map(
                                                        (name) => html`
                                                            <li>${name}</li>
                                                        `,
                                                    )}
                                                </ul>
                                            </section>
                                        `
                                      : ''
                              }
                          </section>
                      `
                    : ''
            }
        `;
    }

    static get styles() {
        return [
            commonStyles.getThemeCSS(),
            commonStyles.getGeneralCSS(false),
            css`
                :host {
                    display: block;
                    padding: 1.5rem;
                }

                .activity-header,
                .generate-card,
                .report-card {
                    max-width: 72rem;
                    margin: 0 auto 1.5rem;
                }

                .activity-header h2,
                .report-card h2 {
                    margin-top: 0;
                }

                .generate-card,
                .report-card {
                    padding: 1.5rem;
                    border: var(--dbp-override-border, 1px solid #ddd);
                    background: var(--dbp-override-secondary-surface, #fff);
                }

                .select-option {
                    max-width: 42rem;
                    margin-bottom: 1.25rem;
                }

                .select-option label {
                    display: block;
                    font-weight: bold;
                }

                .select-option p {
                    margin: 0 0 0.5rem;
                }

                .select-option dbp-select {
                    display: inline-block;
                    min-width: 10rem;
                }

                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 1rem;
                    margin: 1.5rem 0;
                }

                .summary-grid div {
                    padding: 1rem;
                    border: var(--dbp-override-border, 1px solid #ddd);
                }

                .summary-grid strong {
                    display: block;
                    font-size: 2rem;
                }

                .summary-grid span {
                    display: block;
                }

                .report-section {
                    margin-top: 1.5rem;
                }

                .report-section ul {
                    max-height: 18rem;
                    overflow: auto;
                    padding-left: 1.5rem;
                }

                .report-section li {
                    margin-bottom: 0.35rem;
                }

                @media (max-width: 768px) {
                    :host {
                        padding: 1rem;
                    }

                    .summary-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `,
        ];
    }
}

commonUtils.defineCustomElement('dbp-bulletin-generate-jobs', GenerateJobsActivity);
