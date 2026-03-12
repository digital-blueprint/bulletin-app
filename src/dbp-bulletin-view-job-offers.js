import {css, html} from 'lit';
import {ref, createRef} from 'lit/directives/ref.js';
import {repeat} from 'lit/directives/repeat.js';
import * as commonUtils from '@dbp-toolkit/common/utils';
import * as commonStyles from '@dbp-toolkit/common/src/styles.js';
import {ScopedElementsMixin} from '@dbp-toolkit/common/src/scoped/ScopedElementsMixin.js';
import {Icon} from '@dbp-toolkit/common';
import DBPBulletinLitElement from './dbp-bulletin-lit-element.js';
import {JobOfferDetail} from './dbp-bulletin-job-offer-detail.js';

/** @type {Array<{identifier: string, title: string, jobType: string, areaOfInterest: string, publishedAt: string, deadline: string, startDate: string, weeklyHours: string, organization: string, description: string, requirements: string[]}>} */
const MOCK_JOB_OFFERS = [
    {
        identifier: 'a1b2c3d4-0001-4000-8000-000000000001',
        title: 'Universitätsassistent*in im Bereich Elektrotechnik (m/w/d)',
        jobType: 'Universitätsstelle',
        areaOfInterest: 'Elektronik',
        publishedAt: '2026-01-15',
        deadline: '2030-01-01',
        startDate: 'ab sofort',
        weeklyHours: '40 h / Woche',
        organization: 'Institut für Elektrotechnik',
        description: 'Mitarbeit in Forschung und Lehre im Bereich Elektrotechnik.',
        requirements: [
            'Studium der Elektrotechnik oder eines verwandten Fachbereichs',
            'Grundkenntnisse in analoger und digitaler Schaltungstechnik',
        ],
    },
    {
        identifier: 'a1b2c3d4-0002-4000-8000-000000000002',
        title: 'Werkstudent*in (m/w/d) als Projektunterstützung 6h pro Woche',
        jobType: 'Werkstudentenstelle',
        areaOfInterest: 'Architektur & Bauwesen',
        publishedAt: '2026-02-01',
        deadline: '2030-01-01',
        startDate: 'ab sofort',
        weeklyHours: '6 h / Woche',
        organization: 'Institut für Bautechnik',
        description: 'Unterstützung laufender Projekte im Bereich Bauwesen.',
        requirements: [
            'Studium der Architektur, des Bauingenieurwesens oder ähnlichem',
            'Teamfähigkeit und Eigeninitiative',
        ],
    },
    {
        identifier: 'a1b2c3d4-0003-4000-8000-000000000003',
        title: 'Assistant Marketing Research (m/w/d) 20h',
        jobType: 'Teilzeitstelle',
        areaOfInterest: 'Kommunikation & Marketing',
        publishedAt: '2026-02-10',
        deadline: '2030-01-01',
        startDate: 'ab sofort',
        weeklyHours: '20 h / Woche',
        organization: 'Marketing Abteilung',
        description: 'Durchführung von Marktforschungsanalysen und Aufbereitung von Daten.',
        requirements: [
            'Studium der Wirtschaftswissenschaften, Marketing oder ähnlichem',
            'Erfahrung mit Datenanalyse-Tools',
        ],
    },
    {
        identifier: 'a1b2c3d4-0004-4000-8000-000000000004',
        title: 'Studentische Mitarbeiter*in: Planung Hochbau',
        jobType: 'Werkstudentenstelle',
        areaOfInterest: 'Architektur & Bauwesen',
        publishedAt: '2026-02-15',
        deadline: '2030-01-01',
        startDate: 'ab sofort',
        weeklyHours: '10 h / Woche',
        organization: 'Institut für Hochbau',
        description: 'Unterstützung bei Planungsaufgaben im Hochbau.',
        requirements: [
            'Studium der Architektur oder des Bauingenieurwesens',
            'CAD-Kenntnisse von Vorteil',
        ],
    },
    {
        identifier: 'a1b2c3d4-0005-4000-8000-000000000005',
        title: 'Student Support "Informationstechnologie" (m/w/d)',
        jobType: 'Werkstudentenstelle',
        areaOfInterest: 'Informatik',
        publishedAt: '2026-03-15',
        deadline: '2026-06-30',
        startDate: 'ab sofort',
        weeklyHours: '15 h / Woche',
        organization: 'Institut für Informatik',
        description:
            'Du suchst einen flexiblen Studentenjob, der nicht nur Deine Fähigkeiten stärkt, sondern Dich auch persönlich weiterbringt? Wir bieten Dir ein inspirierendes Arbeitsumfeld, das Offenheit, Vielfalt und Teamgeist lebt. Von Anfang an wirst Du aktiv in spannende Projekte eingebunden, sammelst wertvolle Praxiserfahrungen und trägst mit Deinem Engagement zur Umsetzung nachhaltiger Initiativen bei.',
        requirements: [
            'Du befindest dich gerade in einem relevanten Studienfach wie Wirtschaftsinformatik, Betriebswirtschaftslehre, Informatik oder einem ähnlichen Bereich',
            'Du hast Interesse am Bereich IT und insbes. an IT-Governance im Bankwesen. Du siehst dich als Zahlenjongleur, bringst eine analytische Denkweise mit und verstehst komplexe Zusammenhänge',
            'Du hast Engagement, gute Kommunikationsfähigkeiten und genießt Teamarbeit in einem agilen Setup',
            'Du bist sicher im Umgang mit MS Office, insbesondere Excel und PowerPoint. Erfahrung mit Jira oder Confluence',
        ],
    },
    {
        identifier: 'a1b2c3d4-0006-4000-8000-000000000006',
        title: 'Praktikant*in / Werkstudent*in im Bereich Reporting',
        jobType: 'Praktikum',
        areaOfInterest: 'Fahrzeugsicherheit',
        publishedAt: '2026-02-20',
        deadline: '2030-01-01',
        startDate: 'ab sofort',
        weeklyHours: '20 h / Woche',
        organization: 'Fahrzeugsicherheit Institut',
        description: 'Erstellung von Reports und Analysen im Bereich Fahrzeugsicherheit.',
        requirements: [
            'Studium der Fahrzeugtechnik oder ähnlichem',
            'Kenntnisse in Reporting-Tools und Datenvisualisierung',
        ],
    },
    {
        identifier: 'a1b2c3d4-0007-4000-8000-000000000007',
        title: 'Werkstudent*in R&D - Technical Design Tool (m/w/d)',
        jobType: 'Werkstudentenstelle',
        areaOfInterest: 'Architektur & Bauwesen',
        publishedAt: '2026-03-01',
        deadline: '2030-01-01',
        startDate: 'ab sofort',
        weeklyHours: '12 h / Woche',
        organization: 'R&D Abteilung',
        description: 'Mitarbeit bei der Entwicklung technischer Design-Tools.',
        requirements: [
            'Studium der Informatik, Architektur oder ähnlichem',
            'Kenntnisse in CAD oder 3D-Modellierung von Vorteil',
        ],
    },
    {
        identifier: 'a1b2c3d4-0008-4000-8000-000000000008',
        title: 'Marketing Mitarbeiter*in Schwerpunkt Digital Marketing & Social Media',
        jobType: 'Vollzeitstelle',
        areaOfInterest: 'Kommunikation & Marketing',
        publishedAt: '2026-03-05',
        deadline: '2030-01-01',
        startDate: 'ab sofort',
        weeklyHours: '38 h / Woche',
        organization: 'Kommunikationsabteilung',
        description: 'Betreuung und Weiterentwicklung der Social-Media-Kanäle.',
        requirements: [
            'Abgeschlossenes Studium im Bereich Marketing, Kommunikation oder ähnlichem',
            'Mehrjährige Erfahrung im Social-Media-Management',
        ],
    },
    {
        identifier: 'a1b2c3d4-0009-4000-8000-000000000009',
        title: 'Werkstudent:in im Bereich Produktdigitalisierung (teilzeit)',
        jobType: 'Werkstudentenstelle',
        areaOfInterest: 'Wärmetechnik',
        publishedAt: '2026-03-08',
        deadline: '2030-01-01',
        startDate: 'ab sofort',
        weeklyHours: '16 h / Woche',
        organization: 'Institut für Wärmetechnik',
        description: 'Unterstützung bei der Digitalisierung von Produktionsprozessen.',
        requirements: [
            'Studium der Wärmetechnik, Maschinenbau oder ähnlichem',
            'Grundkenntnisse in Digitalisierungstools und Datenbankmanagement',
        ],
    },
    {
        identifier: 'a1b2c3d4-0010-4000-8000-000000000010',
        title: 'Universitätsassistent*in im Bereich Elektrotechnik (m/w/d)',
        jobType: 'Universitätsstelle',
        areaOfInterest: 'Elektronik',
        publishedAt: '2026-01-20',
        deadline: '2030-01-01',
        startDate: 'ab sofort',
        weeklyHours: '40 h / Woche',
        organization: 'Institut für Halbleitertechnik',
        description: 'Forschung und Lehre im Bereich Halbleitertechnik.',
        requirements: [
            'Doktoratsstudium oder Abschluss der Elektrotechnik',
            'Forschungserfahrung im Bereich Halbleiter von Vorteil',
        ],
    },
    {
        identifier: 'a1b2c3d4-0011-4000-8000-000000000011',
        title: 'Werkstudent*in (m/w/d) als Projektunterstützung 6h pro Woche',
        jobType: 'Werkstudentenstelle',
        areaOfInterest: 'Architektur & Bauwesen',
        publishedAt: '2026-02-05',
        deadline: '2030-01-01',
        startDate: 'ab sofort',
        weeklyHours: '6 h / Woche',
        organization: 'Bauplanung GmbH',
        description: 'Projektunterstützung für laufende Bauprojekte.',
        requirements: [
            'Studium des Bauingenieurwesens oder ähnlichem',
            'Selbstständige Arbeitsweise und Organisationsgeschick',
        ],
    },
    {
        identifier: 'a1b2c3d4-0012-4000-8000-000000000012',
        title: 'Software-Entwickler*in (m/w/d) Backend',
        jobType: 'Vollzeitstelle',
        areaOfInterest: 'Informatik',
        publishedAt: '2026-03-10',
        deadline: '2030-03-31',
        startDate: 'ab sofort',
        weeklyHours: '38 h / Woche',
        organization: 'IT-Abteilung',
        description: 'Entwicklung und Wartung von Backend-Systemen.',
        requirements: [
            'Abgeschlossenes Studium der Informatik oder ähnlichem',
            'Kenntnisse in Java, Python oder Go',
            'Erfahrung mit RESTful APIs und Microservices',
        ],
    },
    {
        identifier: 'a1b2c3d4-0013-4000-8000-000000000013',
        title: 'Forschungsassistent*in Maschinenbau (m/w/d)',
        jobType: 'Universitätsstelle',
        areaOfInterest: 'Maschinenbau',
        publishedAt: '2026-01-25',
        deadline: '2030-02-28',
        startDate: 'ab sofort',
        weeklyHours: '40 h / Woche',
        organization: 'Institut für Maschinenbau',
        description: 'Mitarbeit in Forschungsprojekten im Bereich Maschinenbau.',
        requirements: [
            'Studium des Maschinenbaus oder ähnlichem',
            'Erfahrung mit FEM-Simulation von Vorteil',
        ],
    },
    {
        identifier: 'a1b2c3d4-0014-4000-8000-000000000014',
        title: 'Praktikant*in Datenanalyse (m/w/d)',
        jobType: 'Praktikum',
        areaOfInterest: 'Informatik',
        publishedAt: '2026-03-12',
        deadline: '2026-12-31',
        startDate: 'ab sofort',
        weeklyHours: '20 h / Woche',
        organization: 'Data Science Abteilung',
        description: 'Analyse und Visualisierung großer Datensätze.',
        requirements: [
            'Studium der Informatik, Statistik oder ähnlichem',
            'Kenntnisse in Python, R oder SQL',
        ],
    },
    {
        identifier: 'a1b2c3d4-0015-4000-8000-000000000015',
        title: 'Teamassistenz im Bereich Kommunikation (m/w/d)',
        jobType: 'Teilzeitstelle',
        areaOfInterest: 'Kommunikation & Marketing',
        publishedAt: '2026-02-25',
        deadline: '2030-01-01',
        startDate: 'ab sofort',
        weeklyHours: '20 h / Woche',
        organization: 'Kommunikationsabteilung',
        description: 'Unterstützung des Kommunikationsteams in administrativen Aufgaben.',
        requirements: [
            'Ausbildung oder Studium im Bereich Kommunikation oder Verwaltung',
            'Sehr gute MS-Office-Kenntnisse',
        ],
    },
    {
        identifier: 'a1b2c3d4-0016-4000-8000-000000000016',
        title: 'Werkstudent*in Energie- und Umwelttechnik (m/w/d)',
        jobType: 'Werkstudentenstelle',
        areaOfInterest: 'Wärmetechnik',
        publishedAt: '2026-03-02',
        deadline: '2030-06-30',
        startDate: 'ab sofort',
        weeklyHours: '15 h / Woche',
        organization: 'Institut für Energie- und Umwelttechnik',
        description: 'Mitarbeit in Projekten zur erneuerbaren Energie.',
        requirements: [
            'Studium der Energie- und Umwelttechnik oder ähnlichem',
            'Interesse an nachhaltigen Energiesystemen',
        ],
    },
    {
        identifier: 'a1b2c3d4-0017-4000-8000-000000000017',
        title: 'Junior Data Scientist (m/w/d)',
        jobType: 'Vollzeitstelle',
        areaOfInterest: 'Informatik',
        publishedAt: '2026-03-11',
        deadline: '2030-04-15',
        startDate: 'ab sofort',
        weeklyHours: '38 h / Woche',
        organization: 'AI Research Lab',
        description: 'Entwicklung von Machine-Learning-Modellen für industrielle Anwendungen.',
        requirements: [
            'Studium der Informatik, Mathematik oder ähnlichem',
            'Kenntnisse in Machine Learning und Deep Learning',
            'Erfahrung mit TensorFlow oder PyTorch von Vorteil',
        ],
    },
    {
        identifier: 'a1b2c3d4-0018-4000-8000-000000000018',
        title: 'Konstrukteur*in Fahrzeugtechnik (m/w/d)',
        jobType: 'Vollzeitstelle',
        areaOfInterest: 'Fahrzeugsicherheit',
        publishedAt: '2026-02-28',
        deadline: '2030-01-01',
        startDate: 'ab sofort',
        weeklyHours: '38 h / Woche',
        organization: 'Institut für Fahrzeugtechnik',
        description: 'Konstruktion und Auslegung von Fahrzeugkomponenten.',
        requirements: [
            'Studium der Fahrzeugtechnik, des Maschinenbaus oder ähnlichem',
            'Kenntnisse in CAD-Programmen (CATIA, SolidWorks)',
        ],
    },
    {
        identifier: 'a1b2c3d4-0019-4000-8000-000000000019',
        title: 'Lehrassistenz Grundlagen Elektrotechnik',
        jobType: 'Universitätsstelle',
        areaOfInterest: 'Elektronik',
        publishedAt: '2026-01-30',
        deadline: '2030-08-31',
        startDate: 'ab sofort',
        weeklyHours: '8 h / Woche',
        organization: 'Institut für Grundlagen der Elektrotechnik',
        description: 'Betreuung von Übungen und Tutorien in der Grundlagenausbildung.',
        requirements: [
            'Fortgeschrittenes Studium der Elektrotechnik',
            'Didaktische Fähigkeiten und Freude am Unterrichten',
        ],
    },
    {
        identifier: 'a1b2c3d4-0020-4000-8000-000000000020',
        title: 'Projektmanager*in Bauplanung (m/w/d)',
        jobType: 'Vollzeitstelle',
        areaOfInterest: 'Architektur & Bauwesen',
        publishedAt: '2026-03-06',
        deadline: '2030-01-01',
        startDate: 'ab sofort',
        weeklyHours: '38 h / Woche',
        organization: 'Bauplanung AG',
        description: 'Koordination und Steuerung von Bauprojekten.',
        requirements: [
            'Abgeschlossenes Studium des Bauingenieurwesens oder Projektmanagements',
            'Mehrjährige Erfahrung in der Bauplanung',
        ],
    },
    {
        identifier: 'a1b2c3d4-0021-4000-8000-000000000021',
        title: 'Praktikant*in im Bereich Wärmetechnik',
        jobType: 'Praktikum',
        areaOfInterest: 'Wärmetechnik',
        publishedAt: '2026-01-10',
        deadline: '2027-03-31',
        startDate: 'ab sofort',
        weeklyHours: '20 h / Woche',
        organization: 'Institut für Wärmetechnik',
        description: 'Praktische Mitarbeit in thermodynamischen Versuchsprojekten.',
        requirements: [
            'Studium der Wärmetechnik, des Maschinenbaus oder ähnlichem',
            'Interesse an experimenteller Forschung',
        ],
    },
    {
        identifier: 'a1b2c3d4-0022-4000-8000-000000000022',
        title: 'Content Creator & Social Media Manager*in (m/w/d)',
        jobType: 'Teilzeitstelle',
        areaOfInterest: 'Kommunikation & Marketing',
        publishedAt: '2026-03-09',
        deadline: '2030-01-01',
        startDate: 'ab sofort',
        weeklyHours: '20 h / Woche',
        organization: 'Marketingabteilung',
        description: 'Erstellung von Content für verschiedene Social-Media-Plattformen.',
        requirements: [
            'Studium der Kommunikationswissenschaften, Mediendesign oder ähnlichem',
            'Kreativität und Erfahrung in der Content-Erstellung',
        ],
    },
];

// Derive sorted unique option lists from the mock data
const JOB_TYPES = [...new Set(MOCK_JOB_OFFERS.map((j) => j.jobType))].sort();
const AREAS_OF_INTEREST = [...new Set(MOCK_JOB_OFFERS.map((j) => j.areaOfInterest))].sort();

const PAGE_SIZE_OPTIONS = [6, 12, 24];
const DEFAULT_PAGE_SIZE = 12;

class ViewJobOffers extends ScopedElementsMixin(DBPBulletinLitElement) {
    static get scopedElements() {
        return {
            'dbp-icon': Icon,
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
        };
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
     * Parses the current routing URL and opens or closes the detail dialog accordingly.
     */
    handleRoutingUrlChange() {
        const {pathSegments} = this.getRoutingData();

        // Expected URL pattern: job/<identifier>
        if (pathSegments[0] === 'job' && pathSegments[1]) {
            const identifier = pathSegments[1];
            const job = MOCK_JOB_OFFERS.find((j) => j.identifier === identifier) ?? null;
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
                                  (job) => job.identifier,
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
