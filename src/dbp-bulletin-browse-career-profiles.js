import {css, html} from 'lit';
import {ScopedElementsMixin} from '@dbp-toolkit/common/src/scoped/ScopedElementsMixin.js';
import {
    Button,
    DBPSelect,
    Icon,
    IconButton,
    MiniSpinner,
    sendNotification,
    DBPLoginRequired,
} from '@dbp-toolkit/common';
import * as commonStyles from '@dbp-toolkit/common/src/styles.js';
import * as commonUtils from '@dbp-toolkit/common/utils';
import DBPBulletinLitElement from './dbp-bulletin-lit-element.js';
import CareerProfileModule, {
    formatStudentStudies,
    getLocalizedStudentStudyLabel,
    getCareerProfileFieldLabels,
    getCareerProfileIndustryLabels,
    CareerProfileInterestFormElement,
    normalizeStudentStudies,
    normalizeCareerProfileSelectValues,
} from './modules/careerProfileForm.js';
import {
    getLocationHierarchy,
    getLocationKey,
    getWorkLocationLabels,
    normalizeWorkLocations,
    WorkLocationSelectElement,
} from './modules/workLocationsElement.js';
import {CustomTabulatorTable} from '../vendor/formalize/src/table-components.js';

class BrowseCareerProfilesActivity extends ScopedElementsMixin(DBPBulletinLitElement) {
    static get scopedElements() {
        return {
            'dbp-button': Button,
            'dbp-select': DBPSelect,
            'dbp-icon': Icon,
            'dbp-icon-button': IconButton,
            'dbp-mini-spinner': MiniSpinner,
            'dbp-tabulator-table': CustomTabulatorTable,
            'dbp-career-profile-interest-form': CareerProfileInterestFormElement,
            'dbp-work-location-select-element': WorkLocationSelectElement,
            'dbp-login-required': DBPLoginRequired,
        };
    }

    constructor() {
        super();
        this.searchQuery = '';
        this.filterIndustry = '';
        this.filterField = '';
        this.filterWorkLocation = '';
        this._profiles = [];
        this._selectedProfile = null;
        this._loadingProfiles = false;
        this._loadError = false;
        this._profilesLoaded = false;
    }

    static get properties() {
        return {
            ...super.properties,
            searchQuery: {type: String, state: true},
            filterIndustry: {type: String, state: true},
            filterField: {type: String, state: true},
            filterWorkLocation: {type: String, state: true},
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
            changedProperties.has('searchQuery') ||
            changedProperties.has('filterIndustry') ||
            changedProperties.has('filterField') ||
            changedProperties.has('filterWorkLocation') ||
            changedProperties.has('_selectedProfile')
        ) {
            this._syncProfileTable(changedProperties);
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

        // Career profiles are Formalize forms identified by the career-profile frontend key.
        const frontendKey = new CareerProfileModule().getFormFrontendKey();
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
            console.error('Error loading career profiles for company browsing:', error);
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
            <ul class="studyProgram-list">
                ${items.map(
                    (item) => html`
                        <li class="tag">${item}</li>
                    `,
                )}
            </ul>
        `;
    }

    _renderBulletpointList(items) {
        if (!Array.isArray(items) || items.length === 0) {
            return '';
        }

        return html`
            <ul class="bulletpoints-list">
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

        return this._renderList(
            studies.map(
                (study) => html`
                    ${getLocalizedStudentStudyLabel(study, this.lang)}
                `,
            ),
        );
    }

    _renderStudiesSection(profile) {
        const studies = normalizeStudentStudies(profile?.additionalData ?? {});
        if (studies.length === 0) {
            return '';
        }

        return html`
            <dt>${this._i18n.t('career-profile-form.field-study-program')}</dt>
            <dd class="studyProgram-list">${this._renderStudies(profile)}</dd>
        `;
    }

    _getWorkLocationLabels(profile) {
        return getWorkLocationLabels(
            normalizeWorkLocations(profile?.additionalData?.workLocations),
            (key, opts) => this._i18n.t(key, opts),
            this.lang,
        );
    }

    _getIndustryLabels(profile) {
        const data = profile?.additionalData ?? {};
        return getCareerProfileIndustryLabels(data.industries, (key, opts) =>
            this._i18n.t(key, opts),
        );
    }

    _getFieldLabels(profile) {
        return getCareerProfileFieldLabels(profile?.additionalData?.fields, (key, opts) =>
            this._i18n.t(key, opts),
        );
    }

    _formatDate(value) {
        if (!value) {
            return '';
        }

        const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
        if (!dateOnlyMatch) {
            return value;
        }

        const [, year, month, day] = dateOnlyMatch;
        return `${day}.${month}.${year}`;
    }

    _getFilteredProfiles({
        includeIndustry = true,
        includeField = true,
        includeWorkLocation = true,
    } = {}) {
        const query = this.searchQuery.toLowerCase().trim();

        return this._profiles.filter((profile) => {
            const data = profile.additionalData ?? {};
            const studies = formatStudentStudies(data, this.lang, true);
            const workLocationLabels = this._getWorkLocationLabels(profile);
            const industries = normalizeCareerProfileSelectValues(data.industries);
            const industryLabels = this._getIndustryLabels(profile);
            const fields = normalizeCareerProfileSelectValues(data.fields);
            const fieldLabels = this._getFieldLabels(profile);
            const localizedTextValues = [
                data.availability,
                data.teaser,
                this._localized(profile, 'summary', 'summaryEn'),
                this._localized(profile, 'previousExperience', 'previousExperienceEn'),
                ...this._localizedList(profile, 'skills', 'skillsEn'),
            ];

            const matchesSearch =
                !query ||
                [
                    this._getProfileAlias(profile),
                    studies,
                    ...workLocationLabels,
                    ...industryLabels,
                    ...fieldLabels,
                    ...localizedTextValues,
                ]
                    .filter(Boolean)
                    .some((value) => String(value).toLowerCase().includes(query));
            const matchesIndustry =
                !includeIndustry ||
                !this.filterIndustry ||
                data.openToAllIndustries ||
                industries.includes(this.filterIndustry);
            const matchesField =
                !includeField || !this.filterField || fields.includes(this.filterField);
            const matchesWorkLocation =
                !includeWorkLocation ||
                !this.filterWorkLocation ||
                normalizeWorkLocations(data.workLocations).some((location) =>
                    getLocationHierarchy(location).some(
                        (ancestor) => getLocationKey(ancestor) === this.filterWorkLocation,
                    ),
                );

            return matchesSearch && matchesIndustry && matchesField && matchesWorkLocation;
        });
    }

    _getAvailableIndustries() {
        return [
            ...new Set(
                this._getFilteredProfiles({includeIndustry: false}).flatMap((profile) =>
                    normalizeCareerProfileSelectValues(profile.additionalData?.industries),
                ),
            ),
        ];
    }

    _getAvailableFields() {
        return [
            ...new Set(
                this._getFilteredProfiles({includeField: false}).flatMap((profile) =>
                    normalizeCareerProfileSelectValues(profile.additionalData?.fields),
                ),
            ),
        ];
    }

    _getAvailableWorkLocations() {
        return normalizeWorkLocations(
            this._getFilteredProfiles({includeWorkLocation: false}).flatMap((profile) =>
                normalizeWorkLocations(profile.additionalData?.workLocations).flatMap((location) =>
                    getLocationHierarchy(location),
                ),
            ),
        );
    }

    _clearUnavailableFilters() {
        if (this.filterIndustry && !this._getAvailableIndustries().includes(this.filterIndustry)) {
            this.filterIndustry = '';
        }

        if (this.filterField && !this._getAvailableFields().includes(this.filterField)) {
            this.filterField = '';
        }
    }

    _renderProfileSelectSection(profile, labelKey, values, getLabels) {
        const labels = getLabels(values, (key, opts) => this._i18n.t(key, opts));
        if (labels.length === 0) {
            return '';
        }

        return html`
            <dt>${this._i18n.t(labelKey)}</dt>
            <dd>${this._renderList(labels)}</dd>
        `;
    }

    _getTableData() {
        return this._getFilteredProfiles().map((profile) => {
            const data = profile.additionalData ?? {};
            const skills = this._localizedList(profile, 'skills', 'skillsEn');
            return {
                alias: this._getProfileAlias(profile),
                studyProgram: formatStudentStudies(data, this.lang, true),
                workLocations: this._getWorkLocationLabels(profile).join(', '),
                availableFrom: data.availability ?? '',
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
                    title: t('career-profile-form.field-locations'),
                    field: 'workLocations',
                    sorter: 'string',
                    minWidth: 220,
                },
                {
                    title: t('career-profile-form.field-availability'),
                    field: 'availableFrom',
                    sorter: 'string',
                    formatter: (cell) => this._formatDate(cell.getValue()),
                    minWidth: 160,
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
                    frozen: true,
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

    async _syncProfileTable(changedProperties = new Map()) {
        const table = this.renderRoot?.querySelector('#career-profiles-table');
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
        if (changedProperties.has('lang')) {
            table.tabulatorTable.setColumns(options.columns);
        }
        table.tabulatorTable.replaceData(options.data);
    }

    _getSelectOptions(values, getLabels) {
        const t = (key, opts) => this._i18n.t(key, opts);
        return [
            {
                value: '',
                label: t('browse-career-profiles.select-placeholder'),
            },
            ...values
                .map((value) => ({
                    value,
                    label: getLabels(value, t)[0] ?? value,
                }))
                .sort((a, b) => a.label.localeCompare(b.label, this.lang)),
        ];
    }

    onSearchInput(event) {
        this.searchQuery = event.target.value;
        this._clearUnavailableFilters();
    }

    onIndustryChange(event) {
        this.filterIndustry = event.detail?.value ?? event.target.value;
        this._clearUnavailableFilters();
    }

    onFieldChange(event) {
        this.filterField = event.detail?.value ?? event.target.value;
        this._clearUnavailableFilters();
    }

    onWorkLocationChange(event) {
        this.filterWorkLocation = event.detail?.value ?? '';
        this._clearUnavailableFilters();
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
        const fieldOptions = this._getSelectOptions(
            this._getAvailableFields(),
            getCareerProfileFieldLabels,
        );
        const selectedFieldLabel =
            fieldOptions.find((option) => option.value === this.filterField)?.label ??
            t('browse-career-profiles.select-placeholder');

        return html`
            <section class="activity-header">
                <div>
                    <h2>${t('browse-career-profiles.title')}</h2>
                    <p>${t('browse-career-profiles.description')}</p>
                </div>
                ${
                    this._loadingProfiles
                        ? html`
                              <dbp-mini-spinner text="${t('loading-message')}"></dbp-mini-spinner>
                          `
                        : ''
                }
            </section>

            <div class="profile-filter-row">
                <div class="field search-field">
                    <span class="label search-label-spacer" aria-hidden="true">&nbsp;</span>
                    <div class="control search-control">
                        <input
                            type="text"
                            class="input"
                            placeholder="${t('browse-career-profiles.search-placeholder')}"
                            .value="${this.searchQuery}"
                            @input="${this.onSearchInput}"
                            aria-label="${t('browse-career-profiles.search-placeholder')}" />
                        <span class="search-icon" aria-hidden="true">
                            <dbp-icon name="search"></dbp-icon>
                        </span>
                    </div>
                </div>

                <div class="field">
                    <label class="label" for="filter-profile-field">
                        ${t('career-profile-form.field-fields')}
                    </label>
                    <div class="control">
                        <dbp-select
                            id="filter-profile-field"
                            class="filter-select"
                            allow-expand
                            align="left"
                            label="${selectedFieldLabel}"
                            .options="${fieldOptions}"
                            .value="${this.filterField}"
                            @change="${this.onFieldChange}"></dbp-select>
                    </div>
                </div>

                <div class="field">
                    <label class="label" for="filter-profile-work-location">
                        ${t('career-profile-form.field-locations')}
                    </label>
                    <div class="control">
                        <dbp-work-location-select-element
                            id="filter-profile-work-location"
                            lang="${this.lang}"
                            lang-dir="${this.langDir}"
                            placeholder="${t('browse-career-profiles.select-placeholder')}"
                            .locations="${this._getAvailableWorkLocations()}"
                            .value="${this.filterWorkLocation}"
                            @change="${this.onWorkLocationChange}"></dbp-work-location-select-element>
                    </div>
                </div>
            </div>

            <dbp-tabulator-table
                lang="${this.lang}"
                id="career-profiles-table"
                identifier="career-profiles-table"
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
        const furtherQualifications = this._localized(
            profile,
            'furtherQualifications',
            'furtherQualificationsEn',
        );
        const personalInterests = this._localized(
            profile,
            'personalInterests',
            'personalInterestsEn',
        );

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
                    <h2 class="profile-title">${this._getProfileAlias(profile)}</h2>
                </header>

                ${
                    data.teaser
                        ? html`
                              <p class="profile-teaser">${data.teaser}</p>
                          `
                        : ''
                }

                <p class="summary">${this._localized(profile, 'summary', 'summaryEn')}</p>
                <dl class="profile-meta-data">
                    ${this._renderStudiesSection(profile)}
                    ${this._renderMetaItem(
                        t('career-profile-form.field-availability'),
                        data.availability,
                    )}
                    ${
                        normalizeWorkLocations(data.workLocations).length
                            ? html`
                                  <dt>${t('career-profile-form.field-preferred-work-location')}</dt>
                                  <dd>${this._renderList(this._getWorkLocationLabels(profile))}</dd>
                              `
                            : ''
                    }
                    ${this._renderProfileSelectSection(
                        profile,
                        'career-profile-form.field-fields',
                        data.fields,
                        getCareerProfileFieldLabels,
                    )}
                    ${
                        previousExperience
                            ? html`
                                  <dt>${t('career-profile-form.field-previous-experience')}</dt>
                                  <dd>${previousExperience}</dd>
                              `
                            : ''
                    }
                    ${
                        furtherQualifications
                            ? html`
                                  <dt>${t('career-profile-form.field-qualification-view-mode')}</dt>
                                  <dd class="multiline-text">${furtherQualifications}</dd>
                              `
                            : ''
                    }
                    ${
                        skills.length
                            ? html`
                                  <dt>${t('career-profile-form.field-skills-view-mode')}</dt>
                                  <dd>${this._renderBulletpointList(skills)}</dd>
                              `
                            : ''
                    }
                    ${
                        personalInterests
                            ? html`
                                  <dt>${t('career-profile-form.field-personal-interests')}</dt>
                                  <dd>${personalInterests}</dd>
                              `
                            : ''
                    }
                    ${
                        languages.length
                            ? html`
                                  <dt>${t('career-profile-form.field-languages-view-mode')}</dt>
                                  <dd>${this._renderBulletpointList(languages)}</dd>
                              `
                            : ''
                    }
                    ${
                        data.website || data.linkUrl
                            ? this._renderMetaItem(
                                  t('career-profile-form.field-website'),
                                  html`
                                      <a
                                          class="web-link"
                                          href="${data.website || data.linkUrl}"
                                          target="_blank"
                                          rel="noopener noreferrer">
                                          ${data.website || data.linkUrl}
                                      </a>
                                  `,
                              )
                            : ''
                    }
                </dl>
            </article>

            <dbp-career-profile-interest-form
                lang="${this.lang}"
                .auth="${this.auth}"
                entry-point-url="${this.entryPointUrl}"
                form-identifier="${profile.identifier}"
                .profile="${profile}"></dbp-career-profile-interest-form>
        `;
    }

    render() {
        if (!this.isLoggedIn() && !this.isAuthPending()) {
            return html`
                <dbp-login-required
                    subscribe="auth,lang"
                    @dbp-login-requested=${this._onLoginClicked}></dbp-login-required>
            `;
        }

        return html`
            ${
                this._selectedProfile
                    ? this._renderProfileDetail(this._selectedProfile)
                    : this._renderOverview()
            }
        `;
    }

    _onLoginClicked(event) {
        this.sendSetPropertyEvent('requested-login-status', 'logged-in');
        event.preventDefault();
    }

    static get styles() {
        return css`
            ${commonStyles.getGeneralCSS()}
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

            .profile-title {
                margin: 0px;
                font-size: 1.25rem;
                font-weight: 700;
            }
            .profile-detail {
                border: var(--dbp-border);
                border-radius: var(--dbp-border-radius);
                padding: 1rem;
            }

            .profile-detail li {
                line-height: 1.55;
                margin: 0;
            }

            .profile-detail section h3 {
                margin-bottom: 0.25rem;
            }

            .profile-name {
                color: var(--dbp-muted);
                margin: 0 0 0.5rem 0;
            }

            .activity-header p {
                line-height: 1.55;
            }

            .multiline-text {
                white-space: pre-line;
            }

            .profile-filter-row {
                --filter-control-height: 2.1rem;
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 1rem;
                margin-bottom: 1.5rem;
            }

            .profile-filter-row .field {
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

            .profile-filter-row dbp-work-location-select-element {
                --work-location-select-height: var(--filter-control-height);
            }

            .search-label-spacer {
                display: block;
            }

            .label {
                font-weight: bolder;
            }

            .profile-teaser {
                font-size: 1.25rem;
                font-weight: bolder;
                line-height: 1.5;
                margin: 0.5rem 0;
            }

            .profile-meta {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 0.75rem 1rem;
                margin: 1rem 0;
            }

            .profile-meta-data {
                margin-top: 0.5rem;
            }

            .profile-meta dt,
            .profile-meta-data dt {
                font-weight: bolder;
                margin-top: 0.5rem;
            }

            .profile-meta dd {
                margin: 0;
            }

            .studyProgram-list {
                list-style: none;
                padding: 0;
                display: flex;
                gap: 5px;
                flex-wrap: wrap;
            }

            .bulletpoints-list {
                padding-left: 20px;
            }

            .tag {
                display: inline-block;
                border: 1px solid var(--dbp-content);
                border-radius: 2px;
                padding: 0 0.4rem;
                font-size: 1rem;
                color: var(--dbp-content);
            }

            .web-link {
                text-decoration: underline;
                color: var(--dbp-override-primary);
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

                .profile-filter-row {
                    grid-template-columns: 1fr;
                }

                .search-label-spacer {
                    display: none;
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
