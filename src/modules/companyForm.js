import {BaseFormElement, BaseObject} from '../../vendor/formalize/src/form/base-object.js';
import {css, html} from 'lit';
import {
    DbpBooleanElement,
    DbpDateElement,
    DbpEnumElement,
    DbpNumberElement,
    DbpStringElement,
} from '@dbp-toolkit/form-elements';
import * as commonStyles from '@dbp-toolkit/common/styles';
import {createInstance} from '../i18n.js';

const i18n = createInstance();

const PARTNER_TYPE_KEYS = ['0', '1', '2', '3', '4', '5'];
const PARTNER_COMPANY_CATEGORY_KEYS = ['0', '1', '2', '3'];
const COUNTRY_KEYS = ['', '1', '47', '189', '199', '236', '237', 'other'];
const INDUSTRY_KEYS = [
    '12',
    '13',
    '14',
    '15',
    '16',
    '17',
    '18',
    '19',
    '20',
    '21',
    '22',
    '23',
    '24',
    '25',
    '26',
    '27',
    '28',
    '29',
    '30',
    '31',
    '32',
    '33',
    '34',
    '35',
    '36',
    '37',
    '38',
    '39',
    '40',
    '41',
    '42',
    '43',
    '44',
    '45',
    '46',
    '47',
    '48',
    '49',
    '50',
    '51',
];
const FIELD_OF_STUDY_KEYS = [
    '91',
    '92',
    '93',
    '94',
    '95',
    '96',
    '97',
    '98',
    '99',
    '100',
    '101',
    '102',
    '103',
    '104',
    '105',
    '106',
    '107',
    '111',
    '112',
    '113',
    '114',
    '115',
    '116',
];

const LEGACY_FIELD_FALLBACKS = {
    adresse: 'address',
    email: 'contactEmail',
    kontaktperson: 'contactName',
    name: 'companyName',
    telefonnummer: 'contactPhone',
    url: 'website',
};

const createItems = (keys, prefix, t) =>
    Object.fromEntries(keys.map((key) => [key, t(`company-form.${prefix}-${key || 'empty'}`)]));

const keepCompanyFormTranslations = (t) => {
    t('company-form.country-1');
    t('company-form.country-189');
    t('company-form.country-199');
    t('company-form.country-236');
    t('company-form.country-237');
    t('company-form.country-47');
    t('company-form.country-empty');
    t('company-form.country-other');
    t('company-form.field-address');
    t('company-form.field-billing');
    t('company-form.field-city');
    t('company-form.field-company-profile-contact');
    t('company-form.field-contact-person');
    t('company-form.field-country');
    t('company-form.field-department');
    t('company-form.field-description');
    t('company-form.field-email');
    t('company-form.field-employees-national');
    t('company-form.field-employees-total');
    t('company-form.field-infrastructure-link');
    t('company-form.field-infrastructure-link-name');
    t('company-form.field-institute-mention');
    t('company-form.field-linked-fields-of-study');
    t('company-form.field-linked-industries');
    t('company-form.field-locations');
    t('company-form.field-mini-teaser');
    t('company-form.field-name');
    t('company-form.field-of-study-100');
    t('company-form.field-of-study-101');
    t('company-form.field-of-study-102');
    t('company-form.field-of-study-103');
    t('company-form.field-of-study-104');
    t('company-form.field-of-study-105');
    t('company-form.field-of-study-106');
    t('company-form.field-of-study-107');
    t('company-form.field-of-study-111');
    t('company-form.field-of-study-112');
    t('company-form.field-of-study-113');
    t('company-form.field-of-study-114');
    t('company-form.field-of-study-115');
    t('company-form.field-of-study-116');
    t('company-form.field-of-study-91');
    t('company-form.field-of-study-92');
    t('company-form.field-of-study-93');
    t('company-form.field-of-study-94');
    t('company-form.field-of-study-95');
    t('company-form.field-of-study-96');
    t('company-form.field-of-study-97');
    t('company-form.field-of-study-98');
    t('company-form.field-of-study-99');
    t('company-form.field-partner-company-category');
    t('company-form.field-partner-from');
    t('company-form.field-partner-type');
    t('company-form.field-partner-type-text');
    t('company-form.field-partner-until');
    t('company-form.field-phone-number');
    t('company-form.field-postal-code');
    t('company-form.field-products');
    t('company-form.field-rd-employees');
    t('company-form.field-regular-customer');
    t('company-form.field-show-infrastructure-link');
    t('company-form.field-show-partner-company');
    t('company-form.field-show-profile-link');
    t('company-form.field-sort-order');
    t('company-form.field-source-id');
    t('company-form.field-supporter-international-scholarship');
    t('company-form.field-supporter-international-scholarship-year');
    t('company-form.field-supporter-tu-graz-scholarship');
    t('company-form.field-supporter-tu-graz-scholarship-year');
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
    t('company-form.partner-company-category-0');
    t('company-form.partner-company-category-1');
    t('company-form.partner-company-category-2');
    t('company-form.partner-company-category-3');
    t('company-form.partner-type-0');
    t('company-form.partner-type-1');
    t('company-form.partner-type-2');
    t('company-form.partner-type-3');
    t('company-form.partner-type-4');
    t('company-form.partner-type-5');
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
            'dbp-date-element': DbpDateElement,
            'dbp-enum-element': DbpEnumElement,
            'dbp-number-element': DbpNumberElement,
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
        if (value === '') {
            return [];
        }
        return [String(value)];
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

    renderNumberField(name, labelKey) {
        const t = (key, opts) => this._i18n.t(key, opts);
        return html`
            <dbp-number-element
                name="${name}"
                lang="${this.lang}"
                label="${t(labelKey)}"
                .value="${this.getValue(name)}"></dbp-number-element>
        `;
    }

    renderDateField(name, labelKey) {
        const t = (key, opts) => this._i18n.t(key, opts);
        return html`
            <dbp-date-element
                name="${name}"
                lang="${this.lang}"
                label="${t(labelKey)}"
                .value="${this.getValue(name)}"></dbp-date-element>
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

    renderEnumField(name, labelKey, items, options = {}) {
        const t = (key, opts) => this._i18n.t(key, opts);
        const value = options.multiple ? this.getArrayValue(name) : String(this.getValue(name));
        return html`
            <dbp-enum-element
                name="${name}"
                lang="${this.lang}"
                label="${t(labelKey)}"
                .items="${items}"
                .value="${value}"
                ?multiple="${options.multiple}"
                display-mode="${options.displayMode || 'dropdown'}"></dbp-enum-element>
        `;
    }

    render() {
        const t = (key, opts) => this._i18n.t(key, opts);
        keepCompanyFormTranslations(t);
        const countryItems = createItems(COUNTRY_KEYS, 'country', t);
        const partnerTypeItems = createItems(PARTNER_TYPE_KEYS, 'partner-type', t);
        const partnerCompanyCategoryItems = createItems(
            PARTNER_COMPANY_CATEGORY_KEYS,
            'partner-company-category',
            t,
        );
        const industryItems = createItems(INDUSTRY_KEYS, 'industry', t);
        const fieldOfStudyItems = createItems(FIELD_OF_STUDY_KEYS, 'field-of-study', t);

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
                    <div class="two-column-row">
                        ${this.renderStringField('quellen_id', 'company-form.field-source-id')}
                        ${this.renderNumberField('sort_order', 'company-form.field-sort-order')}
                    </div>
                </section>

                <section class="form-section">
                    <h3>${t('company-form.section-address-contact')}</h3>
                    <hr />
                    ${this.renderStringField('adresse', 'company-form.field-address', {rows: 4})}
                    <div class="two-column-row compact-left">
                        ${this.renderStringField('plz', 'company-form.field-postal-code')}
                        ${this.renderStringField('ort', 'company-form.field-city')}
                    </div>
                    ${this.renderEnumField('staat', 'company-form.field-country', countryItems)}
                    ${this.renderStringField('kontaktperson', 'company-form.field-contact-person', {
                        rows: 2,
                    })}
                    ${this.renderStringField(
                        'kontaktperson_anmerkung',
                        'company-form.field-billing',
                        {
                            rows: 4,
                        },
                    )}
                    ${this.renderStringField('telefonnummer', 'company-form.field-phone-number', {
                        rows: 2,
                    })}
                    ${this.renderStringField('email', 'company-form.field-email')}
                    ${this.renderStringField('url', 'company-form.field-url', {
                        placeholderKey: 'company-form.field-url-placeholder',
                    })}
                </section>

                <section class="form-section">
                    <h3>${t('company-form.section-partnership')}</h3>
                    <hr />
                    ${this.renderEnumField(
                        'typ',
                        'company-form.field-partner-type',
                        partnerTypeItems,
                    )}
                    <div class="two-column-row">
                        ${this.renderDateField('partner_von', 'company-form.field-partner-from')}
                        ${this.renderDateField('partner_bis', 'company-form.field-partner-until')}
                    </div>
                    ${this.renderStringField(
                        'partnertyp_text',
                        'company-form.field-partner-type-text',
                        {
                            rows: 3,
                        },
                    )}
                    ${this.renderStringField(
                        'institutsnennung',
                        'company-form.field-institute-mention',
                        {
                            rows: 3,
                        },
                    )}
                    ${this.renderBooleanField('stammkunde', 'company-form.field-regular-customer')}
                </section>

                <section class="form-section">
                    <h3>${t('company-form.section-company-profile')}</h3>
                    <hr />
                    ${this.renderStringField('mini_teaser', 'company-form.field-mini-teaser', {
                        rows: 3,
                    })}
                    ${this.renderStringField('teaser', 'company-form.field-teaser', {rows: 3})}
                    ${this.renderStringField('beschreibung', 'company-form.field-description', {
                        rows: 10,
                    })}
                    ${this.renderStringField('produkte', 'company-form.field-products', {rows: 5})}
                    ${this.renderStringField('standorte', 'company-form.field-locations', {
                        rows: 5,
                    })}
                    ${this.renderStringField(
                        'mitarbeiter_national',
                        'company-form.field-employees-national',
                        {
                            rows: 3,
                        },
                    )}
                    ${this.renderStringField(
                        'mitarbeiter_gesamt',
                        'company-form.field-employees-total',
                        {
                            rows: 3,
                        },
                    )}
                    ${this.renderStringField(
                        'fe_beschaeftigte',
                        'company-form.field-rd-employees',
                        {
                            rows: 3,
                        },
                    )}
                    ${this.renderStringField(
                        'kontakt_firmenprofil',
                        'company-form.field-company-profile-contact',
                        {
                            rows: 10,
                        },
                    )}
                </section>

                <section class="form-section">
                    <h3>${t('company-form.section-relations')}</h3>
                    <hr />
                    ${this.renderEnumField(
                        'relation_partner_branchen',
                        'company-form.field-linked-industries',
                        industryItems,
                        {multiple: true, displayMode: 'tags'},
                    )}
                    ${this.renderEnumField(
                        'relation_partner_fachrichtungen',
                        'company-form.field-linked-fields-of-study',
                        fieldOfStudyItems,
                        {multiple: true, displayMode: 'tags'},
                    )}
                </section>

                <section class="form-section">
                    <h3>${t('company-form.section-partner-company')}</h3>
                    <hr />
                    ${this.renderBooleanField(
                        'partnerunternehmen',
                        'company-form.field-show-partner-company',
                    )}
                    ${this.renderEnumField(
                        'partnerunternehmen_typ',
                        'company-form.field-partner-company-category',
                        partnerCompanyCategoryItems,
                    )}
                    ${this.renderBooleanField(
                        'foerderer_auslandsstip',
                        'company-form.field-supporter-international-scholarship',
                    )}
                    ${this.renderNumberField(
                        'foerderer_auslandsstip_year',
                        'company-form.field-supporter-international-scholarship-year',
                    )}
                    ${this.renderBooleanField(
                        'foerderer_tugrazstip',
                        'company-form.field-supporter-tu-graz-scholarship',
                    )}
                    ${this.renderNumberField(
                        'foerderer_tugrazstip_year',
                        'company-form.field-supporter-tu-graz-scholarship-year',
                    )}
                    ${this.renderBooleanField(
                        'hs_link_anzeigen',
                        'company-form.field-show-infrastructure-link',
                    )}
                    ${this.renderStringField('hs_link', 'company-form.field-infrastructure-link', {
                        placeholderKey: 'company-form.field-url-placeholder',
                    })}
                    ${this.renderStringField(
                        'hs_link_name',
                        'company-form.field-infrastructure-link-name',
                    )}
                    ${this.renderBooleanField(
                        'profil_link_anzeigen',
                        'company-form.field-show-profile-link',
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
