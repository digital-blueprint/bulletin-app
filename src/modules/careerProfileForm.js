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
const CAREER_PROFILE_FRONTEND_KEY = 'career-profile';
const CAREER_PROFILE_DESCRIPTION_MAX_LENGTH = 2500;
const CAREER_PROFILE_TEASER_MAX_LENGTH = 100;
const CAREER_PROFILE_READER_GROUP = '/authorization/groups/019fa767-6f5d-7216-b92c-d82218ec38df';

/**
 * Grants staff and the career-profile reader group read and submission access.
 *
 * @param {object} host
 * @param {string} formIdentifier
 * @returns {Promise<boolean>}
 */
export async function grantCareerProfileReadAccess(host, formIdentifier) {
    if (!formIdentifier) {
        return false;
    }

    const grantUrl = host.entryPointUrl + '/authorization/resource-action-grants';
    const grantBodies = [
        {
            resourceClass: 'DbpRelayFormalizeForm',
            resourceIdentifier: formIdentifier,
            action: 'read',
            dynamicGroupIdentifier: 'staff',
        },
        {
            resourceClass: 'DbpRelayFormalizeSubmissionCollection',
            resourceIdentifier: formIdentifier,
            action: 'create_submissions',
            dynamicGroupIdentifier: 'staff',
        },
        {
            resourceClass: 'DbpRelayFormalizeForm',
            resourceIdentifier: formIdentifier,
            action: 'read',
            groupIdentifier: CAREER_PROFILE_READER_GROUP,
        },
        {
            resourceClass: 'DbpRelayFormalizeSubmissionCollection',
            resourceIdentifier: formIdentifier,
            action: 'create_submissions',
            groupIdentifier: CAREER_PROFILE_READER_GROUP,
        },
    ];
    const responses = await Promise.all(
        grantBodies.map((body) =>
            fetch(grantUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/ld+json',
                    Authorization: 'Bearer ' + host.auth.token,
                },
                body: JSON.stringify(body),
            }),
        ),
    );

    const failedResponse = responses.find((response) => !response.ok);
    if (failedResponse) {
        console.error('Failed to grant read access to career profile:', failedResponse.status);
    }

    return !failedResponse;
}

const parseMultilineList = (value) =>
    String(value ?? '')
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean);

const normalizeMultilineValue = (value) => (Array.isArray(value) ? value.join('\n') : value || '');

const normalizeTeaserValue = (value) =>
    String(value ?? '')
        .slice(0, CAREER_PROFILE_TEASER_MAX_LENGTH)
        .trim();

export const CAREER_PROFILE_INDUSTRIES = {
    'it-software': 'career-profile-form.industry-it-software',
    'management-consulting': 'career-profile-form.industry-management-consulting',
    'non-university-research': 'career-profile-form.industry-non-university-research',
    'universities-higher-education': 'career-profile-form.industry-universities-higher-education',
    'architecture-engineering-firms': 'career-profile-form.industry-architecture-engineering-firms',
    'building-civil-construction': 'career-profile-form.industry-building-civil-construction',
    'building-materials': 'career-profile-form.industry-building-materials',
    'wood-furniture': 'career-profile-form.industry-wood-furniture',
    'mechanical-engineering': 'career-profile-form.industry-mechanical-engineering',
    automotive: 'career-profile-form.industry-automotive',
    'rail-vehicles': 'career-profile-form.industry-rail-vehicles',
    'metal-production-processing': 'career-profile-form.industry-metal-production-processing',
    'metal-goods': 'career-profile-form.industry-metal-goods',
    'plant-engineering-environmental-technology':
        'career-profile-form.industry-plant-engineering-environmental-technology',
    'paper-pulp-packaging': 'career-profile-form.industry-paper-pulp-packaging',
    'mining-metallurgy': 'career-profile-form.industry-mining-metallurgy',
    electronics: 'career-profile-form.industry-electronics',
    'electrical-engineering': 'career-profile-form.industry-electrical-engineering',
    'medical-technology': 'career-profile-form.industry-medical-technology',
    'measurement-instruments': 'career-profile-form.industry-measurement-instruments',
    telecommunications: 'career-profile-form.industry-telecommunications',
    'energy-water-supply': 'career-profile-form.industry-energy-water-supply',
    'chemicals-pharma': 'career-profile-form.industry-chemicals-pharma',
    plastics: 'career-profile-form.industry-plastics',
    'physics-chemistry-labs': 'career-profile-form.industry-physics-chemistry-labs',
    'food-beverages': 'career-profile-form.industry-food-beverages',
    'textiles-clothing-leather': 'career-profile-form.industry-textiles-clothing-leather',
    'staffing-recruitment': 'career-profile-form.industry-staffing-recruitment',
    'passenger-freight-transport': 'career-profile-form.industry-passenger-freight-transport',
    'banking-insurance': 'career-profile-form.industry-banking-insurance',
    'publishing-printing': 'career-profile-form.industry-publishing-printing',
    advertising: 'career-profile-form.industry-advertising',
    'retail-trade': 'career-profile-form.industry-retail-trade',
    'agriculture-forestry': 'career-profile-form.industry-agriculture-forestry',
    tourism: 'career-profile-form.industry-tourism',
    'public-administration-healthcare':
        'career-profile-form.industry-public-administration-healthcare',
    'real-estate-rental': 'career-profile-form.industry-real-estate-rental',
    'other-services': 'career-profile-form.industry-other-services',
    'other-manufacturing': 'career-profile-form.industry-other-manufacturing',
};

export const CAREER_PROFILE_FIELDS = {
    'computer-science-sw-development-business':
        'career-profile-form.field-study-computer-science-sw-development-business',
    'information-and-computer-engineering':
        'career-profile-form.field-study-information-and-computer-engineering',
    architecture: 'career-profile-form.field-study-architecture',
    'civil-engineering': 'career-profile-form.field-study-civil-engineering',
    'business-construction': 'career-profile-form.field-study-business-construction',
    'mechanical-engineering': 'career-profile-form.field-study-mechanical-engineering',
    'business-mechanical-engineering':
        'career-profile-form.field-study-business-mechanical-engineering',
    'electrical-engineering-ee-business':
        'career-profile-form.field-study-electrical-engineering-ee-business',
    'technical-mathematics': 'career-profile-form.field-study-technical-mathematics',
    'technical-physics': 'career-profile-form.field-study-technical-physics',
    'surveying-geomatics': 'career-profile-form.field-study-surveying-geomatics',
    'technical-chemistry': 'career-profile-form.field-study-technical-chemistry',
    biosciences: 'career-profile-form.field-study-biosciences',
    geosciences: 'career-profile-form.field-study-geosciences',
    'process-engineering': 'career-profile-form.field-study-process-engineering',
    'teacher-training': 'career-profile-form.field-study-teacher-training',
    'bachelor-engineering-sciences':
        'career-profile-form.field-study-bachelor-engineering-sciences',
    'bachelor-natural-sciences': 'career-profile-form.field-study-bachelor-natural-sciences',
    'completed-doctoral-studies': 'career-profile-form.field-study-completed-doctoral-studies',
    'university-studies-general': 'career-profile-form.field-study-university-studies-general',
    'advanced-materials-science': 'career-profile-form.field-study-advanced-materials-science',
    'biomedical-engineering': 'career-profile-form.field-study-biomedical-engineering',
    'environmental-systems-sciences-natural-sciences-technology':
        'career-profile-form.field-study-environmental-systems-sciences-natural-sciences-technology',
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

export const normalizeCareerProfileSelectValues = (value) => [
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

const getCareerProfileSelectLabel = (options, value, t) => {
    const translationKey = options[value];
    return translationKey ? t(translationKey) : value;
};

const getCareerProfileSelectItems = (options, t) =>
    Object.fromEntries(
        Object.keys(options).map((value) => [
            value,
            getCareerProfileSelectLabel(options, value, t),
        ]),
    );

const getCareerProfileSelectLabels = (options, value, t) =>
    normalizeCareerProfileSelectValues(value).map((item) =>
        getCareerProfileSelectLabel(options, item, t),
    );

export const getCareerProfileIndustryItems = (t) =>
    getCareerProfileSelectItems(CAREER_PROFILE_INDUSTRIES, t);

export const getCareerProfileIndustryLabels = (value, t) =>
    getCareerProfileSelectLabels(CAREER_PROFILE_INDUSTRIES, value, t);

export const getCareerProfileFieldItems = (t) =>
    getCareerProfileSelectItems(CAREER_PROFILE_FIELDS, t);

export const getCareerProfileFieldLabels = (value, t) =>
    getCareerProfileSelectLabels(CAREER_PROFILE_FIELDS, value, t);

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

const keepCareerProfileTranslations = (t) => {
    t('career-profile-form.create-error-title');
    t('career-profile-form.create-success');
    t('career-profile-form.contact-email-missing');
    t('career-profile-form.field-availability');
    t('career-profile-form.field-contact-email');
    t('career-profile-form.field-languages');
    t('career-profile-form.field-languages-en');
    t('career-profile-form.field-locations');
    t('career-profile-form.field-industries');
    t('career-profile-form.field-fields');
    t('career-profile-form.field-fields-description');
    t('career-profile-form.field-select-placeholder');
    t('career-profile-form.field-study-advanced-materials-science');
    t('career-profile-form.field-study-architecture');
    t('career-profile-form.field-study-bachelor-engineering-sciences');
    t('career-profile-form.field-study-bachelor-natural-sciences');
    t('career-profile-form.field-study-biomedical-engineering');
    t('career-profile-form.field-study-biosciences');
    t('career-profile-form.field-study-business-construction');
    t('career-profile-form.field-study-business-mechanical-engineering');
    t('career-profile-form.field-study-civil-engineering');
    t('career-profile-form.field-study-completed-doctoral-studies');
    t('career-profile-form.field-study-computer-science-sw-development-business');
    t('career-profile-form.field-study-electrical-engineering-ee-business');
    t('career-profile-form.field-study-environmental-systems-sciences-natural-sciences-technology');
    t('career-profile-form.field-study-geosciences');
    t('career-profile-form.field-study-information-and-computer-engineering');
    t('career-profile-form.field-study-mechanical-engineering');
    t('career-profile-form.field-study-process-engineering');
    t('career-profile-form.field-study-surveying-geomatics');
    t('career-profile-form.field-study-teacher-training');
    t('career-profile-form.field-study-technical-chemistry');
    t('career-profile-form.field-study-technical-mathematics');
    t('career-profile-form.field-study-technical-physics');
    t('career-profile-form.field-study-university-studies-general');
    t('career-profile-form.industry-advertising');
    t('career-profile-form.industry-agriculture-forestry');
    t('career-profile-form.industry-architecture-engineering-firms');
    t('career-profile-form.industry-automotive');
    t('career-profile-form.industry-banking-insurance');
    t('career-profile-form.industry-building-civil-construction');
    t('career-profile-form.industry-building-materials');
    t('career-profile-form.industry-chemicals-pharma');
    t('career-profile-form.industry-electrical-engineering');
    t('career-profile-form.industry-electronics');
    t('career-profile-form.industry-energy-water-supply');
    t('career-profile-form.industry-food-beverages');
    t('career-profile-form.industry-it-software');
    t('career-profile-form.industry-management-consulting');
    t('career-profile-form.industry-measurement-instruments');
    t('career-profile-form.industry-mechanical-engineering');
    t('career-profile-form.industry-medical-technology');
    t('career-profile-form.industry-metal-goods');
    t('career-profile-form.industry-metal-production-processing');
    t('career-profile-form.industry-mining-metallurgy');
    t('career-profile-form.industry-non-university-research');
    t('career-profile-form.industry-other-manufacturing');
    t('career-profile-form.industry-other-services');
    t('career-profile-form.industry-paper-pulp-packaging');
    t('career-profile-form.industry-passenger-freight-transport');
    t('career-profile-form.industry-physics-chemistry-labs');
    t('career-profile-form.industry-plant-engineering-environmental-technology');
    t('career-profile-form.industry-plastics');
    t('career-profile-form.industry-public-administration-healthcare');
    t('career-profile-form.industry-publishing-printing');
    t('career-profile-form.industry-rail-vehicles');
    t('career-profile-form.industry-real-estate-rental');
    t('career-profile-form.industry-retail-trade');
    t('career-profile-form.industry-staffing-recruitment');
    t('career-profile-form.industry-telecommunications');
    t('career-profile-form.industry-textiles-clothing-leather');
    t('career-profile-form.industry-tourism');
    t('career-profile-form.industry-universities-higher-education');
    t('career-profile-form.industry-wood-furniture');
    t('career-profile-form.field-previous-experience');
    t('career-profile-form.field-previous-experience-description');
    t('career-profile-form.field-previous-experience-en');
    t('career-profile-form.field-previous-experience-en-description');
    t('career-profile-form.field-personal-interests');
    t('career-profile-form.field-personal-interests-description');
    t('career-profile-form.field-personal-interests-en');
    t('career-profile-form.field-personal-interests-en-description');
    t('career-profile-form.field-profile-summary');
    t('career-profile-form.field-profile-summary-en');
    t('career-profile-form.field-qualification');
    t('career-profile-form.field-qualification-description');
    t('career-profile-form.field-qualification-en');
    t('career-profile-form.field-qualification-en-description');
    t('career-profile-form.field-qualification-view-mode');
    t('career-profile-form.field-skills');
    t('career-profile-form.field-skills-description');
    t('career-profile-form.field-skills-en');
    t('career-profile-form.field-skills-en-description');
    t('career-profile-form.field-study-program');
    t('career-profile-form.field-study-program-description');
    t('career-profile-form.field-teaser-description');
    t('career-profile-form.field-teaser-placeholder');
    t('career-profile-form.field-teaser-title');
    t('career-profile-form.field-text-placeholder');
    t('career-profile-form.field-website');
    t('career-profile-form.field-website-identity-warning');
    t('career-profile-form.field-website-placeholder');
    t('career-profile-form.form-type-name');
    t('career-profile-form.interest-already-submitted');
    t('career-profile-form.interest-company');
    t('career-profile-form.interest-contact-email');
    t('career-profile-form.interest-contact-name');
    t('career-profile-form.interest-description');
    t('career-profile-form.interest-message');
    t('career-profile-form.interest-submit');
    t('career-profile-form.interest-success');
    t('career-profile-form.interest-title');
    t('career-profile-form.required-field-note');
    t('career-profile-form.validation-required');
    t('career-profile-form.validation-url');
};

// The generic Formalize helpers do not expose maxNumSubmissionsPerCreator yet,
// so this module saves the profile form directly.
const saveCareerProfileForm = async (host, formData, formIdentifier = null) => {
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

class CareerProfileModule extends BaseObject {
    getUrlSlug() {
        return CAREER_PROFILE_FRONTEND_KEY;
    }

    getFormComponent() {
        return CareerProfileInterestFormElement;
    }

    getEditFormComponent() {
        return CareerProfileEditFormElement;
    }

    getFormFrontendKey() {
        return CAREER_PROFILE_FRONTEND_KEY;
    }

    getFormName(lang = i18n.language) {
        i18n.changeLanguage(lang);
        return i18n.t('career-profile-form.form-type-name');
    }

    getItemText(data) {
        return data?.companyName || data?.contactEmail || '';
    }
}

export default CareerProfileModule;

export class CareerProfileEditFormElement extends ScopedElementsMixin(DBPLitElement) {
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

    _resetProfileValues() {
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
    }

    resetForCreate() {
        this._resetProfileValues();
        this._setAvailableStudies(this.currentStudentStudies);
        this._prefillStudentData();
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            if (propName === 'lang') {
                this._i18n.changeLanguage(this.lang);
            }

            if ((propName === 'lang' || propName === 'langDir') && this.langDir) {
                setOverridesByGlobalCache(this._i18n, this);
            }

            if (propName === 'existingForm' && (this.existingForm || oldValue)) {
                this._resetProfileValues();
                if (this.existingForm) {
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
                    this._industries = normalizeCareerProfileSelectValues(data.industries);
                    this._fields = normalizeCareerProfileSelectValues(data.fields);
                    this._workLocations = normalizeWorkLocations(data.workLocations);
                    this._availability = data.availability || '';
                    this._contactEmail = data.contactEmail || '';
                    this._website = data.website || data.linkUrl || '';
                    this._teaser = normalizeTeaserValue(data.teaser);
                }
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
            console.error('Error pre-filling career profile data:', error);
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

    _validateWebsiteField() {
        const websiteField = this.shadowRoot?.querySelector('[name="website"]');
        if (!websiteField) {
            return isValidWebsiteUrl(this._website);
        }

        websiteField.customValidator = (value) =>
            isValidWebsiteUrl(value) ? [] : [this._i18n.t('career-profile-form.validation-url')];
        return websiteField.handleErrors();
    }

    get workLocations() {
        return normalizeWorkLocations(this._workLocations);
    }

    _setTeaser(value) {
        const teaser = normalizeTeaserValue(value);
        this._teaser = teaser;

        const teaserField = this.shadowRoot?.querySelector('[name="teaser"]');
        if (teaserField && teaserField.value !== teaser) {
            teaserField.value = teaser;
        }
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
        const requestedStudyKeys = new Set(normalizeCareerProfileSelectValues(studyKeys));
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
        if (this._isSubmitting) {
            return null;
        }

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
                summary: t('career-profile-form.create-error-title'),
                body: t('career-profile-form.contact-email-missing'),
                type: 'warning',
                timeout: 0,
                targetNotificationId: 'career-profile-form-notification',
            });
            return null;
        }

        this._validateWebsiteField();
        if (!this._isFormValid) {
            const hasRequiredValues =
                this._summary.trim() &&
                this._contactEmail.trim() &&
                (this._availableStudies.length === 0 || studies.length > 0);
            sendNotification({
                summary: t('career-profile-form.create-error-title'),
                body: hasRequiredValues
                    ? t('career-profile-form.validation-url')
                    : t('career-profile-form.validation-required'),
                type: 'warning',
                timeout: 0,
                targetNotificationId: 'career-profile-form-notification',
            });
            return null;
        }

        this._isSubmitting = true;

        // Companies submit this schema as their one interest submission for the profile form.
        const dataFeedSchema = JSON.stringify({
            title: 'CareerProfileInterest',
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
                : normalizeCareerProfileSelectValues(this._industries),
            fields: normalizeCareerProfileSelectValues(this._fields),
            workLocations: normalizeWorkLocations(this._workLocations),
            availability: this._availability.trim(),
            contactEmail: this._contactEmail.trim(),
            website: this._website.trim(),
            teaser: normalizeTeaserValue(this._teaser),
            studentCreatorId: this.auth?.['user-id'] || '',
            studentPersonIdentifier: this.auth?.person_id || '',
        };

        // The profile itself is a Formalize form; the public profile fields live in additionalData.
        const formName = new CareerProfileModule().getFormName(this.lang);
        const formData = {
            name: formName,
            localizedNames: [
                {languageTag: 'de', name: new CareerProfileModule().getFormName('de')},
                {languageTag: 'en', name: new CareerProfileModule().getFormName('en')},
            ],
            frontendKey: CAREER_PROFILE_FRONTEND_KEY,
            additionalData,
            dataFeedSchema,
            // Each company can signal interest only once per career profile.
            maxNumSubmissionsPerCreator: 1,
        };

        const host = {
            auth: this.auth,
            entryPointUrl: this.entryPointUrl,
            _i18n: this._i18n,
        };

        try {
            const result = await saveCareerProfileForm(
                host,
                formData,
                isEditMode ? this.existingForm.formId : null,
            );

            const accessGranted =
                !result ||
                isEditMode ||
                (await grantCareerProfileReadAccess(host, result.identifier));
            if (!accessGranted) {
                sendNotification({
                    summary: t('career-profile-form.create-error-title'),
                    body: t('career-profile-form.error-grant-read-access'),
                    type: 'danger',
                    timeout: 0,
                    targetNotificationId: 'career-profile-form-notification',
                });
                return null;
            }

            if (result) {
                sendNotification({
                    summary: t('career-profile-form.create-success-title'),
                    body: t('career-profile-form.create-success'),
                    type: 'success',
                    timeout: 0,
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
            console.error('Error saving career profile form:', error);
            sendNotification({
                summary: t('career-profile-form.create-error-title'),
                body: error.message,
                type: 'danger',
                timeout: 0,
                targetNotificationId: 'career-profile-form-notification',
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
                class="area-interest"
                lang="${this.lang}"
                label="${t(labelKey)}"
                multiple
                display-mode="tags"
                .tagPlaceholder="${{[this.lang]: t('career-profile-form.field-select-placeholder')}}"
                .items="${items}"
                .value="${value}"
                @change="${(event) => {
                    const nextValue = normalizeCareerProfileSelectValues(event.detail.value);
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

    _renderStudySelector(studyItems, t) {
        if (!this._loadingStudentData && !this._availableStudies.length) {
            return '';
        }

        if (!this._availableStudies.length) {
            return html`
                <dbp-mini-spinner text="${t('loading-message')}"></dbp-mini-spinner>
            `;
        }

        return keyed(
            this.lang,
            html`
                <dbp-enum-element
                    name="study-program"
                    lang="${this.lang}"
                    label="${t('career-profile-form.field-study-program')}"
                    multiple
                    display-mode="tags"
                    .tagPlaceholder="${{
                        [this.lang]: t('career-profile-form.field-select-placeholder'),
                    }}"
                    .items="${studyItems}"
                    .value="${this._selectedStudyKeys}"
                    required
                    @change="${(event) => this._selectStudies(event.detail.value)}">
                    <div slot="description">
                        ${t('career-profile-form.field-study-program-description')}
                    </div>
                </dbp-enum-element>
            `,
        );
    }

    render() {
        const t = (key, opts) => this._i18n.t(key, opts);
        const studyItems = Object.fromEntries(
            this._availableStudies.map((study) => [
                getStudentStudyValue(study),
                getLocalizedStudentStudyLabel(study, this.lang),
            ]),
        );
        const fieldItems = getCareerProfileFieldItems(t);
        keepCareerProfileTranslations(t);

        return html`
            <div class="translation-row">
                ${this.renderTextField(
                    'summary',
                    'career-profile-form.field-profile-summary',
                    this._summary,
                    (value) => (this._summary = value),
                    {rows: 6, required: true, maxlength: CAREER_PROFILE_DESCRIPTION_MAX_LENGTH},
                )}
                ${this.renderTextField(
                    'summaryEn',
                    'career-profile-form.field-profile-summary-en',
                    this._summaryEn,
                    (value) => (this._summaryEn = value),
                    {rows: 6, maxlength: CAREER_PROFILE_DESCRIPTION_MAX_LENGTH},
                )}
            </div>

            ${
                this._contactEmail
                    ? html`
                          <div class="profile-prefill-info">
                              <strong>${t('career-profile-form.field-contact-email')}:</strong>
                              ${this._contactEmail}
                          </div>
                      `
                    : ''
            }
            ${this._renderStudySelector(studyItems, t)}
            <dbp-work-locations-element
                lang="${this.lang}"
                lang-dir="${this.langDir}"
                label="${t('career-profile-form.field-preferred-work-location')}"
                .required="${false}"
                .value="${this._workLocations}"
                @change="${(event) =>
                    (this._workLocations = normalizeWorkLocations(
                        event.detail.value,
                    ))}"></dbp-work-locations-element>
            <div class="translation-row">
                ${this.renderDateField(
                    'availability',
                    'career-profile-form.field-availability',
                    this._availability,
                    (value) => (this._availability = value),
                )}
            </div>

            <div class="translation-row">
                ${this.renderMultiSelectField(
                    'fields',
                    'career-profile-form.field-fields',
                    fieldItems,
                    this._fields,
                    (value) => (this._fields = value),
                    {descriptionKey: 'career-profile-form.field-fields-description'},
                )}
            </div>

            <div class="translation-row">
                ${this.renderTextField(
                    'previousExperience',
                    'career-profile-form.field-previous-experience',
                    this._previousExperience,
                    (value) => (this._previousExperience = value),
                    {
                        rows: 4,
                        placeholderKey: 'career-profile-form.field-text-placeholder',
                        descriptionKey: 'career-profile-form.field-previous-experience-description',
                    },
                )}
                ${this.renderTextField(
                    'previousExperienceEn',
                    'career-profile-form.field-previous-experience-en',
                    this._previousExperienceEn,
                    (value) => (this._previousExperienceEn = value),
                    {
                        rows: 4,
                        placeholderKey: 'career-profile-form.field-text-placeholder',
                        descriptionKey:
                            'career-profile-form.field-previous-experience-en-description',
                    },
                )}
            </div>
            <div class="translation-row">
                ${this.renderTextField(
                    'furtherQualifications',
                    'career-profile-form.field-qualification',
                    this._furtherQualifications,
                    (value) => (this._furtherQualifications = value),
                    {
                        rows: 4,
                        placeholderKey: 'career-profile-form.field-text-placeholder',
                        descriptionKey: 'career-profile-form.field-qualification-description',
                    },
                )}
                ${this.renderTextField(
                    'furtherQualificationsEn',
                    'career-profile-form.field-qualification-en',
                    this._furtherQualificationsEn,
                    (value) => (this._furtherQualificationsEn = value),
                    {
                        rows: 4,
                        placeholderKey: 'career-profile-form.field-text-placeholder',
                        descriptionKey: 'career-profile-form.field-qualification-en-description',
                    },
                )}
            </div>
            <div class="translation-row">
                ${this.renderTextField(
                    'skills',
                    'career-profile-form.field-skills',
                    this._skillsText,
                    (value) => (this._skillsText = value),
                    {
                        rows: 4,
                        placeholderKey: 'career-profile-form.field-text-placeholder',
                        descriptionKey: 'career-profile-form.field-skills-description',
                    },
                )}
                ${this.renderTextField(
                    'skillsEn',
                    'career-profile-form.field-skills-en',
                    this._skillsTextEn,
                    (value) => (this._skillsTextEn = value),
                    {
                        rows: 4,
                        placeholderKey: 'career-profile-form.field-text-placeholder',
                        descriptionKey: 'career-profile-form.field-skills-en-description',
                    },
                )}
            </div>

            <div class="translation-row">
                ${this.renderTextField(
                    'personalInterests',
                    'career-profile-form.field-personal-interests',
                    this._personalInterests,
                    (value) => (this._personalInterests = value),
                    {
                        rows: 4,
                        placeholderKey: 'career-profile-form.field-text-placeholder',
                        descriptionKey: 'career-profile-form.field-personal-interests-description',
                    },
                )}
                ${this.renderTextField(
                    'personalInterestsEn',
                    'career-profile-form.field-personal-interests-en',
                    this._personalInterestsEn,
                    (value) => (this._personalInterestsEn = value),
                    {
                        rows: 4,
                        placeholderKey: 'career-profile-form.field-text-placeholder',
                        descriptionKey:
                            'career-profile-form.field-personal-interests-en-description',
                    },
                )}
            </div>

            <div class="translation-row">
                ${this.renderTextField(
                    'languages',
                    'career-profile-form.field-languages',
                    this._languagesText,
                    (value) => (this._languagesText = value),
                    {rows: 4},
                )}
                ${this.renderTextField(
                    'languagesEn',
                    'career-profile-form.field-languages-en',
                    this._languagesTextEn,
                    (value) => (this._languagesTextEn = value),
                    {rows: 4},
                )}
            </div>

            <div>
                ${this.renderTextField(
                    'website',
                    'career-profile-form.field-website',
                    this._website,
                    (value) => (this._website = value),
                    {
                        placeholderKey: 'career-profile-form.field-website-placeholder',
                        descriptionKey: 'career-profile-form.field-website-identity-warning',
                        type: 'url',
                    },
                )}
            </div>

            ${this.renderTextField(
                'teaser',
                'career-profile-form.field-teaser-title',
                this._teaser,
                (value) => this._setTeaser(value),
                {
                    rows: 4,
                    placeholderKey: 'career-profile-form.field-teaser-placeholder',
                    descriptionKey: 'career-profile-form.field-teaser-description',
                },
            )}
        `;
    }

    static get styles() {
        return [
            commonStyles.getButtonCSS(),
            css`
                :host {
                    display: block;
                    padding-right: 8px;
                }

                .translation-row {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 1rem;
                }

                .translation-row > dbp-enum-element.area-interest {
                    display: block !important;
                    grid-column-start: 1 !important;
                    grid-column-end: 3 !important;
                    width: 100%;
                    min-width: 0;
                }

                .profile-prefill-info {
                    background: var(--dbp-secondary-surface);
                    margin: 0 0 1rem 0;
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

export class CareerProfileInterestFormElement extends BaseFormElement {
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
            console.error('Error checking career profile interest submission:', error);
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
                summary: t('career-profile-form.create-error-title'),
                body: t('career-profile-form.validation-required'),
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
                    'Failed to submit career profile interest:',
                    response.status,
                    errorBody,
                );
                sendNotification({
                    summary: t('career-profile-form.create-error-title'),
                    body: errorBody.description || t('career-profile-form.interest-error'),
                    type: 'danger',
                    timeout: 0,
                });
                return;
            }

            this._hasSubmittedInterest = true;
            sendNotification({
                summary: t('career-profile-form.interest-success'),
                body: t('career-profile-form.interest-success-body'),
                type: 'success',
                timeout: 0,
            });
        } catch (error) {
            console.error('Error submitting career profile interest:', error);
            sendNotification({
                summary: t('career-profile-form.create-error-title'),
                body: t('career-profile-form.interest-error'),
                type: 'danger',
                timeout: 0,
            });
        } finally {
            this._isSubmitting = false;
        }
    }

    render() {
        const t = (key, opts) => this._i18n.t(key, opts);
        keepCareerProfileTranslations(t);

        if (this._checkingSubmittedInterest) {
            return html`
                <div class="checking"><dbp-mini-spinner></dbp-mini-spinner></div>
            `;
        }

        return html`
            <form class="interest-form" @submit="${this.submitInterest}" novalidate>
                <h3>${t('career-profile-form.interest-title')}</h3>
                <p class="interest-description">${t('career-profile-form.interest-description')}</p>

                ${
                    this._hasSubmittedInterest
                        ? html`
                              <div class="submitted-notice">
                                  <dbp-icon name="checkmark-circle" aria-hidden="true"></dbp-icon>
                                  <p>${t('career-profile-form.interest-already-submitted')}</p>
                              </div>
                          `
                        : html`
                              <dbp-string-element
                                  name="companyName"
                                  lang="${this.lang}"
                                  label="${t('career-profile-form.interest-company')}"
                                  .value="${this._companyName}"
                                  required
                                  @change="${(event) => (this._companyName = event.detail.value)}"></dbp-string-element>

                              <div class="two-column-row">
                                  <dbp-string-element
                                      name="contactName"
                                      lang="${this.lang}"
                                      label="${t('career-profile-form.interest-contact-name')}"
                                      .value="${this._contactName}"
                                      required
                                      @change="${(event) =>
                                          (this._contactName =
                                              event.detail.value)}"></dbp-string-element>
                                  <dbp-string-element
                                      name="contactEmail"
                                      lang="${this.lang}"
                                      label="${t('career-profile-form.interest-contact-email')}"
                                      .value="${this._contactEmail}"
                                      required
                                      @change="${(event) =>
                                          (this._contactEmail =
                                              event.detail.value)}"></dbp-string-element>
                              </div>

                              <dbp-string-element
                                  name="message"
                                  lang="${this.lang}"
                                  label="${t('career-profile-form.interest-message')}"
                                  .value="${this._message}"
                                  rows="4"
                                  @change="${(event) => (this._message = event.detail.value)}"></dbp-string-element>

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
                                                    <dbp-icon
                                                        name="send-diagonal"
                                                        aria-hidden="true"></dbp-icon>
                                                `
                                      }
                                      ${t('career-profile-form.interest-submit')}
                                  </button>
                              </div>
                          `
                }
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
