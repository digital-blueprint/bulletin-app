import {css, html} from 'lit';
import {ref, createRef} from 'lit/directives/ref.js';
import {repeat} from 'lit/directives/repeat.js';
import * as commonUtils from '@dbp-toolkit/common/utils';
import * as commonStyles from '@dbp-toolkit/common/src/styles.js';
import {ScopedElementsMixin} from '@dbp-toolkit/common/src/scoped/ScopedElementsMixin.js';
import {Icon, MiniSpinner} from '@dbp-toolkit/common';
import DBPBulletinLitElement from './dbp-bulletin-lit-element.js';
import {JobOfferDetail} from './dbp-bulletin-job-offer-detail.js';
import JobOfferModule, {AREAS_OF_INTEREST} from './modules/jobOfferForm.js';

const PAGE_SIZE_OPTIONS = [6, 12, 24];
const DEFAULT_PAGE_SIZE = 12;

class ViewJobOffers extends ScopedElementsMixin(DBPBulletinLitElement) {
    static get scopedElements() {
        return {
            'dbp-icon': Icon,
            'dbp-mini-spinner': MiniSpinner,
            'dbp-bulletin-job-offer-detail': JobOfferDetail,
        };
    }

    constructor() {
        super();
        this.searchQuery = '';
        this.filterJobType = '';
        this.filterAreaOfInterest = '';
        this.sortOrder = 'date-asc';
        this.currentPage = 1;
        this.pageSize = DEFAULT_PAGE_SIZE;
        /** @type {object|null} Currently selected job offer shown in the detail dialog */
        this._selectedJob = null;
        /** @type {import('lit/directives/ref.js').Ref} Direct reference to the detail dialog element */
        this._detailRef = createRef();
        /** @type {Array} Job offers loaded from the formalize API */
        this._jobOffers = [];
        /** @type {boolean} Whether the API request is in progress */
        this._loading = false;
        /** @type {boolean} Whether the API request failed */
        this._loadError = false;
        /** @type {string[]} Unique sorted job-type values derived from loaded data */
        this._jobTypes = [];
        /** @type {Array<[string, string]>} Area-of-interest options shared with the form module */
        this._areasOfInterest = Object.entries(AREAS_OF_INTEREST);
    }

    static get properties() {
        return {
            ...super.properties,
            searchQuery: {type: String, state: true},
            filterJobType: {type: String, state: true},
            filterAreaOfInterest: {type: String, state: true},
            sortOrder: {type: String, state: true},
            currentPage: {type: Number, state: true},
            pageSize: {type: Number, state: true},
            _selectedJob: {state: true},
            _jobOffers: {state: true},
            _loading: {state: true},
            _loadError: {state: true},
            _jobTypes: {state: true},
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
            // English translations (titleEn, descriptionEn, organizationEn, requirementsEn) are
            // optional and only present when the form creator entered them.
            this._jobOffers = members
                .map((form) => {
                    const extra = form.additionalData ?? {};
                    return {
                        /** The form identifier is used as the job offer identifier */
                        identifier: form.identifier,
                        /** Localised title: prefer current lang, fall back to name */
                        title: this._getLocalizedName(form.localizedNames) || form.name || '',
                        jobType: extra.jobType ?? '',
                        areaOfInterest: extra.areaOfInterest ?? '',
                        publishedAt: extra.publishedAt ?? '',
                        deadline: extra.deadline ?? '',
                        startDate: extra.startDate ?? '',
                        weeklyHours: extra.weeklyHours ?? '',
                        salary: extra.salary ?? '',
                        organization: extra.organization ?? '',
                        description: extra.description ?? '',
                        requirements: Array.isArray(extra.requirements) ? extra.requirements : [],
                        linkName: extra.linkName ?? '',
                        linkUrl: extra.linkUrl ?? '',
                        // Optional English translations
                        titleEn: extra.titleEn ?? '',
                        descriptionEn: extra.descriptionEn ?? '',
                        organizationEn: extra.organizationEn ?? '',
                        requirementsEn: Array.isArray(extra.requirementsEn)
                            ? extra.requirementsEn
                            : [],
                    };
                })
                // Only show offers with a future or missing deadline
                .filter((job) => !job.deadline || new Date(job.deadline) >= new Date());

            // Build unique sorted job-type filter options from the loaded data
            this._jobTypes = [
                ...new Set(this._jobOffers.map((j) => j.jobType).filter(Boolean)),
            ].sort();
        } catch (error) {
            console.error('Error loading job offers:', error);
            this._loadError = true;
        } finally {
            this._loading = false;
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
        return this._jobOffers
            .filter((job) => {
                const matchesSearch =
                    !query ||
                    job.title.toLowerCase().includes(query) ||
                    job.areaOfInterest.toLowerCase().includes(query) ||
                    job.jobType.toLowerCase().includes(query) ||
                    job.description.toLowerCase().includes(query);
                const matchesJobType = !this.filterJobType || job.jobType === this.filterJobType;
                const matchesAreaOfInterest =
                    !this.filterAreaOfInterest || job.areaOfInterest === this.filterAreaOfInterest;
                return matchesSearch && matchesJobType && matchesAreaOfInterest;
            })
            .sort((a, b) => {
                const dateA = new Date(a.deadline).getTime();
                const dateB = new Date(b.deadline).getTime();
                return this.sortOrder === 'date-desc' ? dateB - dateA : dateA - dateB;
            });
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

    onJobTypeChange(e) {
        this.filterJobType = e.target.value;
        this.currentPage = 1;
    }

    onAreaOfInterestChange(e) {
        this.filterAreaOfInterest = e.target.value;
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
                        <label class="label" for="filter-job-type">
                            ${t('view-job-offers.job-type')}
                        </label>
                        <div class="control">
                            <select
                                id="filter-job-type"
                                @change="${this.onJobTypeChange}"
                                .value="${this.filterJobType}">
                                <option value="">${t('view-job-offers.select-placeholder')}</option>
                                ${this._jobTypes.map(
                                    (type) => html`
                                        <option
                                            value="${type}"
                                            ?selected="${this.filterJobType === type}">
                                            ${type}
                                        </option>
                                    `,
                                )}
                            </select>
                        </div>
                    </div>

                    <div class="field">
                        <label class="label" for="filter-area-of-interest">
                            ${t('view-job-offers.areas-of-interest')}
                        </label>
                        <div class="control">
                            <select
                                id="filter-area-of-interest"
                                @change="${this.onAreaOfInterestChange}"
                                .value="${this.filterAreaOfInterest}">
                                <option value="">${t('view-job-offers.select-placeholder')}</option>
                                ${this._areasOfInterest.map(
                                    ([value, label]) => html`
                                        <option
                                            value="${value}"
                                            ?selected="${this.filterAreaOfInterest === value}">
                                            ${label}
                                        </option>
                                    `,
                                )}
                            </select>
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
                                              ${job.areaOfInterest
                                                  ? html`
                                                        <span class="job-tag">
                                                            ${job.areaOfInterest}
                                                        </span>
                                                    `
                                                  : ''}
                                              <p class="job-deadline">
                                                  ${t('view-job-offers.deadline')}:
                                                  ${this.formatDate(job.deadline)}
                                              </p>
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
                                                      name="magnifier"
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
                                  <label class="label" for="page-size">
                                      ${t('view-job-offers.page-size')}
                                  </label>
                                  <div class="control">
                                      <select id="page-size" @change="${this.onPageSizeChange}">
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
                                  <button
                                      class="button"
                                      ?disabled="${page <= 1}"
                                      @click="${() => this.goToPage(1)}">
                                      ${t('view-job-offers.pagination-first')}
                                  </button>
                                  <button
                                      class="button"
                                      ?disabled="${page <= 1}"
                                      @click="${() => this.goToPage(page - 1)}">
                                      ${t('view-job-offers.pagination-prev')}
                                  </button>
                                  ${pageNumbers.map(
                                      (p) => html`
                                          <button
                                              class="button pagination-page ${p === page
                                                  ? 'is-primary'
                                                  : ''}"
                                              @click="${() => this.goToPage(p)}"
                                              aria-current="${p === page ? 'page' : 'false'}">
                                              ${p}
                                          </button>
                                      `,
                                  )}
                                  <button
                                      class="button"
                                      ?disabled="${page >= totalPages}"
                                      @click="${() => this.goToPage(page + 1)}">
                                      ${t('view-job-offers.pagination-next')}
                                  </button>
                                  <button
                                      class="button"
                                      ?disabled="${page >= totalPages}"
                                      @click="${() => this.goToPage(totalPages)}">
                                      ${t('view-job-offers.pagination-last')}
                                  </button>
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

            /* Outlined badge matching the design */
            .job-tag {
                display: inline-block;
                border: 1px solid var(--dbp-content);
                border-radius: 2px;
                padding: 0.1rem 0.4rem;
                font-size: 1rem;
                color: var(--dbp-content);
                margin-bottom: 0.5rem;
            }

            .job-deadline {
                margin: 0 0 0.75rem 0;
                font-size: 1rem;
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
                gap: 0.75rem;
                padding: 0.5rem 0;
            }

            .page-size-wrapper {
                display: flex;
                align-items: center;
                gap: 0.4rem;
            }

            .page-size-wrapper .label {
                margin-bottom: 0;
                white-space: nowrap;
                font-size: 1rem;
            }

            .page-size-wrapper .control select {
                width: auto;
                min-height: var(--pagination-control-height);
                padding: 0 0.5em;
            }

            .pagination-buttons {
                display: flex;
                align-items: center;
                gap: 0.25rem;
            }

            .pagination-buttons .button {
                height: var(--pagination-control-height);
                min-height: var(--pagination-control-height);
                box-sizing: border-box;
                display: inline-flex;
                align-items: center;
                padding-top: 0;
                padding-bottom: 0;
                line-height: 1;
            }

            .pagination-page {
                min-width: 2rem;
            }
        `;
    }
}

commonUtils.defineCustomElement('dbp-bulletin-view-job-offers', ViewJobOffers);
