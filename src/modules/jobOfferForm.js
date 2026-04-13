import {BaseFormElement, BaseObject} from '../../vendor/formalize/src/form/base-object.js';
import {css, html} from 'lit';
import {createRef, ref} from 'lit/directives/ref.js';
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
     * Returns the web component class used for editing a job-offer form.
     * This component renders the edit form and handles the API call internally.
     *
     * @returns {typeof JobOfferEditFormElement}
     */
    getEditFormComponent() {
        return JobOfferEditFormElement;
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
export const JOB_TYPES = {
    'full-time': 'Full-time',
    'part-time': 'Part-time',
    temporary: 'Temporary',
    internship: 'Internship',
    student: 'Student position',
};

export const AREAS_OF_INTEREST = {
    engineering: 'Engineering',
    science: 'Science',
    administration: 'Administration',
    teaching: 'Teaching',
    research: 'Research',
    it: 'IT',
    other: 'Other',
};

/**
 * Web component for editing a job-offer form (create or update).
 *
 * Renders form fields for all job details that the public job board will display.
 * The job data is stored in the form's additionalData JSON field so that the
 * public view can read it back via GET /formalize/forms.
 *
 * Handles the API call via apiCreateForm (new form) or apiUpdateForm (existing form)
 * and dispatches a `dbp-edit-form-saved` event on success.
 */
class JobOfferEditFormElement extends ScopedElementsMixin(DBPLitElement) {
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
                targetNotificationId: 'edit-form-dialog-notification',
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
                    new CustomEvent('dbp-edit-form-saved', {
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
                targetNotificationId: 'edit-form-dialog-notification',
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

export class JobOfferFormElement extends BaseFormElement {
    constructor() {
        super();
        this.jobTypes = JOB_TYPES;
        this.areasOfInterest = AREAS_OF_INTEREST;

        // Override the formalize i18n instance with the app's own instance so that
        // job-offer-detail.* translation keys are resolved correctly.
        this._i18n = createInstance();
        this.lang = this._i18n.language;

        /** @type {string} The notification target ID used by the parent modal */
        this.notificationTargetId = 'dbp-notification-apply';

        /** @type {import('lit/directives/ref.js').Ref} Ref to the first-name field element */
        this._firstNameRef = createRef();
        /** @type {import('lit/directives/ref.js').Ref} Ref to the last-name field element */
        this._lastNameRef = createRef();
        /** @type {import('lit/directives/ref.js').Ref} Ref to the email field element */
        this._emailRef = createRef();
        /** @type {import('lit/directives/ref.js').Ref} Ref to the message field element */
        this._messageRef = createRef();

        this._isSubmitting = false;
        /** @type {boolean} True after a successful submission or when a prior submission is detected on open */
        this._hasApplied = false;
        /** @type {boolean} True while the prior-submission check is in progress */
        this._checkingApplied = false;
    }

    static get properties() {
        return {
            ...super.properties,
            notificationTargetId: {type: String, attribute: 'notification-target-id'},
            _isSubmitting: {state: true},
            _hasApplied: {state: true},
            _checkingApplied: {state: true},
        };
    }

    async update(changedProperties) {
        await super.update(changedProperties);

        // Re-run the prior-submission check whenever the form identifier or auth token changes
        if (changedProperties.has('formIdentifier') || changedProperties.has('auth')) {
            if (this.formIdentifier && this.auth?.token) {
                this._checkAlreadyApplied();
            }
        }
    }

    /**
     * Fetches the current user's submissions for this form from the formalize API.
     * Sets _hasApplied to true if at least one submission is found.
     */
    async _checkAlreadyApplied() {
        const userId = this.auth?.['user-id'];
        if (!userId || !this.formIdentifier || !this.entryPointUrl) {
            return;
        }

        this._checkingApplied = true;

        try {
            const url =
                `${this.entryPointUrl}/formalize/submissions` +
                `?formIdentifier=${encodeURIComponent(this.formIdentifier)}` +
                `&perPage=1` +
                `&creatorIdEquals=${encodeURIComponent(userId)}`;

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${this.auth.token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                const members = data['hydra:member'] ?? [];
                if (members.length > 0) {
                    this._hasApplied = true;
                }
            }
        } catch (error) {
            // Non-fatal: if the check fails we simply show the form as normal
            console.error('Error checking prior application:', error);
        } finally {
            this._checkingApplied = false;
        }
    }

    connectedCallback() {
        super.connectedCallback();

        this.updateComplete.then(() => {
            // Listen for the form submission event dispatched by sendSubmission() in base class
            this.addEventListener('DbpFormalizeFormSubmission', async (event) => {
                await this._handleSubmission(event.detail);
            });
        });
    }

    /**
     * Clears all inline validation errors from the application form fields.
     */
    _clearFormErrors() {
        const fields = [
            this._firstNameRef.value,
            this._lastNameRef.value,
            this._emailRef.value,
            this._messageRef.value,
        ];
        fields.filter(Boolean).forEach((field) => {
            field.errorMessages = [];
        });
    }

    /**
     * Calls handleErrors() on every form field to reveal inline validation messages.
     * Returns true only when all fields pass validation.
     * @returns {boolean}
     */
    _validateApplicationForm() {
        const fields = [
            this._firstNameRef.value,
            this._lastNameRef.value,
            this._emailRef.value,
            this._messageRef.value,
        ];
        return fields
            .filter(Boolean)
            .map((field) => field.handleErrors())
            .every(Boolean);
    }

    /**
     * Returns a customValidator function for the email field.
     * @returns {Function}
     */
    get _emailValidator() {
        const i18n = this._i18n;
        return (value) => {
            if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                return [i18n.t('job-offer-detail.email-invalid')];
            }
            return [];
        };
    }

    /**
     * Returns a customValidator function for the message field that enforces a 50-character minimum.
     * @returns {Function}
     */
    get _messageValidator() {
        const i18n = this._i18n;
        return (value) => {
            if (value && value.length < 50) {
                return [i18n.t('job-offer-detail.message-min-length', {current: value.length})];
            }
            return [];
        };
    }

    /**
     * Handles the application form submission triggered by the native form submit event.
     * Validates inline, then delegates to sendSubmission() from the base class which
     * gathers form data and dispatches DbpFormalizeFormSubmission.
     * @param {Event} e
     */
    async _onApplySubmit(e) {
        e.preventDefault();

        if (!this.formIdentifier || !this.entryPointUrl || !this.auth?.token) {
            return;
        }

        if (!this._validateApplicationForm()) {
            return;
        }

        // Collect person_id from auth if available and inject it as a hidden value
        // so sendSubmission() includes it via gatherFormDataFromElement
        this._isSubmitting = true;
        this.saveButtonEnabled = false;

        // Build submission data manually from the ref'd fields since these are
        // custom web-component fields not part of the BaseFormElement form element tree.
        const submissionData = {
            givenName: this._firstNameRef.value?.value ?? '',
            familyName: this._lastNameRef.value?.value ?? '',
            email: this._emailRef.value?.value ?? '',
            freeText: this._messageRef.value?.value ?? '',
            personIdentifier: this.auth.person_id ?? '',
        };

        await this._handleSubmission({formData: submissionData, submissionId: null});
    }

    /**
     * Posts the submission data to the formalize submissions API.
     * On success dispatches a `dbp-job-offer-applied` event and shows a success notification.
     * On failure shows an error notification.
     * @param {{formData: object, submissionId: string|null}} detail
     */
    async _handleSubmission(detail) {
        const t = (key, opts) => this._i18n.t(key, opts);
        const {formData} = detail;

        const postFormData = new FormData();
        postFormData.append('form', '/formalize/forms/' + this.formIdentifier);
        postFormData.append('dataFeedElement', JSON.stringify(formData));
        postFormData.append('submissionState', String(SUBMISSION_STATES_BINARY.SUBMITTED));

        try {
            const response = await fetch(`${this.entryPointUrl}/formalize/submissions`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${this.auth.token}`,
                },
                body: postFormData,
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                console.error('Failed to submit application:', response.status, errorBody);
                const apiMessage = errorBody.description || errorBody['hydra:description'] || '';
                const body = apiMessage
                    ? `${t('job-offer-detail.notification.submit-error-body')}\n${apiMessage}`
                    : t('job-offer-detail.notification.submit-error-body');
                sendNotification({
                    summary: t('job-offer-detail.notification.submit-error-heading'),
                    body: body,
                    type: 'danger',
                    timeout: 0,
                    replaceId: 'dbp-notification-apply',
                    targetNotificationId: this.notificationTargetId,
                });
                return;
            }

            sendNotification({
                summary: t('job-offer-detail.notification.success-heading'),
                body: t('job-offer-detail.apply-success'),
                icon: 'checkmark',
                type: 'success',
                timeout: 5,
                replaceId: 'dbp-notification-apply',
                targetNotificationId: this.notificationTargetId,
            });

            // Reset the form fields after a successful submission and hide the form
            this._clearFormErrors();
            this._hasApplied = true;

            // Notify the parent component (e.g. the detail modal) that the application was sent
            this.dispatchEvent(
                new CustomEvent('dbp-job-offer-applied', {
                    bubbles: true,
                    composed: true,
                }),
            );
        } catch (error) {
            console.error('Error submitting application:', error);
            sendNotification({
                summary: t('job-offer-detail.notification.submit-error-heading'),
                body: t('job-offer-detail.notification.submit-error-body'),
                type: 'danger',
                timeout: 0,
                replaceId: 'dbp-notification-apply',
                targetNotificationId: this.notificationTargetId,
            });
        } finally {
            this._isSubmitting = false;
            this.saveButtonEnabled = true;
        }
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
        const t = (key, opts) => this._i18n.t(key, opts);

        if (this._checkingApplied) {
            return html`
                <div class="checking-spinner"><dbp-icon name="reload"></dbp-icon></div>
            `;
        }

        if (this._hasApplied) {
            return html`
                <div class="applied-notice">
                    <dbp-icon name="checkmark-circle" class="applied-icon"></dbp-icon>
                    <p class="applied-message">${t('job-offer-detail.already-applied')}</p>
                </div>
            `;
        }

        return html`
            <form class="apply-form" @submit="${this._onApplySubmit}" novalidate>
                <h4 class="apply-heading">${t('job-offer-detail.application-title')}</h4>

                <div class="form-row">
                    <dbp-form-string-element
                        ${ref(this._firstNameRef)}
                        subscribe="lang"
                        name="givenName"
                        label="${t('job-offer-detail.first-name')}"
                        .value="${this.formData?.givenName ?? ''}"
                        required
                        autocomplete="given-name"></dbp-form-string-element>

                    <dbp-form-string-element
                        ${ref(this._lastNameRef)}
                        subscribe="lang"
                        name="familyName"
                        label="${t('job-offer-detail.last-name')}"
                        .value="${this.formData?.familyName ?? ''}"
                        required
                        autocomplete="family-name"></dbp-form-string-element>

                    <dbp-form-string-element
                        ${ref(this._emailRef)}
                        subscribe="lang"
                        name="email"
                        label="${t('job-offer-detail.email')}"
                        .value="${this.formData?.email ?? ''}"
                        type="email"
                        required
                        .customValidator="${this._emailValidator}"
                        autocomplete="email"></dbp-form-string-element>
                </div>

                <dbp-form-string-element
                    ${ref(this._messageRef)}
                    subscribe="lang"
                    name="freeText"
                    label="${t('job-offer-detail.message')}"
                    .value="${this.formData?.freeText ?? ''}"
                    required
                    .customValidator="${this._messageValidator}"
                    rows="4"></dbp-form-string-element>

                <div class="form-footer">
                    <button
                        class="button is-primary"
                        type="submit"
                        ?disabled="${this._isSubmitting}">
                        ${t('job-offer-detail.submit')}
                    </button>
                </div>
            </form>
        `;
    }

    static get styles() {
        // language=css
        return [
            super.styles,
            css`
                ${commonStyles.getButtonCSS()}

                .apply-form {
                    border: var(--dbp-border);
                    border-radius: var(--dbp-border-radius);
                    padding: 1.25rem;
                    margin-top: 1.5rem;
                }

                .apply-heading {
                    font-size: 1.1rem;
                    font-weight: 700;
                    margin: 0 0 1rem 0;
                }

                /* Three-column form row for first name, last name, email */
                .form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 1rem;
                    margin-bottom: 0.75rem;
                }

                @media (max-width: 560px) {
                    .form-row {
                        grid-template-columns: 1fr;
                    }
                }

                .form-row dbp-form-string-element {
                    margin-bottom: 0;
                }

                /* Vertical spacing for the message element */
                .apply-form dbp-form-string-element {
                    display: block;
                    margin-bottom: 0.75rem;
                }

                .form-footer {
                    display: flex;
                    justify-content: flex-end;
                    margin-top: 1rem;
                }

                .checking-spinner {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    margin-top: 1.5rem;
                    color: var(--dbp-muted);
                    font-size: 1.5rem;
                }

                .applied-notice {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    border: var(--dbp-border);
                    border-radius: var(--dbp-border-radius);
                    padding: 1.25rem;
                    margin-top: 1.5rem;
                    color: var(--dbp-success);
                }

                .applied-icon {
                    font-size: 1.75rem;
                    flex-shrink: 0;
                }

                .applied-message {
                    margin: 0;
                    font-size: 1rem;
                }
            `,
        ];
    }
}
