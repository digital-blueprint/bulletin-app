import {BaseFormElement, BaseObject} from '../../vendor/formalize/src/form/base-object.js';
import {css, html} from 'lit';
import {DbpStringElement, DbpDateElement, DbpEnumElement} from '@dbp-toolkit/form-elements';
import {SUBMISSION_STATES_BINARY} from '../../vendor/formalize/src/utils.js';
import {Button, Icon, sendNotification} from '@dbp-toolkit/common';
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

    /**
     * Creates a new job-offer form via POST /formalize/forms.
     *
     * @param {object} host - A component instance with auth.token, entryPointUrl, and _i18n.
     * @param {object} options
     * @param {string} options.name - Default form name.
     * @param {string} options.nameEn - English localized name.
     * @param {string} options.nameDe - German localized name.
     * @param {string} [options.description] - Optional form description.
     * @returns {Promise<object|null>} The created form object, or null on failure.
     */
    async createForm(host, {name, nameEn, nameDe, description}) {
        const formData = {
            name,
            localizedNames: [
                {languageTag: 'en', name: nameEn},
                {languageTag: 'de', name: nameDe},
            ],
            frontendKey: 'job-offer',
        };

        if (description) {
            formData.additionalData = {description};
        }

        return apiCreateForm(host, formData);
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
