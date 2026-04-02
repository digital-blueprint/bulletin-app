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
import {apiCreateForm, apiUpdateForm} from '../../vendor/formalize/src/manage-forms-api.js';
import {createInstance} from '../i18n.js';

const i18n = createInstance();

class JobOfferModule extends BaseObject {
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

    getFormFrontendKey() {
        return 'job-offer';
    }

    getFormName(lang = i18n.language) {
        i18n.changeLanguage(lang);
        return i18n.t('manage-job-offers.form-type-name');
    }
}

export default JobOfferModule;

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

/**
 * Web component for creating a new job-offer form.
 *
 * Renders form fields for all job details that the public job board will display.
 * The job data is stored in the form's additionalData JSON field so that the
 * public view can read it back via GET /formalize/forms.
 *
 * Handles the API call to create the form via apiCreateForm and dispatches a
 * `dbp-create-form-created` event on success.
 */
class JobOfferCreateFormElement extends ScopedElementsMixin(DBPLitElement) {
    static get scopedElements() {
        return {
            'dbp-string-element': DbpStringElement,
            'dbp-date-element': DbpDateElement,
            'dbp-enum-element': DbpEnumElement,
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

        /**
         * When set by the parent dialog, the component operates in edit mode.
         * Shape: { formId, formSlug, formName, moduleInstance, additionalData, localizedNames }
         * @type {object|null}
         */
        this.existingForm = null;

        // Mandatory job detail fields
        this._title = '';
        this._description = '';
        this._publishedAt = '';
        this._deadline = '';
        this._organization = '';

        // Optional job detail fields
        this._startDate = '';
        this._weeklyHours = '';
        this._salary = '';
        this._jobType = '';
        this._areaOfInterest = '';
        this._linkName = '';
        this._linkUrl = '';
        /** @type {string} Newline-separated list of requirements entered by the user */
        this._requirementsText = '';

        // Optional English translations of text fields
        this._titleEn = '';
        this._descriptionEn = '';
        this._organizationEn = '';
        /** @type {string} Newline-separated list of requirements in English entered by the user */
        this._requirementsTextEn = '';

        this._isSubmitting = false;
    }

    static get properties() {
        return {
            ...super.properties,
            lang: {type: String},
            auth: {type: Object},
            entryPointUrl: {type: String, attribute: 'entry-point-url'},
            existingForm: {type: Object, attribute: false},
            _title: {state: true},
            _description: {state: true},
            _publishedAt: {state: true},
            _deadline: {state: true},
            _organization: {state: true},
            _startDate: {state: true},
            _weeklyHours: {state: true},
            _salary: {state: true},
            _jobType: {state: true},
            _areaOfInterest: {state: true},
            _linkName: {state: true},
            _linkUrl: {state: true},
            _requirementsText: {state: true},
            _titleEn: {state: true},
            _descriptionEn: {state: true},
            _organizationEn: {state: true},
            _requirementsTextEn: {state: true},
            _isSubmitting: {state: true},
        };
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            if (propName === 'lang') {
                this._i18n.changeLanguage(this.lang);
            }

            // Pre-populate form fields when an existing form is provided for editing
            if (propName === 'existingForm' && this.existingForm) {
                const d = this.existingForm.additionalData || {};
                this._title = d.title || '';
                this._description = d.description || '';
                this._publishedAt = d.publishedAt || '';
                this._deadline = d.deadline || '';
                this._organization = d.organization || '';
                this._startDate = d.startDate || '';
                this._weeklyHours = d.weeklyHours || '';
                this._salary = d.salary || '';
                this._jobType = d.jobType || '';
                this._areaOfInterest = d.areaOfInterest || '';
                this._linkName = d.linkName || '';
                this._linkUrl = d.linkUrl || '';
                this._requirementsText = Array.isArray(d.requirements)
                    ? d.requirements.join('\n')
                    : '';
                this._titleEn = d.titleEn || '';
                this._descriptionEn = d.descriptionEn || '';
                this._organizationEn = d.organizationEn || '';
                this._requirementsTextEn = Array.isArray(d.requirementsEn)
                    ? d.requirementsEn.join('\n')
                    : '';
            }
        });
        super.update(changedProperties);
    }

    /**
     * Returns true when all mandatory fields are filled.
     * @returns {boolean}
     */
    get _isFormValid() {
        return (
            this._title.trim() !== '' &&
            this._description.trim() !== '' &&
            this._publishedAt.trim() !== '' &&
            this._deadline.trim() !== '' &&
            this._organization.trim() !== ''
        );
    }

    /** Resets all form fields to empty defaults. */
    resetForm() {
        this._title = '';
        this._description = '';
        this._publishedAt = '';
        this._deadline = '';
        this._organization = '';
        this._startDate = '';
        this._weeklyHours = '';
        this._salary = '';
        this._jobType = '';
        this._areaOfInterest = '';
        this._linkName = '';
        this._linkUrl = '';
        this._requirementsText = '';
        this._titleEn = '';
        this._descriptionEn = '';
        this._organizationEn = '';
        this._requirementsTextEn = '';
        this._isSubmitting = false;
    }

    /**
     * Splits the requirements text area into a trimmed array of non-empty lines.
     * @returns {string[]}
     */
    _parseRequirements() {
        return this._requirementsText
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);
    }

    /**
     * Splits the English requirements text area into a trimmed array of non-empty lines.
     * @returns {string[]}
     */
    _parseRequirementsEn() {
        return this._requirementsTextEn
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);
    }

    /**
     * Builds the form payload and calls apiCreateForm or apiUpdateForm depending on mode.
     * On success dispatches a form event, on failure shows an error notification.
     */
    async submit() {
        const t = (key, opts) => this._i18n.t(key, opts);
        const isEditMode = this.existingForm !== null && this.existingForm !== undefined;

        if (!this._isFormValid) {
            sendNotification({
                summary: t('create-job-offer.error-title'),
                body: t('create-job-offer.validation-required'),
                type: 'warning',
                timeout: 5,
                targetNotificationId: 'create-form-dialog-notification',
            });
            return null;
        }

        this._isSubmitting = true;

        // JSON Schema for validating job application submissions
        const dataFeedSchema = JSON.stringify({
            title: 'JobApplication',
            type: 'object',
            additionalProperties: false,
            properties: {
                givenName: {
                    type: 'string',
                    minLength: 1,
                    description: "Applicant's given (first) name.",
                },
                familyName: {
                    type: 'string',
                    minLength: 1,
                    description: "Applicant's family (last) name.",
                },
                email: {
                    type: 'string',
                    minLength: 1,
                    format: 'email',
                    description: "Applicant's email address.",
                },
                title: {
                    type: 'string',
                    description: "Applicant's title.",
                },
                personIdentifier: {
                    type: 'string',
                    description: 'The UID of the person',
                },
                freeText: {
                    type: 'string',
                    description: 'Free-text message or cover letter.',
                },
            },
            required: ['givenName', 'familyName', 'personIdentifier', 'email'],
        });

        // All job detail fields are stored in the form's additionalData JSON field
        // so the public view can read them back via GET /formalize/forms.
        // English fields are optional; only stored when non-empty.
        const additionalData = {
            title: this._title.trim(),
            description: this._description.trim(),
            publishedAt: this._publishedAt.trim(),
            deadline: this._deadline.trim(),
            organization: this._organization.trim(),
            startDate: this._startDate.trim(),
            weeklyHours: this._weeklyHours.trim(),
            salary: this._salary.trim(),
            jobType: this._jobType,
            areaOfInterest: this._areaOfInterest,
            linkName: this._linkName.trim(),
            linkUrl: this._linkUrl.trim(),
            requirements: this._parseRequirements(),
            titleEn: this._titleEn.trim(),
            descriptionEn: this._descriptionEn.trim(),
            organizationEn: this._organizationEn.trim(),
            requirementsEn: this._parseRequirementsEn(),
        };

        // Use the English title for the 'en' localizedName when provided, otherwise fall back to the primary title
        const titleEn = this._titleEn.trim() || this._title.trim();
        const formData = {
            name: this._title.trim(),
            localizedNames: [
                {languageTag: 'de', name: this._title.trim()},
                {languageTag: 'en', name: titleEn},
            ],
            frontendKey: new JobOfferModule().getFormFrontendKey(),
            additionalData,
            dataFeedSchema,
        };

        // Build a minimal host object that apiCreateForm / apiUpdateForm expect
        const host = {
            auth: this.auth,
            entryPointUrl: this.entryPointUrl,
            _i18n: this._i18n,
        };

        try {
            let result;
            if (isEditMode) {
                result = await apiUpdateForm(host, this.existingForm.formId, formData);
            } else {
                result = await apiCreateForm(host, formData);
            }

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
            console.error('Error saving job offer form:', error);
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
            <!-- Mandatory fields -->
            <h4 class="section-heading">${t('manage-job-offers.section-mandatory')}</h4>

            <dbp-string-element
                name="title"
                lang="${this.lang}"
                label="${t('manage-job-offers.field-job-title')}"
                .value="${this._title}"
                required
                @change="${(e) => (this._title = e.detail.value)}"></dbp-string-element>

            <dbp-string-element
                name="description"
                lang="${this.lang}"
                label="${t('manage-job-offers.field-description')}"
                placeholder="${t('manage-job-offers.field-description-placeholder')}"
                .value="${this._description}"
                rows="5"
                required
                @change="${(e) => (this._description = e.detail.value)}"></dbp-string-element>

            <dbp-date-element
                name="published-at"
                lang="${this.lang}"
                label="${t('manage-job-offers.field-published-at')}"
                .value="${this._publishedAt}"
                required
                @change="${(e) => (this._publishedAt = e.detail.value)}"></dbp-date-element>

            <dbp-date-element
                name="deadline"
                lang="${this.lang}"
                label="${t('manage-job-offers.field-deadline')}"
                .value="${this._deadline}"
                required
                @change="${(e) => (this._deadline = e.detail.value)}"></dbp-date-element>

            <dbp-string-element
                name="organization"
                lang="${this.lang}"
                label="${t('manage-job-offers.field-organization')}"
                .value="${this._organization}"
                required
                @change="${(e) => (this._organization = e.detail.value)}"></dbp-string-element>

            <!-- Optional fields -->
            <h4 class="section-heading">${t('manage-job-offers.section-optional')}</h4>

            <dbp-date-element
                name="start-date"
                lang="${this.lang}"
                label="${t('manage-job-offers.field-start-date')}"
                .value="${this._startDate}"
                @change="${(e) => (this._startDate = e.detail.value)}"></dbp-date-element>

            <dbp-string-element
                name="weekly-hours"
                lang="${this.lang}"
                label="${t('manage-job-offers.field-weekly-hours')}"
                .value="${this._weeklyHours}"
                @change="${(e) => (this._weeklyHours = e.detail.value)}"></dbp-string-element>

            <dbp-string-element
                name="salary"
                lang="${this.lang}"
                label="${t('manage-job-offers.field-salary')}"
                .value="${this._salary}"
                @change="${(e) => (this._salary = e.detail.value)}"></dbp-string-element>

            <dbp-enum-element
                name="job-type"
                lang="${this.lang}"
                label="${t('manage-job-offers.field-job-type')}"
                .items="${JOB_TYPES}"
                .value="${this._jobType}"
                @change="${(e) => (this._jobType = e.detail.value)}"></dbp-enum-element>

            <dbp-enum-element
                name="area-of-interest"
                lang="${this.lang}"
                label="${t('manage-job-offers.field-area-of-interest')}"
                .items="${AREAS_OF_INTEREST}"
                .value="${this._areaOfInterest}"
                @change="${(e) => (this._areaOfInterest = e.detail.value)}"></dbp-enum-element>

            <dbp-string-element
                name="requirements"
                lang="${this.lang}"
                label="${t('manage-job-offers.field-requirements')}"
                .value="${this._requirementsText}"
                rows="4"
                @change="${(e) => (this._requirementsText = e.detail.value)}"></dbp-string-element>

            <dbp-string-element
                name="link-name"
                lang="${this.lang}"
                label="${t('manage-job-offers.field-link-name')}"
                placeholder="${t('manage-job-offers.field-link-name-placeholder')}"
                .value="${this._linkName}"
                @change="${(e) => (this._linkName = e.detail.value)}"></dbp-string-element>

            <dbp-string-element
                name="link-url"
                lang="${this.lang}"
                label="${t('manage-job-offers.field-link-url')}"
                placeholder="${t('manage-job-offers.field-link-url-placeholder')}"
                .value="${this._linkUrl}"
                @change="${(e) => (this._linkUrl = e.detail.value)}"></dbp-string-element>

            <!-- English texts (optional) -->
            <h4 class="section-heading">${t('manage-job-offers.section-english')}</h4>

            <dbp-string-element
                name="title-en"
                lang="${this.lang}"
                label="${t('manage-job-offers.field-job-title-en')}"
                .value="${this._titleEn}"
                @change="${(e) => (this._titleEn = e.detail.value)}"></dbp-string-element>

            <dbp-string-element
                name="description-en"
                lang="${this.lang}"
                label="${t('manage-job-offers.field-description-en')}"
                .value="${this._descriptionEn}"
                rows="5"
                @change="${(e) => (this._descriptionEn = e.detail.value)}"></dbp-string-element>

            <dbp-string-element
                name="organization-en"
                lang="${this.lang}"
                label="${t('manage-job-offers.field-organization-en')}"
                .value="${this._organizationEn}"
                @change="${(e) => (this._organizationEn = e.detail.value)}"></dbp-string-element>

            <dbp-string-element
                name="requirements-en"
                lang="${this.lang}"
                label="${t('manage-job-offers.field-requirements-en')}"
                .value="${this._requirementsTextEn}"
                rows="4"
                @change="${(e) =>
                    (this._requirementsTextEn = e.detail.value)}"></dbp-string-element>
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
            dbp-string-element,
            dbp-date-element,
            dbp-enum-element {
                display: block;
                margin-bottom: 0.75rem;
            }
        `;
    }
}

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
