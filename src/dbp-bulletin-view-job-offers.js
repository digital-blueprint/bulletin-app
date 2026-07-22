import {css, html} from 'lit';
import {ref, createRef} from 'lit/directives/ref.js';
import {repeat} from 'lit/directives/repeat.js';
import * as commonUtils from '@dbp-toolkit/common/utils';
import * as commonStyles from '@dbp-toolkit/common/src/styles.js';
import {ScopedElementsMixin} from '@dbp-toolkit/common/src/scoped/ScopedElementsMixin.js';
import {Icon, MiniSpinner, DBPLoginRequired} from '@dbp-toolkit/common';
import {DbpEnumElement} from '@dbp-toolkit/form-elements';
import DBPBulletinLitElement from './dbp-bulletin-lit-element.js';
import {JobOfferDetail} from './dbp-bulletin-job-offer-detail.js';
import JobOfferModule, {
    getAreaOfInterestLabel,
    getAreaOfInterestLabels,
    normalizeAreaOfInterestValues,
} from './modules/jobOfferForm.js';
import {
    WorkLocationSelectElement,
    getLocationKey,
    getLocationHierarchy,
    normalizeWorkLocations,
} from './modules/workLocationsElement.js';

// Number of job cards shown initially and appended each time the user scrolls to the end
const INFINITE_SCROLL_BATCH_SIZE = 12;

class ViewJobOffers extends ScopedElementsMixin(DBPBulletinLitElement) {
    static get scopedElements() {
        return {
            'dbp-enum-element': DbpEnumElement,
            'dbp-icon': Icon,
            'dbp-mini-spinner': MiniSpinner,
            'dbp-bulletin-job-offer-detail': JobOfferDetail,
            'dbp-work-location-select-element': WorkLocationSelectElement,
            'dbp-login-required': DBPLoginRequired,
        };
    }

    constructor() {
        super();
        this.searchQuery = '';
        this.filterAreasOfInterest = [];
        this.filterWorkLocation = '';
        this.filterWeeklyHoursMin = '';
        this.filterWeeklyHoursMax = '';
        this.sortOrder = 'date-desc';
        /** @type {number} Number of job cards currently rendered for the infinite scroll list */
        this._visibleCount = INFINITE_SCROLL_BATCH_SIZE;
        /** @type {import('lit/directives/ref.js').Ref} Sentinel element observed to trigger loading more */
        this._sentinelRef = createRef();
        /** @type {IntersectionObserver|null} Observer that appends more jobs when the sentinel is visible */
        this._intersectionObserver = null;
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
            filterAreasOfInterest: {type: Array, state: true},
            filterWorkLocation: {type: String, state: true},
            filterWeeklyHoursMin: {type: String, state: true},
            filterWeeklyHoursMax: {type: String, state: true},
            sortOrder: {type: String, state: true},
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

    updated(changedProperties) {
        super.updated(changedProperties);
        // (Re)attach the observer after each render so it always points at the
        // current sentinel element, which is only present while more jobs remain.
        this._observeSentinel();
    }

    disconnectedCallback() {
        if (this._intersectionObserver) {
            this._intersectionObserver.disconnect();
            this._intersectionObserver = null;
        }
        super.disconnectedCallback();
    }

    /**
     * Connects the IntersectionObserver to the sentinel element so scrolling to the
     * bottom of the list appends the next batch of job cards.
     */
    _observeSentinel() {
        if (!this._intersectionObserver) {
            this._intersectionObserver = new IntersectionObserver(
                (entries) => {
                    if (entries.some((entry) => entry.isIntersecting)) {
                        this._loadMore();
                    }
                },
                {rootMargin: '200px'},
            );
        }

        this._intersectionObserver.disconnect();

        const sentinel = this._sentinelRef.value;
        if (sentinel) {
            this._intersectionObserver.observe(sentinel);
        }
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

                // Parse the weekly hours value for numeric range filtering
                const jobHours = job.weeklyHours !== '' ? parseFloat(job.weeklyHours) : null;
                const matchesMinHours =
                    minHours === null ||
                    (jobHours !== null && !isNaN(jobHours) && jobHours >= minHours);
                const matchesMaxHours =
                    maxHours === null ||
                    (jobHours !== null && !isNaN(jobHours) && jobHours <= maxHours);

                return (
                    matchesSearch &&
                    matchesAreaOfInterest &&
                    matchesWorkLocation &&
                    matchesMinHours &&
                    matchesMaxHours
                );
            })
            .sort((a, b) => this.compareJobsByDate(a, b));
    }

    getAvailableWorkLocations() {
        const jobs = this.getFilteredJobs({includeWorkLocation: false});
        // Expand each job location into its hierarchy so broader locations
        // (region, country) are also selectable. A job in Graz therefore also
        // makes Styria and Austria available as filter options.
        return normalizeWorkLocations(
            jobs.flatMap((job) =>
                normalizeWorkLocations(job.workLocations ?? []).flatMap((location) =>
                    getLocationHierarchy(location),
                ),
            ),
        );
    }

    getAvailableAreasOfInterest() {
        const jobs = this.getFilteredJobs({includeAreaOfInterest: false});
        return [
            ...new Set(
                jobs.flatMap((job) =>
                    normalizeAreaOfInterestValues(job.areasOfInterest ?? job.areaOfInterest),
                ),
            ),
        ];
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
                <span>
                    <b>${label}:</b>
                    &thinsp; ${value}
                </span>
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
        this._clearUnavailableAreaOfInterest();
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

    onWeeklyHoursMinChange(e) {
        // Keep only integer digits and cap the input at two characters.
        const sanitizedValue = (e.target.value ?? '').replace(/\D+/g, '').slice(0, 2);

        if (e.target.value !== sanitizedValue) {
            e.target.value = sanitizedValue;
        }

        this.filterWeeklyHoursMin = sanitizedValue;
        this._clearUnavailableAreaOfInterest();
        this._resetVisibleCount();
    }

    onWeeklyHoursMaxChange(e) {
        const sanitizedValue = (e.target.value ?? '').replace(/\D+/g, '').slice(0, 2);

        if (e.target.value !== sanitizedValue) {
            e.target.value = sanitizedValue;
        }

        this.filterWeeklyHoursMax = sanitizedValue;
        this._clearUnavailableAreaOfInterest();
        this._resetVisibleCount();
    }

    onSortChange(e) {
        this.sortOrder = e.target.value;
        this._resetVisibleCount();
    }

    /**
     * Resets the infinite-scroll list back to the first batch.
     * Used whenever the filters or sorting change so the user starts at the top.
     */
    _resetVisibleCount() {
        this._visibleCount = INFINITE_SCROLL_BATCH_SIZE;
    }

    /**
     * Appends one more batch of job cards to the visible list.
     */
    _loadMore() {
        this._visibleCount += INFINITE_SCROLL_BATCH_SIZE;
    }

    getOrganizationLabel(job) {
        return job.jobOfferType === 'internal' ? this.universityShortName : (job.companyName ?? '');
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
                <dbp-login-required
                    subscribe="auth,lang"
                    @dbp-login-requested=${this._onLoginClicked}></dbp-login-required>
            `;
        }

        const sortedAreasOfInterest = this.getAvailableAreasOfInterest().sort((a, b) =>
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

        const availableWorkLocations = this.getAvailableWorkLocations();
        const filtered = this.getFilteredJobs();

        // Infinite scroll: only render the first _visibleCount jobs; more are appended
        // when the sentinel scrolls into view.
        const visibleCount = Math.min(this._visibleCount, filtered.length);
        const visibleJobs = filtered.slice(0, visibleCount);
        const hasMore = visibleCount < filtered.length;

        return html`
            <div class="job-board">
                <div class="search-filter-row">
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

                    <div class="field area-of-interest-filter">
                        <dbp-enum-element
                            name="filter-area-of-interest"
                            lang="${this.lang}"
                            label="${t('view-job-offers.areas-of-interest')}"
                            multiple
                            display-mode="tags"
                            .tagPlaceholder="${{
                                [this.lang]: t('view-job-offers.select-placeholder'),
                            }}"
                            .items="${areaOfInterestItems}"
                            .value="${this.filterAreasOfInterest}"
                            @change="${this.onAreaOfInterestChange}"></dbp-enum-element>
                    </div>
                </div>

                <!-- Filters row -->
                <div class="filters-row">
                    <div class="field">
                        <label class="label" for="filter-work-location">
                            ${t('view-job-offers.work-location')}
                        </label>
                        <div class="control">
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
                                                      <h3 class="job-title">${job.title}</h3>
                                                      ${this.getInternalFavicon(job)}
                                                  </div>
                                                  <dl class="job-meta-list">
                                                      <span class="job-meta-type">
                                                          ${this.getOrganizationLabel(job)}
                                                      </span>
                                                      ${this._renderJobMetaItem(
                                                          t('view-job-offers.published-at'),
                                                          this.formatDate(job.publishedAt),
                                                      )}
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

                <!-- Infinite scroll sentinel — loading more jobs when it enters the viewport -->
                ${
                    hasMore
                        ? html`
                              <div class="infinite-scroll-sentinel" ${ref(this._sentinelRef)}>
                                  <dbp-mini-spinner></dbp-mini-spinner>
                                  <span>${t('view-job-offers.loading-more')}</span>
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

            .search-filter-row,
            .filters-row {
                display: grid;
                gap: 1rem;
            }

            .search-filter-row,
            .filters-row {
                --filter-control-height: 2.1rem;
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .filters-row dbp-work-location-select-element {
                --work-location-select-height: var(--filter-control-height);
            }

            .search-filter-row .field,
            .filters-row .field {
                margin-bottom: 0;
            }

            .search-label-spacer {
                display: block;
            }

            /* Weekly hours range — two number inputs with a separator */
            .weekly-hours-range {
                display: flex;
                align-items: center;
                gap: 0.5rem;
            }

            .weekly-hours-range .input {
                box-sizing: border-box;
                height: var(--filter-control-height);
                min-height: var(--filter-control-height);
                width: 100%;
            }

            .range-separator {
                flex-shrink: 0;
                color: var(--dbp-muted);
            }
            .job-meta-type{
                color: var(--dbp-primary);
                font-weight:500;
            }


            @media (max-width: 600px) {
                .search-filter-row,
                .filters-row {
                    grid-template-columns: 1fr;
                }

                .search-label-spacer {
                    display: none;
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
                margin-bottom:5px;
            }

            .job-card-header {
                display:flex;
                flex-direction:row;
                justify-content: space-between;
            }

            .job-card-header img{
                max-height: 28px;
                object-fit: cover;
            }

            .favicon-visible {
                display:block;
            }

            .favicon-hidden {
                display:none;
            }

            .job-title {
                font-size: 1.15rem;
                font-weight: 500;
            }

            .job-meta-list {
                display: grid;
                gap: 2px;
            }

            .job-meta-list .button {
                height:max-content;
            }
                .job-meta-item {
                    display: flex;
                    gap:5px;
                }
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
                margin: 0.3rem 0px;
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
                align-items:flex-end;
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

            /* Infinite scroll sentinel — loading indicator shown while more jobs remain */
            .infinite-scroll-sentinel {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.75rem;
                padding: 1.5rem 0;
                color: var(--dbp-muted);
            }
        `;
    }
}

commonUtils.defineCustomElement('dbp-bulletin-view-job-offers', ViewJobOffers);
