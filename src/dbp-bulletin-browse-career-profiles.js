import {css, html} from 'lit';
import {ScopedElementsMixin} from '@dbp-toolkit/common/src/scoped/ScopedElementsMixin.js';
import {Button, Icon, IconButton, MiniSpinner, sendNotification} from '@dbp-toolkit/common';
import * as commonStyles from '@dbp-toolkit/common/src/styles.js';
import * as commonUtils from '@dbp-toolkit/common/utils';
import DBPBulletinLitElement from './dbp-bulletin-lit-element.js';
import JobProfileModule, {
    formatStudentStudies,
    JobProfileInterestFormElement,
    normalizeStudentStudies,
} from './modules/jobProfileForm.js';
import {CustomTabulatorTable} from '../vendor/formalize/src/table-components.js';

class BrowseCareerProfilesActivity extends ScopedElementsMixin(DBPBulletinLitElement) {
    static get scopedElements() {
        return {
            'dbp-button': Button,
            'dbp-icon': Icon,
            'dbp-icon-button': IconButton,
            'dbp-mini-spinner': MiniSpinner,
            'dbp-tabulator-table': CustomTabulatorTable,
            'dbp-job-profile-interest-form': JobProfileInterestFormElement,
        };
    }

    constructor() {
        super();
        this._profiles = [];
        this._selectedProfile = null;
        this._loadingProfiles = false;
        this._loadError = false;
        this._profilesLoaded = false;
    }

    static get properties() {
        return {
            ...super.properties,
            _profiles: {state: true},
            _selectedProfile: {state: true},
            _loadingProfiles: {state: true},
            _loadError: {state: true},
        };
    }

    initialize() {
        this._fetchProfiles();
    }

    update(changedProperties) {
        super.update(changedProperties);

        if (changedProperties.has('routingUrl')) {
            this._handleRoutingUrlChange();
        }

        if (changedProperties.has('auth') && this.auth?.token) {
            const oldAuth = changedProperties.get('auth');
            const userChanged = oldAuth?.['user-id'] !== this.auth?.['user-id'];

            // Token refreshes update auth.token without changing the user. Do not reload the
            // table in that case, otherwise the browse page gets stuck behind a loading flash.
            if (!this._profilesLoaded || userChanged) {
                this._fetchProfiles();
            }
        }
    }

    loginCallback() {
        if (!this._profilesLoaded && this.auth?.token) {
            this._fetchProfiles();
        }
    }

    updated(changedProperties) {
        super.updated(changedProperties);

        if (
            changedProperties.has('_profiles') ||
            changedProperties.has('lang') ||
            changedProperties.has('_selectedProfile')
        ) {
            this._syncProfileTable();
        }
    }

    async _fetchProfiles() {
        if (this._loadingProfiles) {
            return;
        }

        if (!this.auth?.token || !this.entryPointUrl) {
            return;
        }

        this._loadingProfiles = true;
        this._loadError = false;

        // Student profiles are Formalize forms identified by the student-profile frontend key.
        const frontendKey = new JobProfileModule().getFormFrontendKey();
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
                this._loadError = true;
                sendNotification({
                    summary: this._i18n.t('browse-career-profiles.load-error-title'),
                    body: this._i18n.t('browse-career-profiles.load-error'),
                    type: 'danger',
                    timeout: 0,
                });
                return;
            }

            const data = await response.json();
            this._profiles = (data['hydra:member'] ?? []).map((form) => this._mapProfile(form));
            this._profilesLoaded = true;
            this._handleRoutingUrlChange();
        } catch (error) {
            console.error('Error loading student profiles for company browsing:', error);
            this._loadError = true;
            sendNotification({
                summary: this._i18n.t('browse-career-profiles.load-error-title'),
                body: this._i18n.t('browse-career-profiles.load-error'),
                type: 'danger',
                timeout: 0,
            });
        } finally {
            this._loadingProfiles = false;
        }
    }

    _mapProfile(form) {
        const additionalData = form.additionalData ?? {};
        return {
            identifier: form.identifier,
            formName: this._getLocalizedName(form.localizedNames) || form.name || '',
            localizedNames: form.localizedNames ?? [],
            additionalData,
            dataFeedSchema: form.dataFeedSchema ?? '',
        };
    }

    _getLocalizedName(localizedNames) {
        if (!Array.isArray(localizedNames) || localizedNames.length === 0) {
            return '';
        }
        const match = localizedNames.find((name) => name.languageTag === this.lang);
        return (match ?? localizedNames[0]).name ?? '';
    }

    _handleRoutingUrlChange() {
        const {pathSegments} = this.getRoutingData();
        const profileId = pathSegments[0] === 'profile' ? pathSegments[1] : '';

        if (!profileId) {
            this._selectedProfile = null;
            return;
        }

        this._selectedProfile =
            this._profiles.find((profile) => profile.identifier === profileId) ?? null;
    }

    _openProfile(profile) {
        this.sendSetPropertyEvent('routing-url', `profile/${profile.identifier}`, true);
    }

    _backToOverview() {
        this.sendSetPropertyEvent('routing-url', '/', true);
    }

    _localized(profile, primaryKey, englishKey) {
        const data = profile?.additionalData ?? {};
        return this.lang === 'en' && data[englishKey] ? data[englishKey] : data[primaryKey] || '';
    }

    _localizedList(profile, primaryKey, englishKey) {
        const data = profile?.additionalData ?? {};
        return this.lang === 'en' && Array.isArray(data[englishKey]) && data[englishKey].length > 0
            ? data[englishKey]
            : data[primaryKey] || [];
    }

    _getProfileAlias(profile) {
        const index = this._profiles.findIndex((item) => item.identifier === profile.identifier);
        return this._i18n.t('browse-career-profiles.applicant-alias', {number: index + 1});
    }

    _renderList(items) {
        if (!Array.isArray(items) || items.length === 0) {
            return '';
        }

        return html`
            <ul>
                ${items.map(
                    (item) => html`
                        <li>${item}</li>
                    `,
                )}
            </ul>
        `;
    }

    _renderStudies(profile) {
        const studies = normalizeStudentStudies(profile?.additionalData ?? {});
        if (studies.length === 0) {
            return '';
        }

        return this._renderList(studies.map((study) => study.name));
    }

    _renderStudiesSection(profile) {
        const studies = normalizeStudentStudies(profile?.additionalData ?? {});
        if (studies.length === 0) {
            return '';
        }

        return html`
            <section class="profile-studies">
                <h3>${this._i18n.t('student-profile-form.field-study-program')}</h3>
                ${this._renderStudies(profile)}
            </section>
        `;
    }

    _getTableData() {
        return this._profiles.map((profile) => {
            const data = profile.additionalData ?? {};
            const skills = this._localizedList(profile, 'skills', 'skillsEn');
            return {
                alias: this._getProfileAlias(profile),
                studyProgram: formatStudentStudies(data),
                previousExperience: this._localized(
                    profile,
                    'previousExperience',
                    'previousExperienceEn',
                ),
                skills: skills.join(', '),
                profile,
            };
        });
    }

    _createTableActionButton(iconName, title, onClick) {
        const button = this.createScopedElement('dbp-icon-button');
        button.setAttribute('subscribe', 'lang');
        button.setAttribute('icon-name', iconName);
        button.title = title;
        button.setAttribute('aria-label', title);
        button.addEventListener('click', (event) => {
            event.stopPropagation();
            onClick();
        });

        return button;
    }

    _createTableActions(profile) {
        const t = (key, opts) => this._i18n.t(key, opts);
        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.flexWrap = 'wrap';
        actions.style.gap = '0.5rem';
        actions.style.justifyContent = 'flex-end';
        actions.append(
            this._createTableActionButton(
                'keyword-research',
                t('browse-career-profiles.view-profile'),
                () => this._openProfile(profile),
            ),
        );
        return actions;
    }

    _getTableOptions() {
        const t = (key, opts) => this._i18n.t(key, opts);

        return {
            // The toolkit table pagination setup mutates options.langs.en/de,
            // so both language objects must exist before buildTable() is called.
            langs: {
                en: {},
                de: {},
            },
            data: this._getTableData(),
            layout: 'fitColumns',
            rowHeight: 64,
            placeholder: t('browse-career-profiles.no-profiles'),
            columnDefaults: {
                vertAlign: 'middle',
                hozAlign: 'left',
                resizable: false,
            },
            columns: [
                {
                    title: t('browse-career-profiles.column-name'),
                    field: 'alias',
                    sorter: 'string',
                    minWidth: 180,
                },
                {
                    title: t('browse-career-profiles.column-study-program'),
                    field: 'studyProgram',
                    sorter: 'string',
                    minWidth: 220,
                },
                {
                    title: t('browse-career-profiles.column-previous-experience'),
                    field: 'previousExperience',
                    sorter: 'string',
                    minWidth: 240,
                },
                {
                    title: t('browse-career-profiles.column-skills'),
                    field: 'skills',
                    sorter: 'string',
                    minWidth: 220,
                },
                {
                    title: '',
                    field: 'actions',
                    headerSort: false,
                    hozAlign: 'right',
                    headerHozAlign: 'right',
                    minWidth: 120,
                    formatter: (cell) => this._createTableActions(cell.getRow().getData().profile),
                },
            ],
        };
    }

    async _syncProfileTable() {
        const table = this.renderRoot?.querySelector('#student-profiles-table');
        if (!table || this._selectedProfile) {
            return;
        }

        const options = this._getTableOptions();
        table.options = options;
        table.data = options.data;

        if (!table.tabulatorTable) {
            await table.updateComplete;
            if (!table.tabulatorTable && !table.tableBuilding) {
                table.buildTable();
            }
            return;
        }

        table.tabulatorTable.setLocale(this.lang);
        table.tabulatorTable.replaceData(options.data);
    }

    _renderMetaItem(label, value) {
        if (!value) {
            return '';
        }

        return html`
            <div>
                <dt>${label}</dt>
                <dd>${value}</dd>
            </div>
        `;
    }

    _renderOverview() {
        const t = (key, opts) => this._i18n.t(key, opts);

        return html`
            <section class="activity-header">
                <div>
                    <h2>${t('browse-career-profiles.title')}</h2>
                    <p>${t('browse-career-profiles.description')}</p>
                </div>
                ${this._loadingProfiles
                    ? html`
                          <dbp-mini-spinner text="${t('loading-message')}"></dbp-mini-spinner>
                      `
                    : ''}
            </section>

            <dbp-tabulator-table
                lang="${this.lang}"
                id="student-profiles-table"
                identifier="student-profiles-table"
                pagination-enabled
                pagination-size="10"
                .options="${this._getTableOptions()}"></dbp-tabulator-table>
        `;
    }

    _renderProfileDetail(profile) {
        const t = (key, opts) => this._i18n.t(key, opts);
        const data = profile.additionalData ?? {};
        const previousExperience = this._localized(
            profile,
            'previousExperience',
            'previousExperienceEn',
        );
        const skills = this._localizedList(profile, 'skills', 'skillsEn');
        const languages = this._localizedList(profile, 'languages', 'languagesEn');

        return html`
            <span class="back-navigation">
                <a
                    @click="${this._backToOverview}"
                    title="${t('browse-career-profiles.back-to-profiles')}">
                    <dbp-icon name="chevron-left"></dbp-icon>
                    ${t('browse-career-profiles.back-to-profiles')}
                </a>
            </span>

            <article class="profile-detail">
                <header>
                    <h2>${this._getProfileAlias(profile)}</h2>
                </header>

                <p class="summary">${this._localized(profile, 'summary', 'summaryEn')}</p>

                ${this._renderStudiesSection(profile)}

                <dl class="profile-meta">
                    ${this._renderMetaItem(
                        t('student-profile-form.field-availability'),
                        data.availability,
                    )}
                    ${data.website || data.linkUrl
                        ? this._renderMetaItem(
                              t('student-profile-form.field-website'),
                              html`
                                  <a
                                      href="${data.website || data.linkUrl}"
                                      target="_blank"
                                      rel="noopener noreferrer">
                                      ${data.website || data.linkUrl}
                                  </a>
                              `,
                          )
                        : ''}
                </dl>

                ${previousExperience
                    ? html`
                          <section>
                              <h3>${t('student-profile-form.field-previous-experience')}</h3>
                              <p>${previousExperience}</p>
                          </section>
                      `
                    : ''}
                ${skills.length
                    ? html`
                          <section>
                              <h3>${t('student-profile-form.field-skills-view-mode')}</h3>
                              ${this._renderList(skills)}
                          </section>
                      `
                    : ''}
                ${languages.length
                    ? html`
                          <section>
                              <h3>${t('student-profile-form.field-languages-view-mode')}</h3>
                              ${this._renderList(languages)}
                          </section>
                      `
                    : ''}
            </article>

            <dbp-job-profile-interest-form
                lang="${this.lang}"
                .auth="${this.auth}"
                entry-point-url="${this.entryPointUrl}"
                form-identifier="${profile.identifier}"
                .profile="${profile}"></dbp-job-profile-interest-form>
        `;
    }

    render() {
        const t = (key, opts) => this._i18n.t(key, opts);

        if (!this.isLoggedIn() && !this.isAuthPending()) {
            return html`
                <div class="notification is-warning">
                    ${t('error-login-message')}
                    <a href="#" @click="${(event) => this._onLoginClicked(event)}">
                        ${t('error-login-link')}
                    </a>
                </div>
            `;
        }

        return html`
            ${this._selectedProfile
                ? this._renderProfileDetail(this._selectedProfile)
                : this._renderOverview()}
        `;
    }

    _onLoginClicked(event) {
        this.sendSetPropertyEvent('requested-login-status', 'logged-in');
        event.preventDefault();
    }

    static get styles() {
        return css`
            ${commonStyles.getButtonCSS()}
            ${commonStyles.getNotificationCSS()}

            :host {
                display: block;
            }

            .activity-header {
                display: flex;
                gap: 1rem;
                justify-content: space-between;
                margin-bottom: 1.5rem;
            }

            .activity-header h2,
            .profile-detail h2 {
                margin-top: 0;
            }

            .profile-detail {
                border: var(--dbp-border);
                border-radius: var(--dbp-border-radius);
                padding: 1rem;
            }

            .profile-name {
                color: var(--dbp-muted);
                margin: 0 0 0.5rem 0;
            }

            .summary {
                line-height: 1.55;
            }

            .profile-meta {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 0.75rem 1rem;
                margin: 1rem 0;
            }

            .profile-meta dt {
                font-weight: 700;
            }

            .profile-meta dd {
                margin: 0;
            }

            .back-navigation {
                display: inline-block;
                margin-bottom: 1rem;
                padding-top: 1rem;
            }

            .back-navigation a {
                color: inherit;
                cursor: pointer;
                text-decoration: none;
            }

            .back-navigation dbp-icon {
                font-size: 0.8em;
                padding-right: 7px;
                padding-bottom: 2px;
            }

            .back-navigation:hover {
                color: var(--dbp-hover-color, var(--dbp-content));
                background-color: var(--dbp-hover-background-color);
            }

            .back-navigation:hover::before {
                background-color: var(--dbp-hover-color, var(--dbp-content));
            }

            @media (max-width: 720px) {
                .activity-header {
                    display: grid;
                }

                .profile-meta {
                    grid-template-columns: 1fr;
                }
            }
        `;
    }
}

commonUtils.defineCustomElement(
    'dbp-bulletin-browse-career-profiles',
    BrowseCareerProfilesActivity,
);
