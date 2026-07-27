import {BaseFormElement, BaseObject} from '../../vendor/formalize/src/form/base-object.js';
import {css, html} from 'lit';
import {createRef, ref} from 'lit/directives/ref.js';
import {
    DbpStringElement,
    DbpDateElement,
    DbpEnumElement,
    DbpNumberElement,
    DbpSubmissionSelectElement,
} from '@dbp-toolkit/form-elements';
import {ResourceSelect} from '@dbp-toolkit/resource-select';
import {FileSource, FileSink} from '@dbp-toolkit/file-handling';
import {Modal} from '@dbp-toolkit/common/src/modal.js';
import {PdfViewer} from '@dbp-toolkit/pdf-viewer';
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
import {setOverridesByGlobalCache} from '@dbp-toolkit/common/i18next.js';
import {apiCreateForm, apiUpdateForm} from '../../vendor/formalize/src/manage-forms-api.js';
import {createInstance} from '../i18n.js';
import WorkLocationsElement, {
    getDefaultInternalWorkLocations,
    normalizeWorkLocations,
} from './workLocationsElement.js';

const i18n = createInstance();

const JOB_APPLICATION_ATTACHMENT_GROUP = 'attachments';
const JOB_APPLICATION_ATTACHMENT_LIMIT = 5;
const JOB_APPLICATION_ATTACHMENT_MAX_SIZE_KB = 10000;
const JOB_APPLICATION_ATTACHMENT_MAX_SIZE_MB = 10;
const JOB_APPLICATION_ATTACHMENT_ALLOWED_MIME_TYPES = ['application/pdf'];
const JOB_DESCRIPTION_MAX_LENGTH = 2500;
const JOB_OFFER_TYPE_INTERNAL = 'internal';
const JOB_OFFER_TYPE_EXTERNAL = 'external';
const JOB_OFFER_TYPES = [JOB_OFFER_TYPE_INTERNAL, JOB_OFFER_TYPE_EXTERNAL];

const keepJobOfferAttachmentTranslations = (t) => {
    t(
        'create-form.error-create-failed',
        'Failed to publish job offer. Response status: {{status}}',
    );
    t('create-form.success-created', 'Job offer published successfully');
    t('edit-form.error-update-failed', 'Failed to update job offer. Response status: {{status}}');
    t('edit-form.success-updated', 'Job offer updated successfully');
    t('errors.error-title', 'Error');
    t('success.success-title', 'Success');
    t('job-offer-detail.attachments-help', {
        count: JOB_APPLICATION_ATTACHMENT_LIMIT,
        size: JOB_APPLICATION_ATTACHMENT_MAX_SIZE_MB,
    });
    t('job-offer-detail.notification.attachment-limit-body', {
        count: JOB_APPLICATION_ATTACHMENT_LIMIT,
    });
    t('render-form.download-widget.attachment-upload-file-text');
    t('render-form.download-widget.attachment-upload-warning-text');
    t('render-form.download-widget.attachment-remove-file-text');
    t('render-form.download-widget.attachment-deletion-warning-text');
    t('render-form.download-widget.view-attachment');
    t('render-form.download-widget.download-attachment');
    t('render-form.download-widget.delete-attachment');
    t('render-form.download-widget.upload-file-button-label', {
        count: JOB_APPLICATION_ATTACHMENT_LIMIT,
    });
};

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

// Available job categories and areas of interest for the enum selects
export const JOB_CATEGORIES = {
    'student-teaching-assistantship':
        'manage-job-offers.job-category-student-teaching-assistantship',
    'student-research-assistantship':
        'manage-job-offers.job-category-student-research-assistantship',
    'non-scientific-part-time-position':
        'manage-job-offers.job-category-non-scientific-part-time-position',
    'seasonal-position': 'manage-job-offers.job-category-seasonal-position',
    internship: 'manage-job-offers.job-category-internship',
};

export const AREAS_OF_INTEREST = {
    administration: 'manage-job-offers.area-of-interest-administration',
    'Administration-Healthcare': 'manage-job-offers.area-of-interest-Administration-Healthcare',
    teaching: 'manage-job-offers.area-of-interest-teaching',
    research: 'manage-job-offers.area-of-interest-research',
    'natural-sciences': 'manage-job-offers.area-of-interest-natural-sciences',
    'language-linguistics': 'manage-job-offers.area-of-interest-language-linguistics',
    medicine: 'manage-job-offers.area-of-interest-medicine',
    'Medical-technology': 'manage-job-offers.area-of-interest-Medical-technology',
    engineering: 'manage-job-offers.area-of-interest-engineering',
    'Civil-engineering': 'manage-job-offers.area-of-interest-Civil-engineering',
    'Building-construction': 'manage-job-offers.area-of-interest-Building-construction',
    'Construction-industry': 'manage-job-offers.area-of-interest-Construction-industry',
    'Mechanical-engineering': 'manage-job-offers.area-of-interest-Mechanical-engineering',
    it: 'manage-job-offers.area-of-interest-it',
    'software-development': 'manage-job-offers.area-of-interest-software-development',
    design: 'manage-job-offers.area-of-interest-design',
    'Textiles-Clothing-Leather': 'manage-job-offers.area-of-interest-Textiles-Clothing-Leather',
    management: 'manage-job-offers.area-of-interest-management',
    'Management-consulting': 'manage-job-offers.area-of-interest-Management-consulting',
    telecommunications: 'manage-job-offers.area-of-interest-telecommunications',
    trade: 'manage-job-offers.area-of-interest-trade',
    tourism: 'manage-job-offers.area-of-interest-tourism',
    Advertising: 'manage-job-offers.area-of-interest-Advertising',
    'Universities-Colleges': 'manage-job-offers.area-of-interest-Universities-Colleges',
    law: 'manage-job-offers.area-of-interest-law',
    'Publishing-Printing-companies':
        'manage-job-offers.area-of-interest-Publishing-Printing-companies',
    'art-culture-design': 'manage-job-offers.area-of-interest-art-culture-design',
    'communication-marketing': 'manage-job-offers.area-of-interest-communication-marketing',
    'library-services': 'manage-job-offers.area-of-interest-library-services',
    'consulting-support': 'manage-job-offers.area-of-interest-consulting-support',
    'human-resources': 'manage-job-offers.area-of-interest-human-resources',
    'finance-controlling': 'manage-job-offers.area-of-interest-finance-controlling',
    infrastructure: 'manage-job-offers.area-of-interest-infrastructure',
    'sustainability-environment': 'manage-job-offers.area-of-interest-sustainability-environment',
    'didactics-educational-development':
        'manage-job-offers.area-of-interest-didactics-educational-development',
    'plant-engineering-environmental-technology':
        'manage-job-offers.area-of-interest-plant-engineering-environmental-technology',
    'architecture-engineering-offices':
        'manage-job-offers.area-of-interest-architecture-engineering-offices',
    'wooden-furniture': 'manage-job-offers.area-of-interest-wooden-furniture',
    'Physical-chemical-laboratories':
        'manage-job-offers.area-of-interest-Physical-chemical-laboratories',
    'Real-Estate-Rental': 'manage-job-offers.area-of-interest-Real-Estate-Rental',
    'Rail-vehicles': 'manage-job-offers.area-of-interest-Rail-vehicles',
    plastics: 'manage-job-offers.area-of-interest-plastics',
    'Agriculture-Forestry': 'manage-job-offers.area-of-interest-agriculture-forestry',
    'Measuring-instruments': 'manage-job-offers.area-of-interest-measuring-instruments',
    'Metal-production/processing': 'manage-job-offers.area-of-interest-metal-production-processing',
    'Metal-goods': 'manage-job-offers.area-of-interest-metal-goods',
    'Food-Drinks': 'manage-job-offers.area-of-interest-food-drinks',
    'Paper-Pulse-Packaging': 'manage-job-offers.area-of-interest-paper-pulse-packaging',
    'Staffing-agency': 'manage-job-offers.area-of-interest-staffing-agency',
    'Passenger-freight-transport': 'manage-job-offers.area-of-interest-personen-freight-transport',
    automotive: 'manage-job-offers.area-of-interest-automotive',
    'non-university-research': 'manage-job-offers.area-of-interest-non-university-research',
    'banks-insurance': 'manage-job-offers.area-of-interest-banks-insurance',
    'building-materials': 'manage-job-offers.area-of-interest-building-materials',
    'mining-metallurgy': 'manage-job-offers.area-of-interest-mining-metallurgy',
    'chemistry-pharma': 'manage-job-offers.area-of-interest-chemistry-pharma',
    electronics: 'manage-job-offers.area-of-interest-electronics',
    'electrical-engineering': 'manage-job-offers.area-of-interest-electrical-engineering',
    'energy-water-supply': 'manage-job-offers.area-of-interest-energy-water-supply',
    'Other-services': 'manage-job-offers.area-of-interest-other-services',
    'Other-production': 'manage-job-offers.area-of-interest-other-production',
};

const LEGACY_AREA_OF_INTERESTS = {
    other: 'manage-job-offers.area-of-interest-other',
};

const AREA_OF_INTEREST_ALIASES = {
    administration: ['administration', 'verwaltung'],
    teaching: ['teaching', 'lehre'],
    research: ['research', 'forschung'],
    'natural-sciences': [
        'natural-sciences',
        'natural sciences',
        'naturwissenschaften',
        'science',
        'wissenschaft',
    ],
    'language-linguistics': [
        'language-linguistics',
        'language and linguistics',
        'sprache und linguistik',
    ],
    medicine: ['medicine', 'medizin'],
    engineering: ['engineering', 'technik'],
    it: ['it'],
    'software-development': ['software-development', 'softwareentwicklung', 'software development'],
    design: ['design'],
    management: ['management'],
    law: ['law', 'recht'],
    'art-culture-design': [
        'art-culture-design',
        'art, culture and design',
        'kunst, kultur und design',
    ],
    'communication-marketing': [
        'communication-marketing',
        'communication and marketing',
        'kommunikation und marketing',
        'kommunikation & marketing',
    ],
    'library-services': [
        'library-services',
        'library services',
        'library science',
        'bibliothekswesen',
    ],
    'consulting-support': [
        'consulting-support',
        'consulting and support',
        'beratung und betreuung',
    ],
    'human-resources': ['human-resources', 'human resources', 'personalwesen'],
    'finance-controlling': [
        'finance-controlling',
        'finance and controlling',
        'finanzen und controlling',
    ],
    infrastructure: ['infrastructure', 'infrastruktur'],
    'sustainability-environment': [
        'sustainability-environment',
        'sustainability and environment',
        'nachhaltigkeit und umwelt',
    ],
    'didactics-educational-development': [
        'didactics-educational-development',
        'didactics and educational development',
        'didaktik und bildungsentwicklung',
    ],
    'plant-engineering-environmental-technology': [
        'plant-engineering-environmental-technology',
        'plant engineering/environmental technology',
        'anlagenbau/umwelttechnik',
    ],
    'architecture-engineering-offices': [
        'architecture-engineering-offices',
        'architecture/engineering offices',
        'architektur- / ing.büros',
        'architektur-/ing.büros',
    ],
    automotive: ['automotive'],
    'non-university-research': [
        'non-university-research',
        'non-university research',
        'außeruniv. forschung',
        'ausseruniv. forschung',
    ],
    'banks-insurance': ['banks-insurance', 'banks/insurance', 'banken/versicherungen'],
    'building-materials': ['building-materials', 'building materials', 'baustoffe'],
    'mining-metallurgy': [
        'mining-metallurgy',
        'mining/metallurgy',
        'bergbau/hüttenwesen',
        'bergbau/huettenwesen',
    ],
    'chemistry-pharma': ['chemistry-pharma', 'chemistry/pharma', 'chemie/pharma'],
    electronics: ['electronics', 'elektronik'],
    'electrical-engineering': [
        'electrical-engineering',
        'electrical engineering',
        'elektrotechnik',
    ],
    'energy-water-supply': [
        'energy-water-supply',
        'energy/water supply',
        'energie/wasserversorg',
        'energie/wasserversorgung',
    ],
    other: ['other', 'sonstiges'],
};

const withEmptySelectOption = (items, placeholder) => ({
    '': placeholder,
    ...items,
});

export const getJobCategoryLabel = (value, t) => {
    const translationKey = JOB_CATEGORIES[value];

    return translationKey ? t(translationKey) : value;
};

export const getJobCategoryItems = (t, placeholder) =>
    withEmptySelectOption(
        Object.fromEntries(
            Object.keys(JOB_CATEGORIES).map((value) => [value, getJobCategoryLabel(value, t)]),
        ),
        placeholder,
    );

export const getAreaOfInterestLabel = (value, t) => {
    const translationKey = AREAS_OF_INTEREST[value] ?? LEGACY_AREA_OF_INTERESTS[value];

    return translationKey ? t(translationKey) : value;
};

export const getAreaOfInterestItems = (t, placeholder = null) => {
    const items = Object.fromEntries(
        Object.keys(AREAS_OF_INTEREST).map((value) => [value, getAreaOfInterestLabel(value, t)]),
    );

    return placeholder ? withEmptySelectOption(items, placeholder) : items;
};

const parseAreaOfInterestValues = (value) => {
    if (Array.isArray(value)) {
        return value;
    }

    if (typeof value !== 'string') {
        return value ? [value] : [];
    }

    const trimmedValue = value.trim();
    if (!trimmedValue) {
        return [];
    }

    if (trimmedValue.startsWith('[')) {
        try {
            const parsedValue = JSON.parse(trimmedValue);
            return Array.isArray(parsedValue) ? parsedValue : [trimmedValue];
        } catch {
            return [trimmedValue];
        }
    }

    return [trimmedValue];
};

const normalizeSingleAreaOfInterestValue = (value) => {
    if (typeof value !== 'string') {
        return value ? String(value) : '';
    }

    const normalizedValue = value.trim().toLowerCase();
    if (!normalizedValue) {
        return '';
    }

    const match = Object.entries(AREA_OF_INTEREST_ALIASES).find(([, aliases]) =>
        aliases.includes(normalizedValue),
    );

    return match?.[0] ?? value.trim();
};

export const normalizeAreaOfInterestValues = (value) => [
    ...new Set(
        parseAreaOfInterestValues(value).map(normalizeSingleAreaOfInterestValue).filter(Boolean),
    ),
];

const areStringArraysEqual = (left, right) => {
    if (left === right) {
        return true;
    }

    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
        return false;
    }

    return left.every((value, index) => value === right[index]);
};

export const getAreaOfInterestLabels = (value, t) =>
    normalizeAreaOfInterestValues(value).map((areaOfInterestValue) =>
        getAreaOfInterestLabel(areaOfInterestValue, t),
    );

export const normalizeAreaOfInterestValue = (value) =>
    normalizeAreaOfInterestValues(value)[0] ?? '';

const getSubmissionCheckAuthContext = (auth) => ({
    loginStatus: auth?.['login-status'] ?? '',
    userId: auth?.['user-id'] ?? '',
    subject: auth?.subject ?? '',
});

export const hasSubmissionCheckContextChanged = (previousAuth, nextAuth) => {
    const previousContext = getSubmissionCheckAuthContext(previousAuth);
    const nextContext = getSubmissionCheckAuthContext(nextAuth);

    return (
        previousContext.loginStatus !== nextContext.loginStatus ||
        previousContext.userId !== nextContext.userId ||
        previousContext.subject !== nextContext.subject
    );
};

const parseMultilineList = (value) =>
    value
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

const normalizeMultilineValue = (value) => {
    if (Array.isArray(value)) {
        return value.join('\n');
    }

    return typeof value === 'string' ? value : '';
};

const normalizeStringList = (value) => {
    if (Array.isArray(value)) {
        return value.map((item) => String(item).trim()).filter(Boolean);
    }

    return parseMultilineList(normalizeMultilineValue(value));
};

const normalizeHttpUrl = (value) => {
    try {
        const url = new URL(String(value).trim());
        return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch {
        return '';
    }
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
            'dbp-number-element': DbpNumberElement,
            'dbp-submission-select-element': DbpSubmissionSelectElement,
            'dbp-resource-select': ResourceSelect,
            'dbp-work-locations-element': WorkLocationsElement,
            'dbp-icon': Icon,
            'dbp-mini-spinner': MiniSpinner,
        };
    }

    constructor() {
        super();
        this._i18n = createInstance();
        this.lang = this._i18n.language;
        this.langDir = '';
        this.auth = {};
        this.entryPointUrl = '';
        this._areaOfInterestItems = this._createAreaOfInterestItems();

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
        this._applicationDeadline = '';
        this._jobOfferType = JOB_OFFER_TYPE_INTERNAL;
        this._organization = '';
        /** @type {string} The API identifier for the selected organizational unit */
        this._organizationId = '';
        /** @type {string} The Formalize submission identifier for the selected company */
        this._companySubmissionId = '';
        /** @type {string} The display name of the selected company (kept so it can be shown even if the company submission is deleted) */
        this._companyName = '';
        /** @type {object} Snapshot of the selected company submission data */
        this._companyData = {};
        /** @type {string} URL to the external application page for external jobs */
        this._externalJobUrl = '';
        /** @type {Array<{country: string, region: string, city: string}>} Work locations for external jobs */
        this._workLocations = [];

        // Optional job detail fields
        this._startDate = '';
        this._weeklyHours = '';
        this._salary = '';
        this._contractDuration = '';
        this._jobCategory = '';
        this._areasOfInterest = [];
        this._linkName = '';
        this._linkUrl = '';
        /** @type {string} Contact information for the job offer */
        this._contactInformation = '';
        /** @type {string} Contact information in English for the job offer */
        this._contactInformationEn = '';
        /** @type {string} Newline-separated list of requirements entered by the user */
        this._requirementsText = '';
        /** @type {string} Newline-separated list of responsibilities entered by the user */
        this._responsibilitiesText = '';
        /** @type {string} Newline-separated list of qualifications entered by the user */
        this._requiredQualificationText = '';
        /** @type {string} Newline-separated list of benefits entered by the user */
        this._weOfferText = '';

        // Optional English translations of text fields
        this._titleEn = '';
        this._descriptionEn = '';
        this._organizationEn = '';
        this._weeklyHoursEn = '';
        this._salaryEn = '';
        this._contractDurationEn = '';
        this._linkNameEn = '';
        this._linkUrlEn = '';
        /** @type {string} Newline-separated list of requirements in English entered by the user */
        this._requirementsTextEn = '';
        /** @type {string} Newline-separated list of responsibilities in English entered by the user */
        this._responsibilitiesTextEn = '';
        /** @type {string} Newline-separated list of required qualifications in English entered by the user */
        this._requiredQualificationTextEn = '';
        /** @type {string} Newline-separated list of benefits in English entered by the user */
        this._weOfferTextEn = '';

        this._isSubmitting = false;
        this.optionalContent = false;
    }

    _createAreaOfInterestItems() {
        return getAreaOfInterestItems((key, opts) => this._i18n.t(key, opts));
    }

    static get properties() {
        return {
            ...super.properties,
            lang: {type: String},
            langDir: {type: String, attribute: 'lang-dir'},
            auth: {type: Object},
            entryPointUrl: {type: String, attribute: 'entry-point-url'},
            existingForm: {type: Object, attribute: false},
            _title: {state: true},
            _description: {state: true},
            _publishedAt: {state: true},
            _deadline: {state: true},
            _applicationDeadline: {state: true},
            _jobOfferType: {state: true},
            _organization: {state: true},
            _organizationId: {state: true},
            _companySubmissionId: {state: true},
            _companyName: {state: true},
            _companyData: {state: true},
            _externalJobUrl: {state: true},
            _workLocations: {state: true},
            _startDate: {state: true},
            _weeklyHours: {state: true},
            _salary: {state: true},
            _contractDuration: {state: true},
            _jobCategory: {state: true},
            _areasOfInterest: {state: true},
            _linkName: {state: true},
            _linkUrl: {state: true},
            _contactInformation: {state: true},
            _contactInformationEn: {state: true},
            _requirementsText: {state: true},
            _responsibilitiesText: {state: true},
            _requiredQualificationText: {state: true},
            _weOfferText: {state: true},
            _titleEn: {state: true},
            _descriptionEn: {state: true},
            _organizationEn: {state: true},
            _weeklyHoursEn: {state: true},
            _salaryEn: {state: true},
            _contractDurationEn: {state: true},
            _linkNameEn: {state: true},
            _linkUrlEn: {state: true},
            _requirementsTextEn: {state: true},
            _responsibilitiesTextEn: {state: true},
            _requiredQualificationTextEn: {state: true},
            _weOfferTextEn: {state: true},
            _isSubmitting: {state: true},
            optionalContent: {Boolean},
        };
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            if (propName === 'lang') {
                this._i18n.changeLanguage(this.lang);
                this._areaOfInterestItems = this._createAreaOfInterestItems();
            }

            if ((propName === 'lang' || propName === 'langDir') && this.langDir) {
                setOverridesByGlobalCache(this._i18n, this);
            }

            // Pre-populate form fields when an existing form is provided for editing
            if (propName === 'existingForm' && this.existingForm) {
                const d = this.existingForm.additionalData || {};
                this._title = d.title || '';
                this._description = d.description || '';
                this._publishedAt = d.publishedAt || '';
                this._deadline = d.deadline || '';
                this._applicationDeadline = d.applicationDeadline || '';
                this._jobOfferType = this._normalizeJobOfferType(d.jobOfferType, d);
                this._organization = d.organization || '';
                this._organizationId = d.organizationId || '';
                this._companySubmissionId = d.companySubmissionId || '';
                this._companyName = d.companyName || '';
                this._companyData = d.companyData || {};
                this._externalJobUrl = d.externalJobUrl || '';
                this._workLocations = normalizeWorkLocations(d.workLocations);
                this._startDate = d.startDate || '';
                this._weeklyHours = d.weeklyHours || '';
                this._salary = d.salary || '';
                this._contractDuration = d.contractDuration || '';
                this._jobCategory = d.jobCategory || d.jobType || '';
                this._areasOfInterest = normalizeAreaOfInterestValues(
                    d.areasOfInterest ?? d.areaOfInterest,
                );
                this._linkName = d.linkName || '';
                this._linkUrl = d.linkUrl || '';
                this._contactInformation = d.contactInformation || '';
                this._contactInformationEn = d.contactInformationEn || '';
                this._requirementsText = normalizeMultilineValue(d.requirements);
                this._responsibilitiesText = normalizeMultilineValue(d.responsibilities);
                this._requiredQualificationText = normalizeMultilineValue(d.requiredQualification);
                this._weOfferText = normalizeMultilineValue(d.weOffer);
                this._titleEn = d.titleEn || '';
                this._descriptionEn = d.descriptionEn || '';
                this._organizationEn = d.organizationEn || '';
                this._weeklyHoursEn = d.weeklyHoursEn || '';
                this._salaryEn = d.salaryEn || '';
                this._contractDurationEn = d.contractDurationEn || '';
                this._linkNameEn = d.linkNameEn || '';
                this._linkUrlEn = d.linkUrlEn || '';
                this._requirementsTextEn = normalizeMultilineValue(d.requirementsEn);
                this._responsibilitiesTextEn = normalizeMultilineValue(d.responsibilitiesEn);
                this._requiredQualificationTextEn = normalizeMultilineValue(
                    d.requiredQualificationEn,
                );
                this._weOfferTextEn = normalizeMultilineValue(d.weOfferEn);
            }
        });
        super.update(changedProperties);
    }

    /**
     * Returns true when all mandatory fields are filled.
     * @returns {boolean}
     */
    get _isFormValid() {
        const hasJobOwner = this._isInternalJob
            ? this._organization.trim() !== ''
            : this._companySubmissionId.trim() !== '' && this._isExternalJobUrlValid();

        return (
            this._title.trim() !== '' &&
            this._description.trim() !== '' &&
            this._publishedAt.trim() !== '' &&
            this._deadline.trim() !== '' &&
            this._jobOfferType.trim() !== '' &&
            hasJobOwner
        );
    }

    get _isInternalJob() {
        return this._jobOfferType === JOB_OFFER_TYPE_INTERNAL;
    }

    get _isExternalJob() {
        return this._jobOfferType === JOB_OFFER_TYPE_EXTERNAL;
    }

    _isExternalJobUrlValid() {
        return normalizeHttpUrl(this._externalJobUrl) !== '';
    }

    _handleWeeklyHoursInput(event) {
        const inputElement = event?.target;
        const rawValue = String(inputElement?.value ?? '').trim();

        if (rawValue === '') {
            this._weeklyHours = '';
            return;
        }
        const numericValue = Number(rawValue.replace(',', '.'));
        const normalizedValue =
            Number.isFinite(numericValue) && numericValue > 99 ? '99' : rawValue;

        if (inputElement) {
            inputElement.value = normalizedValue;
        }

        this._weeklyHours = normalizedValue;
    }

    _normalizeJobOfferType(value, data = {}) {
        if (JOB_OFFER_TYPES.includes(value)) {
            return value;
        }

        return data.companySubmissionId && !data.organization
            ? JOB_OFFER_TYPE_EXTERNAL
            : JOB_OFFER_TYPE_INTERNAL;
    }

    /** Resets all form fields to empty defaults. */
    resetForm() {
        this._title = '';
        this._description = '';
        this._publishedAt = '';
        this._deadline = '';
        this._applicationDeadline = '';
        this._jobOfferType = JOB_OFFER_TYPE_INTERNAL;
        this._organization = '';
        this._organizationId = '';
        this._companySubmissionId = '';
        this._companyName = '';
        this._companyData = {};
        this._externalJobUrl = '';
        this._workLocations = [];
        this._startDate = '';
        this._weeklyHours = '';
        this._salary = '';
        this._contractDuration = '';
        this._jobCategory = '';
        this._areasOfInterest = [];
        this._linkName = '';
        this._linkUrl = '';
        this._contactInformation = '';
        this._contactInformationEn = '';
        this._requirementsText = '';
        this._responsibilitiesText = '';
        this._requiredQualificationText = '';
        this._weOfferText = '';
        this._titleEn = '';
        this._descriptionEn = '';
        this._organizationEn = '';
        this._weeklyHoursEn = '';
        this._salaryEn = '';
        this._contractDurationEn = '';
        this._linkNameEn = '';
        this._linkUrlEn = '';
        this._requirementsTextEn = '';
        this._responsibilitiesTextEn = '';
        this._requiredQualificationTextEn = '';
        this._weOfferTextEn = '';
        this._isSubmitting = false;
    }

    /**
     * Splits the requirements text area into a trimmed array of non-empty lines.
     * @returns {string[]}
     */
    _parseRequirements() {
        return parseMultilineList(this._requirementsText);
    }

    /**
     * Splits the English requirements text area into a trimmed array of non-empty lines.
     * @returns {string[]}
     */
    _parseRequirementsEn() {
        return parseMultilineList(this._requirementsTextEn);
    }

    /**
     * Splits the English responsibilities text area into a trimmed array of non-empty lines.
     * @returns {string[]}
     */
    _parseResponsibilitiesEn() {
        return parseMultilineList(this._responsibilitiesTextEn);
    }

    /**
     * Splits the responsibilities text area into a trimmed array of non-empty lines.
     * @returns {string[]}
     */
    _parseResponsibilities() {
        return parseMultilineList(this._responsibilitiesText);
    }

    /**
     * Splits the required qualification text area into a trimmed array of non-empty lines.
     * @returns {string[]}
     */
    _parseRequiredQualification() {
        return parseMultilineList(this._requiredQualificationText);
    }

    /**
     * Splits the English required qualification text area into a trimmed array of non-empty lines.
     * @returns {string[]}
     */
    _parseRequiredQualificationEn() {
        return parseMultilineList(this._requiredQualificationTextEn);
    }

    /**
     * Splits the we-offer text area into a trimmed array of non-empty lines.
     * @returns {string[]}
     */
    _parseWeOffer() {
        return parseMultilineList(this._weOfferText);
    }

    /**
     * Splits the English we-offer text area into a trimmed array of non-empty lines.
     * @returns {string[]}
     */
    _parseWeOfferEn() {
        return parseMultilineList(this._weOfferTextEn);
    }

    /**
     * Resolves the display name of the selected company from the submission-select element.
     *
     * Prefers the element's own label resolution for the matching submission, falling back to
     * the selected option's text content. Returns an empty string when no company is selected.
     *
     * @param {HTMLElement} selectElement - The dbp-submission-select-element that emitted the change.
     * @param {string} submissionId - The identifier of the selected company submission.
     * @returns {string}
     */
    _resolveCompanyName(selectElement, submissionId) {
        if (!submissionId) {
            return '';
        }

        // Prefer the element's own label resolution from its loaded submissions.
        const submissions = selectElement?.submissions;
        if (Array.isArray(submissions) && typeof selectElement.getSubmissionLabel === 'function') {
            const match = submissions.find(
                (submission) => selectElement.getSubmissionValue(submission) === submissionId,
            );
            if (match) {
                return selectElement.getSubmissionLabel(match);
            }
        }

        // Fall back to the text of the currently selected option.
        const selectedOption =
            selectElement?.shadowRoot?.querySelector('option[selected]') ??
            selectElement?.shadowRoot?.querySelector(`option[value="${submissionId}"]`);

        return selectedOption?.textContent?.trim() ?? '';
    }

    _resolveCompanyData(selectElement, submissionId) {
        if (!submissionId) {
            return {};
        }

        const submissions = selectElement?.submissions;
        if (
            !Array.isArray(submissions) ||
            typeof selectElement.parseDataFeedElement !== 'function'
        ) {
            return {};
        }

        const match = submissions.find(
            (submission) => selectElement.getSubmissionValue(submission) === submissionId,
        );

        return match ? selectElement.parseDataFeedElement(match.dataFeedElement) : {};
    }

    _parseCompanyDataFeedElement(dataFeedElement) {
        if (!dataFeedElement) {
            return {};
        }

        if (typeof dataFeedElement === 'object') {
            return dataFeedElement;
        }

        try {
            return JSON.parse(dataFeedElement);
        } catch (error) {
            console.warn('Failed to parse company submission dataFeedElement:', error);
            return {};
        }
    }

    async _refreshSelectedCompany() {
        if (!this._isExternalJob) {
            return;
        }

        const submissionId = this._companySubmissionId.trim();
        if (!submissionId) {
            this._companyName = '';
            this._companyData = {};
            return;
        }

        if (this.entryPointUrl && this.auth?.token) {
            const submissionPath = submissionId.startsWith('/formalize/submissions/')
                ? submissionId
                : `/formalize/submissions/${submissionId}`;

            try {
                const response = await fetch(this.entryPointUrl + submissionPath, {
                    headers: {
                        'Content-Type': 'application/ld+json',
                        Authorization: `Bearer ${this.auth.token}`,
                    },
                });

                if (response.ok) {
                    const companyData = this._parseCompanyDataFeedElement(
                        (await response.json()).dataFeedElement,
                    );
                    const companyName = companyData?.name ?? companyData?.companyName;

                    this._companyData = companyData;
                    this._companyName = Array.isArray(companyName)
                        ? companyName.join(', ')
                        : companyName && typeof companyName === 'object'
                          ? JSON.stringify(companyName)
                          : String(companyName || submissionId);
                    return;
                }

                console.warn(
                    `Failed to refresh company submission. Response status: ${response.status}`,
                );
            } catch (error) {
                console.warn('Failed to refresh company submission:', error);
            }
        }

        const selectElement = this.shadowRoot?.querySelector(
            'dbp-submission-select-element[name="company-submission"]',
        );
        const companyName = this._resolveCompanyName(selectElement, submissionId);
        const companyData = this._resolveCompanyData(selectElement, submissionId);

        if (companyName) {
            this._companyName = companyName;
        }

        if (Object.keys(companyData).length > 0) {
            this._companyData = companyData;
        }
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
                timeout: 0,
                targetNotificationId: 'edit-form-dialog-notification',
            });
            return null;
        }

        this._isSubmitting = true;

        await this._refreshSelectedCompany();

        // JSON Schema for validating job application submissions
        const dataFeedSchema = JSON.stringify({
            title: 'JobApplication',
            type: 'object',
            additionalProperties: false,
            files: {
                [JOB_APPLICATION_ATTACHMENT_GROUP]: {
                    minNumber: 0,
                    maxNumber: JOB_APPLICATION_ATTACHMENT_LIMIT,
                    maxSizeMb: JOB_APPLICATION_ATTACHMENT_MAX_SIZE_MB,
                    allowedMimeTypes: JOB_APPLICATION_ATTACHMENT_ALLOWED_MIME_TYPES,
                },
            },
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
            applicationDeadline: this._applicationDeadline.trim(),
            jobOfferType: this._jobOfferType,
            organization: this._isInternalJob ? this._organization.trim() : '',
            organizationId: this._isInternalJob ? this._organizationId.trim() : '',
            companySubmissionId: this._isExternalJob ? this._companySubmissionId.trim() : '',
            companyName: this._isExternalJob ? this._companyName.trim() : '',
            companyData: this._isExternalJob ? this._companyData : {},
            externalJobUrl: this._isExternalJob ? normalizeHttpUrl(this._externalJobUrl) : '',
            workLocations: this._isExternalJob
                ? this._workLocations
                : getDefaultInternalWorkLocations(),
            startDate: this._startDate.trim(),
            weeklyHours: this._weeklyHours.trim(),
            salary: this._salary.trim(),
            contractDuration: this._contractDuration.trim(),
            jobCategory: this._jobCategory,
            areasOfInterest: this._areasOfInterest,
            linkName: this._linkName.trim(),
            linkUrl: this._linkUrl.trim(),
            contactInformation: this._contactInformation.trim(),
            contactInformationEn: this._contactInformationEn.trim(),
            requirements: this._parseRequirements(),
            responsibilities: this._parseResponsibilities(),
            requiredQualification: this._parseRequiredQualification(),
            weOffer: this._parseWeOffer(),
            titleEn: this._titleEn.trim(),
            descriptionEn: this._descriptionEn.trim(),
            organizationEn: this._isInternalJob ? this._organizationEn.trim() : '',
            weeklyHoursEn: this._weeklyHoursEn.trim(),
            salaryEn: this._salaryEn.trim(),
            contractDurationEn: this._contractDurationEn.trim(),
            linkNameEn: this._linkNameEn.trim(),
            linkUrlEn: this._linkUrlEn.trim(),
            requirementsEn: this._parseRequirementsEn(),
            responsibilitiesEn: this._parseResponsibilitiesEn(),
            requiredQualificationEn: this._parseRequiredQualificationEn(),
            weOfferEn: this._parseWeOfferEn(),
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
        const notificationOptions = {
            errorNotificationTargetId: 'edit-form-dialog-notification',
        };

        try {
            let result;
            if (isEditMode) {
                result = await apiUpdateForm(
                    host,
                    this.existingForm.formId,
                    formData,
                    notificationOptions,
                );
            } else {
                result = await apiCreateForm(host, formData, notificationOptions);
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
        keepJobOfferAttachmentTranslations(t);
        const jobTypeItems = {
            [JOB_OFFER_TYPE_INTERNAL]: t('manage-job-offers.job-type-internal'),
            [JOB_OFFER_TYPE_EXTERNAL]: t('manage-job-offers.job-type-external'),
        };
        const jobCategoryItems = getJobCategoryItems(t, t('manage-job-offers.select-placeholder'));
        const multilineHint = t('manage-job-offers.field-list-items-hint');
        const descriptionMaxLengthNote = t('manage-job-offers.field-description-max-length');
        const areaOfInterestPlaceholder = {
            [this.lang]: t('manage-job-offers.field-area-of-interest-placeholder'),
        };

        return html`
            <div class="mandatory">
                <div>
                    <h3 class="legend-title">
                        ${t('manage-job-offers.mandatory-data')}
                    </h3>
                    <hr />
                </div>
                <dbp-enum-element
                    class="job-offer-type-field"
                    name="job-offer-type"
                    lang="${this.lang}"
                    label="${t('manage-job-offers.field-job-type')}"
                    display-mode="list"
                    layout-type="inline"
                    .items="${jobTypeItems}"
                    .value="${this._jobOfferType}"
                    required
                    @change="${(e) => (this._jobOfferType = e.detail.value)}"></dbp-enum-element>

                ${
                    this._isInternalJob
                        ? html`
                              <div class="organization-field">
                                  <label>
                                      ${t('manage-job-offers.field-organization')}
                                      <span class="required-star" aria-hidden="true">*</span>
                                  </label>
                                  <dbp-resource-select
                                      name="organization"
                                      lang="${this.lang}"
                                      resource-path="/base/organizations?perPage=99999"
                                      entry-point-url="${this.entryPointUrl}"
                                      .auth="${this.auth}"
                                      .value="${
                                          this._organizationId
                                              ? `/base/organizations/${this._organizationId}`
                                              : null
                                      }"
                                      @change="${(e) => {
                                          // Store both the OE identifier and its display name.
                                          const obj = e.detail?.object;
                                          const rawValue = e.detail?.value ?? e.target?.value ?? '';
                                          this._organizationId = rawValue.startsWith(
                                              '/base/organizations/',
                                          )
                                              ? rawValue.replace('/base/organizations/', '')
                                              : rawValue;
                                          this._organization = obj?.name ?? rawValue;
                                      }}"></dbp-resource-select>
                              </div>
                          `
                        : html`
                              <dbp-submission-select-element
                                  name="company-submission"
                                  lang="${this.lang}"
                                  label="${t('manage-job-offers.field-company')}"
                                  entry-point-url="${this.entryPointUrl}"
                                  frontend-key="bulletin-company"
                                  submission-element-name="name"
                                  .auth="${this.auth}"
                                  .value="${this._companySubmissionId}"
                                  required
                                  @change="${(e) => {
                                      this._companySubmissionId = e.detail.value;
                                      // Store the display name of the selected company so it can still be shown
                                      // in the detail view even after the company submission is deleted.
                                      this._companyName = this._resolveCompanyName(
                                          e.target,
                                          e.detail.value,
                                      );
                                      this._companyData = this._resolveCompanyData(
                                          e.target,
                                          e.detail.value,
                                      );
                                  }}"></dbp-submission-select-element>

                              <dbp-string-element
                                  name="external-job-url"
                                  lang="${this.lang}"
                                  label="${t('manage-job-offers.field-external-job-url')}"
                                  placeholder="${t(
                                      'manage-job-offers.field-external-job-url-placeholder',
                                  )}"
                                  type="url"
                                  .value="${this._externalJobUrl}"
                                  required
                                  @change="${(e) =>
                                      (this._externalJobUrl =
                                          e.detail.value)}"></dbp-string-element>
                          `
                }
                <div class="translation-row">
                    <dbp-string-element
                        name="title"
                        lang="${this.lang}"
                        label="${t('manage-job-offers.field-job-title')}"
                        .value="${this._title}"
                        required
                        @change="${(e) => (this._title = e.detail.value)}"></dbp-string-element>

                    <dbp-string-element
                        name="title-en"
                        lang="${this.lang}"
                        label="${t('manage-job-offers.field-job-title-en')}"
                        .value="${this._titleEn}"
                        @change="${(e) => (this._titleEn = e.detail.value)}"></dbp-string-element>
                </div>

                <div class="translation-row">
                    <div class="field-with-note">
                        <dbp-string-element
                            name="description"
                            lang="${this.lang}"
                            label="${t('manage-job-offers.field-description')}"
                            placeholder="${t('manage-job-offers.field-description-placeholder')}"
                            .value="${this._description}"
                            rows="5"
                            maxlength="${JOB_DESCRIPTION_MAX_LENGTH}"
                            required
                            @change="${(e) =>
                                (this._description = e.detail.value)}"></dbp-string-element>
                        <div class="field-note">${descriptionMaxLengthNote}</div>
                    </div>

                    <div class="field-with-note">
                        <dbp-string-element
                            name="description-en"
                            lang="${this.lang}"
                            label="${t('manage-job-offers.field-description-en')}"
                            .value="${this._descriptionEn}"
                            rows="5"
                            maxlength="${JOB_DESCRIPTION_MAX_LENGTH}"
                            @change="${(e) =>
                                (this._descriptionEn = e.detail.value)}"></dbp-string-element>
                        <div class="field-note">${descriptionMaxLengthNote}</div>
                    </div>
                </div>
                ${
                    this._isInternalJob
                        ? null
                        : html`
                              <dbp-work-locations-element
                                  lang="${this.lang}"
                                  lang-dir="${this.langDir}"
                                  .value="${this._workLocations}"
                                  @change="${(e) =>
                                      (this._workLocations = normalizeWorkLocations(
                                          e.detail.value,
                                      ))}"></dbp-work-locations-element>
                          `
                }
                <div class="translation-row">
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

                    <dbp-number-element
                        name="weekly-hours"
                        lang="${this.lang}"
                        label="${t('manage-job-offers.field-weekly-hours')}"
                        type="number"
                        min="0"
                        max="99"
                        step="0.5"
                        required
                        .value="${this._weeklyHours}"
                        @input="${this._handleWeeklyHoursInput}"
                        @change="${(e) => (this._weeklyHours = e.detail.value)}"></dbp-number-element>
                    
                    <dbp-date-element
                        name="application-deadline"
                        lang="${this.lang}"
                        label="${t('manage-job-offers.field-application-deadline')}"
                        .value="${this._applicationDeadline}"
                        @change="${(e) =>
                            (this._applicationDeadline = e.detail.value)}"></dbp-date-element>

            </div>
                        
            </div>
            <div id="optional-data-wrapper" class="optional-data-wrapper">
                <button
                    id="optional-button"
                    class="optional-button"
                    tabindex="0"
                    @click="${() => (this.optionalContent = !this.optionalContent)}"
                    aria-label="Optional Data"
                    aria-expanded="${this.optionalContent}">
                    <h3>
                        ${t('manage-job-offers.optional-data')}
                    </h3>

                    <dbp-icon
                        class="optional-data-icon ${this.optionalContent ? 'rotated' : ''}"
                        name="chevron-down"
                        aria-hidden="true"></dbp-icon>
                </button>
                <hr />
                <div
                    class="content
                    ${this.optionalContent ? 'optional-data-visible' : 'optional-data-hidden'}">
                   
                    <div class="half-col">
                        <dbp-date-element
                            name="start-date"
                            lang="${this.lang}"
                            label="${t('manage-job-offers.field-start-date')}"
                            .value="${this._startDate}"
                            @change="${(e) =>
                                (this._startDate = e.detail.value)}"></dbp-date-element>
                    </div>
                       
                    <div class="translation-row">
                        <dbp-string-element
                            name="salary"
                            lang="${this.lang}"
                            label="${t('manage-job-offers.field-salary')}"
                            .value="${this._salary}"
                            @change="${(e) =>
                                (this._salary = e.detail.value)}"></dbp-string-element>

                        <dbp-string-element
                            name="salary-en"
                            lang="${this.lang}"
                            label="${t('manage-job-offers.field-salary-en')}"
                            .value="${this._salaryEn}"
                            @change="${(e) =>
                                (this._salaryEn = e.detail.value)}"></dbp-string-element>
                    </div>

                    <div class="translation-row">
                        <dbp-string-element
                            name="contract-duration"
                            lang="${this.lang}"
                            label="${t('manage-job-offers.field-contract-duration')}"
                            .value="${this._contractDuration}"
                            @change="${(e) =>
                                (this._contractDuration = e.detail.value)}"></dbp-string-element>

                        <dbp-string-element
                            name="contract-duration-en"
                            lang="${this.lang}"
                            label="${t('manage-job-offers.field-contract-duration-en')}"
                            .value="${this._contractDurationEn}"
                            @change="${(e) =>
                                (this._contractDurationEn = e.detail.value)}"></dbp-string-element>
                    </div>
                    <div >
                        <dbp-enum-element
                            name="job-category"
                            lang="${this.lang}"
                            label="${t('manage-job-offers.field-job-category')}"
                            .items="${jobCategoryItems}"
                            .value="${this._jobCategory}"
                            @change="${(e) =>
                                (this._jobCategory = e.detail.value)}"></dbp-enum-element>

                        <dbp-enum-element
                            name="area-of-interest"
                            lang="${this.lang}"
                            label="${t('manage-job-offers.field-area-of-interest')}"
                            multiple
                            display-mode="tags"
                            .tagPlaceholder="${areaOfInterestPlaceholder}"
                            .items="${this._areaOfInterestItems}"
                            .value="${this._areasOfInterest}"
                            @change="${(e) => {
                                const nextAreasOfInterest = normalizeAreaOfInterestValues(
                                    e.detail.value,
                                );

                                // Avoid rewriting the same selection and retriggering Select2.
                                if (
                                    !areStringArraysEqual(
                                        this._areasOfInterest,
                                        nextAreasOfInterest,
                                    )
                                ) {
                                    this._areasOfInterest = nextAreasOfInterest;
                                }
                            }}"></dbp-enum-element>
                    </div>
                    <div class="translation-row">
                        <dbp-string-element
                            name="requirements"
                            lang="${this.lang}"
                            label="${t('manage-job-offers.field-requirements')}"
                            description="${multilineHint}"
                            .value="${this._requirementsText}"
                            rows="4"
                            @change="${(e) =>
                                (this._requirementsText = e.detail.value)}"></dbp-string-element>

                        <dbp-string-element
                            name="requirements-en"
                            lang="${this.lang}"
                            label="${t('manage-job-offers.field-requirements-en')}"
                            description="${multilineHint}"
                            .value="${this._requirementsTextEn}"
                            rows="4"
                            @change="${(e) =>
                                (this._requirementsTextEn = e.detail.value)}"></dbp-string-element>
                    </div>

                    <div class="translation-row">
                        <dbp-string-element
                            name="responsibilities"
                            lang="${this.lang}"
                            label="${t('manage-job-offers.field-responsibilities')}"
                            description="${multilineHint}"
                            .value="${this._responsibilitiesText}"
                            rows="4"
                            @change="${(e) =>
                                (this._responsibilitiesText =
                                    e.detail.value)}"></dbp-string-element>

                        <dbp-string-element
                            name="responsibilities-en"
                            lang="${this.lang}"
                            label="${t('manage-job-offers.field-responsibilities-en')}"
                            description="${multilineHint}"
                            .value="${this._responsibilitiesTextEn}"
                            rows="4"
                            @change="${(e) =>
                                (this._responsibilitiesTextEn =
                                    e.detail.value)}"></dbp-string-element>
                    </div>

                    <div class="translation-row">
                        <dbp-string-element
                            name="required-qualification"
                            lang="${this.lang}"
                            label="${t('manage-job-offers.field-required-qualification')}"
                            description="${multilineHint}"
                            .value="${this._requiredQualificationText}"
                            rows="4"
                            @change="${(e) =>
                                (this._requiredQualificationText =
                                    e.detail.value)}"></dbp-string-element>

                        <dbp-string-element
                            name="required-qualification-en"
                            lang="${this.lang}"
                            label="${t('manage-job-offers.field-required-qualification-en')}"
                            description="${multilineHint}"
                            .value="${this._requiredQualificationTextEn}"
                            rows="4"
                            @change="${(e) =>
                                (this._requiredQualificationTextEn =
                                    e.detail.value)}"></dbp-string-element>
                    </div>

                    <div class="translation-row">
                        <dbp-string-element
                            name="we-offer"
                            lang="${this.lang}"
                            label="${t('manage-job-offers.field-we-offer')}"
                            description="${multilineHint}"
                            .value="${this._weOfferText}"
                            rows="4"
                            @change="${(e) =>
                                (this._weOfferText = e.detail.value)}"></dbp-string-element>

                        <dbp-string-element
                            name="we-offer-en"
                            lang="${this.lang}"
                            label="${t('manage-job-offers.field-we-offer-en')}"
                            description="${multilineHint}"
                            .value="${this._weOfferTextEn}"
                            rows="4"
                            @change="${(e) =>
                                (this._weOfferTextEn = e.detail.value)}"></dbp-string-element>
                    </div>

                    <div class="translation-row">
                        <dbp-string-element
                            name="link-name"
                            lang="${this.lang}"
                            label="${t('manage-job-offers.field-link-name')}"
                            placeholder="${t('manage-job-offers.field-link-name-placeholder')}"
                            .value="${this._linkName}"
                            @change="${(e) =>
                                (this._linkName = e.detail.value)}"></dbp-string-element>

                        <dbp-string-element
                            name="link-name-en"
                            lang="${this.lang}"
                            label="${t('manage-job-offers.field-link-name-en')}"
                            .value="${this._linkNameEn}"
                            @change="${(e) =>
                                (this._linkNameEn = e.detail.value)}"></dbp-string-element>
                    </div>

                    <div class="translation-row">
                        <dbp-string-element
                            name="link-url"
                            lang="${this.lang}"
                            label="${t('manage-job-offers.field-link-url')}"
                            placeholder="${t('manage-job-offers.field-link-url-placeholder')}"
                            .value="${this._linkUrl}"
                            @change="${(e) =>
                                (this._linkUrl = e.detail.value)}"></dbp-string-element>

                        <dbp-string-element
                            name="link-url-en"
                            lang="${this.lang}"
                            label="${t('manage-job-offers.field-link-url-en')}"
                            placeholder="${t('manage-job-offers.field-link-url-placeholder')}"
                            .value="${this._linkUrlEn}"
                            @change="${(e) =>
                                (this._linkUrlEn = e.detail.value)}"></dbp-string-element>
                    </div>

                    <div class="translation-row">
                        <dbp-string-element
                            name="contact-information"
                            lang="${this.lang}"
                            label="${t('manage-job-offers.field-contact-information')}"
                            .value="${this._contactInformation}"
                            rows="3"
                            @change="${(e) =>
                                (this._contactInformation = e.detail.value)}"></dbp-string-element>

                        <dbp-string-element
                            name="contact-information-en"
                            lang="${this.lang}"
                            label="${t('manage-job-offers.field-contact-information-en')}"
                            .value="${this._contactInformationEn}"
                            rows="3"
                            @change="${(e) =>
                                (this._contactInformationEn =
                                    e.detail.value)}"></dbp-string-element>
                    </div>
                </div>
            </div>
            </div>
        `;
    }

    static get styles() {
        return css`
            ${commonStyles.getThemeCSS()}
            ${commonStyles.getGeneralCSS()}

            :host {
                display: block;
            }

            .translation-row {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 0 1rem;
            }

            .required-field-note {
                color: var(--dbp-muted);
                font-size: 0.875rem;
                line-height: 1.4;
                margin: 0 0 0.75rem;
            }

            .field-with-note {
                min-width: 0;
            }

            .field-note {
                color: var(--dbp-muted);
                font-size: 0.875rem;
                line-height: 1.4;
                margin: -0.35rem 0 0.75rem;
            }

            .translation-row dbp-string-element {
                margin-bottom: 0;
            }

            .mandatory,
            .optional-data-wrapper {
                padding-right: 0.5rem;
            }

            .mandatory-date-wrapper,
            .half-col {
                width: 50%;
            }

            .mandatory-date-wrapper *,
            .half-col * {
                padding-right: 0.5rem;
                font-weight: 300;
            }

            .mandatory-date-wrapper input {
                font-weight: 300;
            }

            h3 {
                margin: 0px;
                font-size: 1.3rem;
                font-weight: 400;
            }

            #optional-data-wrapper {
                margin-top: 25px;
            }

            .optional-button {
                background-color: var(--dbp-background);
                border: none;
                display: flex;
                justify-content: space-between;
                width: 100%;
                box-sizing: border-box;
                padding: 0;
                cursor: pointer;
            }
            hr {
                margin-top: 0;
            }

            .optional-data-icon {
                color: var(--dbp-accent);
                font-size: 1.3em;
                transition: transform 0.2s ease;
            }

            .optional-data-icon.rotated {
                transform: rotate(180deg);
            }

            .optional-data-visible {
                display: block;
                transition: transform 0.2s ease;
            }

            .optional-data-hidden {
                display: none;
                transition: transform 0.2s ease;
            }

            @media (max-width: 900px) {
                .translation-row {
                    grid-template-columns: 1fr;
                    gap: 0;
                }
            }

            /* Vertical spacing between form elements */
            dbp-string-element,
            dbp-date-element,
            dbp-enum-element,
            dbp-submission-select-element,
            dbp-number-element {
                display: block;
            }

            .organization-field,
            .job-offer-type-field {
                margin: 10px 0;
            }

            /* Required field asterisk — matches dbp form element convention */
            .required-star {
                color: var(--dbp-danger, red);
            }
        `;
    }
}

export class JobOfferFormElement extends BaseFormElement {
    constructor() {
        super();
        this.jobCategories = JOB_CATEGORIES;
        this.areasOfInterest = AREAS_OF_INTEREST;
        this.job = null;

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
        this._attachmentLimitNotified = false;
        this._applicationDataFeedSchema = '';

        this._isSubmitting = false;
        /** @type {boolean} True after a successful submission or when a prior submission is detected on open */
        this._hasApplied = false;
        /** @type {boolean} True while the prior-submission check is in progress */
        this._checkingApplied = false;

        this.getOrCreateFileGroup(JOB_APPLICATION_ATTACHMENT_GROUP);
    }

    static get properties() {
        return {
            ...super.properties,
            job: {type: Object},
            notificationTargetId: {type: String, attribute: 'notification-target-id'},
            _applicationDataFeedSchema: {state: true},
            _isSubmitting: {state: true},
            _hasApplied: {state: true},
            _checkingApplied: {state: true},
        };
    }

    async update(changedProperties) {
        await super.update(changedProperties);

        const formIdentifierChanged = changedProperties.has('formIdentifier');
        const jobChanged = changedProperties.has('job');
        const authContextChanged =
            changedProperties.has('auth') &&
            hasSubmissionCheckContextChanged(changedProperties.get('auth'), this.auth);

        if (formIdentifierChanged || jobChanged) {
            this._applicationDataFeedSchema = this.job?.dataFeedSchema ?? '';
        }

        if (this._isExternalJobOffer) {
            this._hasApplied = false;
            this._checkingApplied = false;
            return;
        }

        if (formIdentifierChanged || jobChanged || authContextChanged) {
            this._loadApplicationFormSchema();
        }

        // Only re-check when the active job or the logged-in user changes.
        // Token refreshes keep the same user context and must not tear down the form mid-edit.
        if (formIdentifierChanged || authContextChanged) {
            this._hasApplied = false;
            this._checkingApplied = false;

            if (this.formIdentifier && this.auth?.token && this.auth?.['user-id']) {
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
        const token = this.auth?.token;
        const formIdentifier = this.formIdentifier;

        if (!userId || !formIdentifier || !this.entryPointUrl || !token) {
            return;
        }

        this._checkingApplied = true;

        try {
            const url =
                `${this.entryPointUrl}/formalize/submissions` +
                `?formIdentifier=${encodeURIComponent(formIdentifier)}` +
                `&perPage=1` +
                `&creatorIdEquals=${encodeURIComponent(userId)}`;

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (response.ok) {
                const data = await response.json();
                const members = data['hydra:member'] ?? [];
                if (this.formIdentifier === formIdentifier && this.auth?.['user-id'] === userId) {
                    this._hasApplied = members.length > 0;
                }
            }
        } catch (error) {
            // Non-fatal: if the check fails we simply show the form as normal
            console.error('Error checking prior application:', error);
        } finally {
            if (this.formIdentifier === formIdentifier && this.auth?.['user-id'] === userId) {
                this._checkingApplied = false;
            }
        }
    }

    connectedCallback() {
        super.connectedCallback();

        this.updateComplete.then(() => {
            this.addEventListener(
                'dbp-file-source-file-selected',
                this._handleAttachmentFilesSelected,
            );

            // Listen for the form submission event dispatched by sendSubmission() in base class
            this.addEventListener('DbpFormalizeFormSubmission', async (event) => {
                await this._handleSubmission(event.detail);
            });
        });
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.removeEventListener(
            'dbp-file-source-file-selected',
            this._handleAttachmentFilesSelected,
        );
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

    _getAttachmentGroupData() {
        return this.getOrCreateFileGroup(JOB_APPLICATION_ATTACHMENT_GROUP);
    }

    async _loadApplicationFormSchema() {
        const formIdentifier = this.formIdentifier;

        if (!formIdentifier || !this.entryPointUrl || !this.auth?.token) {
            return;
        }

        try {
            const response = await fetch(
                `${this.entryPointUrl}/formalize/forms/${formIdentifier}`,
                {
                    headers: {
                        'Content-Type': 'application/ld+json',
                        Authorization: `Bearer ${this.auth.token}`,
                    },
                },
            );

            if (!response.ok) {
                return;
            }

            const data = await response.json();
            if (this.formIdentifier === formIdentifier) {
                this._applicationDataFeedSchema = data.dataFeedSchema ?? '';
            }
        } catch (error) {
            console.error('Error loading job application form schema:', error);
        }
    }

    _supportsApplicationAttachments() {
        const dataFeedSchema =
            this._applicationDataFeedSchema ??
            this.job?.dataFeedSchema ??
            this.formProperties?.dataFeedSchema ??
            '';

        if (!dataFeedSchema) {
            return false;
        }

        try {
            const schema = JSON.parse(dataFeedSchema);
            return Boolean(schema?.files?.[JOB_APPLICATION_ATTACHMENT_GROUP]);
        } catch (error) {
            console.error('Failed to parse job application file schema:', error);
            return false;
        }
    }

    _openAttachmentPicker(event) {
        event.preventDefault();

        if (!this._supportsApplicationAttachments()) {
            return;
        }

        this.currentUploadGroup = JOB_APPLICATION_ATTACHMENT_GROUP;
        this._attachmentLimitNotified = false;
        const fileSource = this._('#file-source');
        if (fileSource) {
            fileSource.setAttribute('dialog-open', '');
        }
    }

    _notifyAttachmentLimitReached() {
        if (this._attachmentLimitNotified) {
            return;
        }

        const t = (key, opts) => this._i18n.t(key, opts);
        this._attachmentLimitNotified = true;
        sendNotification({
            summary: t('job-offer-detail.notification.submit-error-heading'),
            body: t('job-offer-detail.notification.attachment-limit-body', {
                count: JOB_APPLICATION_ATTACHMENT_LIMIT,
            }),
            type: 'warning',
            timeout: 0,
            replaceId: 'dbp-notification-apply',
            targetNotificationId: this.notificationTargetId,
        });
    }

    _handleAttachmentFilesSelected(event) {
        if (!this._supportsApplicationAttachments()) {
            return;
        }

        const groupData = this._getAttachmentGroupData();

        if (groupData.filesToSubmit.size >= JOB_APPLICATION_ATTACHMENT_LIMIT) {
            this._notifyAttachmentLimitReached();
            return;
        }

        super.handleFilesToSubmit(event);
        this._attachmentLimitNotified = false;
    }

    _handleAttachmentPickerClosed(event) {
        if (event.detail.id !== 'modal-picker-dialog') {
            return;
        }

        event.stopPropagation();
    }

    deleteAttachment(fileIdentifier, fileGroup = JOB_APPLICATION_ATTACHMENT_GROUP) {
        super.deleteAttachment(fileIdentifier, fileGroup);
        this._attachmentLimitNotified = false;
    }

    _handlePdfPreviewClosed(event) {
        event.stopPropagation();
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
     * @returns {(value: string) => string[]}
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
     * @returns {(value: string) => string[]}
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

    get _isExternalJobOffer() {
        return this.job?.jobOfferType === JOB_OFFER_TYPE_EXTERNAL;
    }

    _getExternalJobUrl() {
        return normalizeHttpUrl(this.job?.externalJobUrl ?? '');
    }

    /**
     * Returns the English value when the current language is English and a translation exists.
     * @param {string} primary
     * @param {string} en
     * @returns {string}
     */
    _localized(primary, en = '') {
        return this.lang === 'en' && en ? en : primary;
    }

    /**
     * Returns the English list when the current language is English and translated items exist.
     * @param {unknown} primary
     * @param {unknown} en
     * @returns {unknown}
     */
    _localizedList(primary, en) {
        return this.lang === 'en' && normalizeStringList(en).length > 0 ? en : primary;
    }

    /**
     * Formats an ISO date string (YYYY-MM-DD) to DD.MM.YYYY.
     * @param {string} isoDate
     * @returns {string}
     */
    _formatDisplayDate(isoDate) {
        if (!isoDate || !isoDate.includes('-')) {
            return isoDate;
        }

        const [year, month, day] = isoDate.split('-');
        return year && month && day ? `${day}.${month}.${year}` : isoDate;
    }

    /**
     * Renders multiline plain text while preserving line breaks.
     * @param {string} value
     * @param {string} className
     * @returns {import('lit').TemplateResult|string}
     */
    _renderTextWithLineBreaks(value, className) {
        if (!value) {
            return '';
        }

        const lines = value.split(/\r?\n/);
        return html`
            <p class="${className}">
                ${lines.map((line, index) =>
                    index === 0
                        ? line
                        : html`
                              <br />
                              ${line}
                          `,
                )}
            </p>
        `;
    }

    /**
     * Renders a metadata row when a value is present.
     * @param {string} label
     * @param {string|import('lit').TemplateResult} value
     * @returns {import('lit').TemplateResult|string}
     */
    _renderJobMetaItem(label, value) {
        if (!value) {
            return '';
        }

        return html`
            <div class="job-overview-meta-item">
                <dt>${label}:</dt>
                <dd>${value}</dd>
            </div>
        `;
    }

    _renderWorkLocationList(labels) {
        if (!labels.length) {
            return '';
        }

        return html`
            <ul class="job-overview-work-location-list">
                ${labels.map(
                    (label) => html`
                        <li>${label}</li>
                    `,
                )}
            </ul>
        `;
    }

    /**
     * Renders a list section when at least one item is available.
     * @param {string} title
     * @param {unknown} value
     * @returns {import('lit').TemplateResult|string}
     */
    _renderJobListSection(title, value) {
        const items = normalizeStringList(value);
        if (items.length === 0) {
            return '';
        }

        return html`
            <section class="job-overview-section">
                <h5 class="job-overview-section-title">${title}</h5>
                <ul class="job-overview-list">
                    ${items.map(
                        (item) => html`
                            <li>${item}</li>
                        `,
                    )}
                </ul>
            </section>
        `;
    }

    /**
     * Renders a summary of the current job above the application form.
     * @returns {import('lit').TemplateResult|string}
     */

    _renderExternalApplication() {
        const t = (key, opts) => this._i18n.t(key, opts);
        const externalJobUrl = this._getExternalJobUrl();

        return html`
            <div class="apply-submit-wrapper">
                <h3>${t('job-offer-detail.external-application-title')}</h3>
                <hr />
                <p class="external-application-text">
                    ${t('job-offer-detail.external-application-text')}
                </p>

                ${
                    externalJobUrl
                        ? html`
                              <a
                                  class="button is-primary external-application-link"
                                  href="${externalJobUrl}"
                                  target="_blank"
                                  rel="noopener noreferrer">
                                  <dbp-icon
                                      class="btn-icon"
                                      name="send-diagonal"
                                      aria-hidden="true"></dbp-icon>
                                  ${t('job-offer-detail.apply-external')}
                              </a>
                          `
                        : html`
                              <p class="external-application-missing">
                                  ${t('job-offer-detail.external-application-missing')}
                              </p>
                          `
                }
            </div>
        `;
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
        const attachmentGroup = this._getAttachmentGroupData();
        const supportsApplicationAttachments = this._supportsApplicationAttachments();

        const postFormData = new FormData();
        postFormData.append('form', '/formalize/forms/' + this.formIdentifier);
        postFormData.append('dataFeedElement', JSON.stringify(formData));
        postFormData.append('submissionState', String(SUBMISSION_STATES_BINARY.SUBMITTED));

        if (supportsApplicationAttachments) {
            attachmentGroup.filesToSubmit.forEach((file) => {
                postFormData.append(`${JOB_APPLICATION_ATTACHMENT_GROUP}[]`, file, file.name);
            });
        }

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
            'dbp-file-source': FileSource,
            'dbp-file-sink': FileSink,
            'dbp-modal': Modal,
            'dbp-pdf-viewer': PdfViewer,
            'dbp-button': Button,
            'dbp-icon': Icon,
        };
    }

    render() {
        const t = (key, opts) => this._i18n.t(key, opts);
        keepJobOfferAttachmentTranslations(t);

        if (this._isExternalJobOffer) {
            return this._renderExternalApplication();
        }

        const supportsApplicationAttachments = this._supportsApplicationAttachments();
        const attachmentGroup = this._getAttachmentGroupData();
        const attachmentCount = attachmentGroup.filesToSubmit.size;

        if (this._checkingApplied) {
            return html`
                <div class="checking-spinner"><dbp-icon name="reload"></dbp-icon></div>
            `;
        }

        if (this._hasApplied) {
            return html`
                <div class="apply-form">
                    <div class="applied-notice">
                        <dbp-icon name="checkmark-circle" class="applied-icon"></dbp-icon>
                        <p class="applied-message">${t('job-offer-detail.already-applied')}</p>
                    </div>
                </div>
            `;
        }

        return html`
            <form @submit="${this._onApplySubmit}" novalidate>
                <div class="apply-submit-wrapper">
                    <h3>${t('job-offer-detail.application-title')}</h3>
                    <hr />
                    <dbp-form-string-element
                        ${ref(this._messageRef)}
                        subscribe="lang"
                        name="freeText"
                        label="${t('job-offer-detail.message')}"
                        .value="${this.formData?.freeText ?? ''}"
                        .customValidator="${this._messageValidator}"
                        rows="4"></dbp-form-string-element>

                    ${
                        supportsApplicationAttachments
                            ? html`
                                  <div class="file-upload-container">
                                      <div class="file-upload-title-container">
                                          <h5 class="attachments-title">
                                              ${t('job-offer-detail.attachments')}
                                          </h5>
                                          <span class="file-upload-limit-warning">
                                              ${t('job-offer-detail.attachments-help', {
                                                  count: JOB_APPLICATION_ATTACHMENT_LIMIT,
                                                  size: JOB_APPLICATION_ATTACHMENT_MAX_SIZE_MB,
                                              })}
                                          </span>
                                      </div>

                                      <div class="uploaded-files">
                                          ${this.renderAttachedFilesHtml(JOB_APPLICATION_ATTACHMENT_GROUP)}
                                      </div>

                                      <button
                                          class="button is-secondary upload-button upload-button--attachment"
                                          type="button"
                                          ?disabled="${
                                              this._isSubmitting ||
                                              attachmentCount >= JOB_APPLICATION_ATTACHMENT_LIMIT
                                          }"
                                          @click="${this._openAttachmentPicker}">
                                          <dbp-icon name="upload" aria-hidden="true"></dbp-icon>
                                          ${t(
                                              'render-form.download-widget.upload-file-button-label',
                                              {
                                                  count: JOB_APPLICATION_ATTACHMENT_LIMIT,
                                              },
                                          )}
                                      </button>
                                  </div>
                              `
                            : ''
                    }

                    <div class="form-footer">
                        <button
                            class="button is-primary"
                            type="submit"
                            ?disabled="${this._isSubmitting}">
                            <dbp-icon
                                class="btn-icon"
                                name="send-diagonal"
                                aria-hidden="true"></dbp-icon>
                            ${t('job-offer-detail.submit')}
                        </button>
                    </div>
                </div>
            </form>

            <dbp-file-source
                id="file-source"
                class="file-source"
                lang="${this.lang}"
                allowed-mime-types="application/pdf"
                max-file-size="${JOB_APPLICATION_ATTACHMENT_MAX_SIZE_KB}"
                number-of-files="${JOB_APPLICATION_ATTACHMENT_LIMIT}"
                enabled-targets="local,clipboard,nextcloud"
                @dbp-modal-closed="${this._handleAttachmentPickerClosed}"
                subscribe="nextcloud-auth-url,nextcloud-web-dav-url,nextcloud-name,nextcloud-file-url"></dbp-file-source>

            <dbp-file-sink
                id="file-sink"
                class="file-sink"
                lang="${this.lang}"
                allowed-mime-types="application/pdf,.pdf"
                enabled-targets="local,clipboard,nextcloud"
                subscribe="nextcloud-auth-url,nextcloud-web-dav-url,nextcloud-name,nextcloud-file-url"></dbp-file-sink>

            <dbp-modal
                id="pdf-view-modal"
                class="pdf-view-modal"
                modal-id="job-application-pdf-viewer"
                @dbp-modal-closed="${this._handlePdfPreviewClosed}"
                subscribe="lang">
                <div slot="content">
                    <dbp-pdf-viewer
                        id="dbp-pdf-viewer"
                        lang="${this.lang}"
                        auto-resize="cover"></dbp-pdf-viewer>
                </div>
            </dbp-modal>
        `;
    }

    static get styles() {
        // language=css
        return [
            super.styles,
            css`
                ${commonStyles.getButtonCSS()}

                fieldset {
                    padding: 0.75rem;
                    display: grid;
                    gap: 0.5em;
                    border: 1px solid var(--dbp-content);
                    padding-bottom: 1rem;
                    margin-top: 1.5rem;
                }

                legend {
                    font-weight: 400;
                    font-size: 1.17em;
                    padding: 0 5px;
                }
                .apply-submit-wrapper {
                    margin-top: 2rem;
                }
                h3 {
                    margin: 0px;
                    font-size: 1.3rem;
                    font-weight: 400;
                }

                hr {
                    margin-top: 0;
                    margin-bottom: 1rem;
                }
                .job-overview {
                    border-bottom: var(--dbp-border);
                    margin-bottom: 1.25rem;
                    padding-bottom: 1.25rem;
                }

                .job-overview-title {
                    font-size: 1.25rem;
                    font-weight: 700;
                    margin: 0 0 0.75rem 0;
                }

                .job-overview-description {
                    margin: 0 0 1rem 0;
                    line-height: 1.5;
                }

                .job-overview-meta-list {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 0.75rem 1rem;
                    margin: 0 0 1rem 0;
                }

                .job-overview-meta-item {
                    display: grid;
                    gap: 0.15rem;
                }

                .job-overview-meta-item dt {
                    color: var(--dbp-content);
                    font-weight: 600;
                }

                .job-overview-meta-item dd {
                    margin: 0;
                }

                .job-overview-work-location-list {
                    margin: 0;
                    padding-left: 1.25rem;
                }

                .job-overview-meta-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                    text-decoration: underline;
                    text-underline-offset: 0.15em;
                }

                .job-overview-section {
                    margin-top: 1rem;
                }

                .job-overview-section-title {
                    font-size: 1rem;
                    font-weight: 700;
                    margin: 0 0 0.5rem 0;
                }

                .job-overview-list {
                    margin: 0;
                    padding-left: 1.25rem;
                }

                .job-overview-tags {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                }

                .job-overview-tag {
                    background: var(--dbp-secondary-surface, #f2f4f7);
                    border: 1px solid var(--dbp-content);
                    border-radius: 2px;
                    font-size: 1rem;
                    padding: 0.25rem 0.75rem;
                    color: var(--dbp-content);
                }

                /* Three-column form row for first name, last name, email */
                .form-row {
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    gap: 1rem;
                    margin-bottom: 0.75rem;
                }

                @media (max-width: 560px) {
                    .job-overview-meta-list {
                        grid-template-columns: 1fr;
                    }

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

                .file-upload-container {
                    margin-top: 1rem;
                }

                .file-upload-title-container {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: baseline;
                    gap: 0.5rem;
                    margin-bottom: 0.75rem;
                }

                .attachments-title {
                    font-size: 1rem;
                    font-weight: 700;
                    margin: 0;
                }

                .file-upload-limit-warning {
                    color: var(--dbp-muted);
                    font-size: 0.9rem;
                }

                .upload-button {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                    margin-top: 0.75rem;
                }

                .uploaded-files .file-block {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) auto;
                    gap: 0.75rem;
                    align-items: center;
                }

                .uploaded-files .file-info {
                    min-width: 0;
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: 0.35rem 0.75rem;
                }

                .uploaded-files .file-name {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;
                }

                .uploaded-files .additional-data {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.35rem 0.75rem;
                }

                .uploaded-files .file-action-buttons {
                    display: flex;
                    flex-wrap: wrap;
                    justify-content: flex-end;
                    gap: 0.5rem;
                    max-width: 100%;
                }

                .uploaded-files .file-action-buttons .button {
                    flex: 0 1 auto;
                    max-width: 100%;
                }

                @media (max-width: 900px) {
                    .uploaded-files .file-block {
                        grid-template-columns: 1fr;
                        align-items: stretch;
                    }

                    .uploaded-files .file-action-buttons {
                        justify-content: flex-start;
                    }
                }

                .form-footer .button {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                }

                .external-application-text {
                    margin: 0 0 1rem 0;
                    line-height: 1.5;
                }

                .external-application-link {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                    width: max-content;
                }

                .external-application-missing {
                    color: var(--dbp-danger);
                    margin: 0;
                }

                .btn-icon {
                    flex-shrink: 0;
                    top: 0;
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
