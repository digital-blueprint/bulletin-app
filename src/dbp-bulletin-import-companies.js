import {css, html} from 'lit';
import {ScopedElementsMixin} from '@dbp-toolkit/common/src/scoped/ScopedElementsMixin.js';
import {FileSource} from '@dbp-toolkit/file-handling';
import {Button, DBPSelect, sendNotification} from '@dbp-toolkit/common';
import * as commonStyles from '@dbp-toolkit/common/src/styles.js';
import * as commonUtils from '@dbp-toolkit/common/utils';
import DBPBulletinLitElement from './dbp-bulletin-lit-element.js';
import CompanyModule from './modules/companyForm.js';

const BULLETIN_ADMIN_ROLE = 'ROLE_BULLETIN_ADMIN';
const SUBMISSION_STATE_SUBMITTED = 4;
const IMPORT_LIMIT_OPTIONS = ['10', '20', '50', '100', '200', '500', '1000', 'all'];
// Target field names are taken from CompanyFormElement.render() in src/modules/companyForm.js.
const CSV_HEADER_MAP = {
    abteilung: 'abteilung',
    'abteilung/institut': 'abteilung',
    address: 'adresse',
    'anzeige partnerunternehmen': 'partnerunternehmen',
    adresse: 'adresse',
    billing: 'kontaktperson_anmerkung',
    beschreibung: 'beschreibung',
    city: 'ort',
    company: 'name',
    'company name': 'name',
    'company profile contact': 'kontakt_firmenprofil',
    contact: 'kontakt_firmenprofil',
    'contact person': 'kontaktperson',
    country: 'staat',
    department: 'abteilung',
    'department/institute': 'abteilung',
    description: 'beschreibung',
    email: 'email',
    'e-mail': 'email',
    'employees national': 'mitarbeiter_national',
    'employees total': 'mitarbeiter_gesamt',
    fakturierung: 'kontaktperson_anmerkung',
    'f&e beschaftigte': 'fe_beschaeftigte',
    'f&e-beschaftigte': 'fe_beschaeftigte',
    fe_beschaeftigte: 'fe_beschaeftigte',
    'fe beschaeftigte': 'fe_beschaeftigte',
    'field of studies': 'relation_partner_fachrichtungen',
    'fields of study': 'relation_partner_fachrichtungen',
    foerderer_auslandsstip: 'foerderer_auslandsstip',
    foerderer_auslandsstip_year: 'foerderer_auslandsstip_year',
    foerderer_tugrazstip: 'foerderer_tugrazstip',
    foerderer_tugrazstip_year: 'foerderer_tugrazstip_year',
    'forschung und entwicklung beschaeftigte': 'fe_beschaeftigte',
    'forschung und entwicklung beschäftigte': 'fe_beschaeftigte',
    'foerderer auslandsstipendium': 'foerderer_auslandsstip',
    'foerderer auslandsstipendium jahr': 'foerderer_auslandsstip_year',
    'foerderer tu graz 100 stipendium': 'foerderer_tugrazstip',
    'foerderer tu graz 100 stipendium jahr': 'foerderer_tugrazstip_year',
    'forderer auslandsstipendium': 'foerderer_auslandsstip',
    'forderer auslandsstipendium jahr': 'foerderer_auslandsstip_year',
    'forderer tu graz 100 stipendium': 'foerderer_tugrazstip',
    'forderer tu graz 100 stipendium jahr': 'foerderer_tugrazstip_year',
    hs_link: 'hs_link',
    hs_link_anzeigen: 'hs_link_anzeigen',
    hs_link_name: 'hs_link_name',
    industries: 'relation_partner_branchen',
    'infrastructure label': 'hs_link_name',
    'infrastructure link': 'hs_link',
    'infrastruktur bezeichnung': 'hs_link_name',
    'infrastruktur-link anzeigen': 'hs_link_anzeigen',
    'infrastruktur link': 'hs_link',
    institutsnennung: 'institutsnennung',
    'institute mention': 'institutsnennung',
    invoicing: 'kontaktperson_anmerkung',
    kontakt: 'kontakt_firmenprofil',
    'kontakt firmenprofil': 'kontakt_firmenprofil',
    kontakt_firmenprofil: 'kontakt_firmenprofil',
    kontaktperson: 'kontaktperson',
    kontaktperson_anmerkung: 'kontaktperson_anmerkung',
    'linked fields of study': 'relation_partner_fachrichtungen',
    'linked industries': 'relation_partner_branchen',
    locations: 'standorte',
    'mitarbeiter gesamt': 'mitarbeiter_gesamt',
    'mitarbeiter national': 'mitarbeiter_national',
    mitarbeiter_gesamt: 'mitarbeiter_gesamt',
    mitarbeiter_national: 'mitarbeiter_national',
    'mini teaser': 'mini_teaser',
    mini_teaser: 'mini_teaser',
    name: 'name',
    ort: 'ort',
    partner_bis: 'partner_bis',
    partner_von: 'partner_von',
    'partner von': 'partner_von',
    'partner bis': 'partner_bis',
    'partner company category': 'partnerunternehmen_typ',
    'partnerunternehmen kategorie': 'partnerunternehmen_typ',
    'partner from': 'partner_von',
    'partner type': 'typ',
    'partner type text': 'partnertyp_text',
    'partner until': 'partner_bis',
    partnerunternehmen: 'partnerunternehmen',
    partnerunternehmen_typ: 'partnerunternehmen_typ',
    partnertyp_text: 'partnertyp_text',
    partnertyp: 'typ',
    'partnertyp text': 'partnertyp_text',
    phone: 'telefonnummer',
    'phone number': 'telefonnummer',
    plz: 'plz',
    postalcode: 'plz',
    'postal code': 'plz',
    produkte: 'produkte',
    products: 'produkte',
    profil_link_anzeigen: 'profil_link_anzeigen',
    quellen_id: 'quellen_id',
    'quellen id': 'quellen_id',
    'rd employees': 'fe_beschaeftigte',
    relation_partner_branchen: 'relation_partner_branchen',
    relation_partner_fachrichtungen: 'relation_partner_fachrichtungen',
    'regular customer': 'stammkunde',
    'show infrastructure link': 'hs_link_anzeigen',
    'show partner company': 'partnerunternehmen',
    'show profile link': 'profil_link_anzeigen',
    sortierung: 'sort_order',
    sort_order: 'sort_order',
    'sort order': 'sort_order',
    'source id': 'quellen_id',
    staat: 'staat',
    stammkunde: 'stammkunde',
    standorte: 'standorte',
    telefonnummer: 'telefonnummer',
    teaser: 'teaser',
    typ: 'typ',
    url: 'url',
    website: 'url',
    status: 'status',
    'student fields': 'relation_partner_fachrichtungen',
    supporter_international_scholarship: 'foerderer_auslandsstip',
    'supporter international scholarship': 'foerderer_auslandsstip',
    'supporter international scholarship year': 'foerderer_auslandsstip_year',
    supporter_tu_graz_scholarship: 'foerderer_tugrazstip',
    'supporter tu graz scholarship': 'foerderer_tugrazstip',
    'supporter tu graz scholarship year': 'foerderer_tugrazstip_year',
    'profil-link anzeigen': 'profil_link_anzeigen',
    'verknuepfte branchen': 'relation_partner_branchen',
    'verknuepfte fachrichtungen': 'relation_partner_fachrichtungen',
    'verknupfte branchen': 'relation_partner_branchen',
    'verknupfte fachrichtungen': 'relation_partner_fachrichtungen',
    'verknüpfte branchen': 'relation_partner_branchen',
    'verknüpfte fachrichtungen': 'relation_partner_fachrichtungen',
};
const BOOLEAN_FIELDS = new Set([
    'stammkunde',
    'partnerunternehmen',
    'foerderer_auslandsstip',
    'foerderer_tugrazstip',
    'hs_link_anzeigen',
    'profil_link_anzeigen',
]);
const NUMBER_FIELDS = new Set([
    'sort_order',
    'foerderer_auslandsstip_year',
    'foerderer_tugrazstip_year',
]);
const ARRAY_FIELDS = new Set(['relation_partner_branchen', 'relation_partner_fachrichtungen']);
const COUNTRY_MAP = {
    österreich: '1',
    oesterreich: '1',
    austria: '1',
    deutschland: '47',
    germany: '47',
    schweiz: '189',
    switzerland: '189',
    spanien: '199',
    spain: '199',
    'vereinigte staaten von amerika': '236',
    usa: '236',
    'united states': '236',
    'united states of america': '236',
    'vereinigtes königreich': '237',
    'vereinigtes koenigreich': '237',
    'united kingdom': '237',
};

const normalizeText = (value) =>
    String(value ?? '')
        .trim()
        .replace(/\s+/g, ' ');

const normalizeKey = (value) =>
    normalizeText(value)
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

const normalizeDuplicateName = (value) => normalizeKey(value).replace(/[.,;:/\\|_()[\]{}-]+/g, '');

const normalizeBooleanValue = (value) => {
    const normalizedValue = normalizeKey(value);
    if (['1', 'true', 'yes', 'ja', 'y', 'j'].includes(normalizedValue)) {
        return true;
    }
    if (['0', 'false', 'no', 'nein', 'n'].includes(normalizedValue)) {
        return false;
    }
    return Boolean(value);
};

const normalizeNumberValue = (value) => {
    const normalizedValue = normalizeText(value).replace(',', '.');
    const number = Number(normalizedValue);
    return Number.isNaN(number) ? value : number;
};

const normalizeArrayValue = (value) =>
    normalizeText(value)
        .split(/[,;|]/)
        .map((item) => item.trim())
        .filter(Boolean);

const keepImportCompaniesTranslations = (t) => {
    t('import-companies.errors-empty');
    t('import-companies.errors-title');
    t('import-companies.imported-empty');
    t('import-companies.imported-title');
    t('import-companies.overwritten-empty');
    t('import-companies.overwritten-title');
    t('import-companies.skipped-deactivated-empty');
    t('import-companies.skipped-deactivated-title');
    t('import-companies.skipped-empty');
    t('import-companies.skipped-limit-empty');
    t('import-companies.skipped-limit-title');
    t('import-companies.skipped-title');
};

class ImportCompaniesActivity extends ScopedElementsMixin(DBPBulletinLitElement) {
    static get scopedElements() {
        return {
            'dbp-button': Button,
            'dbp-select': DBPSelect,
            'dbp-file-source': FileSource,
        };
    }

    constructor() {
        super();
        this.nextcloudAuthUrl = '';
        this.nextcloudWebDavUrl = '';
        this.nextcloudName = '';
        this.nextcloudFileUrl = '';
        this._isImporting = false;
        this._includeDeactivatedCompanies = false;
        this._overwriteExistingCompanies = false;
        this._importLimit = 'all';
        this._report = null;
        this._selectedFileName = '';
    }

    static get properties() {
        return {
            ...super.properties,
            nextcloudAuthUrl: {type: String, attribute: 'nextcloud-auth-url'},
            nextcloudWebDavUrl: {type: String, attribute: 'nextcloud-web-dav-url'},
            nextcloudName: {type: String, attribute: 'nextcloud-name'},
            nextcloudFileUrl: {type: String, attribute: 'nextcloud-file-url'},
            _isImporting: {state: true},
            _includeDeactivatedCompanies: {state: true},
            _overwriteExistingCompanies: {state: true},
            _importLimit: {state: true},
            _report: {state: true},
            _selectedFileName: {state: true},
        };
    }

    get _isDeveloper() {
        return (this.auth?._roles ?? []).includes(BULLETIN_ADMIN_ROLE);
    }

    async _handleFileSelected(event) {
        const file = event.detail?.file;
        if (!file || this._isImporting) {
            return;
        }

        this._selectedFileName = file.name;
        this._isImporting = true;
        this._report = null;

        try {
            const csvText = await this._readCsvFile(file);
            const rows = this._parseCsv(csvText);
            const report = await this._importRows(rows);
            this._report = report;

            sendNotification({
                summary: this._i18n.t('import-companies.import-finished-title'),
                body: this._i18n.t('import-companies.import-finished-body', {
                    imported: report.imported.length,
                    overwritten: report.overwritten.length,
                    skipped: report.skipped.length,
                    skippedDeactivated: report.skippedDeactivated.length,
                    skippedLimit: report.skippedLimit.length,
                    errors: report.errors.length,
                }),
                type: report.errors.length > 0 ? 'warning' : 'success',
                timeout: 8,
            });
        } catch (error) {
            console.error('Company import failed:', error);
            this._report = {
                imported: [],
                overwritten: [],
                skipped: [],
                skippedDeactivated: [],
                skippedLimit: [],
                errors: [{rowNumber: '-', name: this._selectedFileName, message: error.message}],
            };
            sendNotification({
                summary: this._i18n.t('import-companies.import-error-title'),
                body: error.message,
                type: 'danger',
                timeout: 0,
            });
        } finally {
            this._isImporting = false;
        }
    }

    async _readCsvFile(file) {
        const buffer = await file.arrayBuffer();
        return this._decodeMixedEncodingLines(new Uint8Array(buffer));
    }

    _decodeMixedEncodingLines(bytes) {
        const parts = [];
        let lineStart = 0;

        for (let index = 0; index < bytes.length; index++) {
            if (bytes[index] !== 0x0a && bytes[index] !== 0x0d) {
                continue;
            }

            parts.push(this._decodeLine(bytes.subarray(lineStart, index)));

            if (bytes[index] === 0x0d && bytes[index + 1] === 0x0a) {
                parts.push('\r\n');
                index++;
            } else {
                parts.push(String.fromCharCode(bytes[index]));
            }

            lineStart = index + 1;
        }

        if (lineStart < bytes.length) {
            parts.push(this._decodeLine(bytes.subarray(lineStart)));
        }

        return parts.join('');
    }

    _decodeLine(bytes) {
        try {
            return new TextDecoder('utf-8', {fatal: true}).decode(bytes);
        } catch {
            return new TextDecoder('iso-8859-15').decode(bytes);
        }
    }

    _parseCsv(csvText) {
        const rows = [];
        let row = [];
        let value = '';
        let inQuotes = false;

        for (let index = 0; index < csvText.length; index++) {
            const char = csvText[index];
            const nextChar = csvText[index + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    value += '"';
                    index++;
                } else {
                    inQuotes = !inQuotes;
                }
                continue;
            }

            if (char === ';' && !inQuotes) {
                row.push(value);
                value = '';
                continue;
            }

            if ((char === '\n' || char === '\r') && !inQuotes) {
                if (char === '\r' && nextChar === '\n') {
                    index++;
                }
                row.push(value);
                if (row.some((cell) => cell !== '')) {
                    rows.push(row);
                }
                row = [];
                value = '';
                continue;
            }

            value += char;
        }

        if (value !== '' || row.length > 0) {
            row.push(value);
            if (row.some((cell) => cell !== '')) {
                rows.push(row);
            }
        }

        if (rows.length < 2) {
            throw new Error(this._i18n.t('import-companies.error-empty-csv'));
        }

        return rows;
    }

    async _importRows(rows) {
        if (!this._isDeveloper) {
            throw new Error(this._i18n.t('import-companies.error-not-authorized'));
        }
        if (!this.auth?.token || !this.entryPointUrl) {
            throw new Error(this._i18n.t('import-companies.error-not-ready'));
        }

        const formIdentifier = await this._fetchCompanyFormIdentifier();
        const existingCompanies = await this._fetchExistingCompanies(formIdentifier);
        const headers = rows[0].map((header) => CSV_HEADER_MAP[normalizeKey(header)] ?? null);
        const maxImports =
            this._importLimit === 'all' ? Number.POSITIVE_INFINITY : Number(this._importLimit);
        const report = {
            imported: [],
            overwritten: [],
            skipped: [],
            skippedDeactivated: [],
            skippedLimit: [],
            errors: [],
        };

        await commonUtils.asyncArrayForEach(rows.slice(1), async (row, index) => {
            const rowNumber = index + 2;
            const company = this._mapRowToCompany(headers, row);
            const name = normalizeText(company.name);
            const duplicateName = normalizeDuplicateName(name);
            const existingCompany = existingCompanies.get(duplicateName);
            const isActive = company.status === '1';

            if (!name) {
                report.errors.push({
                    rowNumber,
                    name: '',
                    message: this._i18n.t('import-companies.error-missing-name'),
                });
                return;
            }

            if (!isActive && !this._includeDeactivatedCompanies) {
                report.skippedDeactivated.push({rowNumber, name});
                return;
            }

            if (existingCompany && !this._overwriteExistingCompanies) {
                report.skipped.push({rowNumber, name});
                return;
            }

            if (report.imported.length + report.overwritten.length >= maxImports) {
                report.skippedLimit.push({rowNumber, name});
                return;
            }

            try {
                if (existingCompany) {
                    await this._updateCompanySubmission(existingCompany.identifier, company);
                    report.overwritten.push({rowNumber, name});
                } else {
                    const createdSubmission = await this._createCompanySubmission(
                        formIdentifier,
                        company,
                    );
                    existingCompanies.set(duplicateName, {
                        identifier: createdSubmission?.identifier,
                    });
                    report.imported.push({rowNumber, name});
                }
            } catch (error) {
                report.errors.push({rowNumber, name, message: error.message});
            }
        });

        return report;
    }

    async _fetchCompanyFormIdentifier() {
        const frontendKey = new CompanyModule().getFormFrontendKey();
        const response = await fetch(
            `${this.entryPointUrl}/formalize/forms?perPage=9999&whereFrontendKeyIn[]=${encodeURIComponent(
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
                this._i18n.t('import-companies.error-load-company-form', {status: response.status}),
            );
        }

        const data = await response.json();
        const form = data['hydra:member']?.[0];
        if (!form?.identifier) {
            throw new Error(this._i18n.t('import-companies.error-company-form-missing'));
        }
        return form.identifier;
    }

    async _fetchExistingCompanies(formIdentifier) {
        const response = await fetch(
            `${this.entryPointUrl}/formalize/submissions?formIdentifier=${encodeURIComponent(
                formIdentifier,
            )}&perPage=9999`,
            {
                headers: {
                    'Content-Type': 'application/ld+json',
                    Authorization: `Bearer ${this.auth.token}`,
                },
            },
        );

        if (!response.ok) {
            throw new Error(
                this._i18n.t('import-companies.error-load-companies', {status: response.status}),
            );
        }

        const data = await response.json();
        const companies = new Map();
        for (const submission of data['hydra:member'] ?? []) {
            try {
                const submissionData = JSON.parse(submission.dataFeedElement ?? '{}');
                const duplicateName = normalizeDuplicateName(
                    submissionData.name ?? submissionData.companyName,
                );
                if (duplicateName && submission.identifier) {
                    companies.set(duplicateName, {identifier: submission.identifier});
                }
            } catch (error) {
                console.error('Could not parse company submission:', error);
            }
        }
        return companies;
    }

    _mapRowToCompany(headers, row) {
        const company = {};
        headers.forEach((fieldName, index) => {
            if (!fieldName) {
                return;
            }
            const value = normalizeText(row[index]);
            if (value !== '') {
                if (BOOLEAN_FIELDS.has(fieldName)) {
                    company[fieldName] = normalizeBooleanValue(value);
                } else if (NUMBER_FIELDS.has(fieldName)) {
                    company[fieldName] = normalizeNumberValue(value);
                } else if (ARRAY_FIELDS.has(fieldName)) {
                    company[fieldName] = normalizeArrayValue(value);
                } else {
                    company[fieldName] = value;
                }
            }
        });

        company.name = normalizeText(company.name);
        if (company.staat !== undefined) {
            company.staat = COUNTRY_MAP[normalizeKey(company.staat)] ?? 'other';
        }
        if (company.url === 'http://' || company.url === 'https://') {
            company.url = '';
        }

        return company;
    }

    async _createCompanySubmission(formIdentifier, company) {
        const postFormData = new FormData();
        postFormData.append('form', `/formalize/forms/${formIdentifier}`);
        postFormData.append('dataFeedElement', JSON.stringify(company));
        postFormData.append('submissionState', String(SUBMISSION_STATE_SUBMITTED));

        const response = await fetch(`${this.entryPointUrl}/formalize/submissions`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${this.auth.token}`,
            },
            body: postFormData,
        });

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(
                errorBody.description ||
                    errorBody['hydra:description'] ||
                    this._i18n.t('import-companies.error-create-company', {
                        status: response.status,
                    }),
            );
        }

        return response.json().catch(() => ({}));
    }

    async _updateCompanySubmission(submissionIdentifier, company) {
        if (!submissionIdentifier) {
            throw new Error(this._i18n.t('import-companies.error-missing-submission-id'));
        }

        const patchFormData = new FormData();
        patchFormData.append('dataFeedElement', JSON.stringify(company));

        const response = await fetch(
            `${this.entryPointUrl}/formalize/submissions/${submissionIdentifier}`,
            {
                method: 'PATCH',
                headers: {
                    Authorization: `Bearer ${this.auth.token}`,
                },
                body: patchFormData,
            },
        );

        if (!response.ok) {
            const errorBody = await response.json().catch(() => ({}));
            throw new Error(
                errorBody.description ||
                    errorBody['hydra:description'] ||
                    this._i18n.t('import-companies.error-update-company', {
                        status: response.status,
                    }),
            );
        }
    }

    _renderReportList(titleKey, items, emptyKey, itemTemplate) {
        const t = (key, opts) => this._i18n.t(key, opts);
        return html`
            <section class="report-section">
                <h3>${t(titleKey, {count: items.length})}</h3>
                ${
                    items.length === 0
                        ? html`
                              <p>${t(emptyKey)}</p>
                          `
                        : html`
                              <ul>
                                  ${items.map(
                                      (item) => html`
                                          <li>${itemTemplate(item)}</li>
                                      `,
                                  )}
                              </ul>
                          `
                }
            </section>
        `;
    }

    _getImportLimitOptions() {
        return IMPORT_LIMIT_OPTIONS.map((value) => ({
            value,
            label: value === 'all' ? this._i18n.t('import-companies.import-limit-all') : value,
        }));
    }

    _getImportLimitLabel() {
        return this._importLimit === 'all'
            ? this._i18n.t('import-companies.import-limit-all')
            : this._importLimit;
    }

    render() {
        const t = (key, opts) => this._i18n.t(key, opts);
        keepImportCompaniesTranslations(t);

        if (!this._isDeveloper) {
            return html`
                <section class="activity-header">
                    <h2>${t('import-companies.title')}</h2>
                    <p>${t('import-companies.not-authorized')}</p>
                </section>
            `;
        }

        return html`
            <section class="activity-header">
                <h2>${t('import-companies.title')}</h2>
                <p>${t('import-companies.description')}</p>
            </section>

            <section class="import-card">
                <p class="hint">${t('import-companies.file-hint')}</p>
                <div class="checkbox-option">
                    <label for="include-deactivated-companies">
                        ${t('import-companies.include-deactivated-label')}
                    </label>
                    <p id="include-deactivated-companies-description">
                        ${t('import-companies.include-deactivated-description')}
                    </p>
                    <input
                        id="include-deactivated-companies"
                        type="checkbox"
                        aria-describedby="include-deactivated-companies-description"
                        .checked="${this._includeDeactivatedCompanies}"
                        ?disabled="${this._isImporting}"
                        @change="${(event) => {
                            this._includeDeactivatedCompanies = event.target.checked;
                        }}" />
                </div>
                <div class="checkbox-option">
                    <label for="overwrite-existing-companies">
                        ${t('import-companies.overwrite-existing-label')}
                    </label>
                    <p id="overwrite-existing-companies-description">
                        ${t('import-companies.overwrite-existing-description')}
                    </p>
                    <input
                        id="overwrite-existing-companies"
                        type="checkbox"
                        aria-describedby="overwrite-existing-companies-description"
                        .checked="${this._overwriteExistingCompanies}"
                        ?disabled="${this._isImporting}"
                        @change="${(event) => {
                            this._overwriteExistingCompanies = event.target.checked;
                        }}" />
                </div>
                <div class="select-option">
                    <label for="company-import-limit">
                        ${t('import-companies.import-limit-label')}
                    </label>
                    <p id="company-import-limit-description">
                        ${t('import-companies.import-limit-description')}
                    </p>
                    <dbp-select
                        id="company-import-limit"
                        align="left"
                        aria-describedby="company-import-limit-description"
                        label="${this._getImportLimitLabel()}"
                        .options="${this._getImportLimitOptions()}"
                        .value="${this._importLimit}"
                        ?disabled="${this._isImporting}"
                        @change="${(event) => {
                            this._importLimit = event.detail.value;
                        }}"></dbp-select>
                </div>
                <dbp-button
                    type="is-primary"
                    value="${
                        this._isImporting
                            ? t('import-companies.importing')
                            : t('import-companies.select-file')
                    }"
                    ?disabled="${this._isImporting}"
                    @click="${() =>
                        this.renderRoot
                            .querySelector('dbp-file-source')
                            ?.openDialog()}"></dbp-button>
                <dbp-file-source
                    context="${t('import-companies.file-source-title')}"
                    button-label="${t('import-companies.select-file')}"
                    enabled-targets="local"
                    number-of-files="1"
                    lang="${this.lang}"
                    nextcloud-auth-url="${this.nextcloudAuthUrl}"
                    nextcloud-web-dav-url="${this.nextcloudWebDavUrl}"
                    nextcloud-name="${this.nextcloudName}"
                    nextcloud-file-url="${this.nextcloudFileUrl}"
                    ?disabled="${this._isImporting}"
                    @dbp-file-source-file-selected="${this._handleFileSelected}"></dbp-file-source>
            </section>

            ${
                this._report
                    ? html`
                          <section class="report-card">
                              <h2>${t('import-companies.report-title')}</h2>
                              ${
                                  this._selectedFileName
                                      ? html`
                                            <p>
                                                ${t('import-companies.report-file', {
                                                    file: this._selectedFileName,
                                                })}
                                            </p>
                                        `
                                      : ''
                              }
                              <div class="summary-grid">
                                  <div>
                                      <strong>${this._report.imported.length}</strong>
                                      <span>${t('import-companies.summary-imported')}</span>
                                  </div>
                                  <div>
                                      <strong>${this._report.overwritten.length}</strong>
                                      <span>${t('import-companies.summary-overwritten')}</span>
                                  </div>
                                  <div>
                                      <strong>${this._report.skipped.length}</strong>
                                      <span>${t('import-companies.summary-skipped')}</span>
                                  </div>
                                  <div>
                                      <strong>${this._report.skippedDeactivated.length}</strong>
                                      <span>
                                          ${t('import-companies.summary-skipped-deactivated')}
                                      </span>
                                  </div>
                                  <div>
                                      <strong>${this._report.skippedLimit.length}</strong>
                                      <span>${t('import-companies.summary-skipped-limit')}</span>
                                  </div>
                                  <div>
                                      <strong>${this._report.errors.length}</strong>
                                      <span>${t('import-companies.summary-errors')}</span>
                                  </div>
                              </div>
                              ${this._renderReportList(
                                  'import-companies.imported-title',
                                  this._report.imported,
                                  'import-companies.imported-empty',
                                  (item) =>
                                      t('import-companies.report-row', {
                                          row: item.rowNumber,
                                          name: item.name,
                                      }),
                              )}
                              ${this._renderReportList(
                                  'import-companies.overwritten-title',
                                  this._report.overwritten,
                                  'import-companies.overwritten-empty',
                                  (item) =>
                                      t('import-companies.report-row', {
                                          row: item.rowNumber,
                                          name: item.name,
                                      }),
                              )}
                              ${this._renderReportList(
                                  'import-companies.skipped-title',
                                  this._report.skipped,
                                  'import-companies.skipped-empty',
                                  (item) =>
                                      t('import-companies.report-row', {
                                          row: item.rowNumber,
                                          name: item.name,
                                      }),
                              )}
                              ${this._renderReportList(
                                  'import-companies.skipped-deactivated-title',
                                  this._report.skippedDeactivated,
                                  'import-companies.skipped-deactivated-empty',
                                  (item) =>
                                      t('import-companies.report-row', {
                                          row: item.rowNumber,
                                          name: item.name,
                                      }),
                              )}
                              ${this._renderReportList(
                                  'import-companies.skipped-limit-title',
                                  this._report.skippedLimit,
                                  'import-companies.skipped-limit-empty',
                                  (item) =>
                                      t('import-companies.report-row', {
                                          row: item.rowNumber,
                                          name: item.name,
                                      }),
                              )}
                              ${this._renderReportList(
                                  'import-companies.errors-title',
                                  this._report.errors,
                                  'import-companies.errors-empty',
                                  (item) =>
                                      t('import-companies.error-row', {
                                          row: item.rowNumber,
                                          name: item.name || '-',
                                          message: item.message,
                                      }),
                              )}
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
                .import-card,
                .report-card {
                    max-width: 72rem;
                    margin: 0 auto 1.5rem;
                }

                .activity-header h2,
                .report-card h2 {
                    margin-top: 0;
                }

                .import-card,
                .report-card {
                    padding: 1.5rem;
                    border: var(--dbp-override-border, 1px solid #ddd);
                    background: var(--dbp-override-secondary-surface, #fff);
                }

                .hint {
                    margin-top: 0;
                }

                .checkbox-option {
                    display: grid;
                    grid-template-columns: 1fr auto;
                    gap: 0.25rem 1rem;
                    align-items: center;
                    max-width: 42rem;
                    margin-bottom: 1.25rem;
                }

                .checkbox-option label {
                    font-weight: bold;
                }

                .checkbox-option p {
                    grid-column: 1;
                    margin: 0;
                }

                .checkbox-option input {
                    grid-column: 2;
                    grid-row: 1 / span 2;
                    width: 1.25rem;
                    height: 1.25rem;
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
                    grid-template-columns: repeat(6, minmax(0, 1fr));
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

                    .checkbox-option {
                        grid-template-columns: 1fr;
                    }

                    .checkbox-option input {
                        grid-column: 1;
                        grid-row: auto;
                    }
                }
            `,
        ];
    }
}

commonUtils.defineCustomElement('dbp-bulletin-import-companies', ImportCompaniesActivity);
