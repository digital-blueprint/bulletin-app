import {css, html} from 'lit';
import {repeat} from 'lit/directives/repeat.js';
import * as commonUtils from '@dbp-toolkit/common/utils';
import * as commonStyles from '@dbp-toolkit/common/src/styles.js';
import DBPBulletinLitElement from './dbp-bulletin-lit-element.js';

/** @type {Array<{id: number, title: string, jobType: string, areaOfInterest: string, deadline: string, description: string}>} */
const MOCK_JOB_OFFERS = [
    {
        id: 1,
        title: 'Universitätsassistent*in im Bereich Elektrotechnik (m/w/d)',
        jobType: 'Universitätsstelle',
        areaOfInterest: 'Elektronik',
        deadline: '2030-01-01',
        description: 'Mitarbeit in Forschung und Lehre im Bereich Elektrotechnik.',
    },
    {
        id: 2,
        title: 'Werkstudent*in (m/w/d) als Projektunterstützung 6h pro Woche',
        jobType: 'Werkstudentenstelle',
        areaOfInterest: 'Architektur & Bauwesen',
        deadline: '2030-01-01',
        description: 'Unterstützung laufender Projekte im Bereich Bauwesen.',
    },
    {
        id: 3,
        title: 'Assistant Marketing Research (m/w/d) 20h',
        jobType: 'Teilzeitstelle',
        areaOfInterest: 'Kommunikation & Marketing',
        deadline: '2030-01-01',
        description: 'Durchführung von Marktforschungsanalysen und Aufbereitung von Daten.',
    },
    {
        id: 4,
        title: 'Studentische Mitarbeiter*in: Planung Hochbau',
        jobType: 'Werkstudentenstelle',
        areaOfInterest: 'Architektur & Bauwesen',
        deadline: '2030-01-01',
        description: 'Unterstützung bei Planungsaufgaben im Hochbau.',
    },
    {
        id: 5,
        title: 'Student Support "Informationstechnologie" (m/w/d)',
        jobType: 'Werkstudentenstelle',
        areaOfInterest: 'Informatik',
        deadline: '2026-06-30',
        description: 'IT-Support für Studierende und Lehrende.',
    },
    {
        id: 6,
        title: 'Praktikant*in / Werkstudent*in im Bereich Reporting',
        jobType: 'Praktikum',
        areaOfInterest: 'Fahrzeugsicherheit',
        deadline: '2030-01-01',
        description: 'Erstellung von Reports und Analysen im Bereich Fahrzeugsicherheit.',
    },
    {
        id: 7,
        title: 'Werkstudent*in R&D - Technical Design Tool (m/w/d)',
        jobType: 'Werkstudentenstelle',
        areaOfInterest: 'Architektur & Bauwesen',
        deadline: '2030-01-01',
        description: 'Mitarbeit bei der Entwicklung technischer Design-Tools.',
    },
    {
        id: 8,
        title: 'Marketing Mitarbeiter*in Schwerpunkt Digital Marketing & Social Media',
        jobType: 'Vollzeitstelle',
        areaOfInterest: 'Kommunikation & Marketing',
        deadline: '2030-01-01',
        description: 'Betreuung und Weiterentwicklung der Social-Media-Kanäle.',
    },
    {
        id: 9,
        title: 'Werkstudent:in im Bereich Produktdigitalisierung (teilzeit)',
        jobType: 'Werkstudentenstelle',
        areaOfInterest: 'Wärmetechnik',
        deadline: '2030-01-01',
        description: 'Unterstützung bei der Digitalisierung von Produktionsprozessen.',
    },
    {
        id: 10,
        title: 'Universitätsassistent*in im Bereich Elektrotechnik (m/w/d)',
        jobType: 'Universitätsstelle',
        areaOfInterest: 'Elektronik',
        deadline: '2030-01-01',
        description: 'Forschung und Lehre im Bereich Halbleitertechnik.',
    },
    {
        id: 11,
        title: 'Werkstudent*in (m/w/d) als Projektunterstützung 6h pro Woche',
        jobType: 'Werkstudentenstelle',
        areaOfInterest: 'Architektur & Bauwesen',
        deadline: '2030-01-01',
        description: 'Projektunterstützung für laufende Bauprojekte.',
    },
    {
        id: 12,
        title: 'Software-Entwickler*in (m/w/d) Backend',
        jobType: 'Vollzeitstelle',
        areaOfInterest: 'Informatik',
        deadline: '2030-03-31',
        description: 'Entwicklung und Wartung von Backend-Systemen.',
    },
    {
        id: 13,
        title: 'Forschungsassistent*in Maschinenbau (m/w/d)',
        jobType: 'Universitätsstelle',
        areaOfInterest: 'Maschinenbau',
        deadline: '2030-02-28',
        description: 'Mitarbeit in Forschungsprojekten im Bereich Maschinenbau.',
    },
    {
        id: 14,
        title: 'Praktikant*in Datenanalyse (m/w/d)',
        jobType: 'Praktikum',
        areaOfInterest: 'Informatik',
        deadline: '2026-12-31',
        description: 'Analyse und Visualisierung großer Datensätze.',
    },
    {
        id: 15,
        title: 'Teamassistenz im Bereich Kommunikation (m/w/d)',
        jobType: 'Teilzeitstelle',
        areaOfInterest: 'Kommunikation & Marketing',
        deadline: '2030-01-01',
        description: 'Unterstützung des Kommunikationsteams in administrativen Aufgaben.',
    },
    {
        id: 16,
        title: 'Werkstudent*in Energie- und Umwelttechnik (m/w/d)',
        jobType: 'Werkstudentenstelle',
        areaOfInterest: 'Wärmetechnik',
        deadline: '2030-06-30',
        description: 'Mitarbeit in Projekten zur erneuerbaren Energie.',
    },
    {
        id: 17,
        title: 'Junior Data Scientist (m/w/d)',
        jobType: 'Vollzeitstelle',
        areaOfInterest: 'Informatik',
        deadline: '2030-04-15',
        description: 'Entwicklung von Machine-Learning-Modellen für industrielle Anwendungen.',
    },
    {
        id: 18,
        title: 'Konstrukteur*in Fahrzeugtechnik (m/w/d)',
        jobType: 'Vollzeitstelle',
        areaOfInterest: 'Fahrzeugsicherheit',
        deadline: '2030-01-01',
        description: 'Konstruktion und Auslegung von Fahrzeugkomponenten.',
    },
    {
        id: 19,
        title: 'Lehrassistenz Grundlagen Elektrotechnik',
        jobType: 'Universitätsstelle',
        areaOfInterest: 'Elektronik',
        deadline: '2030-08-31',
        description: 'Betreuung von Übungen und Tutorien in der Grundlagenausbildung.',
    },
    {
        id: 20,
        title: 'Projektmanager*in Bauplanung (m/w/d)',
        jobType: 'Vollzeitstelle',
        areaOfInterest: 'Architektur & Bauwesen',
        deadline: '2030-01-01',
        description: 'Koordination und Steuerung von Bauprojekten.',
    },
    {
        id: 21,
        title: 'Praktikant*in im Bereich Wärmetechnik',
        jobType: 'Praktikum',
        areaOfInterest: 'Wärmetechnik',
        deadline: '2027-03-31',
        description: 'Praktische Mitarbeit in thermodynamischen Versuchsprojekten.',
    },
    {
        id: 22,
        title: 'Content Creator & Social Media Manager*in (m/w/d)',
        jobType: 'Teilzeitstelle',
        areaOfInterest: 'Kommunikation & Marketing',
        deadline: '2030-01-01',
        description: 'Erstellung von Content für verschiedene Social-Media-Plattformen.',
    },
];

// Derive sorted unique option lists from the mock data
const JOB_TYPES = [...new Set(MOCK_JOB_OFFERS.map((j) => j.jobType))].sort();
const AREAS_OF_INTEREST = [...new Set(MOCK_JOB_OFFERS.map((j) => j.areaOfInterest))].sort();

const PAGE_SIZE_OPTIONS = [6, 12, 24];
const DEFAULT_PAGE_SIZE = 12;

class ViewJobOffers extends DBPBulletinLitElement {
    constructor() {
        super();
        this.searchQuery = '';
        this.filterJobType = '';
        this.filterAreaOfInterest = '';
        this.sortOrder = 'date-asc';
        this.currentPage = 1;
        this.pageSize = DEFAULT_PAGE_SIZE;
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
        };
    }

    /**
     * Returns the mock job offers filtered by search query and dropdowns, then sorted.
     * @returns {Array}
     */
    getFilteredJobs() {
        const query = this.searchQuery.toLowerCase().trim();
        return MOCK_JOB_OFFERS.filter((job) => {
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
        }).sort((a, b) => {
            const dateA = new Date(a.deadline);
            const dateB = new Date(b.deadline);
            return this.sortOrder === 'date-desc' ? dateB - dateA : dateA - dateB;
        });
    }

    /**
     * Formats an ISO date string (YYYY-MM-DD) to the local DD.MM.YYYY format.
     * @param {string} isoDate
     * @returns {string}
     */
    formatDate(isoDate) {
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

    openJob(job) {
        // Placeholder: navigate to job detail view
        const label = this._i18n ? this._i18n.t('view-job-offers.open-job') : 'Open';
        alert(`${label}: ${job.title}`);
    }

    render() {
        const i18n = this._i18n;
        const t = (key) => (i18n ? i18n.t(key) : key);

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
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
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
                                ${JOB_TYPES.map(
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
                                ${AREAS_OF_INTEREST.map(
                                    (area) => html`
                                        <option
                                            value="${area}"
                                            ?selected="${this.filterAreaOfInterest === area}">
                                            ${area}
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
                                  (job) => job.id,
                                  (job) => html`
                                      <div class="job-card">
                                          <div class="job-card-body">
                                              <h3 class="job-title">${job.title}</h3>
                                              <span class="job-tag">${job.areaOfInterest}</span>
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
                                                  <svg
                                                      class="btn-icon"
                                                      xmlns="http://www.w3.org/2000/svg"
                                                      width="16"
                                                      height="16"
                                                      viewBox="0 0 24 24"
                                                      fill="none"
                                                      stroke="currentColor"
                                                      stroke-width="2"
                                                      stroke-linecap="round"
                                                      stroke-linejoin="round"
                                                      aria-hidden="true">
                                                      <circle cx="11" cy="11" r="8"></circle>
                                                      <line
                                                          x1="21"
                                                          y1="21"
                                                          x2="16.65"
                                                          y2="16.65"></line>
                                                  </svg>
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
                font-size: 1rem;
                font-weight: 600;
                line-height: 1.35;
            }

            /* Outlined badge matching the design */
            .job-tag {
                display: inline-block;
                border: 1px solid var(--dbp-content);
                border-radius: 2px;
                padding: 0.1rem 0.4rem;
                font-size: 0.8rem;
                color: var(--dbp-content);
                margin-bottom: 0.5rem;
            }

            .job-deadline {
                margin: 0 0 0.75rem 0;
                font-size: 0.875rem;
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
            }

            /* No results message */
            .no-results {
                padding: 2rem;
                text-align: center;
                color: var(--dbp-muted);
            }

            /* Pagination bar */
            .pagination-bar {
                display: flex;
                align-items: center;
                justify-content: center;
                flex-wrap: wrap;
                gap: 0.75rem;
                padding: 0.5rem 0;
            }

            .page-size-wrapper {
                display: flex;
                align-items: baseline;
                gap: 0.4rem;
            }

            .page-size-wrapper .label {
                margin-bottom: 0;
                white-space: nowrap;
                font-size: 0.875rem;
            }

            .page-size-wrapper .control select {
                width: auto;
            }

            .pagination-buttons {
                display: flex;
                align-items: center;
                gap: 0.25rem;
            }

            .pagination-page {
                min-width: 2rem;
            }
        `;
    }
}

commonUtils.defineCustomElement('dbp-bulletin-view-job-offers', ViewJobOffers);
