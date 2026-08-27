import {BaseFormElement, BaseObject} from '../../vendor/formalize/src/form/base-object.js';
import {css, html} from 'lit';
import {DbpBooleanElement, DbpEnumElement, DbpStringElement} from '@dbp-toolkit/form-elements';
import * as commonStyles from '@dbp-toolkit/common/styles';
import {createInstance} from '../i18n.js';

const i18n = createInstance();

const INDUSTRY_KEYS = Array.from({length: 40}, (_, index) => String(index + 12));

const LEGACY_FIELD_FALLBACKS = {
    abteilung: 'department',
    adresse: 'address',
    beschreibung: 'description',
    branchen: 'relation_partner_branchen',
    email: 'contactEmail',
    kontaktperson: 'contactName',
    name: 'companyName',
    ort: 'city',
    plz: 'postalCode',
    produkte: 'products',
    standorte: 'locations',
    telefonnummer: 'contactPhone',
    url: 'website',
};

export const COMPANY_FIELDS = [
    'name',
    'partnerunternehmen',
    'abteilung',
    'adresse',
    'plz',
    'ort',
    'kontaktperson',
    'telefonnummer',
    'email',
    'url',
    'teaser',
    'beschreibung',
    'produkte',
    'standorte',
    'mitarbeiter_national',
    'mitarbeiter_gesamt',
    'fe_beschaeftigte',
    'branchen',
];

export function pickCompanyData(data = {}) {
    return Object.fromEntries(
        COMPANY_FIELDS.flatMap((field) => {
            const value = data[field] ?? data[LEGACY_FIELD_FALLBACKS[field]];
            return value === undefined ? [] : [[field, value]];
        }),
    );
}

const keepCompanyFormTranslations = (t) => {
    t('company-form.field-address');
    t('company-form.field-city');
    t('company-form.field-contact-person');
    t('company-form.field-department');
    t('company-form.field-description');
    t('company-form.field-email');
    t('company-form.field-employees-national');
    t('company-form.field-employees-total');
    t('company-form.field-industries');
    t('company-form.field-locations');
    t('company-form.field-name');
    t('company-form.field-phone-number');
    t('company-form.field-postal-code');
    t('company-form.field-products');
    t('company-form.field-rd-employees');
    t('company-form.field-show-partner-company');
    t('company-form.field-teaser');
    t('company-form.field-url');
    t('company-form.field-url-placeholder');
    t('company-form.industry-12');
    t('company-form.industry-13');
    t('company-form.industry-14');
    t('company-form.industry-15');
    t('company-form.industry-16');
    t('company-form.industry-17');
    t('company-form.industry-18');
    t('company-form.industry-19');
    t('company-form.industry-20');
    t('company-form.industry-21');
    t('company-form.industry-22');
    t('company-form.industry-23');
    t('company-form.industry-24');
    t('company-form.industry-25');
    t('company-form.industry-26');
    t('company-form.industry-27');
    t('company-form.industry-28');
    t('company-form.industry-29');
    t('company-form.industry-30');
    t('company-form.industry-31');
    t('company-form.industry-32');
    t('company-form.industry-33');
    t('company-form.industry-34');
    t('company-form.industry-35');
    t('company-form.industry-36');
    t('company-form.industry-37');
    t('company-form.industry-38');
    t('company-form.industry-39');
    t('company-form.industry-40');
    t('company-form.industry-41');
    t('company-form.industry-42');
    t('company-form.industry-43');
    t('company-form.industry-44');
    t('company-form.industry-45');
    t('company-form.industry-46');
    t('company-form.industry-47');
    t('company-form.industry-48');
    t('company-form.industry-49');
    t('company-form.industry-50');
    t('company-form.industry-51');
    t('company-form.required-field-note-text');
};

class CompanyModule extends BaseObject {
    getUrlSlug() {
        return 'company';
    }

    getFormComponent() {
        return CompanyFormElement;
    }

    getFormFrontendKey() {
        return 'bulletin-company';
    }

    getFormName(lang = i18n.language) {
        i18n.changeLanguage(lang);
        return i18n.t('company-form.form-type-name');
    }

    getItemText(data) {
        return data?.name || data?.companyName || data?.email || data?.contactEmail || '';
    }
}

export default CompanyModule;

class CompanyFormElement extends BaseFormElement {
    constructor() {
        super();
        this._i18n = createInstance();
        this.lang = this._i18n.language;
    }

    static get scopedElements() {
        return {
            'dbp-boolean-element': DbpBooleanElement,
            'dbp-enum-element': DbpEnumElement,
            'dbp-string-element': DbpStringElement,
        };
    }

    getValue(name) {
        return this.formData?.[name] ?? this.formData?.[LEGACY_FIELD_FALLBACKS[name]] ?? '';
    }

    getBooleanValue(name) {
        return this.getValue(name) === true || this.getValue(name) === 'true';
    }

    getArrayValue(name) {
        const value = this.getValue(name);
        if (Array.isArray(value)) {
            return value.map(String);
        }
        if (!value) {
            return [];
        }
        return String(value)
            .split(/[,;|]/)
            .map((item) => item.trim())
            .filter(Boolean);
    }

    renderStringField(name, labelKey, options = {}) {
        const t = (key, opts) => this._i18n.t(key, opts);
        return html`
            <dbp-string-element
                name="${name}"
                lang="${this.lang}"
                label="${t(labelKey)}"
                .value="${this.getValue(name)}"
                rows="${options.rows || ''}"
                placeholder="${options.placeholderKey ? t(options.placeholderKey) : ''}"
                ?required="${options.required}"></dbp-string-element>
        `;
    }

    renderBooleanField(name, labelKey) {
        const t = (key, opts) => this._i18n.t(key, opts);
        return html`
            <dbp-boolean-element
                name="${name}"
                lang="${this.lang}"
                label="${t(labelKey)}"
                .value="${this.getBooleanValue(name) ? 'true' : 'false'}"></dbp-boolean-element>
        `;
    }

    renderEnumField(name, labelKey, items) {
        const t = (key, opts) => this._i18n.t(key, opts);
        return html`
            <dbp-enum-element
                name="${name}"
                lang="${this.lang}"
                label="${t(labelKey)}"
                .items="${items}"
                .value="${this.getArrayValue(name)}"
                multiple
                display-mode="tags"></dbp-enum-element>
        `;
    }

    render() {
        const t = (key, opts) => this._i18n.t(key, opts);
        keepCompanyFormTranslations(t);
        const industryItems = Object.fromEntries(
            INDUSTRY_KEYS.map((key) => [key, t(`company-form.industry-${key}`)]),
        );

        return html`
            <form class="formalize-form">
                <p class="required-field-note">
                    <span class="red-marked-asterisk">*</span>
                    ${t('company-form.required-field-note-text')}
                </p>

                <section class="form-section">
                    <h3>${t('company-form.section-basic-data')}</h3>
                    <hr />
                    ${this.renderStringField('name', 'company-form.field-name', {required: true})}
                    ${this.renderStringField('abteilung', 'company-form.field-department', {
                        rows: 2,
                    })}
                </section>

                <section class="form-section">
                    <h3>${t('company-form.section-address-contact')}</h3>
                    <hr />
                    ${this.renderStringField('adresse', 'company-form.field-address', {rows: 4})}
                    <div class="two-column-row compact-left">
                        ${this.renderStringField('plz', 'company-form.field-postal-code')}
                        ${this.renderStringField('ort', 'company-form.field-city')}
                    </div>
                    ${this.renderStringField('kontaktperson', 'company-form.field-contact-person', {
                        rows: 2,
                    })}
                    ${this.renderStringField('telefonnummer', 'company-form.field-phone-number', {
                        rows: 2,
                    })}
                    ${this.renderStringField('email', 'company-form.field-email')}
                    ${this.renderStringField('url', 'company-form.field-url', {
                        placeholderKey: 'company-form.field-url-placeholder',
                    })}
                </section>

                <section class="form-section">
                    <h3>${t('company-form.section-company-profile')}</h3>
                    <hr />
                    ${this.renderStringField('teaser', 'company-form.field-teaser', {rows: 3})}
                    ${this.renderStringField('beschreibung', 'company-form.field-description', {
                        rows: 10,
                    })}
                    ${this.renderStringField('produkte', 'company-form.field-products', {rows: 5})}
                    ${this.renderStringField('standorte', 'company-form.field-locations', {
                        rows: 5,
                    })}
                    ${this.renderEnumField(
                        'branchen',
                        'company-form.field-industries',
                        industryItems,
                    )}
                    <div class="two-column-row">
                        ${this.renderStringField(
                            'mitarbeiter_national',
                            'company-form.field-employees-national',
                        )}
                        ${this.renderStringField(
                            'mitarbeiter_gesamt',
                            'company-form.field-employees-total',
                        )}
                    </div>
                    ${this.renderStringField('fe_beschaeftigte', 'company-form.field-rd-employees')}
                </section>

                <section class="form-section">
                    <h3>${t('company-form.section-partner-company')}</h3>
                    <hr />
                    ${this.renderBooleanField(
                        'partnerunternehmen',
                        'company-form.field-show-partner-company',
                    )}
                </section>
            </form>
        `;
    }

    static get styles() {
        return css`
            ${commonStyles.getThemeCSS()}
            ${commonStyles.getGeneralCSS()}

            :host {
                display: block;
            }

            .required-field-note {
                margin: 0 0 0.75rem;
            }

            .red-marked-asterisk {
                color: var(--dbp-danger);
                font-weight: bold;
            }

            .formalize-form {
                padding-right: 8px;
            }

            .form-section {
                margin-top: 1.5rem;
                padding-top: 1rem;
            }

            .form-section:first-of-type {
                border-top: 0;
                margin-top: 0;
                padding-top: 0;
            }

            .form-section h3 {
                margin: 0px;
                font-size: 1.3rem;
                font-weight: 400;
            }

            .two-column-row {
                display: grid;
                gap: 1rem;
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .compact-left {
                grid-template-columns: minmax(8rem, 0.35fr) minmax(0, 1fr);
            }

            @media (max-width: 640px) {
                .two-column-row,
                .compact-left {
                    grid-template-columns: 1fr;
                }
            }
        `;
    }
}
