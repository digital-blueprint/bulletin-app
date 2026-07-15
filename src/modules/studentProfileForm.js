import {BaseFormElement, BaseObject} from '../../vendor/formalize/src/form/base-object.js';
import {SUBMISSION_STATES_BINARY} from '../../vendor/formalize/src/utils.js';
import {css, html} from 'lit';
import {DbpDateElement, DbpStringElement} from '@dbp-toolkit/form-elements';
import {
    Button,
    Icon,
    MiniSpinner,
    ScopedElementsMixin,
    sendNotification,
} from '@dbp-toolkit/common';
import * as commonStyles from '@dbp-toolkit/common/styles';
import DBPLitElement from '@dbp-toolkit/common/dbp-lit-element';
import {setOverridesByGlobalCache} from '@dbp-toolkit/common/i18next.js';
import {createInstance} from '../i18n.js';
import WorkLocationsElement, {normalizeWorkLocations} from './workLocationsElement.js';

const i18n = createInstance();
const STUDENT_PROFILE_FRONTEND_KEY = 'student-profile';
const STUDENT_PROFILE_DESCRIPTION_MAX_LENGTH = 2500;

const parseMultilineList = (value) =>
    String(value ?? '')
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);

const normalizeMultilineValue = (value) => (Array.isArray(value) ? value.join('\n') : value || '');

export const normalizeStudentStudies = (localData) => {
    const value =
        localData.studies ??
        localData.studyProgram ??
        localData.studyPrograms ??
        localData.curriculum ??
        localData.curricula ??
        localData.degreeProgram ??
        localData.degreePrograms ??
        '';

    if (Array.isArray(value)) {
        return value
            .map((item) => {
                if (typeof item === 'object' && item !== null) {
                    return {
                        ...item,
                        name: item.name ?? item.title ?? item.identifier ?? '',
                    };
                }

                return {name: String(item ?? '')};
            })
            .filter((item) => item.name);
    }

    if (typeof value === 'object' && value !== null) {
        const name = value.name ?? value.title ?? value.identifier ?? '';
        return name ? [{...value, name}] : [];
    }

    const name = String(value ?? '');
    return name ? [{name}] : [];
};

export const formatStudentStudies = (localData) => {
    return normalizeStudentStudies(localData)
        .map((study) => study.name)
        .join(', ');
};

const isValidWebsiteUrl = (value) => {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
        return true;
    }

    try {
        const url = new URL(trimmedValue);
        return ['http:', 'https:'].includes(url.protocol);
    } catch {
        return false;
    }
};

const keepStudentProfileTranslations = (t) => {
    t('student-profile-form.create-error-title');
    t('student-profile-form.create-success');
    t('student-profile-form.contact-email-missing');
    t('student-profile-form.field-availability');
    t('student-profile-form.field-contact-email');
    t('student-profile-form.field-languages');
    t('student-profile-form.field-languages-en');
    t('student-profile-form.field-locations');
    t('student-profile-form.field-previous-experience');
    t('student-profile-form.field-previous-experience-description');
    t('student-profile-form.field-previous-experience-en');
    t('student-profile-form.field-previous-experience-en-description');
    t('student-profile-form.field-personal-interests');
    t('student-profile-form.field-personal-interests-description');
    t('student-profile-form.field-personal-interests-en');
    t('student-profile-form.field-personal-interests-en-description');
    t('student-profile-form.field-profile-summary');
    t('student-profile-form.field-profile-summary-en');
    t('student-profile-form.field-qualification');
    t('student-profile-form.field-qualification-description');
    t('student-profile-form.field-qualification-en');
    t('student-profile-form.field-qualification-en-description');
    t('student-profile-form.field-qualification-view-mode');
    t('student-profile-form.field-skills');
    t('student-profile-form.field-skills-description');
    t('student-profile-form.field-skills-en');
    t('student-profile-form.field-skills-en-description');
    t('student-profile-form.field-study-program');
    t('student-profile-form.field-text-placeholder');
    t('student-profile-form.field-website');
    t('student-profile-form.field-website-identity-warning');
    t('student-profile-form.field-website-placeholder');
    t('student-profile-form.form-type-name');
    t('student-profile-form.interest-already-submitted');
    t('student-profile-form.interest-company');
    t('student-profile-form.interest-contact-email');
    t('student-profile-form.interest-contact-name');
    t('student-profile-form.interest-description');
    t('student-profile-form.interest-message');
    t('student-profile-form.interest-submit');
    t('student-profile-form.interest-success');
    t('student-profile-form.interest-title');
    t('student-profile-form.required-field-note');
    t('student-profile-form.validation-required');
    t('student-profile-form.validation-url');
};

// The generic Formalize helpers do not expose maxNumSubmissionsPerCreator yet,
// so this module saves the profile form directly.
const saveStudentProfileForm = async (host, formData, formIdentifier = null) => {
    const body = {
        name: formData.name,
        localizedNames: formData.localizedNames,
        frontendKey: formData.frontendKey,
        additionalData: formData.additionalData,
        dataFeedSchema: formData.dataFeedSchema,
        maxNumSubmissionsPerCreator: formData.maxNumSubmissionsPerCreator,
    };

    const response = await fetch(
        formIdentifier
            ? `${host.entryPointUrl}/formalize/forms/${formIdentifier}`
            : `${host.entryPointUrl}/formalize/forms`,
        {
            method: formIdentifier ? 'PATCH' : 'POST',
            headers: {
                'Content-Type': formIdentifier
                    ? 'application/merge-patch+json'
                    : 'application/ld+json',
                Authorization: `Bearer ${host.auth.token}`,
            },
            body: JSON.stringify(body),
        },
    );

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.description || errorData['hydra:description'] || response.status);
    }

    return response.json();
};

class JobProfileModule extends BaseObject {
    getUrlSlug() {
        return STUDENT_PROFILE_FRONTEND_KEY;
    }

    getFormComponent() {
        return JobProfileInterestFormElement;
    }

    getEditFormComponent() {
        return JobProfileEditFormElement;
    }

    getFormFrontendKey() {
        return STUDENT_PROFILE_FRONTEND_KEY;
    }

    getFormName(lang = i18n.language) {
        i18n.changeLanguage(lang);
        return i18n.t('student-profile-form.form-type-name');
    }

    getItemText(data) {
        return data?.companyName || data?.contactEmail || '';
    }
}

export default JobProfileModule;

export class JobProfileEditFormElement extends ScopedElementsMixin(DBPLitElement) {
    static get scopedElements() {
        return {
            'dbp-string-element': DbpStringElement,
            'dbp-date-element': DbpDateElement,
            'dbp-icon': Icon,
            'dbp-mini-spinner': MiniSpinner,
            'dbp-work-locations-element': WorkLocationsElement,
        };
    }

    constructor() {
        super();
        this._i18n = createInstance();
        this.lang = this._i18n.language;
        this.langDir = '';
        this.auth = {};
        this.entryPointUrl = '';
        this.existingForm = null;
        this.currentStudentStudies = [];
        this._summary = '';
        this._summaryEn = '';
        this._studyProgram = '';
        this._studies = [];
        this._previousExperience = '';
        this._previousExperienceEn = '';
        this._skillsText = '';
        this._skillsTextEn = '';
        this._furtherQualifications = '';
        this._furtherQualificationsEn = '';
        this._personalInterests = '';
        this._personalInterestsEn = '';
        this._languagesText = '';
        this._languagesTextEn = '';
        this._workLocations = [];
        this._availability = '';
        this._contactEmail = '';
        this._studentDataPrefillUserId = '';
        this._website = '';
        this._loadingStudentData = false;
        this._isSubmitting = false;
    }

    static get properties() {
        return {
            ...super.properties,
            lang: {type: String},
            langDir: {type: String, attribute: 'lang-dir'},
            auth: {type: Object},
            entryPointUrl: {type: String, attribute: 'entry-point-url'},
            existingForm: {type: Object, attribute: false},
            currentStudentStudies: {type: Array, attribute: false},
            _summary: {state: true},
            _summaryEn: {state: true},
            _studyProgram: {state: true},
            _studies: {state: true},
            _previousExperience: {state: true},
            _previousExperienceEn: {state: true},
            _skillsText: {state: true},
            _skillsTextEn: {state: true},
            _furtherQualifications: {state: true},
            _furtherQualificationsEn: {state: true},
            _personalInterests: {state: true},
            _personalInterestsEn: {state: true},
            _languagesText: {state: true},
            _languagesTextEn: {state: true},
            _workLocations: {state: true},
            _availability: {state: true},
            _contactEmail: {state: true},
            _website: {state: true},
            _loadingStudentData: {state: true},
            _isSubmitting: {state: true},
        };
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            if (propName === 'lang') {
                this._i18n.changeLanguage(this.lang);
            }

            if ((propName === 'lang' || propName === 'langDir') && this.langDir) {
                setOverridesByGlobalCache(this._i18n, this);
            }

            if (propName === 'existingForm' && this.existingForm) {
                const data = this.existingForm.additionalData || {};
                this._summary = data.summary || '';
                this._summaryEn = data.summaryEn || '';
                this._studies = normalizeStudentStudies(data);
                this._studyProgram =
                    data.studyProgram || formatStudentStudies({studies: this._studies});
                this._previousExperience = data.previousExperience || '';
                this._previousExperienceEn = data.previousExperienceEn || '';
                this._skillsText = normalizeMultilineValue(data.skills);
                this._skillsTextEn = normalizeMultilineValue(data.skillsEn);
                this._furtherQualifications = data.furtherQualifications || '';
                this._furtherQualificationsEn = data.furtherQualificationsEn || '';
                this._personalInterests = data.personalInterests || '';
                this._personalInterestsEn = data.personalInterestsEn || '';
                this._languagesText = normalizeMultilineValue(data.languages);
                this._languagesTextEn = normalizeMultilineValue(data.languagesEn);
                this._workLocations = normalizeWorkLocations(data.workLocations);
                this._availability = data.availability || '';
                this._contactEmail = data.contactEmail || '';
                this._website = data.website || data.linkUrl || '';
            }

            if (
                (propName === 'currentStudentStudies' || propName === 'existingForm') &&
                Array.isArray(this.currentStudentStudies) &&
                this.currentStudentStudies.length > 0 &&
                !Array.isArray(this.existingForm?.additionalData?.studies)
            ) {
                this._studies = normalizeStudentStudies({studies: this.currentStudentStudies});
                this._studyProgram = formatStudentStudies({studies: this._studies});
            }
        });

        if (
            changedProperties.has('auth') ||
            changedProperties.has('entryPointUrl') ||
            changedProperties.has('existingForm')
        ) {
            this._prefillStudentData();
        }

        super.update(changedProperties);
    }

    async _prefillStudentData() {
        const userId = this.auth?.['user-id'];
        const hasSavedStudies = Array.isArray(this.existingForm?.additionalData?.studies);
        const hasCompleteStudentData = this._contactEmail && this._studies.length > 0;
        if (
            !userId ||
            !this.auth?.token ||
            !this.entryPointUrl ||
            this._studentDataPrefillUserId === userId ||
            (hasCompleteStudentData && (!this.existingForm || hasSavedStudies))
        ) {
            return;
        }

        this._loadingStudentData = true;

        try {
            const localData = await this._fetchPersonLocalData(userId, ['email', 'studies']);

            // Email is kept in additionalData for contacting the student, but never shown to companies.
            const studies = normalizeStudentStudies(localData);

            this._contactEmail = this._contactEmail || localData.email || '';
            this._studies = studies.length ? studies : this._studies;
            this._studyProgram = this._studies.length
                ? formatStudentStudies({studies: this._studies})
                : this._studyProgram || formatStudentStudies(localData);
            this._studentDataPrefillUserId = userId;
        } catch (error) {
            console.error('Error pre-filling student profile data:', error);
        } finally {
            this._loadingStudentData = false;
        }
    }

    async _fetchPersonLocalData(userId, localDataAttributes) {
        const includeLocal = localDataAttributes.join(',');
        const response = await fetch(
            `${this.entryPointUrl}/base/people/${encodeURIComponent(
                userId,
            )}?includeLocal=${encodeURIComponent(includeLocal)}`,
            {
                headers: {
                    'Content-Type': 'application/ld+json',
                    Authorization: `Bearer ${this.auth.token}`,
                },
            },
        );

        if (!response.ok) {
            if (localDataAttributes.includes('studies')) {
                return this._fetchPersonLocalData(
                    userId,
                    localDataAttributes.filter((attribute) => attribute !== 'studies'),
                );
            }

            throw new Error(response.statusText || response.status);
        }

        const person = await response.json();
        return person?.localData ?? {};
    }

    get _isFormValid() {
        return (
            this._summary.trim() !== '' &&
            this._contactEmail.trim() !== '' &&
            isValidWebsiteUrl(this._website)
        );
    }

    _getDisplayStudies() {
        if (this._studies.length > 0) {
            return this._studies;
        }

        if (Array.isArray(this.currentStudentStudies) && this.currentStudentStudies.length > 0) {
            return normalizeStudentStudies({studies: this.currentStudentStudies});
        }

        return [];
    }

    async submit() {
        const t = (key, opts) => this._i18n.t(key, opts);
        const isEditMode = Boolean(this.existingForm?.formId);
        const studies = this._getDisplayStudies();
        const studyProgram = studies.length
            ? formatStudentStudies({studies})
            : this._studyProgram.trim();

        if (!this._contactEmail.trim()) {
            sendNotification({
                summary: t('student-profile-form.create-error-title'),
                body: t('student-profile-form.contact-email-missing'),
                type: 'warning',
                timeout: 0,
                targetNotificationId: 'student-profile-form-notification',
            });
            return null;
        }

        if (!this._isFormValid) {
            sendNotification({
                summary: t('student-profile-form.create-error-title'),
                body:
                    this._summary.trim() && this._contactEmail.trim()
                        ? t('student-profile-form.validation-url')
                        : t('student-profile-form.validation-required'),
                type: 'warning',
                timeout: 0,
                targetNotificationId: 'student-profile-form-notification',
            });
            return null;
        }

        this._isSubmitting = true;

        // Companies submit this schema as their one interest submission for the profile form.
        const dataFeedSchema = JSON.stringify({
            title: 'StudentProfileInterest',
            type: 'object',
            additionalProperties: false,
            properties: {
                companyName: {type: 'string', minLength: 1},
                contactName: {type: 'string', minLength: 1},
                contactEmail: {type: 'string', minLength: 1, format: 'email'},
                message: {type: 'string'},
            },
            required: ['companyName', 'contactName', 'contactEmail'],
        });

        const additionalData = {
            summary: this._summary.trim(),
            summaryEn: this._summaryEn.trim(),
            studyProgram,
            studies,
            previousExperience: this._previousExperience.trim(),
            previousExperienceEn: this._previousExperienceEn.trim(),
            skills: parseMultilineList(this._skillsText),
            skillsEn: parseMultilineList(this._skillsTextEn),
            furtherQualifications: this._furtherQualifications.trim(),
            furtherQualificationsEn: this._furtherQualificationsEn.trim(),
            personalInterests: this._personalInterests.trim(),
            personalInterestsEn: this._personalInterestsEn.trim(),
            languages: parseMultilineList(this._languagesText),
            languagesEn: parseMultilineList(this._languagesTextEn),
            workLocations: normalizeWorkLocations(this._workLocations),
            availability: this._availability.trim(),
            contactEmail: this._contactEmail.trim(),
            website: this._website.trim(),
            studentCreatorId: this.auth?.['user-id'] || '',
            studentPersonIdentifier: this.auth?.person_id || '',
        };

        // The profile itself is a Formalize form; the public profile fields live in additionalData.
        const formName = new JobProfileModule().getFormName(this.lang);
        const formData = {
            name: formName,
            localizedNames: [
                {languageTag: 'de', name: new JobProfileModule().getFormName('de')},
                {languageTag: 'en', name: new JobProfileModule().getFormName('en')},
            ],
            frontendKey: STUDENT_PROFILE_FRONTEND_KEY,
            additionalData,
            dataFeedSchema,
            // Each company can signal interest only once per student profile.
            maxNumSubmissionsPerCreator: 1,
        };

        const host = {
            auth: this.auth,
            entryPointUrl: this.entryPointUrl,
            _i18n: this._i18n,
        };

        try {
            const result = await saveStudentProfileForm(
                host,
                formData,
                isEditMode ? this.existingForm.formId : null,
            );

            if (result) {
                sendNotification({
                    summary: t('student-profile-form.interest-success'),
                    body: t('student-profile-form.create-success'),
                    type: 'success',
                    timeout: 5,
                });
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
            console.error('Error saving student profile form:', error);
            sendNotification({
                summary: t('student-profile-form.create-error-title'),
                body: error.message,
                type: 'danger',
                timeout: 0,
                targetNotificationId: 'student-profile-form-notification',
            });
        } finally {
            this._isSubmitting = false;
        }

        return null;
    }

    renderTextField(name, labelKey, value, onChange, options = {}) {
        const t = (key, opts) => this._i18n.t(key, opts);
        return html`
            <dbp-string-element
                name="${name}"
                lang="${this.lang}"
                label="${t(labelKey)}"
                .value="${value}"
                rows="${options.rows || ''}"
                maxlength="${options.maxlength || ''}"
                placeholder="${options.placeholderKey ? t(options.placeholderKey) : ''}"
                type="${options.type || 'text'}"
                ?required="${options.required}"
                @change="${(event) => onChange(event.detail.value)}">
                <!-- Render the description between the label and the input via the description slot,
                     so the reading order for screen readers is: field name, description, input. -->
                ${
                    options.descriptionKey
                        ? html`
                              <div slot="description">${t(options.descriptionKey)}</div>
                          `
                        : ''
                }
            </dbp-string-element>
        `;
    }

    renderDateField(name, labelKey, value, onChange, options = {}) {
        const t = (key, opts) => this._i18n.t(key, opts);
        return html`
            <dbp-date-element
                name="${name}"
                lang="${this.lang}"
                label="${t(labelKey)}"
                .value="${value}"
                ?required="${options.required}"
                @change="${(event) => onChange(event.detail.value)}"></dbp-date-element>
        `;
    }

    render() {
        const t = (key, opts) => this._i18n.t(key, opts);
        const studies = this._getDisplayStudies();
        const studyProgram = studies.length ? formatStudentStudies({studies}) : this._studyProgram;
        keepStudentProfileTranslations(t);

        return html`
            <p class="required-field-note">${t('student-profile-form.required-field-note')}</p>

            <div class="translation-row">
                ${this.renderTextField(
                    'summary',
                    'student-profile-form.field-profile-summary',
                    this._summary,
                    (value) => (this._summary = value),
                    {rows: 6, required: true, maxlength: STUDENT_PROFILE_DESCRIPTION_MAX_LENGTH},
                )}
                ${this.renderTextField(
                    'summaryEn',
                    'student-profile-form.field-profile-summary-en',
                    this._summaryEn,
                    (value) => (this._summaryEn = value),
                    {rows: 6, maxlength: STUDENT_PROFILE_DESCRIPTION_MAX_LENGTH},
                )}
            </div>

            ${
                this._contactEmail
                    ? html`
                          <div class="profile-prefill-info">
                              <strong>${t('student-profile-form.field-contact-email')}:</strong>
                              ${this._contactEmail}
                          </div>
                      `
                    : ''
            }
            ${
                this._loadingStudentData || studyProgram || studies.length
                    ? html`
                          <div class="profile-prefill-info">
                              <strong>${t('student-profile-form.field-study-program')}:</strong>
                              ${
                                  studies.length
                                      ? html`
                                            <ul>
                                                ${studies.map(
                                                    (study) => html`
                                                        <li>${study.name}</li>
                                                    `,
                                                )}
                                            </ul>
                                        `
                                      : this._loadingStudentData
                                        ? html`
                                              <dbp-mini-spinner
                                                  text="${t('loading-message')}"></dbp-mini-spinner>
                                          `
                                        : html`
                                              ${studyProgram}
                                          `
                              }
                          </div>
                      `
                    : ''
            }

            <div class="translation-row">
                ${this.renderTextField(
                    'previousExperience',
                    'student-profile-form.field-previous-experience',
                    this._previousExperience,
                    (value) => (this._previousExperience = value),
                    {
                        rows: 4,
                        placeholderKey: 'student-profile-form.field-text-placeholder',
                        descriptionKey:
                            'student-profile-form.field-previous-experience-description',
                    },
                )}
                ${this.renderTextField(
                    'previousExperienceEn',
                    'student-profile-form.field-previous-experience-en',
                    this._previousExperienceEn,
                    (value) => (this._previousExperienceEn = value),
                    {
                        rows: 4,
                        placeholderKey: 'student-profile-form.field-text-placeholder',
                        descriptionKey:
                            'student-profile-form.field-previous-experience-en-description',
                    },
                )}
            </div>

            <div class="translation-row">
                ${this.renderTextField(
                    'skills',
                    'student-profile-form.field-skills',
                    this._skillsText,
                    (value) => (this._skillsText = value),
                    {
                        rows: 4,
                        placeholderKey: 'student-profile-form.field-text-placeholder',
                        descriptionKey: 'student-profile-form.field-skills-description',
                    },
                )}
                ${this.renderTextField(
                    'skillsEn',
                    'student-profile-form.field-skills-en',
                    this._skillsTextEn,
                    (value) => (this._skillsTextEn = value),
                    {
                        rows: 4,
                        placeholderKey: 'student-profile-form.field-text-placeholder',
                        descriptionKey: 'student-profile-form.field-skills-en-description',
                    },
                )}
            </div>

            <div class="translation-row">
                ${this.renderTextField(
                    'furtherQualifications',
                    'student-profile-form.field-qualification',
                    this._furtherQualifications,
                    (value) => (this._furtherQualifications = value),
                    {
                        rows: 4,
                        placeholderKey: 'student-profile-form.field-text-placeholder',
                        descriptionKey: 'student-profile-form.field-qualification-description',
                    },
                )}
                ${this.renderTextField(
                    'furtherQualificationsEn',
                    'student-profile-form.field-qualification-en',
                    this._furtherQualificationsEn,
                    (value) => (this._furtherQualificationsEn = value),
                    {
                        rows: 4,
                        placeholderKey: 'student-profile-form.field-text-placeholder',
                        descriptionKey: 'student-profile-form.field-qualification-en-description',
                    },
                )}
            </div>

            <div class="translation-row">
                ${this.renderTextField(
                    'personalInterests',
                    'student-profile-form.field-personal-interests',
                    this._personalInterests,
                    (value) => (this._personalInterests = value),
                    {
                        rows: 4,
                        placeholderKey: 'student-profile-form.field-text-placeholder',
                        descriptionKey: 'student-profile-form.field-personal-interests-description',
                    },
                )}
                ${this.renderTextField(
                    'personalInterestsEn',
                    'student-profile-form.field-personal-interests-en',
                    this._personalInterestsEn,
                    (value) => (this._personalInterestsEn = value),
                    {
                        rows: 4,
                        placeholderKey: 'student-profile-form.field-text-placeholder',
                        descriptionKey:
                            'student-profile-form.field-personal-interests-en-description',
                    },
                )}
            </div>

            <div class="translation-row">
                ${this.renderTextField(
                    'languages',
                    'student-profile-form.field-languages',
                    this._languagesText,
                    (value) => (this._languagesText = value),
                    {rows: 4},
                )}
                ${this.renderTextField(
                    'languagesEn',
                    'student-profile-form.field-languages-en',
                    this._languagesTextEn,
                    (value) => (this._languagesTextEn = value),
                    {rows: 4},
                )}
            </div>

            <dbp-work-locations-element
                lang="${this.lang}"
                lang-dir="${this.langDir}"
                label="${t('student-profile-form.field-locations')}"
                .value="${this._workLocations}"
                @change="${(event) =>
                    (this._workLocations = normalizeWorkLocations(
                        event.detail.value,
                    ))}"></dbp-work-locations-element>

            <div class="translation-row">
                ${this.renderDateField(
                    'availability',
                    'student-profile-form.field-availability',
                    this._availability,
                    (value) => (this._availability = value),
                )}
                ${this.renderTextField(
                    'website',
                    'student-profile-form.field-website',
                    this._website,
                    (value) => (this._website = value),
                    {
                        placeholderKey: 'student-profile-form.field-website-placeholder',
                        descriptionKey: 'student-profile-form.field-website-identity-warning',
                        type: 'url',
                    },
                )}
            </div>

            <div class="form-footer">
                <button
                    class="button is-primary"
                    type="button"
                    ?disabled="${this._isSubmitting}"
                    @click="${() => this.submit()}">
                    ${
                        this._isSubmitting
                            ? html`
                                  <dbp-mini-spinner></dbp-mini-spinner>
                              `
                            : html`
                                  <dbp-icon name="save" aria-hidden="true"></dbp-icon>
                              `
                    }
                    ${t('student-profile-form.save-profile')}
                </button>
            </div>
        `;
    }

    static get styles() {
        return [
            commonStyles.getButtonCSS(),
            css`
                :host {
                    display: block;
                }

                .required-field-note {
                    margin-top: 0;
                }

                .translation-row {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 1rem;
                }

                .profile-prefill-info {
                    background: var(--dbp-secondary-surface);
                    border: var(--dbp-border);
                    border-radius: var(--dbp-border-radius);
                    margin: 0 0 1rem 0;
                    padding: 0.75rem 1rem;
                }

                .profile-prefill-info h3 {
                    font-size: 1rem;
                    margin: 0 0 0.5rem;
                }

                .profile-prefill-info ul {
                    margin: 0.5rem 0 0 1.25rem;
                }

                .profile-prefill-info p {
                    margin: 0.5rem 0 0;
                }

                .form-footer {
                    display: flex;
                    justify-content: flex-end;
                    margin-top: 1rem;
                }

                .button {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                }

                @media (max-width: 720px) {
                    .translation-row {
                        grid-template-columns: 1fr;
                    }
                }
            `,
        ];
    }
}

export class JobProfileInterestFormElement extends BaseFormElement {
    static get scopedElements() {
        return {
            'dbp-string-element': DbpStringElement,
            'dbp-button': Button,
            'dbp-icon': Icon,
            'dbp-mini-spinner': MiniSpinner,
        };
    }

    constructor() {
        super();
        this._i18n = createInstance();
        this.lang = this._i18n.language;
        this.profile = null;
        this._companyName = '';
        this._contactName = '';
        this._contactEmail = '';
        this._message = '';
        this._isSubmitting = false;
        this._hasSubmittedInterest = false;
        this._checkingSubmittedInterest = false;
    }

    static get properties() {
        return {
            ...super.properties,
            profile: {type: Object},
            _companyName: {state: true},
            _contactName: {state: true},
            _contactEmail: {state: true},
            _message: {state: true},
            _isSubmitting: {state: true},
            _hasSubmittedInterest: {state: true},
            _checkingSubmittedInterest: {state: true},
        };
    }

    async update(changedProperties) {
        await super.update(changedProperties);

        const formIdentifierChanged = changedProperties.has('formIdentifier');
        const authChanged = changedProperties.has('auth');
        if ((formIdentifierChanged || authChanged) && this.formIdentifier && this.auth?.token) {
            this._checkAlreadySubmittedInterest();
        }
    }

    async _checkAlreadySubmittedInterest() {
        const userId = this.auth?.['user-id'];
        const formIdentifier = this.formIdentifier;

        if (!formIdentifier || !this.entryPointUrl || !this.auth?.token) {
            return;
        }

        this._checkingSubmittedInterest = true;

        try {
            const query = new URLSearchParams({
                formIdentifier,
                perPage: '1',
            });
            if (userId) {
                query.set('creatorIdEquals', userId);
            }

            const response = await fetch(`${this.entryPointUrl}/formalize/submissions?${query}`, {
                headers: {Authorization: `Bearer ${this.auth.token}`},
            });

            if (response.ok) {
                const data = await response.json();
                const submissions = data['hydra:member'] ?? [];
                const hasSubmittedInterest = submissions.length > 0;

                if (this.formIdentifier === formIdentifier) {
                    this._hasSubmittedInterest = hasSubmittedInterest;
                }
            }
        } catch (error) {
            console.error('Error checking student profile interest submission:', error);
        } finally {
            if (this.formIdentifier === formIdentifier) {
                this._checkingSubmittedInterest = false;
            }
        }
    }

    get _isFormValid() {
        return (
            this._companyName.trim() !== '' &&
            this._contactName.trim() !== '' &&
            this._contactEmail.trim() !== ''
        );
    }

    async submitInterest(event) {
        event.preventDefault();
        const t = (key, opts) => this._i18n.t(key, opts);

        if (!this._isFormValid) {
            sendNotification({
                summary: t('student-profile-form.create-error-title'),
                body: t('student-profile-form.validation-required'),
                type: 'warning',
                timeout: 0,
            });
            return;
        }

        this._isSubmitting = true;

        await this._checkAlreadySubmittedInterest();
        if (this._hasSubmittedInterest) {
            this._isSubmitting = false;
            return;
        }

        // Formalize accepts submissions as multipart data even when no files are attached.
        const postFormData = new FormData();
        postFormData.append('form', '/formalize/forms/' + this.formIdentifier);
        postFormData.append(
            'dataFeedElement',
            JSON.stringify({
                companyName: this._companyName.trim(),
                contactName: this._contactName.trim(),
                contactEmail: this._contactEmail.trim(),
                message: this._message.trim(),
            }),
        );
        postFormData.append('submissionState', String(SUBMISSION_STATES_BINARY.SUBMITTED));

        try {
            const response = await fetch(`${this.entryPointUrl}/formalize/submissions`, {
                method: 'POST',
                headers: {Authorization: `Bearer ${this.auth.token}`},
                body: postFormData,
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                console.error(
                    'Failed to submit student profile interest:',
                    response.status,
                    errorBody,
                );
                sendNotification({
                    summary: t('student-profile-form.create-error-title'),
                    body: errorBody.description || t('student-profile-form.interest-error'),
                    type: 'danger',
                    timeout: 0,
                });
                return;
            }

            this._hasSubmittedInterest = true;
            sendNotification({
                summary: t('student-profile-form.interest-success'),
                body: t('student-profile-form.interest-success-body'),
                type: 'success',
                timeout: 5,
            });
        } catch (error) {
            console.error('Error submitting student profile interest:', error);
            sendNotification({
                summary: t('student-profile-form.create-error-title'),
                body: t('student-profile-form.interest-error'),
                type: 'danger',
                timeout: 0,
            });
        } finally {
            this._isSubmitting = false;
        }
    }

    render() {
        const t = (key, opts) => this._i18n.t(key, opts);
        keepStudentProfileTranslations(t);

        if (this._checkingSubmittedInterest) {
            return html`
                <div class="checking"><dbp-mini-spinner></dbp-mini-spinner></div>
            `;
        }

        if (this._hasSubmittedInterest) {
            return html`
                <div class="submitted-notice">
                    <dbp-icon name="checkmark-circle" aria-hidden="true"></dbp-icon>
                    <p>${t('student-profile-form.interest-already-submitted')}</p>
                </div>
            `;
        }

        return html`
            <form class="interest-form" @submit="${this.submitInterest}" novalidate>
                <h3>${t('student-profile-form.interest-title')}</h3>
                <p class="interest-description">
                    ${t('student-profile-form.interest-description')}
                </p>

                <dbp-string-element
                    name="companyName"
                    lang="${this.lang}"
                    label="${t('student-profile-form.interest-company')}"
                    .value="${this._companyName}"
                    required
                    @change="${(event) =>
                        (this._companyName = event.detail.value)}"></dbp-string-element>

                <div class="two-column-row">
                    <dbp-string-element
                        name="contactName"
                        lang="${this.lang}"
                        label="${t('student-profile-form.interest-contact-name')}"
                        .value="${this._contactName}"
                        required
                        @change="${(event) =>
                            (this._contactName = event.detail.value)}"></dbp-string-element>
                    <dbp-string-element
                        name="contactEmail"
                        lang="${this.lang}"
                        label="${t('student-profile-form.interest-contact-email')}"
                        .value="${this._contactEmail}"
                        required
                        @change="${(event) =>
                            (this._contactEmail = event.detail.value)}"></dbp-string-element>
                </div>

                <dbp-string-element
                    name="message"
                    lang="${this.lang}"
                    label="${t('student-profile-form.interest-message')}"
                    .value="${this._message}"
                    rows="4"
                    @change="${(event) =>
                        (this._message = event.detail.value)}"></dbp-string-element>

                <div class="form-footer">
                    <button
                        class="button is-primary"
                        type="submit"
                        ?disabled="${this._isSubmitting}">
                        ${
                            this._isSubmitting
                                ? html`
                                      <dbp-mini-spinner></dbp-mini-spinner>
                                  `
                                : html`
                                      <dbp-icon name="send-diagonal" aria-hidden="true"></dbp-icon>
                                  `
                        }
                        ${t('student-profile-form.interest-submit')}
                    </button>
                </div>
            </form>
        `;
    }

    static get styles() {
        return [
            super.styles,
            commonStyles.getButtonCSS(),
            css`
                .interest-form {
                    border: var(--dbp-border);
                    border-radius: var(--dbp-border-radius);
                    margin-top: 1.5rem;
                    padding: 1rem;
                }

                .interest-form h3 {
                    margin: 0 0 0.5rem 0;
                }

                .interest-description {
                    line-height: 1.55;
                    margin: 0 0 1rem 0;
                }

                .two-column-row {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 1rem;
                }

                .form-footer {
                    display: flex;
                    justify-content: flex-end;
                    margin-top: 1rem;
                }

                .button,
                .submitted-notice {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                }

                .submitted-notice {
                    color: var(--dbp-success);
                    margin-top: 1rem;
                }

                .submitted-notice p {
                    margin: 0;
                }

                @media (max-width: 720px) {
                    .two-column-row {
                        grid-template-columns: 1fr;
                    }
                }
            `,
        ];
    }
}
