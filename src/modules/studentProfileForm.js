import {BaseFormElement, BaseObject} from '../../vendor/formalize/src/form/base-object.js';
import {SUBMISSION_STATES_BINARY} from '../../vendor/formalize/src/utils.js';
import {css, html} from 'lit';
import {keyed} from 'lit/directives/keyed.js';
import {DbpDateElement, DbpEnumElement, DbpStringElement} from '@dbp-toolkit/form-elements';
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
const STUDENT_PROFILE_TEASER_MAX_LENGTH = 100;

const parseMultilineList = (value) =>
    String(value ?? '')
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);

const normalizeMultilineValue = (value) => (Array.isArray(value) ? value.join('\n') : value || '');

const normalizeTeaserValue = (value) =>
    String(value ?? '')
        .slice(0, STUDENT_PROFILE_TEASER_MAX_LENGTH)
        .trim();

export const STUDENT_PROFILE_INDUSTRIES = {
    'it-software': 'student-profile-form.industry-it-software',
    'management-consulting': 'student-profile-form.industry-management-consulting',
    'non-university-research': 'student-profile-form.industry-non-university-research',
    'universities-higher-education': 'student-profile-form.industry-universities-higher-education',
    'architecture-engineering-firms':
        'student-profile-form.industry-architecture-engineering-firms',
    'building-civil-construction': 'student-profile-form.industry-building-civil-construction',
    'building-materials': 'student-profile-form.industry-building-materials',
    'wood-furniture': 'student-profile-form.industry-wood-furniture',
    'mechanical-engineering': 'student-profile-form.industry-mechanical-engineering',
    automotive: 'student-profile-form.industry-automotive',
    'rail-vehicles': 'student-profile-form.industry-rail-vehicles',
    'metal-production-processing': 'student-profile-form.industry-metal-production-processing',
    'metal-goods': 'student-profile-form.industry-metal-goods',
    'plant-engineering-environmental-technology':
        'student-profile-form.industry-plant-engineering-environmental-technology',
    'paper-pulp-packaging': 'student-profile-form.industry-paper-pulp-packaging',
    'mining-metallurgy': 'student-profile-form.industry-mining-metallurgy',
    electronics: 'student-profile-form.industry-electronics',
    'electrical-engineering': 'student-profile-form.industry-electrical-engineering',
    'medical-technology': 'student-profile-form.industry-medical-technology',
    'measurement-instruments': 'student-profile-form.industry-measurement-instruments',
    telecommunications: 'student-profile-form.industry-telecommunications',
    'energy-water-supply': 'student-profile-form.industry-energy-water-supply',
    'chemicals-pharma': 'student-profile-form.industry-chemicals-pharma',
    plastics: 'student-profile-form.industry-plastics',
    'physics-chemistry-labs': 'student-profile-form.industry-physics-chemistry-labs',
    'food-beverages': 'student-profile-form.industry-food-beverages',
    'textiles-clothing-leather': 'student-profile-form.industry-textiles-clothing-leather',
    'staffing-recruitment': 'student-profile-form.industry-staffing-recruitment',
    'passenger-freight-transport': 'student-profile-form.industry-passenger-freight-transport',
    'banking-insurance': 'student-profile-form.industry-banking-insurance',
    'publishing-printing': 'student-profile-form.industry-publishing-printing',
    advertising: 'student-profile-form.industry-advertising',
    'retail-trade': 'student-profile-form.industry-retail-trade',
    'agriculture-forestry': 'student-profile-form.industry-agriculture-forestry',
    tourism: 'student-profile-form.industry-tourism',
    'public-administration-healthcare':
        'student-profile-form.industry-public-administration-healthcare',
    'real-estate-rental': 'student-profile-form.industry-real-estate-rental',
    'other-services': 'student-profile-form.industry-other-services',
    'other-manufacturing': 'student-profile-form.industry-other-manufacturing',
};

export const STUDENT_PROFILE_FIELDS = {
    'computer-science-sw-development-business':
        'student-profile-form.field-study-computer-science-sw-development-business',
    'information-and-computer-engineering':
        'student-profile-form.field-study-information-and-computer-engineering',
    architecture: 'student-profile-form.field-study-architecture',
    'civil-engineering': 'student-profile-form.field-study-civil-engineering',
    'business-construction': 'student-profile-form.field-study-business-construction',
    'mechanical-engineering': 'student-profile-form.field-study-mechanical-engineering',
    'business-mechanical-engineering':
        'student-profile-form.field-study-business-mechanical-engineering',
    'electrical-engineering-ee-business':
        'student-profile-form.field-study-electrical-engineering-ee-business',
    'technical-mathematics': 'student-profile-form.field-study-technical-mathematics',
    'technical-physics': 'student-profile-form.field-study-technical-physics',
    'surveying-geomatics': 'student-profile-form.field-study-surveying-geomatics',
    'technical-chemistry': 'student-profile-form.field-study-technical-chemistry',
    biosciences: 'student-profile-form.field-study-biosciences',
    geosciences: 'student-profile-form.field-study-geosciences',
    'process-engineering': 'student-profile-form.field-study-process-engineering',
    'teacher-training': 'student-profile-form.field-study-teacher-training',
    'bachelor-engineering-sciences':
        'student-profile-form.field-study-bachelor-engineering-sciences',
    'bachelor-natural-sciences': 'student-profile-form.field-study-bachelor-natural-sciences',
    'completed-doctoral-studies': 'student-profile-form.field-study-completed-doctoral-studies',
    'university-studies-general': 'student-profile-form.field-study-university-studies-general',
    'advanced-materials-science': 'student-profile-form.field-study-advanced-materials-science',
    'biomedical-engineering': 'student-profile-form.field-study-biomedical-engineering',
    'environmental-systems-sciences-natural-sciences-technology':
        'student-profile-form.field-study-environmental-systems-sciences-natural-sciences-technology',
};

const parseSelectValues = (value) => {
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

export const normalizeStudentProfileSelectValues = (value) => [
    ...new Set(
        parseSelectValues(value)
            .map((item) => String(item ?? '').trim())
            .filter(Boolean),
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

const getStudentProfileSelectLabel = (options, value, t) => {
    const translationKey = options[value];
    return translationKey ? t(translationKey) : value;
};

const getStudentProfileSelectItems = (options, t) =>
    Object.fromEntries(
        Object.keys(options).map((value) => [
            value,
            getStudentProfileSelectLabel(options, value, t),
        ]),
    );

const getStudentProfileSelectLabels = (options, value, t) =>
    normalizeStudentProfileSelectValues(value).map((item) =>
        getStudentProfileSelectLabel(options, item, t),
    );

export const getStudentProfileIndustryItems = (t) =>
    getStudentProfileSelectItems(STUDENT_PROFILE_INDUSTRIES, t);

export const getStudentProfileIndustryLabels = (value, t) =>
    getStudentProfileSelectLabels(STUDENT_PROFILE_INDUSTRIES, value, t);

export const getStudentProfileFieldItems = (t) =>
    getStudentProfileSelectItems(STUDENT_PROFILE_FIELDS, t);

export const getStudentProfileFieldLabels = (value, t) =>
    getStudentProfileSelectLabels(STUDENT_PROFILE_FIELDS, value, t);

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

const STUDENT_STUDY_IDENTIFIER_FIELDS = [
    'key',
    'identifier',
    'id',
    'code',
    'curriculumKey',
    'curriculumId',
];

const getStableStudentStudyIdentifier = (study) => {
    for (const field of STUDENT_STUDY_IDENTIFIER_FIELDS) {
        if (study?.[field] !== undefined && study[field] !== null && study[field] !== '') {
            return `${field}:${study[field]}`;
        }
    }

    return null;
};

export const getStudentStudyValue = (study) =>
    getStableStudentStudyIdentifier(study) ?? ['name', study?.name ?? ''].join(':');

export const getLocalizedStudentStudyName = (study, lang = 'de') =>
    lang === 'en' ? study?.nameEn || study?.name || '' : study?.name || study?.nameEn || '';

export const getLocalizedStudentStudyLabel = (study, lang = 'de') => {
    const name = getLocalizedStudentStudyName(study, lang);
    const key = String(study?.key ?? '').trim();
    return key && name ? `${key} - ${name}` : key || name;
};

export const formatStudentStudies = (localData, lang = 'de', includeKey = false) => {
    if (
        lang === 'en' &&
        (!Array.isArray(localData?.studies) || localData.studies.length === 0) &&
        localData?.studyProgramEn
    ) {
        return String(localData.studyProgramEn);
    }

    return normalizeStudentStudies(localData)
        .map((study) =>
            includeKey
                ? getLocalizedStudentStudyLabel(study, lang)
                : getLocalizedStudentStudyName(study, lang),
        )
        .join(', ');
};

export const mergeLocalizedStudentStudies = (germanLocalData, englishLocalData) => {
    const germanStudies = normalizeStudentStudies(germanLocalData);
    const englishStudies = normalizeStudentStudies(englishLocalData);
    const englishStudiesByIdentifier = new Map(
        englishStudies
            .map((study, index) => [getStableStudentStudyIdentifier(study), {study, index}])
            .filter(([identifier]) => identifier),
    );
    const matchedEnglishIndexes = new Set();

    const studies = germanStudies.map((study, index) => {
        const identifier = getStableStudentStudyIdentifier(study);
        const match = identifier ? englishStudiesByIdentifier.get(identifier) : null;
        const englishIndex = match?.index ?? index;
        const englishStudy = match?.study ?? englishStudies[englishIndex];
        if (englishStudy) {
            matchedEnglishIndexes.add(englishIndex);
        }

        return {
            ...study,
            nameEn: englishStudy?.name || study.nameEn || study.name,
        };
    });

    englishStudies.forEach((study, index) => {
        if (!matchedEnglishIndexes.has(index)) {
            studies.push({...study, nameEn: study.name});
        }
    });

    return studies;
};

const mergeStudentStudies = (...studyLists) => {
    const studiesByIdentifier = new Map();

    studyLists.flat().forEach((study) => {
        if (!study?.name) {
            return;
        }

        const key = getStudentStudyValue(study);
        const existingStudy = studiesByIdentifier.get(key);
        if (!existingStudy) {
            studiesByIdentifier.set(key, study);
            return;
        }

        const mergedStudy = {...study, ...existingStudy};
        const nameEn = existingStudy.nameEn || study.nameEn;
        if (nameEn) {
            mergedStudy.nameEn = nameEn;
        }
        studiesByIdentifier.set(key, mergedStudy);
    });

    return [...studiesByIdentifier.values()];
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
    t('student-profile-form.field-open-to-all-industries');
    t('student-profile-form.field-industries');
    t('student-profile-form.field-fields');
    t('student-profile-form.field-fields-description');
    t('student-profile-form.field-select-placeholder');
    t('student-profile-form.field-study-advanced-materials-science');
    t('student-profile-form.field-study-architecture');
    t('student-profile-form.field-study-bachelor-engineering-sciences');
    t('student-profile-form.field-study-bachelor-natural-sciences');
    t('student-profile-form.field-study-biomedical-engineering');
    t('student-profile-form.field-study-biosciences');
    t('student-profile-form.field-study-business-construction');
    t('student-profile-form.field-study-business-mechanical-engineering');
    t('student-profile-form.field-study-civil-engineering');
    t('student-profile-form.field-study-completed-doctoral-studies');
    t('student-profile-form.field-study-computer-science-sw-development-business');
    t('student-profile-form.field-study-electrical-engineering-ee-business');
    t(
        'student-profile-form.field-study-environmental-systems-sciences-natural-sciences-technology',
    );
    t('student-profile-form.field-study-geosciences');
    t('student-profile-form.field-study-information-and-computer-engineering');
    t('student-profile-form.field-study-mechanical-engineering');
    t('student-profile-form.field-study-process-engineering');
    t('student-profile-form.field-study-surveying-geomatics');
    t('student-profile-form.field-study-teacher-training');
    t('student-profile-form.field-study-technical-chemistry');
    t('student-profile-form.field-study-technical-mathematics');
    t('student-profile-form.field-study-technical-physics');
    t('student-profile-form.field-study-university-studies-general');
    t('student-profile-form.industry-advertising');
    t('student-profile-form.industry-agriculture-forestry');
    t('student-profile-form.industry-architecture-engineering-firms');
    t('student-profile-form.industry-automotive');
    t('student-profile-form.industry-banking-insurance');
    t('student-profile-form.industry-building-civil-construction');
    t('student-profile-form.industry-building-materials');
    t('student-profile-form.industry-chemicals-pharma');
    t('student-profile-form.industry-electrical-engineering');
    t('student-profile-form.industry-electronics');
    t('student-profile-form.industry-energy-water-supply');
    t('student-profile-form.industry-food-beverages');
    t('student-profile-form.industry-it-software');
    t('student-profile-form.industry-management-consulting');
    t('student-profile-form.industry-measurement-instruments');
    t('student-profile-form.industry-mechanical-engineering');
    t('student-profile-form.industry-medical-technology');
    t('student-profile-form.industry-metal-goods');
    t('student-profile-form.industry-metal-production-processing');
    t('student-profile-form.industry-mining-metallurgy');
    t('student-profile-form.industry-non-university-research');
    t('student-profile-form.industry-other-manufacturing');
    t('student-profile-form.industry-other-services');
    t('student-profile-form.industry-paper-pulp-packaging');
    t('student-profile-form.industry-passenger-freight-transport');
    t('student-profile-form.industry-physics-chemistry-labs');
    t('student-profile-form.industry-plant-engineering-environmental-technology');
    t('student-profile-form.industry-plastics');
    t('student-profile-form.industry-public-administration-healthcare');
    t('student-profile-form.industry-publishing-printing');
    t('student-profile-form.industry-rail-vehicles');
    t('student-profile-form.industry-real-estate-rental');
    t('student-profile-form.industry-retail-trade');
    t('student-profile-form.industry-staffing-recruitment');
    t('student-profile-form.industry-telecommunications');
    t('student-profile-form.industry-textiles-clothing-leather');
    t('student-profile-form.industry-tourism');
    t('student-profile-form.industry-universities-higher-education');
    t('student-profile-form.industry-wood-furniture');
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
    t('student-profile-form.field-study-program-description');
    t('student-profile-form.field-teaser-description');
    t('student-profile-form.field-teaser-placeholder');
    t('student-profile-form.field-teaser-title');
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
            'dbp-enum-element': DbpEnumElement,
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
        this._localizedStudentStudies = [];
        this._summary = '';
        this._summaryEn = '';
        this._studyProgram = '';
        this._studies = [];
        this._availableStudies = [];
        this._selectedStudyKeys = [];
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
        this._openToAllIndustries = false;
        this._industries = [];
        this._fields = [];
        this._workLocations = [];
        this._availability = '';
        this._contactEmail = '';
        this._studentDataPrefillUserId = '';
        this._website = '';
        this._teaser = '';
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
            _availableStudies: {state: true},
            _selectedStudyKeys: {state: true},
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
            _openToAllIndustries: {state: true},
            _industries: {state: true},
            _fields: {state: true},
            _workLocations: {state: true},
            _availability: {state: true},
            _contactEmail: {state: true},
            _website: {state: true},
            _teaser: {state: true},
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
                this._selectedStudyKeys = this._studies.map(getStudentStudyValue);
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
                this._openToAllIndustries = Boolean(data.openToAllIndustries);
                this._industries = normalizeStudentProfileSelectValues(data.industries);
                this._fields = normalizeStudentProfileSelectValues(data.fields);
                this._workLocations = normalizeWorkLocations(data.workLocations);
                this._availability = data.availability || '';
                this._contactEmail = data.contactEmail || '';
                this._website = data.website || data.linkUrl || '';
                this._teaser = normalizeTeaserValue(data.teaser);
            }
        });

        if (
            changedProperties.has('currentStudentStudies') ||
            changedProperties.has('existingForm')
        ) {
            this._setAvailableStudies(this.currentStudentStudies);
        }

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
            const currentStudies = normalizeStudentStudies({
                studies: this.currentStudentStudies,
            });
            const needsStudies =
                currentStudies.length === 0 || currentStudies.some((study) => !study.nameEn);
            const [localData, englishLocalData] = await Promise.all([
                this._fetchPersonLocalData(
                    userId,
                    needsStudies ? ['email', 'studies'] : ['email'],
                    'de',
                ),
                needsStudies
                    ? this._fetchPersonLocalData(userId, ['studies'], 'en')
                    : Promise.resolve({}),
            ]);

            // Email is kept in additionalData for contacting the student, but never shown to companies.
            const studies = needsStudies
                ? mergeLocalizedStudentStudies(localData, englishLocalData)
                : currentStudies;

            this._contactEmail = this._contactEmail || localData.email || '';
            this._localizedStudentStudies = studies;
            this._setAvailableStudies(studies);
            this._studentDataPrefillUserId = userId;
        } catch (error) {
            console.error('Error pre-filling student profile data:', error);
        } finally {
            this._loadingStudentData = false;
        }
    }

    async _fetchPersonLocalData(userId, localDataAttributes, language) {
        const includeLocal = localDataAttributes.join(',');
        const response = await fetch(
            `${this.entryPointUrl}/base/people/${encodeURIComponent(
                userId,
            )}?includeLocal=${encodeURIComponent(includeLocal)}`,
            {
                headers: {
                    'Content-Type': 'application/ld+json',
                    Authorization: `Bearer ${this.auth.token}`,
                    'Accept-Language': language,
                },
            },
        );

        if (!response.ok) {
            if (localDataAttributes.includes('studies')) {
                const fallbackAttributes = localDataAttributes.filter(
                    (attribute) => attribute !== 'studies',
                );
                return fallbackAttributes.length > 0
                    ? this._fetchPersonLocalData(userId, fallbackAttributes, language)
                    : {};
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
            (this._availableStudies.length === 0 || this._getDisplayStudies().length > 0) &&
            isValidWebsiteUrl(this._website)
        );
    }

    _setAvailableStudies(studies) {
        const fetchedStudies = normalizeStudentStudies({studies});
        const localizedStudies =
            this._studentDataPrefillUserId === this.auth?.['user-id']
                ? normalizeStudentStudies({studies: this._localizedStudentStudies})
                : [];
        const currentStudies = normalizeStudentStudies({studies: this.currentStudentStudies});
        const savedData = this.existingForm?.additionalData ?? {};
        const savedStudies = Array.isArray(savedData.studies)
            ? normalizeStudentStudies({studies: savedData.studies})
            : [];
        const selectableStudies = mergeStudentStudies(
            localizedStudies,
            fetchedStudies,
            currentStudies,
            savedStudies,
        );
        const legacyStudies =
            selectableStudies.length === 0 && this._studyProgram
                ? normalizeStudentStudies({studyProgram: this._studyProgram})
                : [];

        this._availableStudies = mergeStudentStudies(selectableStudies, legacyStudies);

        const selectedStudyKeys = this._selectedStudyKeys.filter((studyKey) =>
            this._availableStudies.some((study) => getStudentStudyValue(study) === studyKey),
        );

        this._selectStudies(
            selectedStudyKeys.length > 0
                ? selectedStudyKeys
                : savedStudies.length > 0
                  ? savedStudies.map(getStudentStudyValue)
                  : this._availableStudies.map(getStudentStudyValue),
            true,
        );
    }

    _selectStudies(studyKeys, force = false) {
        const requestedStudyKeys = new Set(normalizeStudentProfileSelectValues(studyKeys));
        const studies = this._availableStudies.filter((study) =>
            requestedStudyKeys.has(getStudentStudyValue(study)),
        );
        const selectedStudyKeys = studies.map(getStudentStudyValue);
        if (!force && areStringArraysEqual(this._selectedStudyKeys, selectedStudyKeys)) {
            return;
        }

        this._studies = studies;
        this._selectedStudyKeys = selectedStudyKeys;
        this._studyProgram = studies.length ? formatStudentStudies({studies}) : this._studyProgram;
    }

    _getDisplayStudies() {
        const selectedStudyKeys = new Set(this._selectedStudyKeys);
        return this._availableStudies.filter((study) =>
            selectedStudyKeys.has(getStudentStudyValue(study)),
        );
    }

    async submit() {
        const t = (key, opts) => this._i18n.t(key, opts);
        const isEditMode = Boolean(this.existingForm?.formId);
        const studies = this._getDisplayStudies();
        const studyProgram = studies.length
            ? formatStudentStudies({studies})
            : this._studyProgram.trim();
        const studyProgramEn = studies.length
            ? formatStudentStudies({studies}, 'en')
            : this.existingForm?.additionalData?.studyProgramEn || studyProgram;

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
            const hasRequiredValues =
                this._summary.trim() &&
                this._contactEmail.trim() &&
                (this._availableStudies.length === 0 || studies.length > 0);
            sendNotification({
                summary: t('student-profile-form.create-error-title'),
                body: hasRequiredValues
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
            studyProgramEn,
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
            openToAllIndustries: this._openToAllIndustries,
            industries: this._openToAllIndustries
                ? []
                : normalizeStudentProfileSelectValues(this._industries),
            fields: normalizeStudentProfileSelectValues(this._fields),
            workLocations: normalizeWorkLocations(this._workLocations),
            availability: this._availability.trim(),
            contactEmail: this._contactEmail.trim(),
            website: this._website.trim(),
            teaser: normalizeTeaserValue(this._teaser),
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

    renderMultiSelectField(name, labelKey, items, value, onChange, options = {}) {
        const t = (key, opts) => this._i18n.t(key, opts);
        return html`
            <dbp-enum-element
                name="${name}"
                lang="${this.lang}"
                label="${t(labelKey)}"
                multiple
                display-mode="tags"
                .tagPlaceholder="${{[this.lang]: t('student-profile-form.field-select-placeholder')}}"
                .items="${items}"
                .value="${value}"
                @change="${(event) => {
                    const nextValue = normalizeStudentProfileSelectValues(event.detail.value);
                    if (!areStringArraysEqual(value, nextValue)) {
                        onChange(nextValue);
                    }
                }}">
                ${
                    options.descriptionKey
                        ? html`
                              <div slot="description">${t(options.descriptionKey)}</div>
                          `
                        : ''
                }
            </dbp-enum-element>
        `;
    }

    renderCheckboxField(name, labelKey, value, onChange) {
        const t = (key, opts) => this._i18n.t(key, opts);
        return html`
            <label class="checkbox-field">
                <input
                    type="checkbox"
                    name="${name}"
                    .checked="${value}"
                    @change="${(event) => onChange(event.target.checked)}" />
                <span>${t(labelKey)}</span>
            </label>
        `;
    }

    render() {
        const t = (key, opts) => this._i18n.t(key, opts);
        const studyItems = Object.fromEntries(
            this._availableStudies.map((study) => [
                getStudentStudyValue(study),
                getLocalizedStudentStudyLabel(study, this.lang),
            ]),
        );
        const industryItems = getStudentProfileIndustryItems(t);
        const fieldItems = getStudentProfileFieldItems(t);
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
                this._loadingStudentData || this._availableStudies.length
                    ? html`
                          ${
                              this._availableStudies.length
                                  ? keyed(
                                        this.lang,
                                        html`
                                            <dbp-enum-element
                                                name="study-program"
                                                lang="${this.lang}"
                                                label="${t('student-profile-form.field-study-program')}"
                                                multiple
                                                display-mode="tags"
                                                .tagPlaceholder="${{
                                                    [this.lang]: t(
                                                        'student-profile-form.field-select-placeholder',
                                                    ),
                                                }}"
                                                .items="${studyItems}"
                                                .value="${this._selectedStudyKeys}"
                                                required
                                                @change="${(event) =>
                                                    this._selectStudies(event.detail.value)}">
                                                <div slot="description">
                                                    ${t(
                                                        'student-profile-form.field-study-program-description',
                                                    )}
                                                </div>
                                            </dbp-enum-element>
                                        `,
                                    )
                                  : html`
                                        <dbp-mini-spinner
                                            text="${t('loading-message')}"></dbp-mini-spinner>
                                    `
                          }
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

            <div class="translation-row">
                <div>
                    ${this.renderCheckboxField(
                        'openToAllIndustries',
                        'student-profile-form.field-open-to-all-industries',
                        this._openToAllIndustries,
                        (value) => (this._openToAllIndustries = value),
                    )}
                    ${
                        this._openToAllIndustries
                            ? ''
                            : this.renderMultiSelectField(
                                  'industries',
                                  'student-profile-form.field-industries',
                                  industryItems,
                                  this._industries,
                                  (value) => (this._industries = value),
                              )
                    }
                </div>
                ${this.renderMultiSelectField(
                    'fields',
                    'student-profile-form.field-fields',
                    fieldItems,
                    this._fields,
                    (value) => (this._fields = value),
                    {descriptionKey: 'student-profile-form.field-fields-description'},
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

            ${this.renderTextField(
                'teaser',
                'student-profile-form.field-teaser-title',
                this._teaser,
                (value) => (this._teaser = normalizeTeaserValue(value)),
                {
                    rows: 4,
                    maxlength: STUDENT_PROFILE_TEASER_MAX_LENGTH,
                    placeholderKey: 'student-profile-form.field-teaser-placeholder',
                    descriptionKey: 'student-profile-form.field-teaser-description',
                },
            )}

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

                .checkbox-field {
                    display: flex;
                    gap: 0.5rem;
                    align-items: flex-start;
                    margin-bottom: 1rem;
                }

                .checkbox-field input {
                    margin-top: 0.2rem;
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
