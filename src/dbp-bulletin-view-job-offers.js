import {css, html} from 'lit';
import {ref, createRef} from 'lit/directives/ref.js';
import {repeat} from 'lit/directives/repeat.js';
import * as commonUtils from '@dbp-toolkit/common/utils';
import * as commonStyles from '@dbp-toolkit/common/src/styles.js';
import {ScopedElementsMixin} from '@dbp-toolkit/common/src/scoped/ScopedElementsMixin.js';
import {Icon, MiniSpinner, DBPLoginRequiredWarning} from '@dbp-toolkit/common';
import {DbpEnumElement} from '@dbp-toolkit/form-elements';
import DBPBulletinLitElement from './dbp-bulletin-lit-element.js';
import {JobOfferDetail} from './dbp-bulletin-job-offer-detail.js';
import JobOfferModule, {
    getAreaOfInterestLabel,
    getAreaOfInterestLabels,
    normalizeAreaOfInterestValues,
    normalizePartnerCompanyValue,
} from './modules/jobOfferForm.js';
import {
    WorkLocationSelectElement,
    getLocationKey,
    getLocationHierarchy,
    getWorkLocationLabel,
    normalizeWorkLocations,
} from './modules/workLocationsElement.js';
import HoursRangeElement, {
    formatHoursRange,
    isHoursRangeInRange,
} from './modules/hoursRangeElement.js';

// Number of job cards shown initially and appended each time the user requests more
const LOAD_MORE_BATCH_SIZE = 12;

// Filter presets applied when a "Mein Traumjob ist:" option is selected.
// The keys match the option values of the dream job dropdown.
const DREAM_JOB_PRESETS = {
    'study-accompanying': {
        // Steiermark (Styria) as work location, remote allowed, at most 20 hours per week
        workLocation: 'AT|styria|',
        includeRemote: true,
        weeklyHoursMin: '',
        weeklyHoursMax: '20',
    },
    'career-entry': {
        // Any work location, remote allowed, at least 20 hours per week
        workLocation: '',
        includeRemote: true,
        weeklyHoursMin: '20',
        weeklyHoursMax: '',
    },
};

class ViewJobOffers extends ScopedElementsMixin(DBPBulletinLitElement) {
    static get scopedElements() {
        return {
            'dbp-enum-element': DbpEnumElement,
            'dbp-icon': Icon,
            'dbp-mini-spinner': MiniSpinner,
            'dbp-bulletin-job-offer-detail': JobOfferDetail,
            'dbp-work-location-select-element': WorkLocationSelectElement,
            'dbp-hours-range-element': HoursRangeElement,
            'dbp-login-required-warning': DBPLoginRequiredWarning,
        };
    }

    constructor() {
        super();
        this.searchQuery = '';
        this.filterDreamJob = 'all';
        this.filterAreasOfInterest = [];
        this.filterWorkLocation = '';
        this.filterIncludeRemote = false;
        this.filterWeeklyHoursMin = '';
        this.filterWeeklyHoursMax = '';
        this.sortOrder = 'date-desc';
        /** @type {boolean} Whether the additional filters row is expanded */
        this._filtersOpen = false;
        /** @type {number} Number of job cards currently rendered */
        this._visibleCount = LOAD_MORE_BATCH_SIZE;
        /** @type {object|null} Currently selected job offer shown in the detail dialog */
        this._selectedJob = null;
        /** @type {import('lit/directives/ref.js').Ref} Direct reference to the detail dialog element */
        this._detailRef = createRef();
        /** @type {Array} Job offers loaded from the formalize API */
        this._jobOffers = [];
        /** @type {Record<string, Record<string, string>>} Organizational unit names by language and id */
        this._organizationNamesByLanguage = {};
        /** @type {boolean} Whether the API request is in progress */
        this._loading = false;
        /** @type {boolean} Whether the API request failed */
        this._loadError = false;
        this.universityShortName = '';
    }

    static get properties() {
        return {
            ...super.properties,
            searchQuery: {type: String, state: true},
            filterDreamJob: {type: String, state: true},
            filterAreasOfInterest: {type: Array, state: true},
            filterWorkLocation: {type: String, state: true},
            filterIncludeRemote: {type: Boolean, state: true},
            filterWeeklyHoursMin: {type: String, state: true},
            filterWeeklyHoursMax: {type: String, state: true},
            sortOrder: {type: String, state: true},
            _filtersOpen: {type: Boolean, state: true},
            _visibleCount: {type: Number, state: true},
            universityShortName: {type: String, attribute: 'university-short-name'},
            _selectedJob: {state: true},
            _jobOffers: {state: true},
            _loading: {state: true},
            _loadError: {state: true},
        };
    }

    /**
     * Called by the base class once after the user is logged in.
     * Triggers the initial data fetch from the formalize API.
     */
    initialize() {
        this._fetchJobOffers();
    }

    update(changedProperties) {
        super.update(changedProperties);

        changedProperties.forEach((oldValue, propName) => {
            switch (propName) {
                case 'routingUrl':
                    this.handleRoutingUrlChange();
                    break;
            }
        });
    }

    /**
     * Fetches job-offer forms from the formalize API.
     * Job offers are stored as forms with frontendKey = 'job-offer'.
     * The job details are stored in the form's additionalData field.
     */
    async _fetchJobOffers() {
        if (!this.auth || !this.auth.token || !this.entryPointUrl) {
            return;
        }

        this._loading = true;
        this._loadError = false;
        let jobOffersLoaded = false;

        const frontendKey = new JobOfferModule().getFormFrontendKey();
        const url =
            this.entryPointUrl +
            '/formalize/forms?perPage=9999&whereFrontendKeyIn[]=' +
            encodeURIComponent(frontendKey);

        try {
            const response = await fetch(url, {
                headers: {
                    'Content-Type': 'application/ld+json',
                    Authorization: 'Bearer ' + this.auth.token,
                },
            });

            if (!response.ok) {
                console.error('Failed to load job offers, status:', response.status);
                this._loadError = true;
                return;
            }

            const data = await response.json();
            const members = data['hydra:member'] ?? [];

            // Map each form entry to a JobOffer shape that the rest of the UI expects.
            // The job details are stored in the form's additionalData field at creation time.
            // English translations are optional and only present when the form creator entered
            // them.
            this._jobOffers = members
                .map((form) => {
                    const extra = form.additionalData ?? {};
                    const areasOfInterest = normalizeAreaOfInterestValues(
                        extra.areasOfInterest ?? extra.areaOfInterest,
                    );

                    return {
                        /** The form identifier is used as the job offer identifier */
                        identifier: form.identifier,
                        dataFeedSchema: form.dataFeedSchema ?? '',
                        /** Localised title: prefer current lang, fall back to name */
                        title: this._getLocalizedName(form.localizedNames) || form.name || '',
                        jobOfferType: extra.jobOfferType ?? '',
                        jobCategory: extra.jobCategory ?? extra.jobType ?? '',
                        areaOfInterest: areasOfInterest[0] ?? '',
                        areasOfInterest,
                        publishedAt: form.publishedAt ?? extra.publishedAt ?? '',
                        deadline: extra.deadline ?? '',
                        applicationDeadline: extra.applicationDeadline ?? '',
                        startDate: extra.startDate ?? '',
                        weeklyHours: extra.weeklyHours ?? '',
                        weeklyHoursMin: extra.weeklyHoursMin ?? '',
                        weeklyHoursMax: extra.weeklyHoursMax ?? '',
                        weeklyHoursEn: extra.weeklyHoursEn ?? '',
                        salary: extra.salary ?? '',
                        salaryEn: extra.salaryEn ?? '',
                        contractDuration: extra.contractDuration ?? '',
                        contractDurationEn: extra.contractDurationEn ?? '',
                        organizationalUnit:
                            extra.organizationalUnit ??
                            extra.organisationalUnit ??
                            extra.organization ??
                            '',
                        organization: extra.organization ?? '',
                        organizationId: this._getResourceIdentifier(extra.organizationId),
                        companySubmissionId: extra.companySubmissionId ?? '',
                        // The company name is stored at creation time so it can still be shown
                        // even if the company submission has since been deleted.
                        companyName: extra.companyName ?? '',
                        companyData: extra.companyData ?? {},
                        isFromPartnerCompany: normalizePartnerCompanyValue(
                            extra.isFromPartnerCompany ?? extra.companyData?.partnerunternehmen,
                        ),
                        externalJobUrl: extra.externalJobUrl ?? '',
                        workLocations: normalizeWorkLocations(extra.workLocations),
                        remote: extra.remote === true,
                        description: extra.description ?? '',
                        requirements: Array.isArray(extra.requirements) ? extra.requirements : [],
                        responsibilities: Array.isArray(extra.responsibilities)
                            ? extra.responsibilities
                            : [],
                        requiredQualification: Array.isArray(extra.requiredQualification)
                            ? extra.requiredQualification
                            : [],
                        weOffer: Array.isArray(extra.weOffer) ? extra.weOffer : [],
                        linkName: extra.linkName ?? '',
                        linkNameEn: extra.linkNameEn ?? '',
                        linkUrl: extra.linkUrl ?? '',
                        linkUrlEn: extra.linkUrlEn ?? '',
                        contactInformation: extra.contactInformation ?? '',
                        contactInformationEn: extra.contactInformationEn ?? '',
                        // Optional English translations
                        titleEn: extra.titleEn ?? '',
                        descriptionEn: extra.descriptionEn ?? '',
                        organizationalUnitEn:
                            extra.organizationalUnitEn ??
                            extra.organisationalUnitEn ??
                            extra.organizationEn ??
                            '',
                        organizationEn: extra.organizationEn ?? '',
                        requirementsEn: Array.isArray(extra.requirementsEn)
                            ? extra.requirementsEn
                            : [],
                        responsibilitiesEn: Array.isArray(extra.responsibilitiesEn)
                            ? extra.responsibilitiesEn
                            : [],
                        requiredQualificationEn: Array.isArray(extra.requiredQualificationEn)
                            ? extra.requiredQualificationEn
                            : [],
                        weOfferEn: Array.isArray(extra.weOfferEn) ? extra.weOfferEn : [],
                    };
                })
                // Keep date-only deadlines visible for the full deadline day.
                .filter((job) => this._isDeadlineVisible(job.deadline));
            this._clearUnavailableAreaOfInterest();
            await this._loadAndApplyLocalizedOrganizationNames();
            jobOffersLoaded = true;
        } catch (error) {
            console.error('Error loading job offers:', error);
            this._loadError = true;
        } finally {
            this._loading = false;
        }

        if (jobOffersLoaded) {
            this.handleRoutingUrlChange();
        }
    }

    _getResourceIdentifier(value) {
        const stringValue = String(value ?? '').trim();
        return stringValue.startsWith('/base/organizations/')
            ? stringValue.replace('/base/organizations/', '')
            : stringValue;
    }

    _getOrganizationName(organization, lang) {
        if (organization?.name) {
            return organization.name;
        }

        const localizedNames = organization?.localizedNames;
        if (Array.isArray(localizedNames)) {
            const match = localizedNames.find((n) => n.languageTag === lang);
            return (match ?? localizedNames[0]).name ?? '';
        }

        return organization?.['@id'] ?? '';
    }

    async _loadOrganizationNamesForLanguage(lang) {
        if (this._organizationNamesByLanguage[lang]) {
            return this._organizationNamesByLanguage[lang];
        }

        if (!this.auth?.token || !this.entryPointUrl) {
            return {};
        }

        const url = new URL('/base/organizations?perPage=99999', this.entryPointUrl).href;
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/ld+json',
                'Accept-Language': lang,
                Authorization: 'Bearer ' + this.auth.token,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to load organizational units, status: ${response.status}`);
        }

        const data = await response.json();
        const names = {};

        for (const organization of data['hydra:member'] ?? []) {
            const identifier = this._getResourceIdentifier(organization?.['@id']);
            const name = this._getOrganizationName(organization, lang);

            if (identifier && name) {
                names[identifier] = name;
            }
        }

        this._organizationNamesByLanguage = {
            ...this._organizationNamesByLanguage,
            [lang]: names,
        };

        return names;
    }

    async _loadAndApplyLocalizedOrganizationNames() {
        const jobsWithOrganizationIds = this._jobOffers.filter((job) => job.organizationId);

        if (jobsWithOrganizationIds.length === 0) {
            return;
        }

        try {
            const [organizationNamesDe, organizationNamesEn] = await Promise.all(
                ['de', 'en'].map((lang) => this._loadOrganizationNamesForLanguage(lang)),
            );

            this._jobOffers = this._jobOffers.map((job) => {
                const organizationId = this._getResourceIdentifier(job.organizationId);
                const organizationNameDe = organizationNamesDe[organizationId];
                const organizationNameEn = organizationNamesEn[organizationId];

                if (!organizationNameDe && !organizationNameEn) {
                    return job;
                }

                return {
                    ...job,
                    organization: organizationNameDe || job.organization,
                    organizationEn: organizationNameEn || job.organizationEn,
                    organizationalUnit: organizationNameDe || job.organizationalUnit,
                    organizationalUnitEn: organizationNameEn || job.organizationalUnitEn,
                };
            });

            if (this._selectedJob) {
                this._selectedJob =
                    this._jobOffers.find(
                        (job) => job.identifier === this._selectedJob.identifier,
                    ) ?? this._selectedJob;
            }
        } catch (error) {
            console.error('Error loading organizational unit names:', error);
        }
    }

    /**
     * Picks the localised name matching the current language from the localizedNames array.
     * Falls back to the first entry if no match is found.
     * @param {Array<{languageTag: string, name: string}>} localizedNames
     * @returns {string}
     */
    _getLocalizedName(localizedNames) {
        if (!Array.isArray(localizedNames) || localizedNames.length === 0) {
            return '';
        }
        const match = localizedNames.find((n) => n.languageTag === this.lang);
        return (match ?? localizedNames[0]).name ?? '';
    }

    /**
     * Parses the current routing URL and opens or closes the detail dialog accordingly.
     */
    handleRoutingUrlChange() {
        const {pathSegments} = this.getRoutingData();

        // Expected URL pattern: job/<identifier>
        if (pathSegments[0] === 'job' && pathSegments[1]) {
            const identifier = pathSegments[1];
            const job = this._jobOffers.find((j) => j.identifier === identifier) ?? null;
            if (job) {
                this.openJobDialog(job);
            }
        } else {
            // Any other path — close the dialog if it is open
            const detailEl = /** @type {JobOfferDetail|undefined} */ (this._detailRef.value);
            if (detailEl) {
                detailEl.close();
            }
        }
    }

    /**
     * Sets the selected job and opens the detail dialog.
     * The ref is always populated since the dialog element is always in the DOM.
     * updateComplete ensures the job property has been received before open() is called.
     * @param {object} job
     */
    openJobDialog(job) {
        this._selectedJob = job;
        // Defer the open() call until after Lit has committed the current render,
        // so the detail component has received the updated job property.
        this.updateComplete.then(() => {
            const detailEl = /** @type {JobOfferDetail|undefined} */ (this._detailRef.value);
            if (detailEl) {
                detailEl.open();
            }
        });
    }

    /**
     * Opens the job detail dialog from a "View" button click and updates the routing URL.
     * The routing URL change triggers handleRoutingUrlChange, which calls openJobDialog.
     * @param {object} job
     */
    openJob(job) {
        this.sendSetPropertyEvent('routing-url', `job/${job.identifier}`, true);
    }

    /**
     * Called when the detail dialog is closed; resets the routing URL to root.
     */
    onDialogClosed() {
        this._selectedJob = null;
        this.sendSetPropertyEvent('routing-url', '/', true);
    }

    /**
     * Returns the loaded job offers filtered by search query and dropdowns, then sorted.
     * @returns {Array}
     */
    getFilteredJobs({includeAreaOfInterest = true, includeWorkLocation = true} = {}) {
        const query = this.searchQuery.toLowerCase().trim();
        return this._jobOffers
            .filter((job) => {
                const areaOfInterestLabels = getAreaOfInterestLabels(
                    job.areasOfInterest ?? job.areaOfInterest,
                    this._i18n.t.bind(this._i18n),
                );
                const matchesSearch =
                    !query ||
                    job.title.toLowerCase().includes(query) ||
                    areaOfInterestLabels.some((label) => label.toLowerCase().includes(query)) ||
                    this._getLocalizedDescription(job).toLowerCase().includes(query) ||
                    formatHoursRange(job.weeklyHoursMin, job.weeklyHoursMax, job.weeklyHours)
                        .toLowerCase()
                        .includes(query) ||
                    String(job.weeklyHoursEn ?? '')
                        .toLowerCase()
                        .includes(query);
                const jobAreasOfInterest = normalizeAreaOfInterestValues(
                    job.areasOfInterest ?? job.areaOfInterest,
                );
                const matchesAreaOfInterest =
                    !includeAreaOfInterest ||
                    this.filterAreasOfInterest.length === 0 ||
                    this.filterAreasOfInterest.some((value) => jobAreasOfInterest.includes(value));
                const matchesWorkLocation =
                    !includeWorkLocation ||
                    !this.filterWorkLocation ||
                    normalizeWorkLocations(job.workLocations).some((location) =>
                        getLocationHierarchy(location).some(
                            (ancestor) => getLocationKey(ancestor) === this.filterWorkLocation,
                        ),
                    );

                const matchesRemote = this.filterIncludeRemote || !this._isRemoteJob(job);

                const matchesHours = isHoursRangeInRange(
                    job.weeklyHoursMin,
                    job.weeklyHoursMax,
                    this.filterWeeklyHoursMin,
                    this.filterWeeklyHoursMax,
                    job.weeklyHours,
                );

                return (
                    matchesSearch &&
                    matchesAreaOfInterest &&
                    matchesWorkLocation &&
                    matchesRemote &&
                    matchesHours
                );
            })
            .sort((a, b) => this.compareJobsByDate(a, b));
    }

    /**
     * Returns true when the job is remote. Legacy remote location values remain supported.
     * @param {object} job
     * @returns {boolean}
     */
    _isRemoteJob(job) {
        return (
            job.remote === true ||
            normalizeWorkLocations(job.workLocations).some((location) =>
                [location.country, location.region, location.city].some(
                    (part) => String(part).toLowerCase() === 'remote',
                ),
            )
        );
    }

    getAvailableWorkLocations({includeSelected = false} = {}) {
        const jobs = this.getFilteredJobs({includeWorkLocation: false});
        // Expand each job location into its hierarchy so broader locations
        // (region, country) are also selectable. A job in Graz therefore also
        // makes Styria and Austria available as filter options.
        const availableLocations = normalizeWorkLocations(
            jobs.flatMap((job) =>
                normalizeWorkLocations(job.workLocations ?? []).flatMap((location) =>
                    getLocationHierarchy(location),
                ),
            ),
        );

        if (!includeSelected || !this.filterWorkLocation) {
            return availableLocations;
        }

        const selectedLocation = this._jobOffers
            .flatMap((job) =>
                normalizeWorkLocations(job.workLocations ?? []).flatMap((location) =>
                    getLocationHierarchy(location),
                ),
            )
            .find((location) => getLocationKey(location) === this.filterWorkLocation);

        return normalizeWorkLocations([
            ...availableLocations,
            ...(selectedLocation ? [selectedLocation] : []),
        ]);
    }

    getAvailableAreasOfInterest({includeSelected = false} = {}) {
        const jobs = this.getFilteredJobs({includeAreaOfInterest: false});
        const availableAreasOfInterest = [
            ...new Set(
                jobs.flatMap((job) =>
                    normalizeAreaOfInterestValues(job.areasOfInterest ?? job.areaOfInterest),
                ),
            ),
        ];

        return includeSelected
            ? [...new Set([...availableAreasOfInterest, ...this.filterAreasOfInterest])]
            : availableAreasOfInterest;
    }

    getInternalFavicon(job) {
        const i18n = this._i18n;
        const t = (key) => (i18n ? i18n.t(key) : key);
        let getfaviconURL = commonUtils.getAssetURL(
            '@digital-blueprint/bulletin-app',
            'icon/favicon.svg',
        );

        if (!job.externalJobUrl) {
            return html`
                <img
                    src="${getfaviconURL}"
                    aria-label="${t('manage-job-offers.job-type-internal')}" />
            `;
        }
    }

    _renderPartnerCompanyMarker(job, t) {
        if (job.jobOfferType === 'internal' || !job.isFromPartnerCompany) {
            return null;
        }

        return html`
            <span class="partner-company-marker" title="${t('view-job-offers.partner-company')}">
                <dbp-icon name="star" aria-hidden="true"></dbp-icon>
            </span>
        `;
    }

    _clearUnavailableAreaOfInterest() {
        if (this.filterAreasOfInterest.length === 0) {
            return;
        }

        const availableAreasOfInterest = new Set(this.getAvailableAreasOfInterest());
        const nextAreasOfInterest = this.filterAreasOfInterest.filter((value) =>
            availableAreasOfInterest.has(value),
        );

        if (nextAreasOfInterest.length !== this.filterAreasOfInterest.length) {
            this.filterAreasOfInterest = nextAreasOfInterest;
        }
    }

    _renderWorkLocationTags(job, t) {
        const locations = normalizeWorkLocations(job.workLocations);
        if (locations.length === 0) {
            return '';
        }

        const labels = locations.map((loc) => getWorkLocationLabel(loc, t, this.lang));

        return html`
            <div class="job-tags-wrapper">
                <span class="job-card-label">${t('view-job-offers.work-location')}:</span>
                <span class="job-locations">
                    ${labels.map((label) => label.split(', ').slice(0, 1, 2).join(', ')).join('; ')}
                </span>
            </div>
        `;
    }

    _renderAreaOfInterestTags(job, t) {
        const areaOfInterestLabels = getAreaOfInterestLabels(
            job.areasOfInterest ?? job.areaOfInterest,
            t,
        );

        if (areaOfInterestLabels.length === 0) {
            return '';
        }

        return html`
            <div class="job-tags-wrapper area-wrapper">
                <span class="job-card-label">${t('view-job-offers.areas-of-interest')}:</span>
                <div class="job-tags">
                    ${areaOfInterestLabels.map(
                        (label) => html`
                            <span class="job-tag">${label}</span>
                        `,
                    )}
                </div>
            </div>
        `;
    }

    /**
     * Returns the English value when the current language is English and the English text is
     * non-empty; otherwise returns the primary value.
     * @param {string} primary
     * @param {string} en
     * @returns {string}
     */
    _localized(primary, en) {
        return this.lang === 'en' && en ? en : primary;
    }

    /**
     * Returns the localized description for search and display contexts.
     * @param {object} job
     * @returns {string}
     */
    _getLocalizedDescription(job) {
        return this._localized(job.description ?? '', job.descriptionEn ?? '');
    }

    /**
     * Returns whether a deadline should still be visible in the list.
     * Date-only values stay visible until the next local midnight.
     * @param {string} deadline
     * @returns {boolean}
     */
    _isDeadlineVisible(deadline) {
        if (!deadline) {
            return true;
        }

        const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(deadline);
        if (dateOnlyMatch) {
            const [, year, month, day] = dateOnlyMatch;
            const expiresAt = new Date(Number(year), Number(month) - 1, Number(day) + 1);
            return expiresAt > new Date();
        }

        const timestamp = Date.parse(deadline);
        return !Number.isNaN(timestamp) && timestamp >= Date.now();
    }

    /**
     * Renders a metadata row for the search-result card when a value is available.
     * @param {string} label
     * @param {string} value
     * @returns {import('lit').TemplateResult|string}
     */
    _renderJobMetaItem(label, value) {
        if (!value) {
            return '';
        }

        return html`
            <div class="job-meta-item">
                <span class="job-card-label">${label}:</span>
                &thinsp; ${value}
            </div>
        `;
    }

    /**
     * Parses a date string to a comparable timestamp.
     * Invalid or missing dates return null so callers can sort them last.
     * @param {string} value
     * @returns {number|null}
     */
    getSortableTimestamp(value) {
        if (!value) {
            return null;
        }

        const timestamp = Date.parse(value);
        return Number.isNaN(timestamp) ? null : timestamp;
    }

    /**
     * Compares two jobs by publication date and keeps missing dates at the end.
     * @param {object} a
     * @param {object} b
     * @returns {number}
     */
    compareJobsByDate(a, b) {
        const publishedAtA = this.getSortableTimestamp(a.publishedAt);
        const publishedAtB = this.getSortableTimestamp(b.publishedAt);

        if (publishedAtA === null && publishedAtB === null) {
            return a.identifier.localeCompare(b.identifier);
        }

        if (publishedAtA === null) {
            return 1;
        }

        if (publishedAtB === null) {
            return -1;
        }

        if (publishedAtA !== publishedAtB) {
            return this.sortOrder === 'date-desc'
                ? publishedAtB - publishedAtA
                : publishedAtA - publishedAtB;
        }

        return a.identifier.localeCompare(b.identifier);
    }

    /**
     * Formats an ISO date string (YYYY-MM-DD) to the local DD.MM.YYYY format.
     * @param {string} isoDate
     * @returns {string}
     */
    formatDate(isoDate) {
        if (!isoDate) return '';
        const [year, month, day] = isoDate.split('-');
        return `${day}.${month}.${year}`;
    }

    onSearchInput(e) {
        this.searchQuery = e.target.value;
        this._resetVisibleCount();
    }

    onAreaOfInterestChange(e) {
        const nextAreasOfInterest = normalizeAreaOfInterestValues(e.detail?.value);
        const selectionUnchanged =
            nextAreasOfInterest.length === this.filterAreasOfInterest.length &&
            nextAreasOfInterest.every(
                (value, index) => value === this.filterAreasOfInterest[index],
            );

        if (selectionUnchanged) {
            return;
        }

        this.filterAreasOfInterest = nextAreasOfInterest;
        this._resetVisibleCount();
    }

    onWorkLocationChange(e) {
        this.filterWorkLocation = e.detail?.value ?? '';
        this._clearUnavailableAreaOfInterest();
        this._resetVisibleCount();
    }

    onDreamJobChange(e) {
        this.filterDreamJob = e.target.value;

        // Apply the preset filters that belong to the selected dream job option.
        // Selecting "Alle" clears the previously applied preset filters.
        const preset = DREAM_JOB_PRESETS[this.filterDreamJob] ?? {
            workLocation: '',
            includeRemote: false,
            weeklyHoursMin: '',
            weeklyHoursMax: '',
        };
        this.filterWorkLocation = preset.workLocation;
        this.filterIncludeRemote = preset.includeRemote;
        this.filterWeeklyHoursMin = preset.weeklyHoursMin;
        this.filterWeeklyHoursMax = preset.weeklyHoursMax;
        this._clearUnavailableAreaOfInterest();

        this._resetVisibleCount();
    }

    onIncludeRemoteChange(e) {
        this.filterIncludeRemote = e.target.checked;
        this._resetVisibleCount();
    }

    /**
     * Toggles the visibility of the additional filters row.
     */
    toggleFilters() {
        this._filtersOpen = !this._filtersOpen;
    }

    /**
     * Resets all filters back to their default (empty) state.
     */
    clearFilters() {
        this.searchQuery = '';
        this.filterDreamJob = 'all';
        this.filterAreasOfInterest = [];
        this.filterWorkLocation = '';
        this.filterIncludeRemote = false;
        this.filterWeeklyHoursMin = '';
        this.filterWeeklyHoursMax = '';
        this._resetVisibleCount();
    }

    onWeeklyHoursMinChange(e) {
        this.filterWeeklyHoursMin = e.detail?.min ?? '';
        this._clearUnavailableAreaOfInterest();
        this._resetVisibleCount();
    }

    onWeeklyHoursMaxChange(e) {
        this.filterWeeklyHoursMax = e.detail?.max ?? '';
        this._clearUnavailableAreaOfInterest();
        this._resetVisibleCount();
    }

    onSortChange(e) {
        this.sortOrder = e.target.value;
        this._resetVisibleCount();
    }

    /**
     * Resets the job list back to the first batch.
     * Used whenever the filters or sorting change so the user starts at the top.
     */
    _resetVisibleCount() {
        this._visibleCount = LOAD_MORE_BATCH_SIZE;
    }

    /**
     * Converts a work location key ("country|region|city") into its most specific label,
     * e.g. "AT|styria|" becomes "Steiermark".
     * @param {string} locationKey
     * @param {(key: string) => string} t
     * @returns {string}
     */
    _getWorkLocationMarkerLabel(locationKey, t) {
        const [country = '', region = '', city = ''] = String(locationKey).split('|');
        const label = getWorkLocationLabel({country, region, city}, t, this.lang);
        // getWorkLocationLabel joins city, region and country with commas, ordered from the
        // most specific to the least specific part, so the first segment is the best marker text.
        return label.split(',')[0].trim();
    }

    /**
     * Formats the weekly hours range for a filter marker, e.g. "< 20h", "> 20h" or "20 – 30h".
     * @param {string} min
     * @param {string} max
     * @param {(key: string, options?: object) => string} t
     * @returns {string}
     */
    _formatHoursMarker(min, max, t) {
        const hasMin = String(min).trim() !== '';
        const hasMax = String(max).trim() !== '';

        if (hasMin && !hasMax) {
            return t('view-job-offers.weekly-hours-min-marker', {hours: min});
        }
        if (!hasMin && hasMax) {
            return t('view-job-offers.weekly-hours-max-marker', {hours: max});
        }
        return t('view-job-offers.weekly-hours-range-marker', {min, max});
    }

    /**
     * Builds the list of currently active filters shown as removable markers.
     * @param {(key: string, options?: object) => string} t
     * @returns {Array<{key: string, category: string, value: string, clear: () => void}>}
     */
    _getActiveFilterMarkers(t) {
        const markers = [];

        if (this.searchQuery.trim()) {
            markers.push({
                key: 'search',
                category: t('view-job-offers.search-marker-label'),
                value: this.searchQuery.trim(),
                clear: () => {
                    this.searchQuery = '';
                    this._resetVisibleCount();
                },
            });
        }

        // Work location and the "include remote" checkbox are shown as a single combined marker,
        // e.g. "Steiermark / Remote", "Steiermark" or "Remote".
        if (this.filterWorkLocation || this.filterIncludeRemote) {
            const workLocationValue = [
                this.filterWorkLocation
                    ? this._getWorkLocationMarkerLabel(this.filterWorkLocation, t)
                    : '',
                this.filterIncludeRemote ? t('view-job-offers.remote-marker') : '',
            ]
                .filter(Boolean)
                .join(' / ');
            markers.push({
                key: 'work-location',
                category: t('view-job-offers.work-location'),
                value: workLocationValue,
                clear: () => {
                    this.filterWorkLocation = '';
                    this.filterIncludeRemote = false;
                    this._clearUnavailableAreaOfInterest();
                    this._resetVisibleCount();
                },
            });
        }

        if (this.filterWeeklyHoursMin || this.filterWeeklyHoursMax) {
            markers.push({
                key: 'weekly-hours',
                category: t('view-job-offers.weekly-hours'),
                value: this._formatHoursMarker(
                    this.filterWeeklyHoursMin,
                    this.filterWeeklyHoursMax,
                    t,
                ),
                clear: () => {
                    this.filterWeeklyHoursMin = '';
                    this.filterWeeklyHoursMax = '';
                    this._clearUnavailableAreaOfInterest();
                    this._resetVisibleCount();
                },
            });
        }

        this.filterAreasOfInterest.forEach((areaOfInterest) => {
            markers.push({
                key: `area-of-interest-${areaOfInterest}`,
                category: t('view-job-offers.areas-of-interest'),
                value: getAreaOfInterestLabel(areaOfInterest, t),
                clear: () => {
                    this.filterAreasOfInterest = this.filterAreasOfInterest.filter(
                        (value) => value !== areaOfInterest,
                    );
                    this._resetVisibleCount();
                },
            });
        });

        return markers;
    }

    /**
     * Appends one more batch of job cards to the visible list.
     */
    _loadMore() {
        this._visibleCount += LOAD_MORE_BATCH_SIZE;
    }

    getOrganizationLabel(job) {
        if (job.jobOfferType === 'internal') {
            return this.universityShortName;
        }

        const companyName = job.companyName ?? '';
        if (job.jobOfferType !== 'external' || !job.isFromPartnerCompany) {
            return companyName;
        }

        const website = job.companyData?.url ?? job.companyData?.website ?? '';
        try {
            const companyUrl = new URL(String(website).trim());
            if (['http:', 'https:'].includes(companyUrl.protocol)) {
                return html`
                    <a
                        class="partner-company-link"
                        href="${companyUrl.href}"
                        target="_blank"
                        rel="noopener noreferrer">
                        ${companyName}
                    </a>
                `;
            }
        } catch {
            // Fall back to the company name when no valid website is available.
        }

        return companyName;
    }

    _onLoginClicked(e) {
        this.sendSetPropertyEvent('requested-login-status', 'logged-in');
        e.preventDefault();
    }

    render() {
        const i18n = this._i18n;
        const t = (key, options) => (i18n ? i18n.t(key, options) : key);

        if (this.isAuthPending()) {
            return html`
                <div class="loading-wrapper">
                    <dbp-mini-spinner></dbp-mini-spinner>
                    <span>${t('view-job-offers.auth-loading')}</span>
                </div>
            `;
        }

        if (!this.isLoggedIn()) {
            return html`
                <dbp-login-required-warning
                    subscribe="auth,lang"
                    @dbp-login-requested=${this._onLoginClicked}></dbp-login-required-warning>
            `;
        }

        const sortedAreasOfInterest = this.getAvailableAreasOfInterest({
            includeSelected: true,
        }).sort((a, b) =>
            getAreaOfInterestLabel(a, t).localeCompare(getAreaOfInterestLabel(b, t), this.lang),
        );
        const areaOfInterestItems = Object.fromEntries(
            sortedAreasOfInterest.map((value) => [value, getAreaOfInterestLabel(value, t)]),
        );

        // Loading state
        if (this._loading) {
            return html`
                <div class="loading-wrapper">
                    <dbp-mini-spinner></dbp-mini-spinner>
                    <span>${t('view-job-offers.loading')}</span>
                </div>
            `;
        }

        // Error state
        if (this._loadError) {
            return html`
                <p class="no-results">${t('view-job-offers.error-load-failed')}</p>
            `;
        }

        const availableWorkLocations = this.getAvailableWorkLocations({includeSelected: true});
        const filtered = this.getFilteredJobs();
        const activeFilterMarkers = this._getActiveFilterMarkers(t);

        // Render the first _visibleCount jobs until the user requests another batch.
        const visibleCount = Math.min(this._visibleCount, filtered.length);
        const visibleJobs = filtered.slice(0, visibleCount);
        const hasMore = visibleCount < filtered.length;

        return html`
            <div class="job-board">
                <!-- Primary filter row: dream job, search and the toggle for the remaining filters -->
                <div class="search-filter-wrapper">
                    <div class="search-filter-row">
                        <div class="field">
                            <label class="label" for="filter-dream-job">
                                ${t('view-job-offers.dream-job-label')}
                            </label>
                            <div class="control">
                                <select
                                    id="filter-dream-job"
                                    @change="${this.onDreamJobChange}"
                                    .value="${this.filterDreamJob}">
                                    <option
                                        value="all"
                                        ?selected="${this.filterDreamJob === 'all'}">
                                        ${t('view-job-offers.dream-job-all')}
                                    </option>
                                    <option
                                        value="study-accompanying"
                                        ?selected="${this.filterDreamJob === 'study-accompanying'}">
                                        ${t('view-job-offers.dream-job-study-accompanying')}
                                    </option>
                                    <option
                                        value="career-entry"
                                        ?selected="${this.filterDreamJob === 'career-entry'}">
                                        ${t('view-job-offers.dream-job-career-entry')}
                                    </option>
                                </select>
                            </div>
                        </div>

                        <!-- Search bar -->
                        <div class="field search-field">
                            <span class="label search-label-spacer" aria-hidden="true">&nbsp;</span>
                            <div class="control search-control">
                                <input
                                    type="text"
                                    class="input"
                                    placeholder="${t('view-job-offers.search-placeholder')}"
                                    .value="${this.searchQuery}"
                                    @input="${this.onSearchInput}"
                                    aria-label="${t('view-job-offers.search-placeholder')}" />
                                <span class="search-icon" aria-hidden="true">
                                    <dbp-icon name="search"></dbp-icon>
                                </span>
                            </div>
                        </div>

                        <!-- Toggle for the additional filters -->
                        <div class="field toggle-field">
                            <span class="label search-label-spacer" aria-hidden="true">&nbsp;</span>
                            <button
                                type="button"
                                class="filter-toggle"
                                aria-expanded="${this._filtersOpen ? 'true' : 'false'}"
                                @click="${this.toggleFilters}">
                                <dbp-icon
                                    name="${this._filtersOpen ? 'chevron-up' : 'chevron-down'}"></dbp-icon>
                                <span>
                                    ${
                                        this._filtersOpen
                                            ? t('view-job-offers.filter-close')
                                            : t('view-job-offers.filter-open')
                                    }
                                </span>
                            </button>
                        </div>
                    </div>

                    <!-- Additional filters row, only visible once the user opens the filters -->
                    ${
                        this._filtersOpen
                            ? html`
                                  <div class="filters-row">
                                      <div class="field work-location-field">
                                          <label class="label" for="filter-work-location">
                                              ${t('view-job-offers.work-location')}
                                          </label>
                                          <div class="control work-location-control">
                                              <dbp-work-location-select-element
                                                  id="filter-work-location"
                                                  lang="${this.lang}"
                                                  lang-dir="${this.langDir}"
                                                  placeholder="${t('view-job-offers.select-placeholder')}"
                                                  .locations="${availableWorkLocations}"
                                                  .value="${this.filterWorkLocation}"
                                                  @change="${
                                                      this.onWorkLocationChange
                                                  }"></dbp-work-location-select-element>
                                              <label class="remote-checkbox">
                                                  <input
                                                      type="checkbox"
                                                      class="remote-checkbox-input"
                                                      .checked="${this.filterIncludeRemote}"
                                                      @change="${this.onIncludeRemoteChange}" />
                                                  <span class="remote-checkbox-label">
                                                      ${t('view-job-offers.include-remote')}
                                                  </span>
                                              </label>
                                          </div>
                                      </div>

                                      <dbp-hours-range-element
                                          lang="${this.lang}"
                                          class="weekly-hours-range-view-job-offer"
                                          lang-dir="${this.langDir}"
                                          label="${t('hours-range.label')}"
                                          .min="${this.filterWeeklyHoursMin}"
                                          .max="${this.filterWeeklyHoursMax}"
                                          @change="${(e) => {
                                              this.filterWeeklyHoursMin = e.detail?.min ?? '';
                                              this.filterWeeklyHoursMax = e.detail?.max ?? '';
                                              this._clearUnavailableAreaOfInterest();
                                              this._resetVisibleCount();
                                          }}"></dbp-hours-range-element>

                                      <div class="field area-of-interest-field">
                                          <dbp-enum-element
                                              name="filter-area-of-interest"
                                              lang="${this.lang}"
                                              label="${t('view-job-offers.areas-of-interest')}"
                                              multiple
                                              display-mode="tags"
                                              .tagPlaceholder="${{
                                                  [this.lang]: t(
                                                      'view-job-offers.select-placeholder',
                                                  ),
                                              }}"
                                              .items="${areaOfInterestItems}"
                                              .value="${this.filterAreasOfInterest}"
                                              @change="${
                                                  this.onAreaOfInterestChange
                                              }"></dbp-enum-element>
                                      </div>
                                  </div>
                              `
                            : ''
                    }

                    <!-- Active filter markers, styled after dbp-cabinet-current-refinements -->
                    ${
                        activeFilterMarkers.length > 0
                            ? html`
                                  <div class="ais-CurrentRefinements">
                                      <ul
                                          class="ais-CurrentRefinements-list"
                                          aria-label="${t('view-job-offers.active-filters-label')}">
                                          ${activeFilterMarkers.map(
                                              (marker) => html`
                                                  <li class="ais-CurrentRefinements-category">
                                                      <div class="refinement-title">
                                                          ${marker.category}
                                                      </div>
                                                      <div class="refinement-value">
                                                          <span
                                                              class="ais-CurrentRefinements-categoryLabel">
                                                              ${marker.value}
                                                          </span>
                                                          <button
                                                              type="button"
                                                              class="ais-CurrentRefinements-delete"
                                                              aria-label="${marker.category} ${marker.value}"
                                                              title="${t(
                                                                  'view-job-offers.remove-filter',
                                                                  {filter: marker.value},
                                                              )}"
                                                              @click="${marker.clear}">
                                                              <span class="visually-hidden">
                                                                  ${t(
                                                                      'view-job-offers.remove-filter',
                                                                      {
                                                                          filter: marker.value,
                                                                      },
                                                                  )}
                                                              </span>
                                                              <span
                                                                  class="filter-close-icon"></span>
                                                          </button>
                                                      </div>
                                                  </li>
                                              `,
                                          )}
                                      </ul>
                                      <button
                                          type="button"
                                          class="clear-refinements-button"
                                          @click="${this.clearFilters}">
                                          <dbp-icon name="close" aria-hidden="true"></dbp-icon>
                                          <span class="clear-refinements-button-label">
                                              ${t('view-job-offers.clear-filters')}
                                          </span>
                                      </button>
                                  </div>
                              `
                            : ''
                    }
                </div>
                    <!-- Section heading and sort control -->
                    <div class="job-offer-wrapper">
                        <div class="section-header">
                            <h2>
                                ${t('view-job-offers.available-positions')}
                                <span class="position-count">
                                    ${t('view-job-offers.position-count', {
                                        total: this._jobOffers.length,
                                        filtered: filtered.length,
                                    })}
                                </span>
                            </h2>
                        </div>

                        <!-- Job cards grid -->
                        ${
                            filtered.length === 0
                                ? html`
                                      <p class="no-results">${t('view-job-offers.no-results')}</p>
                                  `
                                : html`
                                      <div class="job-grid">
                                          ${repeat(
                                              visibleJobs,
                                              (job) => job.identifier,
                                              (job) => html`
                                                  <div class="job-card">
                                                      <div class="job-card-body">
                                                          <div class="job-card-header">
                                                              <h3 class="job-title">
                                                                  ${job.title}
                                                              </h3>
                                                              <div class="job-source-marker">
                                                                  ${this.getInternalFavicon(job)}
                                                              </div>
                                                          </div>
                                                          <dl class="job-meta-list">
                                                              <span class="job-meta-type">
                                                                  ${this._renderPartnerCompanyMarker(job, t)}
                                                                  ${this.getOrganizationLabel(job)}
                                                              </span>
                                                              ${this._renderWorkLocationTags(job, t)}
                                                              ${this._renderJobMetaItem(
                                                                  t(
                                                                      'view-job-offers.organizational-unit',
                                                                  ),
                                                                  this._localized(
                                                                      job.organizationalUnit,
                                                                      job.organizationalUnitEn ??
                                                                          '',
                                                                  ),
                                                              )}
                                                              ${this._renderJobMetaItem(
                                                                  t('view-job-offers.weekly-hours'),
                                                                  this._localized(
                                                                      formatHoursRange(
                                                                          job.weeklyHoursMin,
                                                                          job.weeklyHoursMax,
                                                                          job.weeklyHours,
                                                                      ),
                                                                      job.weeklyHoursEn ?? '',
                                                                  ),
                                                              )}
                                                          </dl>
                                                          ${this._renderAreaOfInterestTags(job, t)}
                                                      </div>

                                                      <div class="job-card-footer">
                                                          <button
                                                              class="button is-secondary"
                                                              @click="${() => this.openJob(job)}"
                                                              aria-label="${t(
                                                                  'view-job-offers.view-details',
                                                              )} – ${job.title}">
                                                              <dbp-icon
                                                                  class="btn-icon"
                                                                  name="keyword-research"
                                                                  aria-hidden="true"></dbp-icon>
                                                              ${t('view-job-offers.view-details')}
                                                          </button>
                                                      </div>
                                                  </div>
                                              `,
                                          )}
                                      </div>
                                  `
                        }

                        <!-- Load more control -->
                        ${
                            hasMore
                                ? html`
                                      <div class="load-more-wrapper">
                                          <button
                                              type="button"
                                              class="button is-primary load-more-button"
                                              @click="${this._loadMore}">
                                              <dbp-icon
                                                  class="btn-icon"
                                                  name="angle-double-down"
                                                  aria-hidden="true"></dbp-icon>
                                              ${t('view-job-offers.load-more')}
                                          </button>
                                      </div>
                                  `
                                : ''
                        }

                        <!-- Job detail dialog — always in the DOM; job property drives its content -->
                        <dbp-bulletin-job-offer-detail
                            ${ref(this._detailRef)}
                            .job="${this._selectedJob}"
                            lang="${this.lang}"
                            subscribe="university-short-name"
                            .universityShortName="${this.universityShortName}"
                            entry-point-url="${this.entryPointUrl}"
                            .auth="${this.auth}"
                            @dbp-modal-closed="${this.onDialogClosed}"></dbp-bulletin-job-offer-detail>
                    </div>
                </div>
            </div>
        `;
    }

    static get styles() {
        return css`
            ${commonStyles.getThemeCSS()}
            ${commonStyles.getGeneralCSS()}
            ${commonStyles.getButtonCSS()}
            ${commonStyles.getNotificationCSS()}

            /* Override: getGeneralCSS background-size of 25% is too large; also ensure enough
               right padding so the chevron SVG never overlaps the selected option text.
               The vertical and left padding match the ".input" fields so the dream job select
               lines up with the search input and the other filters. */
            select:not(.select) {
                background-size: 1em !important;
                padding-top: calc(0.375em - 1px);
                padding-bottom: calc(0.375em - 1px);
                padding-left: calc(0.625em - 1px);
                padding-right: 2em !important;
                width: 100%;
                cursor: pointer;
            }

            .job-board {
                display: flex;
                flex-direction: column;
                gap: 2rem;
            }

            .job-card-label {
                font-weight: bolder;
            }

            .job-locations {
                word-break: break-all;
            }

            /* Loading state wrapper */
            .loading-wrapper {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 2rem;
                color: var(--dbp-muted);
            }

            .search-filter-wrapper {
                display: grid;
            }

            /* Search bar — extends the .input with a search icon overlay */
            .search-field {
                margin-bottom: 0;
            }

            .search-control {
                position: relative;
            }

            .search-control .input {
                padding-right: 2.5rem;
                width: 100%;
            }

            /* Align the height of the dream job select, the search input and the filter toggle */
            .search-filter-row .control select,
            .search-filter-row .search-control .input,
            .search-filter-row .filter-toggle {
                box-sizing: border-box;
                height: var(--filter-control-height);
                min-height: var(--filter-control-height);
            }

            .search-icon {
                position: absolute;
                right: 0.75rem;
                top: 50%;
                transform: translateY(-50%);
                color: var(--dbp-muted);
                display: flex;
                align-items: center;
                pointer-events: none;
            }

            .search-filter-row,
            .filters-row {
                display: grid;
                gap: 0.5rem;
                --filter-control-height: 2.1rem;
            }

            /* Primary row: dream job dropdown, search field and the filter toggle */
            .search-filter-row {
                grid-template-columns: minmax(0, 1fr) minmax(0, 2fr) auto;
                align-items: end;
            }

            /* Additional filters: work location (+ remote) and weekly hours */
            .filters-row {
                grid-template-columns: minmax(0, 1fr) auto;
                align-items: end;
            }

            .area-of-interest-field {
                grid-column: 1 / -1;
            }

            .filters-row dbp-hours-range-element {
                --hours-range-input-min-width: 130px;
                --hours-range-input-max-width: 150px;
                width: fit-content;
            }

            .filters-row dbp-work-location-select-element {
                --work-location-select-height: var(--filter-control-height);
                flex: 1 1 auto;
                min-width: 0;
            }

            /* Work location select and the "100% remote" box are attached to each other so they
               look like a single control with a shared border, mirroring the design mockup. */
            .work-location-control {
                display: flex;
                align-items: stretch;
            }

            .remote-checkbox {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                white-space: nowrap;
                cursor: pointer;
                box-sizing: border-box;
                height: var(--filter-control-height);
                padding: 0 0.75rem;
                border: var(--dbp-border);
                border-radius: var(--dbp-border-radius);
                /* Overlap the select's right border so only a single divider line is visible */
                margin-left: -1px;
            }

            /* Custom bordered checkbox instead of the default (blue) browser checkbox */
            .remote-checkbox-input {
                appearance: none;
                -webkit-appearance: none;
                -moz-appearance: none;
                box-sizing: border-box;
                margin: 0;
                width: 1em;
                height: 1em;
                border: 1px solid var(--dbp-content);
                background: var(--dbp-background);
                cursor: pointer;
                position: relative;
                flex: none;
            }

            .remote-checkbox-input:checked::after {
                content: '';
                position: absolute;
                left: 0.28em;
                top: 0.08em;
                width: 0.28em;
                height: 0.55em;
                border: solid var(--dbp-content);
                border-width: 0 2px 2px 0;
                transform: rotate(45deg);
            }

            .remote-checkbox-label {
                cursor: pointer;
            }

            /* Filter toggle button in the primary row */
            .toggle-field {
                display: flex;
                flex-direction: column;
            }

            .filter-toggle {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
                height: var(--filter-control-height);
                padding: 0 0.9rem;
                white-space: nowrap;
                background: var(--dbp-background);
                color: var(--dbp-content);
                border: 1px solid var(--dbp-content);
                cursor: pointer;
            }

            /* Reset the icon's intrinsic baseline offset so it is vertically centered
               within the flex-centered button instead of sitting slightly too high */
            .filter-toggle dbp-icon {
                top: 0;
            }

            .filter-toggle:focus-visible {
                outline: 2px solid var(--dbp-content);
                outline-offset: 2px;
            }

            /* Active filter markers, styled after dbp-cabinet-current-refinements */
            .ais-CurrentRefinements {
                font-size: 1em;
                margin-top: 1.3em;
                display: flex;
                align-items: start;
            }

            .visually-hidden {
                position: absolute !important;
                clip: rect(1px, 1px, 1px, 1px);
                overflow: hidden;
                height: 1px;
                width: 1px;
                word-wrap: normal;
            }

            .ais-CurrentRefinements-list {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                gap: 0.5em 1em;
                margin: 0;
                padding: 0;
                list-style: none;
            }

            .ais-CurrentRefinements-category {
                list-style: none;
                border: 1px solid var(--dbp-content);
                display: flex;
                word-break: keep-all;
            }

            .ais-CurrentRefinements-delete {
                position: relative;
                background: none;
                border: none 0;
                cursor: pointer;
                color: var(--dbp-content);
                display: flex;
                align-items: center;
            }

            .ais-CurrentRefinements-category:hover .filter-close-icon {
                transform: rotate(90deg);
            }

            .filter-close-icon {
                display: block;
                transition: transform 0.1s ease-in;
                mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='white'%3E%3Cpath d='M.293.293a1 1 0 011.414 0L8 6.586 14.293.293a1 1 0 111.414 1.414L9.414 8l6.293 6.293a1 1 0 01-1.414 1.414L8 9.414l-6.293 6.293a1 1 0 01-1.414-1.414L6.586 8 .293 1.707a1 1 0 010-1.414z'/%3E%3C/svg%3E");
                width: 10px;
                height: 10px;
                background-size: 10px;
                color: var(--dbp-content);
                background: var(--dbp-content);
            }

            .refinement-title {
                color: var(--dbp-on-primary-surface);
                background: var(--dbp-primary-surface);
                padding: 4px 8px;
                font-weight: bolder;
            }

            .refinement-value {
                padding: 4px 6px;
                justify-content: space-between;
                display: flex;
                gap: 0.5em;
                align-items: center;
            }

            /* Clear all filters button, styled after dbp-cabinet-clear-refinements.
               Sits on the right of the markers row and stays vertically aligned with them. */
            .ais-CurrentRefinements-clear {
                list-style: none;
                margin-left: auto;
            }

            .clear-refinements-button {
                background: transparent;
                border: 1px solid transparent;
                color: var(--dbp-content);
                border-radius: 0;
                padding: 4px 6px;
                position: relative;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 4px;
                white-space: nowrap;
                margin-left: auto;
            }

            .clear-refinements-button dbp-icon {
                font-size: 1.1em;
                top: 0;
            }

            .clear-refinements-button:focus,
            .clear-refinements-button:hover {
                background: var(--dbp-hover-background-color);
                color: var(--dbp-hover-color);
                text-decoration: underline;
                text-underline-offset: 3px;
            }

            /* Rotate the close icon on hover, mirroring the marker delete icons */
            .clear-refinements-button:focus dbp-icon,
            .clear-refinements-button:hover dbp-icon {
                transform: rotate(90deg);
                transition: transform 0.1s ease-in;
            }

            .clear-refinements-button-label {
                white-space: nowrap;
            }

            .search-filter-row .field,
            .filters-row .field {
                margin-bottom: 0;
            }

            .search-label-spacer {
                display: block;
            }

            /* Toolkit form elements render their own label inside a fieldset, so the label styling
               and the vertical position have to be aligned with the plain ".label" of the other
               filter fields */
            .search-filter-row dbp-enum-element,
            .filters-row dbp-enum-element {
                --dbp-label-font-weight: bolder;
                --dbp-label-margin-bottom: 0.25em;
                display: block;
                /* Compensates the 10px fieldset margin of the toolkit form element */
                margin: -10px 0;
            }

            .label {
                font-weight: bolder;
                margin-bottom: 0.25em;
            }

            .weekly-hours-range-view-job-offer {
                --hours-range-input-min-height: 2.1rem;
                --hours-range-fieldset-margin-top: 0.7rem;
                --hours-range-placeholder-font-weight: 100;
            }

            .job-meta-type {
                color: var(--dbp-primary);
                font-weight: 500;
            }

            @media (max-width: 900px) {
                .search-filter-row {
                    grid-template-columns: minmax(0, 1fr) auto;
                    gap: 1em;
                }

                .search-filter-row .search-field {
                    grid-column: 1 / -1;
                    order: 3;
                }

                .filters-row {
                    grid-template-columns: 1fr;
                }
                .weekly-hours-range-view-job-offer {
                    --hours-range-fieldset-margin-top: 0;
                }

                .search-label-spacer {
                    display: none;
                }
                .search-filter-wrapper {
                    gap: 0.5em;
                }
            }

            @media (max-width: 600px) {
                .search-filter-row {
                    grid-template-columns: 1fr;
                    padding-bottom: 10px;
                }

                .search-filter-row .search-field {
                    order: 0;
                }

                .filters-row {
                    grid-template-columns: 1fr;
                    border-top: 3px solid var(--dbp-accent);
                    padding-top: 10px;
                }

                .search-label-spacer {
                    display: none;
                }

                .filter-toggle {
                    width: 100%;
                }
            }
            .job-offer-wrapper {
                display: grid;
                gap: 0.5em;
            }
            /* Section heading aligned with the sort control */
            .section-header {
                display: flex;
                align-items: baseline;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 0.5rem;
                margin-top: 0.25rem;
            }

            .section-header h2 {
                margin: 0;
                font-weight: 300;
            }

            .position-count {
                color: var(--dbp-muted);
                font-size: 1rem;
                font-weight: normal;
            }

            .sort-wrapper {
                display: flex;
                align-items: baseline;
                gap: 0.5rem;
                flex-shrink: 0;
            }

            /* Override .label margin so it sits flush with the select */
            .sort-label {
                margin-bottom: 0;
                white-space: nowrap;
            }

            .sort-wrapper .control select {
                width: auto;
            }

            /* 3-column job card grid */
            .job-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 1rem;
            }

            @media (max-width: 900px) {
                .job-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
            }

            @media (max-width: 560px) {
                .job-grid {
                    grid-template-columns: 1fr;
                }
                .work-location-control {
                    flex-direction: column;
                }

                .remote-checkbox {
                    border-top: 0;
                    margin-left: 0;
                }
            }

            /* Job card */
            .job-card {
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                border: var(--dbp-border);
                border-radius: var(--dbp-border-radius);
                padding: 1rem;
                background: var(--dbp-background);
                transition: box-shadow 0.15s;
            }

            .job-card:hover {
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }

            .job-card-body {
                flex: 1;
                margin-bottom: 5px;
            }

            .job-card-header {
                display: flex;
                flex-direction: row;
                justify-content: space-between;
            }

            .job-card-header img {
                max-height: 28px;
                object-fit: cover;
            }

            .job-source-marker {
                display: flex;
                align-items: flex-start;
                flex-shrink: 0;
                margin-left: 0.5rem;
            }

            .partner-company-marker {
                display: inline-flex;
                align-items: center;
                color: var(--dbp-accent);
                line-height: 1;
            }

            .partner-company-marker dbp-icon {
                font-size: 1rem;
                top: 0;
            }

            .partner-company-link {
                color: var(--dbp-accent);
            }

            .favicon-visible {
                display: block;
            }

            .favicon-hidden {
                display: none;
            }

            .job-title {
                font-size: 1.15rem;
                font-weight: 500;
            }

            .job-meta-list {
                display: grid;
            }

            .job-meta-list .button {
                height: max-content;
            }

            .job-meta-item {
                display: inline;
            }

            .job-meta-item dt,
            .job-meta-item dd {
                margin: 0;
            }

            .job-meta-item dt {
                font-size: 0.95rem;
                font-weight: 600;
            }

            .job-meta-item dd {
                font-size: 1rem;
                line-height: 1.35;
            }

            .job-tags-wrapper {
                display: inline;
            }

            .area-wrapper {
                display: initial;
            }
            .job-tags-wrapper .job-card-label {
                margin-right: 0.15rem;
            }

            .job-tags {
                display: flex;
                flex-wrap: wrap;
                gap: 0.2rem;
                margin: 0.3rem 0;
            }

            .job-tag {
                display: inline-block;
                border: 1px solid var(--dbp-content);
                border-radius: 2px;
                padding: 0.1rem 0.4rem;
                font-size: 1rem;
                color: var(--dbp-content);
            }

            .job-card-footer {
                display: flex;
                justify-content: flex-end;
                align-items: flex-end;
            }

            /* Button icon aligned inside the secondary button */
            .job-card-footer .button {
                display: inline-flex;
                align-items: center;
                gap: 0.35rem;
                height: max-content;
            }

            .btn-icon {
                flex-shrink: 0;
                top: 0;
            }

            /* No results message */
            .no-results {
                padding: 2rem;
                text-align: center;
                color: var(--dbp-muted);
            }

            .load-more-wrapper {
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 1.5rem 0;
            }

            .load-more-button {
                display: inline-flex;
                align-items: center;
                gap: 0.5rem;
            }

            @media (max-width: 440px) {
                .ais-CurrentRefinements {
                    flex-wrap: wrap;
                    justify-content: flex-end;
                }
                .clear-refinements-button {
                    margin-left: unset;
                    margin-top: 10px;
                }
            }
        `;
    }
}

commonUtils.defineCustomElement('dbp-bulletin-view-job-offers', ViewJobOffers);
