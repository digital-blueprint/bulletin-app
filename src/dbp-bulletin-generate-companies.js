import {css, html} from 'lit';
import {ScopedElementsMixin} from '@dbp-toolkit/common/src/scoped/ScopedElementsMixin.js';
import {Button, DBPSelect, sendNotification} from '@dbp-toolkit/common';
import * as commonStyles from '@dbp-toolkit/common/src/styles.js';
import * as commonUtils from '@dbp-toolkit/common/utils';
import DBPBulletinLitElement from './dbp-bulletin-lit-element.js';
import CompanyModule, {pickCompanyData} from './modules/companyForm.js';

const BULLETIN_ADMIN_ROLE = 'ROLE_BULLETIN_ADMIN';
const COMPANY_COUNT_OPTIONS = ['5', '10', '20', '50', '100'];
const SUBMISSION_STATE_SUBMITTED = 4;

const COMPANY_NAMES = [
    'Alpine Robotics',
    'Blue Circuit',
    'Green Mobility',
    'Murmur Labs',
    'Nova Engineering',
    'Peak Analytics',
    'Styria Systems',
    'Urban Structures',
];
const COMPANY_SUFFIXES = ['AG', 'GmbH', 'KG', 'Solutions GmbH', 'Technologies GmbH'];
const CITIES = [
    {city: 'Graz', postalCode: '8010', street: 'Technikerstrasse 12'},
    {city: 'Graz', postalCode: '8020', street: 'Innovationsplatz 4'},
    {city: 'Leoben', postalCode: '8700', street: 'Montanweg 8'},
    {city: 'Linz', postalCode: '4020', street: 'Industriestrasse 25'},
    {city: 'Vienna', postalCode: '1010', street: 'Forschungsring 7'},
];
const DEPARTMENTS = ['Engineering', 'Human resources', 'Innovation', 'Research and development'];
const PRODUCTS = [
    'Automation systems and digital services',
    'Data platforms and analytics solutions',
    'Energy-efficient components and consulting',
    'Engineering services and industrial software',
];
const INDUSTRY_KEYS = Array.from({length: 40}, (_value, index) => String(index + 12));

const randomItem = (items) => items[Math.floor(Math.random() * items.length)];

const randomSubset = (items, max) => {
    const count = Math.floor(Math.random() * Math.min(max, items.length)) + 1;
    return [...items].sort(() => Math.random() - 0.5).slice(0, count);
};

export function buildRandomCompany(index, timestamp = Date.now()) {
    const location = randomItem(CITIES);
    const name = `${randomItem(COMPANY_NAMES)} ${randomItem(COMPANY_SUFFIXES)} #${String(
        timestamp,
    ).slice(-5)}-${index + 1}`;
    const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    const nationalEmployees = (Math.floor(Math.random() * 490) + 10).toString();
    const totalEmployees = (
        Number(nationalEmployees) + Math.floor(Math.random() * 1500)
    ).toString();

    return pickCompanyData({
        name,
        partnerunternehmen: Math.random() < 0.35,
        abteilung: randomItem(DEPARTMENTS),
        adresse: location.street,
        plz: location.postalCode,
        ort: location.city,
        kontaktperson: 'Alex Example',
        telefonnummer: '+43 316 555 0100',
        email: `contact-${timestamp}-${index + 1}@example.org`,
        url: `https://${slug}.example.org`,
        teaser: 'Innovative technology company creating practical solutions for industry and society.',
        beschreibung:
            'We develop sustainable products and digital services in interdisciplinary teams and work closely with research partners.',
        produkte: randomItem(PRODUCTS),
        standorte: `${location.city}, Austria`,
        mitarbeiter_national: nationalEmployees,
        mitarbeiter_gesamt: totalEmployees,
        branchen: randomSubset(INDUSTRY_KEYS, 4),
    });
}

class GenerateCompaniesActivity extends ScopedElementsMixin(DBPBulletinLitElement) {
    static get scopedElements() {
        return {
            'dbp-button': Button,
            'dbp-select': DBPSelect,
        };
    }

    constructor() {
        super();
        this._companyCount = '10';
        this._isGenerating = false;
        this._report = null;
    }

    static get properties() {
        return {
            ...super.properties,
            _companyCount: {state: true},
            _isGenerating: {state: true},
            _report: {state: true},
        };
    }

    get _isDeveloper() {
        return (this.auth?._roles ?? []).includes(BULLETIN_ADMIN_ROLE);
    }

    async _getOrCreateCompanyFormIdentifier() {
        const companyModule = new CompanyModule();
        const frontendKey = companyModule.getFormFrontendKey();
        const response = await fetch(
            `${this.entryPointUrl}/formalize/forms?perPage=1&whereFrontendKeyIn[]=${encodeURIComponent(
                frontendKey,
            )}`,
            {
                headers: {
                    'Content-Type': 'application/ld+json',
                    Authorization: `Bearer ${this.auth.token}`,
                },
            },
        );

        if (!response.ok) {
            throw new Error(
                this._i18n.t('generate-companies.error-load-company-form', {
                    status: response.status,
                }),
            );
        }

        const data = await response.json();
        const formIdentifier = data['hydra:member']?.[0]?.identifier;
        if (formIdentifier) {
            return formIdentifier;
        }

        const createResponse = await fetch(`${this.entryPointUrl}/formalize/forms`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/ld+json',
                Authorization: `Bearer ${this.auth.token}`,
            },
            body: JSON.stringify({
                name: companyModule.getFormName(this.lang),
                localizedNames: [
                    {languageTag: 'de', name: companyModule.getFormName('de')},
                    {languageTag: 'en', name: companyModule.getFormName('en')},
                ],
                frontendKey,
            }),
        });

        if (!createResponse.ok) {
            throw new Error(
                this._i18n.t('generate-companies.error-create-company-form', {
                    status: createResponse.status,
                }),
            );
        }

        const createdForm = await createResponse.json();
        if (!createdForm.identifier) {
            throw new Error(this._i18n.t('generate-companies.error-company-form-missing'));
        }
        return createdForm.identifier;
    }

    async _createCompanySubmission(formIdentifier, company) {
        const body = new FormData();
        body.append('form', `/formalize/forms/${formIdentifier}`);
        body.append('dataFeedElement', JSON.stringify(company));
        body.append('submissionState', String(SUBMISSION_STATE_SUBMITTED));

        const response = await fetch(`${this.entryPointUrl}/formalize/submissions`, {
            method: 'POST',
            headers: {Authorization: `Bearer ${this.auth.token}`},
            body,
        });

        if (!response.ok) {
            throw new Error(
                this._i18n.t('generate-companies.error-create-company', {
                    status: response.status,
                }),
            );
        }

        const submission = await response.json();
        if (!submission.identifier) {
            throw new Error(this._i18n.t('generate-companies.error-submission-id-missing'));
        }
        return submission.identifier;
    }

    async _handleGenerate() {
        if (this._isGenerating) {
            return;
        }
        if (!this._isDeveloper) {
            sendNotification({
                summary: this._i18n.t('generate-companies.error-title'),
                body: this._i18n.t('generate-companies.error-not-authorized'),
                type: 'danger',
                timeout: 0,
            });
            return;
        }
        if (!this.auth?.token || !this.entryPointUrl) {
            sendNotification({
                summary: this._i18n.t('generate-companies.error-title'),
                body: this._i18n.t('generate-companies.error-not-ready'),
                type: 'danger',
                timeout: 0,
            });
            return;
        }

        this._isGenerating = true;
        this._report = null;
        const report = {created: [], errors: []};

        try {
            const formIdentifier = await this._getOrCreateCompanyFormIdentifier();
            const timestamp = Date.now();
            await commonUtils.asyncArrayForEach(
                Array.from({length: Number(this._companyCount)}),
                async (_value, index) => {
                    const company = buildRandomCompany(index, timestamp);
                    try {
                        const identifier = await this._createCompanySubmission(
                            formIdentifier,
                            company,
                        );
                        report.created.push({name: company.name, identifier, formIdentifier});
                    } catch (error) {
                        console.error('Failed to generate company:', error);
                        report.errors.push(company.name);
                    }
                },
            );
        } catch (error) {
            console.error('Failed to generate companies:', error);
            sendNotification({
                summary: this._i18n.t('generate-companies.error-title'),
                body: error.message,
                type: 'danger',
                timeout: 0,
            });
        } finally {
            this._report = report;
            this._isGenerating = false;
        }

        if (report.created.length > 0 || report.errors.length > 0) {
            sendNotification({
                summary: this._i18n.t('generate-companies.finished-title'),
                body: this._i18n.t('generate-companies.finished-body', {
                    created: report.created.length,
                    errors: report.errors.length,
                }),
                type: report.errors.length > 0 ? 'warning' : 'success',
                timeout: 8,
            });
        }
    }

    _getActivityUrl(route, path) {
        const basePath = this.basePath.endsWith('/') ? this.basePath : `${this.basePath}/`;
        return `${basePath}${this.lang}/${route}/${path}`;
    }

    render() {
        const t = (key, options) => this._i18n.t(key, options);

        if (!this._isDeveloper) {
            return html`
                <section class="activity-header">
                    <h2>${t('generate-companies.title')}</h2>
                    <p>${t('generate-companies.not-authorized')}</p>
                </section>
            `;
        }

        return html`
            <section class="activity-header">
                <h2>${t('generate-companies.title')}</h2>
                <p>${t('generate-companies.description')}</p>
            </section>

            <section class="generate-card">
                <div class="select-option">
                    <label for="company-count">${t('generate-companies.count-label')}</label>
                    <p id="company-count-description">
                        ${t('generate-companies.count-description')}
                    </p>
                    <dbp-select
                        id="company-count"
                        align="left"
                        aria-describedby="company-count-description"
                        label="${this._companyCount}"
                        .options="${COMPANY_COUNT_OPTIONS.map((value) => ({value, label: value}))}"
                        .value="${this._companyCount}"
                        ?disabled="${this._isGenerating}"
                        @change="${(event) => {
                            this._companyCount = event.detail.value;
                        }}"></dbp-select>
                </div>
                <dbp-button
                    type="is-primary"
                    value="${
                        this._isGenerating
                            ? t('generate-companies.generating')
                            : t('generate-companies.generate-button')
                    }"
                    ?disabled="${this._isGenerating}"
                    @click="${this._handleGenerate}"></dbp-button>
            </section>

            ${
                this._report
                    ? html`
                          <section class="report-card">
                              <h2>${t('generate-companies.report-title')}</h2>
                              <div class="summary-grid">
                                  <div>
                                      <strong>${this._report.created.length}</strong>
                                      <span>${t('generate-companies.summary-created')}</span>
                                  </div>
                                  <div>
                                      <strong>${this._report.errors.length}</strong>
                                      <span>${t('generate-companies.summary-errors')}</span>
                                  </div>
                              </div>
                              ${
                                  this._report.created.length > 0
                                      ? html`
                                            <section class="report-section">
                                                <h3>
                                                    ${t('generate-companies.created-title', {
                                                        count: this._report.created.length,
                                                    })}
                                                </h3>
                                                <ul>
                                                    ${this._report.created.map(
                                                        (company) => html`
                                                            <li>
                                                                <strong>${company.name}</strong>
                                                                <a
                                                                    href="${this._getActivityUrl(
                                                                        'manage-fields',
                                                                        `${encodeURIComponent(
                                                                            company.formIdentifier,
                                                                        )}/${encodeURIComponent(
                                                                            company.identifier,
                                                                        )}/edit`,
                                                                    )}">
                                                                    ${t(
                                                                        'generate-companies.edit-company-link',
                                                                    )}
                                                                </a>
                                                            </li>
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

                .summary-grid strong,
                .summary-grid span {
                    display: block;
                }

                .summary-grid strong {
                    font-size: 2rem;
                }

                .report-section ul {
                    max-height: 18rem;
                    overflow: auto;
                    padding-left: 1.5rem;
                }

                .report-section li {
                    margin-bottom: 0.75rem;
                }

                .report-section li strong,
                .report-section li a {
                    display: block;
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

commonUtils.defineCustomElement('dbp-bulletin-generate-companies', GenerateCompaniesActivity);
