import {css, html} from 'lit';
import {ScopedElementsMixin} from '@dbp-toolkit/common/src/scoped/ScopedElementsMixin.js';
import {Button, DBPSelect, sendNotification} from '@dbp-toolkit/common';
import * as commonStyles from '@dbp-toolkit/common/src/styles.js';
import * as commonUtils from '@dbp-toolkit/common/utils';
import DBPBulletinLitElement from './dbp-bulletin-lit-element.js';
import JobProfileModule, {
    STUDENT_PROFILE_FIELDS,
    STUDENT_PROFILE_INDUSTRIES,
} from './modules/studentProfileForm.js';

const BULLETIN_ADMIN_ROLE = 'ROLE_BULLETIN_ADMIN';
const PROFILE_COUNT_OPTIONS = ['5', '10', '20', '50', '100'];
const MS_PER_DAY = 86400000;

const SAMPLE_STUDIES = [
    'Computer Science',
    'Information and Computer Engineering',
    'Architecture',
    'Civil Engineering',
    'Mechanical Engineering',
    'Electrical Engineering',
    'Technical Mathematics',
    'Technical Physics',
    'Biomedical Engineering',
    'Environmental Systems Sciences',
];

const SAMPLE_SUMMARIES = [
    'Motivated TU Graz student interested in applying technical knowledge in interdisciplinary teams.',
    'Curious student with a strong focus on practical problem solving and clear communication.',
    'Engaged student looking for opportunities to contribute to innovative projects.',
    'Analytical student interested in sustainable solutions, software, and modern engineering methods.',
];

const SAMPLE_SUMMARIES_DE = [
    'Motivierte:r TU Graz-Student:in mit Interesse daran, technisches Wissen in interdisziplinären Teams einzusetzen.',
    'Neugierige:r Student:in mit starkem Fokus auf praktische Problemlösung und klare Kommunikation.',
    'Engagierte:r Student:in auf der Suche nach Möglichkeiten, zu innovativen Projekten beizutragen.',
    'Analytische:r Student:in mit Interesse an nachhaltigen Lösungen, Software und modernen Ingenieurmethoden.',
];

const SAMPLE_EXPERIENCE = [
    'Project work at university, internships, and voluntary team assignments.',
    'Hands-on experience from laboratory exercises, student projects, and hackathons.',
    'Experience with agile project work, documentation, and presenting technical results.',
    'Several course projects involving research, prototyping, and implementation.',
];

const SAMPLE_EXPERIENCE_DE = [
    'Projektarbeit an der Universität, Praktika und freiwillige Teamaufgaben.',
    'Praktische Erfahrung aus Laborübungen, studentischen Projekten und Hackathons.',
    'Erfahrung mit agiler Projektarbeit, Dokumentation und Präsentation technischer Ergebnisse.',
    'Mehrere Lehrveranstaltungsprojekte mit Recherche, Prototyping und Umsetzung.',
];

const SAMPLE_SKILLS = [
    'JavaScript',
    'Python',
    'Data analysis',
    'Project coordination',
    'CAD',
    'Machine learning basics',
    'Technical documentation',
    'User research',
    'Embedded systems',
    'Sustainable design',
];

const SAMPLE_SKILLS_DE = [
    'JavaScript',
    'Python',
    'Datenanalyse',
    'Projektkoordination',
    'CAD',
    'Grundlagen des maschinellen Lernens',
    'Technische Dokumentation',
    'Nutzer:innenforschung',
    'Eingebettete Systeme',
    'Nachhaltiges Design',
];

const SAMPLE_QUALIFICATIONS = [
    'Reliable, structured, and comfortable learning new tools quickly.',
    'Strong analytical skills and experience working in international teams.',
    'Good communication skills and a careful approach to technical tasks.',
    'Independent working style with a strong interest in continuous improvement.',
];

const SAMPLE_QUALIFICATIONS_DE = [
    'Verlässlich, strukturiert und geübt darin, neue Werkzeuge schnell zu erlernen.',
    'Starke analytische Fähigkeiten und Erfahrung in internationalen Teams.',
    'Gute Kommunikationsfähigkeiten und sorgfältige Herangehensweise an technische Aufgaben.',
    'Selbstständige Arbeitsweise mit großem Interesse an kontinuierlicher Verbesserung.',
];

const SAMPLE_INTERESTS = [
    'Technology transfer, sustainable products, and collaborative research.',
    'Software quality, automation, and human-centered design.',
    'Energy systems, mobility, and data-driven decision making.',
    'Research prototypes, entrepreneurship, and interdisciplinary product development.',
];

const SAMPLE_INTERESTS_DE = [
    'Technologietransfer, nachhaltige Produkte und kollaborative Forschung.',
    'Softwarequalität, Automatisierung und menschenzentriertes Design.',
    'Energiesysteme, Mobilität und datenbasierte Entscheidungsfindung.',
    'Forschungsprototypen, Entrepreneurship und interdisziplinäre Produktentwicklung.',
];

const SAMPLE_LANGUAGES = ['German', 'English', 'Spanish', 'Italian', 'French'];
const SAMPLE_LANGUAGES_DE = ['Deutsch', 'Englisch', 'Spanisch', 'Italienisch', 'Französisch'];

const SAMPLE_WORK_LOCATIONS = [
    {country: 'AT', region: 'styria', city: 'graz'},
    {country: 'AT', region: 'vienna', city: 'vienna-city'},
    {country: 'AT', region: 'upper-austria', city: 'linz'},
    {country: 'AT', region: 'salzburg', city: 'salzburg-city'},
    {country: 'AT', region: 'tyrol', city: 'innsbruck'},
    {country: 'AT', region: 'carinthia', city: 'klagenfurt'},
];

// Returns a random integer in the inclusive range [min, max].
const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// Returns a random subset (1..max items) from the given array.
const randomSubset = (items, max) => {
    const count = randomInt(1, Math.min(max, items.length));
    const shuffled = [...items].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
};

// Formats a Date as an ISO date string (YYYY-MM-DD).
const toIsoDate = (date) => date.toISOString().split('T')[0];

class GenerateStudentProfilesActivity extends ScopedElementsMixin(DBPBulletinLitElement) {
    static get scopedElements() {
        return {
            'dbp-button': Button,
            'dbp-select': DBPSelect,
        };
    }

    constructor() {
        super();
        this._isGenerating = false;
        this._profileCount = '10';
        this._report = null;
    }

    static get properties() {
        return {
            ...super.properties,
            _isGenerating: {state: true},
            _profileCount: {state: true},
            _report: {state: true},
        };
    }

    get _isDeveloper() {
        return (this.auth?._roles ?? []).includes(BULLETIN_ADMIN_ROLE);
    }

    // Builds a single random student-profile form payload compatible with /formalize/forms.
    _buildRandomStudentProfile(index) {
        const module = new JobProfileModule();
        const uniqueSuffix = `#${Date.now().toString().slice(-5)}-${index + 1}`;
        const studies = randomSubset(SAMPLE_STUDIES, 2).map((name) => ({name}));
        const skillIndexes = randomSubset(
            Array.from({length: SAMPLE_SKILLS.length}, (_value, skillIndex) => skillIndex),
            4,
        );
        const languageIndexes = randomSubset(
            Array.from({length: SAMPLE_LANGUAGES.length}, (_value, languageIndex) => languageIndex),
            3,
        );
        const openToAllIndustries = Math.random() < 0.35;
        const availability = toIsoDate(new Date(Date.now() + randomInt(7, 120) * MS_PER_DAY));
        const summaryIndex = randomInt(0, SAMPLE_SUMMARIES.length - 1);
        const experienceIndex = randomInt(0, SAMPLE_EXPERIENCE.length - 1);
        const qualificationIndex = randomInt(0, SAMPLE_QUALIFICATIONS.length - 1);
        const interestIndex = randomInt(0, SAMPLE_INTERESTS.length - 1);

        const additionalData = {
            summary: SAMPLE_SUMMARIES_DE[summaryIndex],
            summaryEn: SAMPLE_SUMMARIES[summaryIndex],
            studyProgram: studies.map((study) => study.name).join(', '),
            studies,
            previousExperience: SAMPLE_EXPERIENCE_DE[experienceIndex],
            previousExperienceEn: SAMPLE_EXPERIENCE[experienceIndex],
            skills: skillIndexes.map((skillIndex) => SAMPLE_SKILLS_DE[skillIndex]),
            skillsEn: skillIndexes.map((skillIndex) => SAMPLE_SKILLS[skillIndex]),
            furtherQualifications: SAMPLE_QUALIFICATIONS_DE[qualificationIndex],
            furtherQualificationsEn: SAMPLE_QUALIFICATIONS[qualificationIndex],
            personalInterests: SAMPLE_INTERESTS_DE[interestIndex],
            personalInterestsEn: SAMPLE_INTERESTS[interestIndex],
            languages: languageIndexes.map((languageIndex) => SAMPLE_LANGUAGES_DE[languageIndex]),
            languagesEn: languageIndexes.map((languageIndex) => SAMPLE_LANGUAGES[languageIndex]),
            openToAllIndustries,
            industries: openToAllIndustries
                ? []
                : randomSubset(Object.keys(STUDENT_PROFILE_INDUSTRIES), 4),
            fields: randomSubset(Object.keys(STUDENT_PROFILE_FIELDS), 3),
            workLocations: randomSubset(SAMPLE_WORK_LOCATIONS, 2),
            availability,
            contactEmail: `student-profile-${Date.now()}-${index + 1}@example.org`,
            website: `https://profiles.example.org/student-${Date.now()}-${index + 1}`,
            teaser: SAMPLE_SUMMARIES_DE[summaryIndex].slice(0, 100).trim(),
            studentCreatorId: `generated-student-${Date.now()}-${index + 1}`,
            studentPersonIdentifier: '',
        };

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

        return {
            name: `${module.getFormName(this.lang)} ${uniqueSuffix}`,
            localizedNames: [
                {languageTag: 'de', name: `${module.getFormName('de')} ${uniqueSuffix}`},
                {languageTag: 'en', name: `${module.getFormName('en')} ${uniqueSuffix}`},
            ],
            frontendKey: module.getFormFrontendKey(),
            additionalData,
            dataFeedSchema,
            // Each company can signal interest only once per student profile.
            maxNumSubmissionsPerCreator: 1,
        };
    }

    // Creates a single student profile form via POST /formalize/forms.
    async _createStudentProfileForm(formData) {
        const body = {
            name: formData.name,
            localizedNames: formData.localizedNames,
            frontendKey: formData.frontendKey,
            additionalData: formData.additionalData,
            dataFeedSchema: formData.dataFeedSchema,
            maxNumSubmissionsPerCreator: formData.maxNumSubmissionsPerCreator,
        };

        const response = await fetch(this.entryPointUrl + '/formalize/forms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/ld+json',
                Authorization: 'Bearer ' + this.auth.token,
            },
            body: JSON.stringify(body),
        });

        return response.ok;
    }

    async _handleGenerate() {
        if (this._isGenerating) {
            return;
        }

        if (!this._isDeveloper) {
            sendNotification({
                summary: this._i18n.t('generate-student-profiles.error-title'),
                body: this._i18n.t('generate-student-profiles.error-not-authorized'),
                type: 'danger',
                timeout: 0,
            });
            return;
        }

        if (!this.auth?.token || !this.entryPointUrl) {
            sendNotification({
                summary: this._i18n.t('generate-student-profiles.error-title'),
                body: this._i18n.t('generate-student-profiles.error-not-ready'),
                type: 'danger',
                timeout: 0,
            });
            return;
        }

        const count = Number(this._profileCount);
        this._isGenerating = true;
        this._report = null;

        const report = {created: [], errors: []};

        await commonUtils.asyncArrayForEach(Array.from({length: count}), async (_value, index) => {
            const formData = this._buildRandomStudentProfile(index);
            try {
                const created = await this._createStudentProfileForm(formData);
                if (created) {
                    report.created.push(formData.name);
                } else {
                    report.errors.push(formData.name);
                }
            } catch (error) {
                console.error('Failed to generate student profile:', error);
                report.errors.push(formData.name);
            }
        });

        this._report = report;
        this._isGenerating = false;

        sendNotification({
            summary: this._i18n.t('generate-student-profiles.finished-title'),
            body: this._i18n.t('generate-student-profiles.finished-body', {
                created: report.created.length,
                errors: report.errors.length,
            }),
            type: report.errors.length > 0 ? 'warning' : 'success',
            timeout: 8,
        });
    }

    _getProfileCountOptions() {
        return PROFILE_COUNT_OPTIONS.map((value) => ({value, label: value}));
    }

    render() {
        const t = (key, opts) => this._i18n.t(key, opts);

        if (!this._isDeveloper) {
            return html`
                <section class="activity-header">
                    <h2>${t('generate-student-profiles.title')}</h2>
                    <p>${t('generate-student-profiles.not-authorized')}</p>
                </section>
            `;
        }

        return html`
            <section class="activity-header">
                <h2>${t('generate-student-profiles.title')}</h2>
                <p>${t('generate-student-profiles.description')}</p>
            </section>

            <section class="generate-card">
                <div class="select-option">
                    <label for="profile-count">${t('generate-student-profiles.count-label')}</label>
                    <p id="profile-count-description">
                        ${t('generate-student-profiles.count-description')}
                    </p>
                    <dbp-select
                        id="profile-count"
                        align="left"
                        aria-describedby="profile-count-description"
                        label="${this._profileCount}"
                        .options="${this._getProfileCountOptions()}"
                        .value="${this._profileCount}"
                        ?disabled="${this._isGenerating}"
                        @change="${(event) => {
                            this._profileCount = event.detail.value;
                        }}"></dbp-select>
                </div>
                <dbp-button
                    type="is-primary"
                    value="${
                        this._isGenerating
                            ? t('generate-student-profiles.generating')
                            : t('generate-student-profiles.generate-button')
                    }"
                    ?disabled="${this._isGenerating}"
                    @click="${this._handleGenerate}"></dbp-button>
            </section>

            ${
                this._report
                    ? html`
                          <section class="report-card">
                              <h2>${t('generate-student-profiles.report-title')}</h2>
                              <div class="summary-grid">
                                  <div>
                                      <strong>${this._report.created.length}</strong>
                                      <span>${t('generate-student-profiles.summary-created')}</span>
                                  </div>
                                  <div>
                                      <strong>${this._report.errors.length}</strong>
                                      <span>${t('generate-student-profiles.summary-errors')}</span>
                                  </div>
                              </div>
                              ${
                                  this._report.created.length > 0
                                      ? html`
                                            <section class="report-section">
                                                <h3>
                                                    ${t('generate-student-profiles.created-title', {
                                                        count: this._report.created.length,
                                                    })}
                                                </h3>
                                                <ul>
                                                    ${this._report.created.map(
                                                        (name) => html`
                                                            <li>${name}</li>
                                                        `,
                                                    )}
                                                </ul>
                                            </section>
                                        `
                                      : ''
                              }
                          </section>
                      `
                    : ''
            }
        `;
    }

    static get styles() {
        return [
            commonStyles.getThemeCSS(),
            commonStyles.getGeneralCSS(false),
            css`
                :host {
                    display: block;
                    padding: 1.5rem;
                }

                .activity-header,
                .generate-card,
                .report-card {
                    max-width: 72rem;
                    margin: 0 auto 1.5rem;
                }

                .activity-header h2,
                .report-card h2 {
                    margin-top: 0;
                }

                .generate-card,
                .report-card {
                    padding: 1.5rem;
                    border: var(--dbp-override-border, 1px solid #ddd);
                    background: var(--dbp-override-secondary-surface, #fff);
                }

                .select-option {
                    max-width: 42rem;
                    margin-bottom: 1.25rem;
                }

                .select-option label {
                    display: block;
                    font-weight: bold;
                }

                .select-option p {
                    margin: 0 0 0.5rem;
                }

                .select-option dbp-select {
                    display: inline-block;
                    min-width: 10rem;
                }

                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 1rem;
                    margin: 1.5rem 0;
                }

                .summary-grid div {
                    padding: 1rem;
                    border: var(--dbp-override-border, 1px solid #ddd);
                }

                .summary-grid strong {
                    display: block;
                    font-size: 2rem;
                }

                .summary-grid span {
                    display: block;
                }

                .report-section {
                    margin-top: 1.5rem;
                }

                .report-section ul {
                    max-height: 18rem;
                    overflow: auto;
                    padding-left: 1.5rem;
                }

                .report-section li {
                    margin-bottom: 0.35rem;
                }

                @media (max-width: 768px) {
                    :host {
                        padding: 1rem;
                    }

                    .summary-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `,
        ];
    }
}

commonUtils.defineCustomElement(
    'dbp-bulletin-generate-student-profiles',
    GenerateStudentProfilesActivity,
);
