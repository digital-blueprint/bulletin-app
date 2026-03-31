import {BaseFormElement, BaseObject} from '../../vendor/formalize/src/form/base-object.js';
import {css, html} from 'lit';
import {DbpStringElement, DbpDateElement, DbpEnumElement} from '@dbp-toolkit/form-elements';
import {SUBMISSION_STATES_BINARY} from '../../vendor/formalize/src/utils.js';
import {
    ScopedElementsMixin,
    Button,
    Icon,
    MiniSpinner,
    sendNotification,
} from '@dbp-toolkit/common';
import * as commonStyles from '@dbp-toolkit/common/styles';
import DBPLitElement from '@dbp-toolkit/common/dbp-lit-element';
import {apiCreateForm} from '../../vendor/formalize/src/manage-forms-api.js';
import {createInstance} from '../i18n.js';

const i18n = createInstance();

export default class extends BaseObject {
    getUrlSlug() {
        return 'job-offer';
    }

    /**
     * @returns {typeof BaseFormElement}
     */
    getFormComponent() {
        return JobOfferFormElement;
    }

    /**
     * Returns the web component class used for creating a new job-offer form.
     * This component renders the creation form and handles the API call internally.
     *
     * @returns {typeof JobOfferCreateFormElement}
     */
    getCreateFormComponent() {
        return JobOfferCreateFormElement;
    }

    getFormIdentifier() {
        // This UUID identifies the form in the API; the frontendKey 'job-offer' is used for filtering via allow-list-frontend-keys
        return '7432af11-6f1c-45ee-8aa3-e90b3395e29c';
    }

    getFormFrontendKey() {
        return 'job-offer';
    }

    getFormName(lang = i18n.language) {
        i18n.changeLanguage(lang);
        return i18n.t('manage-job-offers.form-type-name');
    }
}

/**
 * Web component for creating a new job-offer form.
 *
 * Renders form fields for Title, Description, and Headline 1-5 in both German
 * (mandatory) and English (optional). Handles the API call to create the form
 * via apiCreateForm and dispatches a `dbp-create-form-created` event on success.
 */
class JobOfferCreateFormElement extends ScopedElementsMixin(DBPLitElement) {
    static get scopedElements() {
        return {
            'dbp-string-element': DbpStringElement,
            'dbp-icon': Icon,
            'dbp-mini-spinner': MiniSpinner,
        };
    }

    constructor() {
        super();
        this._i18n = createInstance();
        this.lang = this._i18n.language;
        this.auth = {};
        this.entryPointUrl = '';

        // German fields (mandatory)
        this._titleDe = '';
        this._descriptionDe = '';
        this._headline1De = '';
        this._headline2De = '';
        this._headline3De = '';
        this._headline4De = '';
        this._headline5De = '';

        // English fields (optional)
        this._titleEn = '';
        this._descriptionEn = '';
        this._headline1En = '';
        this._headline2En = '';
        this._headline3En = '';
        this._headline4En = '';
        this._headline5En = '';

        this._isSubmitting = false;
    }

    static get properties() {
        return {
            ...super.properties,
            lang: {type: String},
            auth: {type: Object},
            entryPointUrl: {type: String, attribute: 'entry-point-url'},
            _titleDe: {state: true},
            _descriptionDe: {state: true},
            _headline1De: {state: true},
            _headline2De: {state: true},
            _headline3De: {state: true},
            _headline4De: {state: true},
            _headline5De: {state: true},
            _titleEn: {state: true},
            _descriptionEn: {state: true},
            _headline1En: {state: true},
            _headline2En: {state: true},
            _headline3En: {state: true},
            _headline4En: {state: true},
            _headline5En: {state: true},
            _isSubmitting: {state: true},
        };
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            if (propName === 'lang') {
                this._i18n.changeLanguage(this.lang);
            }
        });
        super.update(changedProperties);
    }

    /**
     * Returns true when all mandatory German fields are filled.
     * @returns {boolean}
     */
    get _isFormValid() {
        return this._titleDe.trim() !== '' && this._descriptionDe.trim() !== '';
    }

    /** Resets all form fields to empty defaults. */
    resetForm() {
        this._titleDe = '';
        this._descriptionDe = '';
        this._headline1De = '';
        this._headline2De = '';
        this._headline3De = '';
        this._headline4De = '';
        this._headline5De = '';
        this._titleEn = '';
        this._descriptionEn = '';
        this._headline1En = '';
        this._headline2En = '';
        this._headline3En = '';
        this._headline4En = '';
        this._headline5En = '';
        this._isSubmitting = false;
    }

    /**
     * Builds the form payload and calls apiCreateForm.
     * On success dispatches `dbp-create-form-created`, on failure shows error notification.
     */
    async submit() {
        const t = (key, opts) => this._i18n.t(key, opts);

        if (!this._isFormValid) {
            sendNotification({
                summary: t('create-job-offer.error-title'),
                body: t('create-job-offer.validation-german-required'),
                type: 'warning',
                timeout: 5,
                targetNotificationId: 'create-form-dialog-notification',
            });
            return null;
        }

        this._isSubmitting = true;

        // Use the German title as the default form name
        const name = this._titleDe.trim();

        const additionalData = {
            titleDe: this._titleDe.trim(),
            descriptionDe: this._descriptionDe.trim(),
            headline1De: this._headline1De.trim(),
            headline2De: this._headline2De.trim(),
            headline3De: this._headline3De.trim(),
            headline4De: this._headline4De.trim(),
            headline5De: this._headline5De.trim(),
            titleEn: this._titleEn.trim(),
            descriptionEn: this._descriptionEn.trim(),
            headline1En: this._headline1En.trim(),
            headline2En: this._headline2En.trim(),
            headline3En: this._headline3En.trim(),
            headline4En: this._headline4En.trim(),
            headline5En: this._headline5En.trim(),
        };

        const formData = {
            name,
            localizedNames: [
                {languageTag: 'de', name: this._titleDe.trim()},
                {languageTag: 'en', name: this._titleEn.trim() || this._titleDe.trim()},
            ],
            frontendKey: 'job-offer',
            additionalData,
        };

        // Build a minimal host object that apiCreateForm expects
        const host = {
            auth: this.auth,
            entryPointUrl: this.entryPointUrl,
            _i18n: this._i18n,
        };

        try {
            const result = await apiCreateForm(host, formData);

            if (result) {
                this.dispatchEvent(
                    new CustomEvent('dbp-create-form-created', {
                        detail: {form: result},
                        bubbles: true,
                        composed: true,
                    }),
                );
                return result;
            }
        } catch (error) {
            console.error('Error creating job offer form:', error);
            sendNotification({
                summary: t('create-job-offer.error-title'),
                body: error.message,
                type: 'danger',
                timeout: 0,
                targetNotificationId: 'create-form-dialog-notification',
            });
        } finally {
            this._isSubmitting = false;
        }

        return null;
    }

    render() {
        const t = (key, opts) => this._i18n.t(key, opts);

        return html`
            <!-- German fields (mandatory) -->
            <h4 class="section-heading">${t('create-job-offer.section-german')}</h4>

            <dbp-string-element
                name="title-de"
                lang="${this.lang}"
                label="${t('create-job-offer.field-title')}"
                .value="${this._titleDe}"
                required
                @change="${(e) => (this._titleDe = e.detail.value)}"></dbp-string-element>

            <dbp-string-element
                name="description-de"
                lang="${this.lang}"
                label="${t('create-job-offer.field-description')}"
                .value="${this._descriptionDe}"
                rows="4"
                required
                @change="${(e) => (this._descriptionDe = e.detail.value)}"></dbp-string-element>

            <dbp-string-element
                name="headline-1-de"
                lang="${this.lang}"
                label="${t('create-job-offer.field-headline-1')}"
                .value="${this._headline1De}"
                @change="${(e) => (this._headline1De = e.detail.value)}"></dbp-string-element>

            <dbp-string-element
                name="headline-2-de"
                lang="${this.lang}"
                label="${t('create-job-offer.field-headline-2')}"
                .value="${this._headline2De}"
                @change="${(e) => (this._headline2De = e.detail.value)}"></dbp-string-element>

            <dbp-string-element
                name="headline-3-de"
                lang="${this.lang}"
                label="${t('create-job-offer.field-headline-3')}"
                .value="${this._headline3De}"
                @change="${(e) => (this._headline3De = e.detail.value)}"></dbp-string-element>

            <dbp-string-element
                name="headline-4-de"
                lang="${this.lang}"
                label="${t('create-job-offer.field-headline-4')}"
                .value="${this._headline4De}"
                @change="${(e) => (this._headline4De = e.detail.value)}"></dbp-string-element>

            <dbp-string-element
                name="headline-5-de"
                lang="${this.lang}"
                label="${t('create-job-offer.field-headline-5')}"
                .value="${this._headline5De}"
                @change="${(e) => (this._headline5De = e.detail.value)}"></dbp-string-element>

            <!-- English fields (optional) -->
            <h4 class="section-heading">${t('create-job-offer.section-english')}</h4>

            <dbp-string-element
                name="title-en"
                lang="${this.lang}"
                label="${t('create-job-offer.field-title')}"
                .value="${this._titleEn}"
                @change="${(e) => (this._titleEn = e.detail.value)}"></dbp-string-element>

            <dbp-string-element
                name="description-en"
                lang="${this.lang}"
                label="${t('create-job-offer.field-description')}"
                .value="${this._descriptionEn}"
                rows="4"
                @change="${(e) => (this._descriptionEn = e.detail.value)}"></dbp-string-element>

            <dbp-string-element
                name="headline-1-en"
                lang="${this.lang}"
                label="${t('create-job-offer.field-headline-1')}"
                .value="${this._headline1En}"
                @change="${(e) => (this._headline1En = e.detail.value)}"></dbp-string-element>

            <dbp-string-element
                name="headline-2-en"
                lang="${this.lang}"
                label="${t('create-job-offer.field-headline-2')}"
                .value="${this._headline2En}"
                @change="${(e) => (this._headline2En = e.detail.value)}"></dbp-string-element>

            <dbp-string-element
                name="headline-3-en"
                lang="${this.lang}"
                label="${t('create-job-offer.field-headline-3')}"
                .value="${this._headline3En}"
                @change="${(e) => (this._headline3En = e.detail.value)}"></dbp-string-element>

            <dbp-string-element
                name="headline-4-en"
                lang="${this.lang}"
                label="${t('create-job-offer.field-headline-4')}"
                .value="${this._headline4En}"
                @change="${(e) => (this._headline4En = e.detail.value)}"></dbp-string-element>

            <dbp-string-element
                name="headline-5-en"
                lang="${this.lang}"
                label="${t('create-job-offer.field-headline-5')}"
                .value="${this._headline5En}"
                @change="${(e) => (this._headline5En = e.detail.value)}"></dbp-string-element>
        `;
    }

    static get styles() {
        return css`
            ${commonStyles.getThemeCSS()}
            ${commonStyles.getGeneralCSS()}

            :host {
                display: block;
            }

            .section-heading {
                font-size: 1rem;
                font-weight: 700;
                margin: 1.25rem 0 0.75rem;
            }

            /* Vertical spacing between form elements */
            dbp-string-element {
                display: block;
                margin-bottom: 0.75rem;
            }
        `;
    }
}

// Available job types and areas of interest for the enum selects
const JOB_TYPES = {
    'full-time': 'Full-time',
    'part-time': 'Part-time',
    temporary: 'Temporary',
    internship: 'Internship',
    student: 'Student position',
};

const AREAS_OF_INTEREST = {
    engineering: 'Engineering',
    science: 'Science',
    administration: 'Administration',
    teaching: 'Teaching',
    research: 'Research',
    it: 'IT',
    other: 'Other',
};

class JobOfferFormElement extends BaseFormElement {
    constructor() {
        super();
        this.jobTypes = JOB_TYPES;
        this.areasOfInterest = AREAS_OF_INTEREST;
    }

    connectedCallback() {
        super.connectedCallback();

        this.updateComplete.then(() => {
            // Listen for the form submission event dispatched by the base class
            this.addEventListener('DbpFormalizeFormSubmission', async (event) => {
                const data = event.detail;

                const postFormData = new FormData();
                postFormData.append('form', '/formalize/forms/' + this.formIdentifier);
                postFormData.append('dataFeedElement', JSON.stringify(data.formData));
                postFormData.append('submissionState', String(SUBMISSION_STATES_BINARY.SUBMITTED));

                try {
                    const options = {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${this.auth.token}`,
                        },
                        body: postFormData,
                    };
                    const url = `${this.entryPointUrl}/formalize/submissions`;
                    const response = await fetch(url, options);
                    const responseBody = await response.json();

                    if (!response.ok) {
                        sendNotification({
                            summary: 'Error',
                            body: `Failed to submit job offer. Response status: ${response.status}<br>${responseBody.description}`,
                            type: 'danger',
                            timeout: 0,
                        });
                    } else {
                        this.wasSubmissionSuccessful = true;
                    }
                } catch (error) {
                    console.error(error.message);
                    sendNotification({
                        summary: 'Error',
                        body: error.message,
                        type: 'danger',
                        timeout: 0,
                    });
                } finally {
                    if (this.wasSubmissionSuccessful) {
                        sendNotification({
                            summary: 'Success',
                            body: 'Job offer submitted successfully',
                            type: 'success',
                            timeout: 5,
                        });
                    }
                }

                this.saveButtonEnabled = true;
                this.formData = data;
            });
        });
    }

    static get scopedElements() {
        return {
            'dbp-form-string-element': DbpStringElement,
            'dbp-form-date-element': DbpDateElement,
            'dbp-form-enum-element': DbpEnumElement,
            'dbp-button': Button,
            'dbp-icon': Icon,
        };
    }

    render() {
        const data = this.formData || {};

        return html`
            <h2>Job Offer Form</h2>

            <form class="formalize-form">
                <div class="form-header">${this.getButtonRowHtml()}</div>

                <fieldset class="form-section">
                    <legend>Mandatory Data</legend>

                    <dbp-form-string-element
                        subscribe="lang"
                        name="title"
                        label="Job title"
                        .value=${data.title || ''}
                        required></dbp-form-string-element>

                    <dbp-form-date-element
                        subscribe="lang"
                        name="publishedAt"
                        label="Publication date"
                        .value=${data.publishedAt || ''}
                        required></dbp-form-date-element>

                    <dbp-form-date-element
                        subscribe="lang"
                        name="deadline"
                        label="End of publication"
                        .value=${data.deadline || ''}
                        required></dbp-form-date-element>

                    <dbp-form-string-element
                        subscribe="lang"
                        name="description"
                        label="Job description"
                        .value=${data.description || ''}
                        rows="5"
                        required></dbp-form-string-element>
                </fieldset>

                <fieldset class="form-section">
                    <legend>Optional Data</legend>

                    <dbp-form-date-element
                        subscribe="lang"
                        name="startDate"
                        label="Job start date"
                        .value=${data.startDate || ''}></dbp-form-date-element>

                    <dbp-form-string-element
                        subscribe="lang"
                        name="salary"
                        label="Salary per month"
                        .value=${data.salary || ''}></dbp-form-string-element>

                    <dbp-form-string-element
                        subscribe="lang"
                        name="weeklyHours"
                        label="Employment level per week"
                        .value=${data.weeklyHours || ''}></dbp-form-string-element>

                    <dbp-form-enum-element
                        subscribe="lang"
                        name="jobType"
                        label="Job Type"
                        .items=${this.jobTypes}
                        .value=${data.jobType || ''}></dbp-form-enum-element>

                    <dbp-form-enum-element
                        subscribe="lang"
                        name="areaOfInterest"
                        label="Area of interest"
                        .items=${this.areasOfInterest}
                        .value=${data.areaOfInterest || ''}></dbp-form-enum-element>

                    <dbp-form-string-element
                        subscribe="lang"
                        name="linkName"
                        label="Name of an additional link"
                        .value=${data.linkName || ''}></dbp-form-string-element>

                    <dbp-form-string-element
                        subscribe="lang"
                        name="linkUrl"
                        label="Link URL"
                        .customValidator=${(value) => {
                            if (!value) return [];
                            try {
                                new URL(value);
                                return [];
                            } catch {
                                return ['Please enter a valid URL (e.g. https://example.com)'];
                            }
                        }}
                        .value=${data.linkUrl || ''}></dbp-form-string-element>
                </fieldset>
            </form>
            ${this._renderResult(this.formData)}
        `;
    }

    static get styles() {
        // language=css
        return [
            super.styles,
            css`
                .form-section {
                    border: 1px solid var(--dbp-override-muted, #ccc);
                    border-radius: 4px;
                    padding: 1em;
                    margin-top: 1.5em;
                }

                .form-section legend {
                    padding: 0 0.5em;
                    font-weight: bold;
                }
            `,
        ];
    }

    /**
     * Renders the submitted form data as a JSON preview for debugging.
     * @param {object} data
     * @returns {import('lit').TemplateResult}
     */
    _renderResult(data) {
        if (data && Object.keys(data).length > 0) {
            return html`
                <div class="container">
                    <h2>Form data</h2>
                    <pre>${JSON.stringify(data, null, 2)}</pre>
                </div>
            `;
        }

        return html``;
    }
}
