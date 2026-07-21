import {css, html} from 'lit';
import {ScopedElementsMixin} from '@dbp-toolkit/common/src/scoped/ScopedElementsMixin.js';
import {Button, Icon, MiniSpinner, sendNotification, DBPLoginRequired} from '@dbp-toolkit/common';
import {Modal} from '@dbp-toolkit/common/src/modal.js';
import {Notification} from '@dbp-toolkit/notification';
import * as commonStyles from '@dbp-toolkit/common/src/styles.js';
import * as commonUtils from '@dbp-toolkit/common/utils';
import DBPBulletinLitElement from './dbp-bulletin-lit-element.js';
import JobProfileModule, {
    JobProfileEditFormElement,
    JobProfileInterestFormElement,
    getStudentProfileFieldLabels,
    getStudentProfileIndustryLabels,
    getLocalizedStudentStudyLabel,
    mergeLocalizedStudentStudies,
    normalizeStudentStudies,
} from './modules/studentProfileForm.js';
import {getWorkLocationLabels, normalizeWorkLocations} from './modules/workLocationsElement.js';

class CareerProfileActivity extends ScopedElementsMixin(DBPBulletinLitElement) {
    static get scopedElements() {
        return {
            'dbp-button': Button,
            'dbp-icon': Icon,
            'dbp-mini-spinner': MiniSpinner,
            'dbp-modal': Modal,
            'dbp-notification': Notification,
            'dbp-job-profile-edit-form': JobProfileEditFormElement,
            'dbp-job-profile-interest-form': JobProfileInterestFormElement,
            'dbp-login-required': DBPLoginRequired,
        };
    }

    constructor() {
        super();
        this._profiles = [];
        this._selectedProfile = null;
        this._submissions = [];
        this._loadingProfiles = false;
        this._loadingSubmissions = false;
        this._loadError = false;
        this._submissionsLoadError = false;
        this._editDialogProfile = null;
        this._deleteDialogProfile = null;
        this._isDeletingProfile = false;
        this._profilesLoaded = false;
        this._currentStudentStudies = [];
        this._currentStudentStudiesUserId = '';
        this._loadingCurrentStudentStudies = false;
        this._currentStudentStudiesPromise = null;
    }

    static get properties() {
        return {
            ...super.properties,
            _profiles: {state: true},
            _selectedProfile: {state: true},
            _submissions: {state: true},
            _loadingProfiles: {state: true},
            _loadingSubmissions: {state: true},
            _loadError: {state: true},
            _submissionsLoadError: {state: true},
            _editDialogProfile: {state: true},
            _deleteDialogProfile: {state: true},
            _isDeletingProfile: {state: true},
            _currentStudentStudies: {state: true},
            _loadingCurrentStudentStudies: {state: true},
        };
    }

    initialize() {
        this._fetchProfiles();
        this._fetchCurrentStudentStudies();
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
            // list in that case, otherwise the activity flashes a loading spinner periodically.
            if (!this._profilesLoaded || userChanged) {
                this._fetchProfiles();
            }
        }

        if (changedProperties.has('auth') || changedProperties.has('entryPointUrl')) {
            this._fetchCurrentStudentStudies();
        }
    }

    loginCallback() {
        if (!this._profilesLoaded && this.auth?.token) {
            this._fetchProfiles();
        }

        this._fetchCurrentStudentStudies();
    }

    async _fetchCurrentStudentStudies() {
        const userId = this.auth?.['user-id'];
        if (this._loadingCurrentStudentStudies) {
            return this._currentStudentStudiesPromise;
        }

        if (
            !userId ||
            !this.auth?.token ||
            !this.entryPointUrl ||
            this._currentStudentStudiesUserId === userId
        ) {
            return;
        }

        this._loadingCurrentStudentStudies = true;
        this._currentStudentStudiesPromise = (async () => {
            try {
                const url = `${this.entryPointUrl}/base/people/${encodeURIComponent(
                    userId,
                )}?includeLocal=${encodeURIComponent('studies')}`;
                const [germanResponse, englishResponse] = await Promise.all(
                    ['de', 'en'].map((language) =>
                        fetch(url, {
                            headers: {
                                'Content-Type': 'application/ld+json',
                                Authorization: `Bearer ${this.auth.token}`,
                                'Accept-Language': language,
                            },
                        }),
                    ),
                );
                if (!germanResponse.ok && !englishResponse.ok) {
                    return;
                }

                const [germanPerson, englishPerson] = await Promise.all([
                    germanResponse.ok ? germanResponse.json() : {},
                    englishResponse.ok ? englishResponse.json() : {},
                ]);
                this._currentStudentStudies = mergeLocalizedStudentStudies(
                    germanPerson?.localData ?? {},
                    englishPerson?.localData ?? {},
                );
                this._currentStudentStudiesUserId = userId;
            } catch (error) {
                console.error('Error loading student studies:', error);
            } finally {
                this._loadingCurrentStudentStudies = false;
                this._currentStudentStudiesPromise = null;
            }
        })();

        return this._currentStudentStudiesPromise;
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

        // Student profiles are stored as Formalize forms and grouped by their frontend key.
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
                return;
            }

            const data = await response.json();
            this._profiles = (data['hydra:member'] ?? []).map((form) => this._mapProfile(form));
            this._profilesLoaded = true;
            this._handleRoutingUrlChange();
        } catch (error) {
            console.error('Error loading student profiles:', error);
            this._loadError = true;
        } finally {
            this._loadingProfiles = false;
        }
    }

    _mapProfile(form) {
        const additionalData = form.additionalData ?? {};
        return {
            identifier: form.identifier,
            formId: form.identifier,
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

    _isOwnProfile(profile) {
        const data = profile?.additionalData ?? {};
        // Ownership is stored when the student creates the profile form.
        // The backend still needs to enforce the same rule for real access control.
        return Boolean(
            (data.studentCreatorId && data.studentCreatorId === this.auth?.['user-id']) ||
            (data.studentPersonIdentifier && data.studentPersonIdentifier === this.auth?.person_id),
        );
    }

    _getOwnProfiles() {
        return this._profiles.filter((profile) => this._isOwnProfile(profile));
    }

    _handleRoutingUrlChange() {
        const {pathSegments} = this.getRoutingData();
        // Supported routes are: /, profile/<id>, and profile/<id>/submissions.
        const profileId = pathSegments[0] === 'profile' ? pathSegments[1] : '';

        if (!profileId) {
            this._selectedProfile = null;
            this._submissions = [];
            return;
        }

        const profile = this._profiles.find((item) => item.identifier === profileId) ?? null;
        if (profile && !this._isOwnProfile(profile)) {
            this._selectedProfile = null;
            this._submissions = [];
            this._backToOverview();
            return;
        }

        this._selectedProfile = profile;

        if (profile && pathSegments[2] === 'submissions') {
            // Companies may inspect public profile details, but only the owning student can view interest submissions.
            if (!this._isOwnProfile(profile)) {
                this._submissions = [];
                this._backToOverview();
                return;
            }
            this._fetchSubmissions(profile.identifier);
        } else {
            this._submissions = [];
        }
    }

    async _fetchSubmissions(formIdentifier) {
        if (!formIdentifier || !this.auth?.token || !this.entryPointUrl) {
            return;
        }

        this._loadingSubmissions = true;
        this._submissionsLoadError = false;

        try {
            const response = await fetch(
                `${this.entryPointUrl}/formalize/submissions?formIdentifier=${encodeURIComponent(
                    formIdentifier,
                )}&perPage=9999`,
                {
                    headers: {
                        'Content-Type': 'application/ld+json',
                        Authorization: 'Bearer ' + this.auth.token,
                    },
                },
            );

            if (!response.ok) {
                this._submissionsLoadError = true;
                return;
            }

            const data = await response.json();
            // Formalize stores custom submission values as a JSON string in dataFeedElement.
            this._submissions = (data['hydra:member'] ?? []).map((submission) => ({
                identifier: submission.identifier,
                createdAt: submission.dateCreated ?? submission.createdAt ?? '',
                data: this._parseSubmissionData(submission),
            }));
        } catch (error) {
            console.error('Error loading student profile submissions:', error);
            this._submissionsLoadError = true;
        } finally {
            this._loadingSubmissions = false;
        }
    }

    _parseSubmissionData(submission) {
        try {
            return JSON.parse(submission.dataFeedElement || '{}');
        } catch {
            return {};
        }
    }

    _openProfile(profile) {
        this.sendSetPropertyEvent('routing-url', `profile/${profile.identifier}`, true);
    }

    _openSubmissions(profile) {
        if (!this._isOwnProfile(profile)) {
            return;
        }

        this.sendSetPropertyEvent('routing-url', `profile/${profile.identifier}/submissions`, true);
    }

    _backToOverview() {
        this.sendSetPropertyEvent('routing-url', '/', true);
    }

    async _openEditDialog(profile = null) {
        if (profile && !this._isOwnProfile(profile)) {
            return;
        }

        if (!profile && this._getOwnProfiles().length > 0) {
            sendNotification({
                summary: this._i18n.t('career-profile.one-profile-title'),
                body: this._i18n.t('career-profile.one-profile-body'),
                type: 'warning',
                timeout: 5,
            });
            return;
        }

        await this._fetchCurrentStudentStudies();
        this._editDialogProfile = profile;
        this.updateComplete.then(() => this._('#student-profile-edit-modal')?.open());
    }

    async _handleProfileSaved() {
        this._('#student-profile-edit-modal')?.close();
        await this._fetchProfiles();
    }

    _openDeleteDialog(profile) {
        if (!this._isOwnProfile(profile)) {
            return;
        }

        this._deleteDialogProfile = profile;
        this.updateComplete.then(() => this._('#student-profile-delete-modal')?.open());
    }

    async _deleteProfile() {
        const profile = this._deleteDialogProfile;
        if (!profile || !this._isOwnProfile(profile) || !this.entryPointUrl || !this.auth?.token) {
            return;
        }

        this._isDeletingProfile = true;

        try {
            // Deleting the Formalize form also removes the student profile represented by it.
            const response = await fetch(
                `${this.entryPointUrl}/formalize/forms/${profile.identifier}`,
                {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${this.auth.token}`,
                    },
                },
            );

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                throw new Error(
                    errorBody.description ||
                        errorBody['hydra:description'] ||
                        this._i18n.t('career-profile.delete-error'),
                );
            }

            sendNotification({
                summary: this._i18n.t('career-profile.delete-success-title'),
                body: this._i18n.t('career-profile.delete-success-body'),
                type: 'success',
                timeout: 5,
            });

            this._('#student-profile-delete-modal')?.close();
            this._deleteDialogProfile = null;
            this._selectedProfile = null;
            this._submissions = [];
            this.sendSetPropertyEvent('routing-url', '/', true);
            await this._fetchProfiles();
        } catch (error) {
            console.error('Error deleting student profile:', error);
            sendNotification({
                summary: this._i18n.t('career-profile.delete-error-title'),
                body: error.message || this._i18n.t('career-profile.delete-error'),
                type: 'danger',
                timeout: 0,
            });
        } finally {
            this._isDeletingProfile = false;
        }
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

    _getProfileStudies(profile) {
        const data = profile?.additionalData ?? {};
        const savedStudies = Array.isArray(data.studies) ? normalizeStudentStudies(data) : [];
        if (savedStudies.length > 0) {
            return savedStudies;
        }

        if (this._isOwnProfile(profile) && this._currentStudentStudies.length > 0) {
            return this._currentStudentStudies;
        }

        return normalizeStudentStudies(data);
    }

    _renderStudies(profile) {
        const studies = this._getProfileStudies(profile);
        if (studies.length === 0) {
            return '';
        }

        return this._renderList(
            studies.map((study) => getLocalizedStudentStudyLabel(study, this.lang)),
        );
    }

    _renderStudiesSection(profile) {
        const studies = this._getProfileStudies(profile);
        if (studies.length === 0 && !this._loadingCurrentStudentStudies) {
            return '';
        }

        return html`
            <section class="profile-studies">
                <h3>${this._i18n.t('student-profile-form.field-study-program')}</h3>
                ${
                    studies.length
                        ? this._renderStudies(profile)
                        : html`
                              <dbp-mini-spinner
                                  text="${this._i18n.t('loading-message')}"></dbp-mini-spinner>
                          `
                }
            </section>
        `;
    }

    _renderWorkLocations(profile) {
        const labels = getWorkLocationLabels(
            normalizeWorkLocations(profile?.additionalData?.workLocations),
            (key, opts) => this._i18n.t(key, opts),
            this.lang,
        );
        if (labels.length === 0) {
            return '';
        }

        return this._renderList(labels);
    }

    _renderProfileSelectSection(profile, labelKey, values, getLabels) {
        const labels = getLabels(values, (key, opts) => this._i18n.t(key, opts));
        if (labels.length === 0) {
            return '';
        }

        return html`
            <section>
                <h3>${this._i18n.t(labelKey)}</h3>
                ${this._renderList(labels)}
            </section>
        `;
    }
    _renderIndustriesSection(profile) {
        const data = profile.additionalData ?? {};
        if (data.openToAllIndustries) {
            return html`
                <section>
                    <h3>${this._i18n.t('student-profile-form.field-industries')}</h3>
                    <p>${this._i18n.t('student-profile-form.field-open-to-all-industries')}</p>
                </section>
            `;
        }

        return this._renderProfileSelectSection(
            profile,
            'student-profile-form.field-industries',
            data.industries,
            getStudentProfileIndustryLabels,
        );
    }

    _getLanguages(profile) {
        const items = this._localizedList(profile, 'languages', 'languagesEn');
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
    _getSkills(profile) {
        const items = this._localizedList(profile, 'skills', 'skillsEn');
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
    _getIndustries(profile) {
        const data = profile?.additionalData ?? {};

        if (data.openToAllIndustries) {
            return html`
                <p>${this._i18n.t('student-profile-form.field-open-to-all-industries')}</p>
            `;
        }

        const t = (key, opts) => this._i18n.t(key, opts);
        const items = getStudentProfileIndustryLabels(data.industries, t);

        if (!Array.isArray(items) || items.length === 0) {
            return '';
        }

        return html`
            <ul class="industry-list">
                ${items.map(
                    (item) => html`
                        <li class="tag">${item}</li>
                    `,
                )}
            </ul>
        `;
    }
    _getFields(profile) {
        const data = profile?.additionalData ?? {};

        const t = (key, opts) => this._i18n.t(key, opts);
        const items = getStudentProfileFieldLabels(data.fields, t);

        if (!Array.isArray(items) || items.length === 0) {
            return '';
        }

        return html`
            <ul class="field-list">
                ${items.map(
                    (item) => html`
                        <li class="tag">${item}</li>
                    `,
                )}
            </ul>
        `;
    }

    _renderWorkLocationList(labels) {
        if (!labels.length) {
            return '';
        }

        return html`
            <ul class="work-location-list">
                ${labels.map(
                    (label) => html`
                        <li class="work-location-list-item">${label}</li>
                    `,
                )}
            </ul>
        `;
    }

    _renderProfileCard(profile) {
        const isOwnProfile = this._isOwnProfile(profile);
        const data = profile.additionalData ?? {};
        const workLocationLabels = getWorkLocationLabels(
            normalizeWorkLocations(data.workLocations),
            (key, opts) => this._i18n.t(key, opts),
            this.lang,
        );
        const summary = this._localized(profile, 'summary', 'summaryEn');
        const personalInterests = this._localized(
            profile,
            'personalInterests',
            'personalInterestsEn',
        );
        const qualification = this._localized(
            profile,
            'furtherQualifications',
            'furtherQualificationsEn',
        );
        const previousExperience = this._localized(
            profile,
            'previousExperience',
            'previousExperienceEn',
        );

        return html`
            <div class="profile-card">
                <div class="profile-card-header">
                    <h2>${this._i18n.t('career-profile.own-profile-title')}</h2>
                    <div class="profile-card-actions">
                        <!-- ><button
                        class="button is-secondary"
                        type="button"
                        @click="${() => this._openProfile(profile)}">
                        <dbp-icon name="magnifier" aria-hidden="true"></dbp-icon>
                        ${this._i18n.t('career-profile.view-profile')}
                    </button>-->
                        ${
                            isOwnProfile
                                ? html`
                                      <button
                                          class="button is-secondary"
                                          type="button"
                                          @click="${() => this._openEditDialog(profile)}">
                                          <dbp-icon name="pencil" aria-hidden="true"></dbp-icon>
                                          ${this._i18n.t('career-profile.edit-profile')}
                                      </button>
                                      <button
                                          class="button is-secondary"
                                          type="button"
                                          @click="${() => this._openDeleteDialog(profile)}">
                                          <dbp-icon name="trash" aria-hidden="true"></dbp-icon>
                                          ${this._i18n.t('career-profile.delete-profile')}
                                      </button>
                                      <button
                                          class="button is-primary"
                                          type="button"
                                          @click="${() => this._openSubmissions(profile)}">
                                          <dbp-icon name="list" aria-hidden="true"></dbp-icon>
                                          ${this._i18n.t('career-profile.view-submissions')}
                                      </button>
                                  `
                                : ''
                        }
                    </div>
                </div>
                <div>
                    ${
                        isOwnProfile && data.contactEmail
                            ? html`
                                  <div class="contact-email">
                                      <dl class="contact-wrapper">
                                          <dt>
                                              ${this._i18n.t('student-profile-form.field-contact-email')}:
                                          </dt>
                                          <dd class="contact-value">${data.contactEmail}</dd>
                                      </dl>
                                      <span class="additional-note" aria-describedby="email-note">
                                          ${this._i18n.t('student-profile-form.field-contact-email-note')}
                                      </span>
                                  </div>
                              `
                            : ''
                    }
                </div>

                <div class="student-profile-wrapper">
                    ${
                        data.teaser
                            ? html`
                                  <p class="student-teaser">${data.teaser}</p>
                              `
                            : ''
                    }
                    <p>${summary}</p>

                    <dl>
                        <dt>${this._i18n.t('student-profile-form.field-availability')}:</dt>
                        <dd>${data.availability}</dd>

                        <dt>${this._i18n.t('student-profile-form.field-website')}:</dt>
                        <dd>
                            <a href="${data.website}" target="_blank" rel="noopener noreferrer">
                                ${data.website}
                            </a>
                        </dd>

                        <dt>
                            ${this._i18n.t('student-profile-form.field-preferred-work-location')}:
                        </dt>
                        <dd>
                            ${this._renderWorkLocationList(
                                workLocationLabels.map((label) =>
                                    label.split(', ').slice(0, 2).join(', '),
                                ),
                            )}
                        </dd>

                        <dt>${this._i18n.t('student-profile-form.field-preferred-industries')}:</dt>
                        <dd>${this._getIndustries(profile)}</dd>

                        <dt>${this._i18n.t('student-profile-form.field-fields')}:</dt>
                        <dd>${this._getFields(profile)}</dd>

                        <dt>${this._i18n.t('student-profile-form.field-previous-experience')}:</dt>
                        <dd>${previousExperience}</dd>

                        <dt>${this._i18n.t('student-profile-form.field-qualification')}:</dt>
                        <dd>${qualification}</dd>

                        <dt>${this._i18n.t('student-profile-form.field-personal-interests')}:</dt>
                        <dd>${personalInterests}</dd>

                        <dt>${this._i18n.t('student-profile-form.field-skills')}:</dt>
                        <dd>${this._getSkills(profile)}</dd>

                        <dt>${this._i18n.t('student-profile-form.field-languages-view-mode')}:</dt>
                        <dd>${this._getLanguages(profile)}</dd>
                    </dl>
                </div>
            </div>
        `;
    }

    _renderOverview() {
        const t = (key, opts) => this._i18n.t(key, opts);
        const ownProfiles = this._getOwnProfiles();

        return html`
            <section class="activity-header">
                <div>
                    <p>${t('career-profile.description')}</p>
                </div>
                <button
                    class="button is-primary"
                    type="button"
                    ?disabled="${ownProfiles.length > 0}"
                    @click="${() => this._openEditDialog()}">
                    <dbp-icon name="plus" aria-hidden="true"></dbp-icon>
                    ${t('career-profile.create-profile')}
                </button>
            </section>

            ${
                ownProfiles.length > 0
                    ? html`
                          <p class="hint">${t('career-profile.one-profile-hint')}</p>
                      `
                    : ''
            }
            ${
                this._loadError
                    ? html`
                          <p class="notification is-danger">${t('career-profile.load-error')}</p>
                      `
                    : ''
            }
            ${
                this._loadingProfiles
                    ? html`
                          <dbp-mini-spinner text="${t('loading-message')}"></dbp-mini-spinner>
                      `
                    : ''
            }

            <div class="profile-list">
                ${
                    ownProfiles.length === 0 && !this._loadingProfiles
                        ? html`
                              <p>${t('career-profile.no-profiles')}</p>
                          `
                        : ownProfiles.map((profile) => this._renderProfileCard(profile))
                }
            </div>
        `;
    }

    _renderProfileDetail(profile) {
        const t = (key, opts) => this._i18n.t(key, opts);
        const data = profile.additionalData ?? {};
        const isOwnProfile = this._isOwnProfile(profile);
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
                <a @click="${this._backToOverview}" title="${t('career-profile.back-to-profiles')}">
                    <dbp-icon name="chevron-left"></dbp-icon>
                    ${t('career-profile.back-to-profiles')}
                </a>
            </span>

            <article class="profile-detail">
                <header>
                    <h2>${t('career-profile.own-profile-title')}</h2>
                </header>

                ${
                    data.teaser
                        ? html`
                              <p class="profile-teaser">${data.teaser}</p>
                          `
                        : ''
                }

                <p class="summary">${this._localized(profile, 'summary', 'summaryEn')}</p>

                ${this._renderStudiesSection(profile)} ${this._renderIndustriesSection(profile)}
                ${this._renderProfileSelectSection(
                    profile,
                    'student-profile-form.field-fields',
                    data.fields,
                    getStudentProfileFieldLabels,
                )}
                ${
                    normalizeWorkLocations(data.workLocations).length
                        ? html`
                              <section>
                                  <h3>${t('student-profile-form.field-locations')}</h3>
                                  ${this._renderWorkLocations(profile)}
                              </section>
                          `
                        : ''
                }

                <dl class="profile-meta">
                    ${this._renderMetaItem(
                        t('student-profile-form.field-availability'),
                        data.availability,
                    )}
                    ${
                        data.website || data.linkUrl
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
                            : ''
                    }
                </dl>

                ${
                    previousExperience
                        ? html`
                              <section>
                                  <h3>${t('student-profile-form.field-previous-experience')}</h3>
                                  <p>${previousExperience}</p>
                              </section>
                          `
                        : ''
                }
                ${
                    skills.length
                        ? html`
                              <section>
                                  <h3>${t('student-profile-form.field-skills')}</h3>
                                  ${this._renderList(skills)}
                              </section>
                          `
                        : ''
                }
                ${
                    furtherQualifications
                        ? html`
                              <section>
                                  <h3>
                                      ${t('student-profile-form.field-qualification-view-mode')}
                                  </h3>
                                  <p class="multiline-text">${furtherQualifications}</p>
                              </section>
                          `
                        : ''
                }
                ${
                    personalInterests
                        ? html`
                              <section>
                                  <h3>${t('student-profile-form.field-personal-interests')}</h3>
                                  <p>${personalInterests}</p>
                              </section>
                          `
                        : ''
                }
                ${
                    languages.length
                        ? html`
                              <section>
                                  <h3>${t('student-profile-form.field-languages')}</h3>
                                  ${this._renderList(languages)}
                              </section>
                          `
                        : ''
                }
            </article>

            ${
                isOwnProfile
                    ? html`
                          <div class="owner-actions">
                              <button
                                  class="button is-secondary"
                                  type="button"
                                  @click="${() => this._openEditDialog(profile)}">
                                  ${t('career-profile.edit-profile')}
                              </button>
                              <button
                                  class="button is-secondary"
                                  type="button"
                                  @click="${() => this._openDeleteDialog(profile)}">
                                  ${t('career-profile.delete-profile')}
                              </button>
                              <button
                                  class="button is-primary"
                                  type="button"
                                  @click="${() => this._openSubmissions(profile)}">
                                  ${t('career-profile.view-submissions')}
                              </button>
                          </div>
                      `
                    : html`
                          <dbp-job-profile-interest-form
                              lang="${this.lang}"
                              .auth="${this.auth}"
                              entry-point-url="${this.entryPointUrl}"
                              form-identifier="${profile.identifier}"
                              .profile="${profile}"></dbp-job-profile-interest-form>
                      `
            }
        `;
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

    _renderSubmissions(profile) {
        const t = (key, opts) => this._i18n.t(key, opts);

        return html`
            <span class="back-navigation">
                <a
                    @click="${() => this._openProfile(profile)}"
                    title="${t('career-profile.back-to-profile')}">
                    <dbp-icon name="chevron-left"></dbp-icon>
                    ${t('career-profile.back-to-profile')}
                </a>
            </span>

            <section class="submissions-view">
                <h2>${t('career-profile.submissions-title')}</h2>
                <p>${this._localized(profile, 'headline', 'headlineEn') || profile.formName}</p>

                ${
                    this._loadingSubmissions
                        ? html`
                              <dbp-mini-spinner text="${t('loading-message')}"></dbp-mini-spinner>
                          `
                        : ''
                }
                ${
                    this._submissionsLoadError
                        ? html`
                              <p class="notification is-danger">
                                  ${t('career-profile.submissions-load-error')}
                              </p>
                          `
                        : ''
                }
                ${
                    !this._loadingSubmissions && this._submissions.length === 0
                        ? html`
                              <p>${t('career-profile.no-submissions')}</p>
                          `
                        : ''
                }

                <div class="submission-list">
                    ${this._submissions.map((submission) => this._renderSubmission(submission))}
                </div>
            </section>
        `;
    }

    _renderSubmission(submission) {
        const t = (key, opts) => this._i18n.t(key, opts);
        const data = submission.data ?? {};

        return html`
            <article class="submission-card">
                <h3>${data.companyName || t('career-profile.unknown-company')}</h3>
                <dl class="profile-meta">
                    ${this._renderMetaItem(
                        t('student-profile-form.interest-contact-name'),
                        data.contactName,
                    )}
                    ${this._renderMetaItem(
                        t('student-profile-form.interest-contact-email'),
                        data.contactEmail,
                    )}
                </dl>
                ${
                    data.message
                        ? html`
                              <section>
                                  <h4>${t('student-profile-form.interest-message')}</h4>
                                  <p>${data.message}</p>
                              </section>
                          `
                        : ''
                }
            </article>
        `;
    }

    _renderEditModal() {
        const t = (key, opts) => this._i18n.t(key, opts);
        const title = this._editDialogProfile
            ? t('career-profile.edit-profile')
            : t('career-profile.create-profile');

        return html`
            <dbp-modal
                id="student-profile-edit-modal"
                modal-id="student-profile-edit-modal"
                subscribe="lang">
                <div slot="title">
                    <h2 class="modal-title">${title}</h2>
                </div>
                <div slot="content">
                    <dbp-notification
                        id="student-profile-form-notification"
                        lang="${this.lang}"></dbp-notification>
                    <dbp-job-profile-edit-form
                        lang="${this.lang}"
                        lang-dir="${this.langDir}"
                        .auth="${this.auth}"
                        entry-point-url="${this.entryPointUrl}"
                        .existingForm="${this._editDialogProfile}"
                        .currentStudentStudies="${this._currentStudentStudies}"
                        @dbp-edit-form-saved="${
                            this._handleProfileSaved
                        }"></dbp-job-profile-edit-form>
                </div>
            </dbp-modal>
        `;
    }

    _renderDeleteModal() {
        const t = (key, opts) => this._i18n.t(key, opts);
        const profileName =
            this._deleteDialogProfile?.additionalData?.visibleName ||
            this._deleteDialogProfile?.formName ||
            '';

        return html`
            <dbp-modal
                id="student-profile-delete-modal"
                modal-id="student-profile-delete-modal"
                subscribe="lang">
                <div slot="title">
                    <h2 class="modal-title">${t('career-profile.delete-dialog-title')}</h2>
                </div>
                <div slot="content" class="delete-dialog-content">
                    <p>${t('career-profile.delete-dialog-message', {name: profileName})}</p>
                    <div class="delete-dialog-actions">
                        <button
                            class="button is-secondary"
                            type="button"
                            ?disabled="${this._isDeletingProfile}"
                            @click="${() => this._('#student-profile-delete-modal')?.close()}">
                            ${t('career-profile.delete-dialog-cancel')}
                        </button>
                        <button
                            class="button is-primary"
                            type="button"
                            ?disabled="${this._isDeletingProfile}"
                            @click="${() => this._deleteProfile()}">
                            ${
                                this._isDeletingProfile
                                    ? html`
                                          <dbp-mini-spinner></dbp-mini-spinner>
                                      `
                                    : html`
                                          <dbp-icon name="trash" aria-hidden="true"></dbp-icon>
                                      `
                            }
                            ${t('career-profile.delete-dialog-confirm')}
                        </button>
                    </div>
                </div>
            </dbp-modal>
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

        const {pathSegments} = this.getRoutingData();
        const isSubmissionsRoute =
            pathSegments[0] === 'profile' && pathSegments[2] === 'submissions';

        return html`
            ${
                this._selectedProfile
                    ? isSubmissionsRoute
                        ? this._renderSubmissions(this._selectedProfile)
                        : this._renderProfileDetail(this._selectedProfile)
                    : this._renderOverview()
            }
            ${this._renderEditModal()} ${this._renderDeleteModal()}
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

            h2 {
                margin: 0;
                font-size: 1.25rem;
            }

            .profile-card-header {
                display: flex;
                justify-content: space-between;
                width: 100%;
            }

            .profile-card {
                gap: 0;
                margin-top: 1rem;
            }

            .owner-actions {
                display: flex;
                gap: 1rem;
            }

            .profile-card-actions {
                margin-left: auto;
            }
            .profile-card {
                display: flex;
                flex-direction: column;
                align-items: flex-start;
                justify-content: space-between;
            }

            .contact-email {
                margin-top: 1rem;
            }
            dl {
                display: flex;
                flex-direction: column;
                margin: 0;
            }
            dt {
                font-weight: bold;
                margin: 0;
            }

            dd {
                margin-left: 2px;
                margin-bottom: 1.5rem;
            }

            .contact-wrapper {
                display: flex;
                flex-direction: row;
            }

            .contact-value {
                margin: 0;
                margin-left: 3px;
            }

            .additional-note {
                font-size: 14px;
                color: var(--dbp-override-muted);
            }

            .student-teaser {
                font-weight: bold;
                font-size: 1.25rem;
                width: max-content;
            }

            .industry-list,
            .field-list,
            .work-location-list {
                list-style: none;
                padding: 0;
            }

            .tag,
            .work-location-list-item {
                display: inline-block;
                border: 1px solid var(--dbp-content);
                border-radius: 2px;
                padding: 0.1rem 0.4rem;
                font-size: 1rem;
                color: var(--dbp-content);
            }

            .activity-header {
                margin-bottom: 1.5rem;
            }

            .modal-title {
                font-weight: 300;
                margin: 0;
            }

            .activity-header h2,
            .profile-detail h2 {
                margin-top: 0;
            }

            fieldset {
                padding: 0.75rem;
                display: grid;
                gap: 0.5em;
                border: 1px solid var(--dbp-content);
                padding-bottom: 1rem;
                margin-top: 1.5rem;
            }

            legend {
                font-weight: 400;
                font-size: 1.17em;
                padding: 0 5px;
            }

            .profile-list,
            .submission-list {
                display: grid;
                gap: 1rem;
            }

            .profile-detail,
            .submission-card {
                border: var(--dbp-border);
                border-radius: var(--dbp-border-radius);
                padding: 1rem;
            }

            .profile-card h3,
            .submission-card h3 {
                margin: 0 0 0.35rem 0;
            }

            .profile-card-actions,
            .owner-actions {
                flex-wrap: wrap;
                justify-content: flex-end;
            }

            .profile-name,
            .hint {
                color: var(--dbp-muted);
                margin: 0 0 0.5rem 0;
            }

            .summary {
                line-height: 1.55;
            }

            .multiline-text {
                white-space: pre-line;
            }

            .profile-teaser {
                font-size: 1.25rem;
                font-weight: 700;
                line-height: 1.5;
                margin: 0 0 1rem 0;
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

            .owner-actions {
                margin-top: 1rem;
            }

            .delete-dialog-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 1rem;
                justify-content: flex-end;
                margin-top: 1.5rem;
            }

            .button {
                gap: 0.35rem;
            }

            @media (max-width: 720px) {
                .activity-header,
                .profile-card {
                    display: grid;
                }

                .profile-card-actions,
                .owner-actions {
                    justify-content: flex-start;
                }

                .profile-meta {
                    grid-template-columns: 1fr;
                }
            }
        `;
    }
}

commonUtils.defineCustomElement('dbp-bulletin-career-profile', CareerProfileActivity);
