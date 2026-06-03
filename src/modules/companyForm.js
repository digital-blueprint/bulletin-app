import {BaseFormElement, BaseObject} from '../../vendor/formalize/src/form/base-object.js';
import {css, html} from 'lit';
import {DbpStringElement} from '@dbp-toolkit/form-elements';
import * as commonStyles from '@dbp-toolkit/common/styles';
import {createInstance} from '../i18n.js';

const i18n = createInstance();

class CompanyModule extends BaseObject {
    getUrlSlug() {
        return 'company';
    }

    getFormComponent() {
        return CompanyFormElement;
    }

    getFormFrontendKey() {
        return 'company';
    }

    getFormName(lang = i18n.language) {
        i18n.changeLanguage(lang);
        return i18n.t('company-form.form-type-name');
    }

    getItemText(data) {
        return data?.companyName || data?.contactEmail || '';
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
            'dbp-string-element': DbpStringElement,
        };
    }

    getValue(name) {
        return this.formData?.[name] || '';
    }

    render() {
        const t = (key, opts) => this._i18n.t(key, opts);

        return html`
            <form class="formalize-form">
                <p class="required-field-note">${t('company-form.required-field-note')}</p>

                <dbp-string-element
                    name="companyName"
                    lang="${this.lang}"
                    label="${t('company-form.field-company-name')}"
                    .value="${this.getValue('companyName')}"
                    required></dbp-string-element>

                <dbp-string-element
                    name="website"
                    lang="${this.lang}"
                    label="${t('company-form.field-website')}"
                    placeholder="${t('company-form.field-website-placeholder')}"
                    .value="${this.getValue('website')}"></dbp-string-element>

                <dbp-string-element
                    name="industry"
                    lang="${this.lang}"
                    label="${t('company-form.field-industry')}"
                    .value="${this.getValue('industry')}"></dbp-string-element>

                <dbp-string-element
                    name="contactName"
                    lang="${this.lang}"
                    label="${t('company-form.field-contact-name')}"
                    .value="${this.getValue('contactName')}"></dbp-string-element>

                <dbp-string-element
                    name="contactEmail"
                    lang="${this.lang}"
                    label="${t('company-form.field-contact-email')}"
                    .value="${this.getValue('contactEmail')}"
                    required></dbp-string-element>

                <dbp-string-element
                    name="contactPhone"
                    lang="${this.lang}"
                    label="${t('company-form.field-contact-phone')}"
                    .value="${this.getValue('contactPhone')}"></dbp-string-element>

                <dbp-string-element
                    name="address"
                    lang="${this.lang}"
                    label="${t('company-form.field-address')}"
                    rows="3"
                    .value="${this.getValue('address')}"></dbp-string-element>

                <dbp-string-element
                    name="notes"
                    lang="${this.lang}"
                    label="${t('company-form.field-notes')}"
                    rows="4"
                    .value="${this.getValue('notes')}"></dbp-string-element>
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
                color: var(--dbp-muted);
                font-size: 0.875rem;
                margin: 0 0 0.75rem;
            }
        `;
    }
}
