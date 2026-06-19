import {css, html, nothing, unsafeCSS} from 'lit';
import {ref, createRef} from 'lit/directives/ref.js';
import {repeat} from 'lit/directives/repeat.js';
import * as commonUtils from '@dbp-toolkit/common/utils';
import * as commonStyles from '@dbp-toolkit/common/src/styles.js';
import {ScopedElementsMixin} from '@dbp-toolkit/common/src/scoped/ScopedElementsMixin.js';
import {DBPSelect, Icon, MiniSpinner, getIconSVGURL} from '@dbp-toolkit/common';
import DBPBulletinLitElement from './dbp-bulletin-lit-element.js';
import {JobOfferDetail} from './dbp-bulletin-job-offer-detail.js';
import JobOfferModule, {
    AREAS_OF_INTEREST,
    getAreaOfInterestLabel,
    getAreaOfInterestLabels,
    normalizeAreaOfInterestValues,
} from './modules/jobOfferForm.js';
import {normalizeWorkLocations} from './modules/workLocationsElement.js';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50, 100];
const DEFAULT_PAGE_SIZE = 10;

class ViewJobOffers extends ScopedElementsMixin(DBPBulletinLitElement) {
    static get scopedElements() {
        return {
            'dbp-select': DBPSelect,
            'dbp-icon': Icon,
            'dbp-mini-spinner': MiniSpinner,
            'dbp-bulletin-job-offer-detail': JobOfferDetail,
        };
    }

    constructor() {
        super();
        this.searchQuery = '';
        this.filterAreaOfInterest = '';
        this.filterWeeklyHoursMin = '';
        this.filterWeeklyHoursMax = '';
        this.sortOrder = 'date-desc';
        this.currentPage = 1;
        this.pageSize = DEFAULT_PAGE_SIZE;
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
        /** @type {Array<string>} Area-of-interest option values shared with the form module */
        this._areasOfInterest = Object.keys(AREAS_OF_INTEREST);
    }

    static get properties() {
        return {
            ...super.properties,
            searchQuery: {type: String, state: true},
            filterAreaOfInterest: {type: String, state: true},
            filterWeeklyHoursMin: {type: String, state: true},
            filterWeeklyHoursMax: {type: String, state: true},
            sortOrder: {type: String, state: true},
            currentPage: {type: Number, state: true},
            pageSize: {type: Number, state: true},
            _selectedJob: {state: true},
            _jobOffers: {state: true},
            _loading: {state: true},
            _loadError: {state: true},
            _areasOfInterest: {state: true},
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
                        externalJobUrl: extra.externalJobUrl ?? '',
                        workLocations: normalizeWorkLocations(extra.workLocations),
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
            await this._loadAndApplyLocalizedOrganizationNames();
        } catch (error) {
            console.error('Error loading job offers:', error);
            this._loadError = true;
        } finally {
            this._loading = false;
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
    getFilteredJobs() {
        const query = this.searchQuery.toLowerCase().trim();
        const minHours =
            this.filterWeeklyHoursMin !== '' ? parseFloat(this.filterWeeklyHoursMin) : null;
        const maxHours =
            this.filterWeeklyHoursMax !== '' ? parseFloat(this.filterWeeklyHoursMax) : null;

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
                    this._getLocalizedDescription(job).toLowerCase().includes(query);
                const matchesAreaOfInterest =
                    !this.filterAreaOfInterest ||
                    normalizeAreaOfInterestValues(
                        job.areasOfInterest ?? job.areaOfInterest,
                    ).includes(this.filterAreaOfInterest);

                // Parse the weekly hours value for numeric range filtering
                const jobHours = job.weeklyHours !== '' ? parseFloat(job.weeklyHours) : null;
                const matchesMinHours =
                    minHours === null ||
                    (jobHours !== null && !isNaN(jobHours) && jobHours >= minHours);
                const matchesMaxHours =
                    maxHours === null ||
                    (jobHours !== null && !isNaN(jobHours) && jobHours <= maxHours);

                return matchesSearch && matchesAreaOfInterest && matchesMinHours && matchesMaxHours;
            })
            .sort((a, b) => this.compareJobsByDate(a, b));
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
            <div class="job-tags">
                ${areaOfInterestLabels.map(
                    (label) => html`
                        <span class="job-tag">${label}</span>
                    `,
                )}
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
                <dt>${label}:</dt>
                <dd>${value}</dd>
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
        this.currentPage = 1;
    }

    onAreaOfInterestChange(e) {
        this.filterAreaOfInterest = e.detail?.value ?? e.target.value;
        this.currentPage = 1;
    }

    onWeeklyHoursMinChange(e) {
        // Keep only integer digits and cap the input at two characters.
        const sanitizedValue = (e.target.value ?? '').replace(/\D+/g, '').slice(0, 2);

        if (e.target.value !== sanitizedValue) {
            e.target.value = sanitizedValue;
        }

        this.filterWeeklyHoursMin = sanitizedValue;
        this.currentPage = 1;
    }

    onWeeklyHoursMaxChange(e) {
        const sanitizedValue = (e.target.value ?? '').replace(/\D+/g, '').slice(0, 2);

        if (e.target.value !== sanitizedValue) {
            e.target.value = sanitizedValue;
        }

        this.filterWeeklyHoursMax = sanitizedValue;
        this.currentPage = 1;
    }

    onSortChange(e) {
        this.sortOrder = e.target.value;
        this.currentPage = 1;
    }

    onPageSizeChange(e) {
        this.pageSize = Number(e.target.value);
        this.currentPage = 1;
    }

    goToPage(page) {
        this.currentPage = page;
    }

    render() {
        const i18n = this._i18n;
        const t = (key) => (i18n ? i18n.t(key) : key);

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
                <div class="notification is-warning login-required-message">
                    ${t('view-job-offers.error-login-required')}
                </div>
            `;
        }

        const sortedAreasOfInterest = [...this._areasOfInterest].sort((a, b) =>
            getAreaOfInterestLabel(a, t).localeCompare(getAreaOfInterestLabel(b, t), this.lang),
        );
        const areaOfInterestOptions = [
            {
                value: '',
                label: t('view-job-offers.select-placeholder'),
            },
            ...sortedAreasOfInterest.map((value) => ({
                value,
                label: getAreaOfInterestLabel(value, t),
            })),
        ];
        const selectedAreaOfInterestLabel =
            areaOfInterestOptions.find((option) => option.value === this.filterAreaOfInterest)
                ?.label ?? t('view-job-offers.select-placeholder');

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

        const filtered = this.getFilteredJobs();
        const totalPages = Math.max(1, Math.ceil(filtered.length / this.pageSize));

        // Clamp current page within valid range
        const page = Math.min(this.currentPage, totalPages);
        const pageStart = (page - 1) * this.pageSize;
        const pageJobs = filtered.slice(pageStart, pageStart + this.pageSize);

        // Build the visible page-number window (at most 5 pages centred on current)
        const windowSize = 2;
        let rangeStart = Math.max(1, page - windowSize);
        let rangeEnd = Math.min(totalPages, page + windowSize);
        if (rangeEnd - rangeStart < windowSize * 2) {
            rangeStart = Math.max(1, rangeEnd - windowSize * 2);
            rangeEnd = Math.min(totalPages, rangeStart + windowSize * 2);
        }
        const pageNumbers = [];
        for (let p = rangeStart; p <= rangeEnd; p++) {
            pageNumbers.push(p);
        }

        return html`
            <div class="job-board">
                <!-- Search bar -->
                <div class="field search-field">
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

                <!-- Filters row -->
                <div class="filters-row">
                    <div class="field">
                        <label class="label" for="filter-area-of-interest">
                            ${t('view-job-offers.areas-of-interest')}
                        </label>
                        <div class="control">
                            <dbp-select
                                id="filter-area-of-interest"
                                class="filter-select"
                                allow-expand
                                align="left"
                                label="${selectedAreaOfInterestLabel}"
                                .options="${areaOfInterestOptions}"
                                .value="${this.filterAreaOfInterest}"
                                @change="${this.onAreaOfInterestChange}"></dbp-select>
                        </div>
                    </div>

                    <div class="field">
                        <label class="label">${t('view-job-offers.weekly-hours-range')}</label>
                        <div class="control weekly-hours-range">
                            <input
                                type="number"
                                class="input"
                                min="0"
                                max="99"
                                step="1"
                                placeholder="${t('view-job-offers.weekly-hours-min')}"
                                .value="${this.filterWeeklyHoursMin}"
                                @input="${this.onWeeklyHoursMinChange}"
                                aria-label="${t('view-job-offers.weekly-hours-min')}" />
                            <span class="range-separator">–</span>
                            <input
                                type="number"
                                class="input"
                                min="0"
                                max="99"
                                step="1"
                                placeholder="${t('view-job-offers.weekly-hours-max')}"
                                .value="${this.filterWeeklyHoursMax}"
                                @input="${this.onWeeklyHoursMaxChange}"
                                aria-label="${t('view-job-offers.weekly-hours-max')}" />
                        </div>
                    </div>
                </div>

                <!-- Section heading and sort control -->
                <div class="section-header">
                    <h2>${t('view-job-offers.available-positions')}</h2>
                    <div class="sort-wrapper">
                        <label class="label sort-label" for="sort-order">
                            ${t('view-job-offers.sort-by')}
                        </label>
                        <div class="control">
                            <select
                                id="sort-order"
                                @change="${this.onSortChange}"
                                .value="${this.sortOrder}">
                                <option
                                    value="date-asc"
                                    ?selected="${this.sortOrder === 'date-asc'}">
                                    ${t('view-job-offers.sort-date-asc')}
                                </option>
                                <option
                                    value="date-desc"
                                    ?selected="${this.sortOrder === 'date-desc'}">
                                    ${t('view-job-offers.sort-date-desc')}
                                </option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Job cards grid -->
                ${filtered.length === 0
                    ? html`
                          <p class="no-results">${t('view-job-offers.no-results')}</p>
                      `
                    : html`
                          <div class="job-grid">
                              ${repeat(
                                  pageJobs,
                                  (job) => job.identifier,
                                  (job) => html`
                                      <div class="job-card">
                                          <div class="job-card-body">
                                              <h3 class="job-title">${job.title}</h3>
                                              <dl class="job-meta-list">
                                                  ${this._renderJobMetaItem(
                                                      t('view-job-offers.organizational-unit'),
                                                      this._localized(
                                                          job.organizationalUnit,
                                                          job.organizationalUnitEn ?? '',
                                                      ),
                                                  )}
                                                  ${this._renderJobMetaItem(
                                                      t('view-job-offers.weekly-hours'),
                                                      this._localized(
                                                          job.weeklyHours,
                                                          job.weeklyHoursEn ?? '',
                                                      ),
                                                  )}
                                                  ${this._renderJobMetaItem(
                                                      t('view-job-offers.published-at'),
                                                      this.formatDate(job.publishedAt),
                                                  )}
                                                  ${this._renderJobMetaItem(
                                                      t('view-job-offers.application-deadline'),
                                                      this.formatDate(
                                                          job.applicationDeadline || job.deadline,
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
                      `}

                <!-- Pagination bar -->
                ${filtered.length > 0
                    ? html`
                          <div class="pagination-bar">
                              <div class="page-size-wrapper">
                                  <label class="label pagination-label" for="page-size">
                                      ${t('view-job-offers.page-size')}
                                  </label>
                                  <div class="page-size-select-wrapper">
                                      <select
                                          id="page-size"
                                          class="pagination-page-size"
                                          @change="${this.onPageSizeChange}">
                                          ${PAGE_SIZE_OPTIONS.map(
                                              (n) => html`
                                                  <option
                                                      value="${n}"
                                                      ?selected="${this.pageSize === n}">
                                                      ${n}
                                                  </option>
                                              `,
                                          )}
                                      </select>
                                  </div>
                              </div>

                              <div class="pagination-buttons">
                                  <div class="pagination-nav-group">
                                      <button
                                          type="button"
                                          class="button pagination-button"
                                          ?disabled="${page <= 1}"
                                          aria-label="${t('view-job-offers.pagination-first')}"
                                          @click="${() => this.goToPage(1)}">
                                          &lt;&lt;
                                      </button>
                                      <button
                                          type="button"
                                          class="button pagination-button pagination-button-compact"
                                          ?disabled="${page <= 1}"
                                          aria-label="${t('view-job-offers.pagination-prev')}"
                                          @click="${() => this.goToPage(page - 1)}">
                                          &lt;
                                      </button>
                                  </div>
                                  <div class="pagination-pages-group">
                                      ${pageNumbers.map(
                                          (p) => html`
                                              <button
                                                  type="button"
                                                  class="button pagination-button pagination-page ${p ===
                                                  page
                                                      ? 'is-active'
                                                      : ''}"
                                                  @click="${() => this.goToPage(p)}"
                                                  aria-current="${p === page ? 'page' : nothing}">
                                                  ${p}
                                              </button>
                                          `,
                                      )}
                                  </div>
                                  <div class="pagination-nav-group">
                                      <button
                                          type="button"
                                          class="button pagination-button pagination-button-compact"
                                          ?disabled="${page >= totalPages}"
                                          aria-label="${t('view-job-offers.pagination-next')}"
                                          @click="${() => this.goToPage(page + 1)}">
                                          &gt;
                                      </button>
                                      <button
                                          type="button"
                                          class="button pagination-button"
                                          ?disabled="${page >= totalPages}"
                                          aria-label="${t('view-job-offers.pagination-last')}"
                                          @click="${() => this.goToPage(totalPages)}">
                                          &gt;&gt;
                                      </button>
                                  </div>
                              </div>
                          </div>
                      `
                    : ''}

                <!-- Job detail dialog — always in the DOM; job property drives its content -->
                <dbp-bulletin-job-offer-detail
                    ${ref(this._detailRef)}
                    .job="${this._selectedJob}"
                    lang="${this.lang}"
                    entry-point-url="${this.entryPointUrl}"
                    .auth="${this.auth}"
                    @dbp-modal-closed="${this.onDialogClosed}"></dbp-bulletin-job-offer-detail>
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
               right padding so the chevron SVG never overlaps the selected option text */
            select:not(.select) {
                background-size: 1em !important;
                padding-right: 2em !important;
                width: 100%;
                cursor: pointer;
            }

            .job-board {
                display: flex;
                flex-direction: column;
                gap: 1.25rem;
            }

            /* Loading state wrapper */
            .loading-wrapper {
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 2rem;
                color: var(--dbp-muted);
            }

            /* Search bar — extends the .input with a search icon overlay */
            .search-field {
                margin-bottom: 0;
            }

            .search-control {
                position: relative;
            }

            .filter-select {
                display: block;
                width: 100%;
            }

            .filter-select::part(trigger) {
                width: 100%;
                justify-content: space-between;
            }

            .filter-select::part(menu) {
                width: 100%;
                min-width: 100%;
                max-width: 100%;
                max-height: min(20rem, 60vh);
                overflow-x: hidden;
                overflow-y: auto;
                top: 2rem;
            }

            .search-control .input {
                padding-right: 2.5rem;
                width: 100%;
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

            /* Filters row — two equal columns */
            .filters-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 1rem;
            }

            .filters-row .field {
                margin-bottom: 0;
            }

            /* Weekly hours range — two number inputs with a separator */
            .weekly-hours-range {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .weekly-hours-range .input {
                width: 100%;
            }

            .range-separator {
                flex-shrink: 0;
                color: var(--dbp-muted);
            }

            @media (max-width: 600px) {
                .filters-row {
                    grid-template-columns: 1fr;
                }
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
                font-size: 1.4rem;
                font-weight: 700;
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
            }

            .job-title {
                margin: 0 0 0.6rem 0;
                font-size: 1.15rem;
                font-weight: 600;
                line-height: 1.35;
            }

            .job-meta-list {
                display: grid;
                gap: 0.4rem;
                margin: 0 0 0.75rem 0;
            }

            .job-meta-item {
                display: grid;
                gap: 0.15rem;
                margin: 0;
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

            /* Outlined badge matching the design */
            .job-tags {
                display: flex;
                flex-wrap: wrap;
                gap: 0.4rem;
                margin-bottom: 0.5rem;
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
                margin-top: 0.5rem;
            }

            /* Button icon aligned inside the secondary button */
            .job-card-footer .button {
                display: inline-flex;
                align-items: center;
                gap: 0.35rem;
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

            /* Pagination bar */
            .pagination-bar {
                --pagination-control-height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-wrap: wrap;
                gap: 0.5rem;
                padding: 0.5rem 0;
                color: var(--dbp-content);
            }

            .page-size-wrapper {
                display: flex;
                align-items: center;
                gap: 0;
            }

            .pagination-label {
                margin-bottom: 0;
                white-space: nowrap;
                font-size: 1rem;
                color: var(--dbp-content);
                font-weight: 400;
                padding-right: 14px;
            }

            .page-size-select-wrapper {
                position: relative;
                display: inline-flex;
                align-items: center;
            }

            .page-size-select-wrapper::after {
                content: '';
                position: absolute;
                right: 0.6rem;
                width: 1rem;
                height: 1rem;
                pointer-events: none;
                background-color: var(--dbp-content);
                mask-image: url('${unsafeCSS(getIconSVGURL('chevron-down'))}');
                -webkit-mask-image: url('${unsafeCSS(getIconSVGURL('chevron-down'))}');
                mask-repeat: no-repeat;
                -webkit-mask-repeat: no-repeat;
                mask-position: center;
                -webkit-mask-position: center;
                mask-size: contain;
                -webkit-mask-size: contain;
            }

            .pagination-page-size {
                box-sizing: border-box;
                width: auto;
                min-height: var(--pagination-control-height);
                padding: calc(0.5em - 1px) 1.95em calc(0.5em - 1px) 0.75em;
                padding-left: 0.75em !important;
                padding-right: 1.95em !important;
                color: var(--dbp-content);
                background-color: var(--dbp-background);
                border: var(--dbp-border);
                border-radius: var(--dbp-border-radius);
                cursor: pointer;
                appearance: none;
                -webkit-appearance: none;
                -moz-appearance: none;
                background: none;
                background-image: none !important;
            }

            .pagination-buttons {
                display: flex;
                align-items: center;
                gap: 0.75rem;
            }

            .pagination-nav-group,
            .pagination-pages-group {
                display: flex;
                align-items: center;
            }

            .pagination-nav-group {
                gap: 0.25rem;
            }

            .pagination-button {
                opacity: unset;
                border-radius: var(--dbp-border-radius);
                cursor: pointer;
                padding: calc(0.375em - 1px) 0.75em;
                text-align: center;
                white-space: nowrap;
                font-size: inherit;
                font-weight: bolder;
                font-family: inherit;
                transition:
                    all 0.15s ease 0s,
                    color 0.15s ease 0s;
                background: var(--dbp-secondary-surface);
                color: var(--dbp-on-secondary-surface);
                border-color: var(--dbp-secondary-surface-border-color);
                height: var(--pagination-control-height);
                min-width: var(--pagination-control-height);
                min-height: var(--pagination-control-height);
                box-sizing: border-box;
                display: inline-flex;
                justify-content: center;
                align-items: center;
                padding-top: 0;
                padding-bottom: 0;
                line-height: 1;
            }

            .pagination-button:hover:not([disabled]) {
                background: var(--dbp-hover-background-color);
                color: var(--dbp-hover-color, var(--dbp-on-secondary-surface));
            }

            .pagination-button[disabled] {
                opacity: 0.45;
                cursor: default;
            }

            .pagination-page {
                min-width: var(--pagination-control-height);
            }

            .pagination-button-compact {
                min-width: 2.25rem;
                padding-left: 0.4rem;
                padding-right: 0.4rem;
            }

            .pagination-page.is-active {
                background: var(--dbp-on-secondary-surface);
                color: var(--dbp-secondary-surface);
                border-color: var(--dbp-on-secondary-surface);
            }

            @media (max-width: 600px) {
                .pagination-bar {
                    justify-content: flex-start;
                }

                .pagination-label {
                    display: none;
                }

                .pagination-buttons {
                    gap: 0.375rem;
                }

                .pagination-nav-group {
                    gap: 0.125rem;
                }

                .pagination-button {
                    border: none;
                }

                .pagination-page-size {
                    padding-right: 1.5em;
                }
            }
        `;
    }
}

commonUtils.defineCustomElement('dbp-bulletin-view-job-offers', ViewJobOffers);
