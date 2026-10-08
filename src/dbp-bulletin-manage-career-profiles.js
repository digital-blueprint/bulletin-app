import {css, html} from 'lit';
import {ScopedElementsMixin} from '@dbp-toolkit/common/src/scoped/ScopedElementsMixin.js';
import {
    DBPSelect,
    Icon,
    IconButton,
    MiniSpinner,
    DBPLoginRequiredWarning,
    sendNotification,
} from '@dbp-toolkit/common';
import {Modal} from '@dbp-toolkit/common/src/modal.js';
import * as commonStyles from '@dbp-toolkit/common/src/styles.js';
import * as commonUtils from '@dbp-toolkit/common/utils';
import {setOverridesByGlobalCache} from '@dbp-toolkit/common/i18next.js';
import DBPBulletinLitElement from './dbp-bulletin-lit-element.js';
import CareerProfileModule, {
    formatStudentStudies,
    getCareerProfileVisibilityLabel,
} from './modules/careerProfileForm.js';
import {CareerProfileEditDialogElement} from './modules/careerProfileEditDialog.js';
import {CustomTabulatorTable} from '../vendor/formalize/src/table-components.js';

export class ManageCareerProfilesActivity extends ScopedElementsMixin(DBPBulletinLitElement) {
    static get scopedElements() {
        return {
            'dbp-icon': Icon,
            'dbp-icon-button': IconButton,
            'dbp-select': DBPSelect,
            'dbp-mini-spinner': MiniSpinner,
            'dbp-login-required-warning': DBPLoginRequiredWarning,
            'dbp-modal': Modal,
            'dbp-career-profile-edit-dialog': CareerProfileEditDialogElement,
            'dbp-tabulator-table': CustomTabulatorTable,
        };
    }

    static get properties() {
        return {
            ...super.properties,
            langDir: {type: String, attribute: 'lang-dir'},
            _profiles: {state: true},
            _loading: {state: true},
            _loadError: {state: true},
            _deleteProfile: {state: true},
            _deleting: {state: true},
            _selectedProfiles: {state: true},
            _bulkDeleteProfiles: {state: true},
        };
    }

    constructor() {
        super();
        this.langDir = '';
        this._profiles = [];
        this._loading = false;
        this._loadError = false;
        this._deleteProfile = null;
        this._deleting = false;
        this._requestId = 0;
        this._selectedProfiles = [];
        this._bulkDeleteProfiles = [];
    }

    get _isAuthorized() {
        const roles = /** @type {string[]} */ (this.auth?._roles ?? []);
        return roles.includes('ROLE_BULLETIN_CAREER_PROFILE_ADMIN');
    }

    initialize() {
        void this._fetchProfiles();
    }

    updated(changedProperties) {
        super.updated(changedProperties);
        if ((changedProperties.has('lang') || changedProperties.has('langDir')) && this.langDir) {
            void setOverridesByGlobalCache(this._i18n, this);
        }
        if (changedProperties.has('auth') || changedProperties.has('entryPointUrl')) {
            const oldAuth = changedProperties.get('auth');
            if (!this._isAuthorized || !this.auth?.token) {
                this._requestId++;
                this._profiles = [];
                this._loading = false;
                this._deleteProfile = null;
                this._selectedProfiles = [];
                this._bulkDeleteProfiles = [];
            } else if (
                changedProperties.has('entryPointUrl') ||
                oldAuth?.['user-id'] !== this.auth?.['user-id'] ||
                !(oldAuth?._roles ?? []).includes('ROLE_BULLETIN_CAREER_PROFILE_ADMIN')
            ) {
                this._profiles = [];
                void this._fetchProfiles();
            }
        }
        if (
            changedProperties.has('_profiles') ||
            changedProperties.has('lang') ||
            changedProperties.has('auth')
        ) {
            void this._syncTable();
        }
    }

    async _fetchProfiles() {
        if (!this._isAuthorized || !this.auth?.token || !this.entryPointUrl) return;
        const requestId = ++this._requestId;
        this._loading = true;
        this._loadError = false;
        this._selectedProfiles = [];
        try {
            // The API determines visibility; administrators also manage unreleased profiles.
            let url = `${this.entryPointUrl}/formalize/forms?perPage=9999&whereFrontendKeyIn[]=${encodeURIComponent(new CareerProfileModule().getFormFrontendKey())}`;
            const profiles = [];
            while (url) {
                const response = await fetch(url, {
                    headers: {
                        Authorization: `Bearer ${this.auth.token}`,
                        Accept: 'application/ld+json',
                    },
                });
                if (!response.ok) throw new Error(String(response.status));
                const data = await response.json();
                if (requestId !== this._requestId) return;
                profiles.push(
                    ...(data['hydra:member'] ?? []).map((form) => ({
                        ...form,
                        formId: form.identifier,
                    })),
                );
                const next = data['hydra:view']?.['hydra:next'];
                url = next ? new URL(next, `${this.entryPointUrl}/`).href : '';
            }
            this._profiles = profiles;
        } catch (error) {
            if (requestId !== this._requestId) return;
            console.error('Error loading career profiles for administration:', error);
            this._loadError = true;
            this._notify(this._i18n.t('manage-career-profiles.load-error'), 'danger');
        } finally {
            if (requestId === this._requestId) this._loading = false;
        }
    }

    _canAct(profile, action) {
        const grants = profile?.grantedActions ?? [];
        return this._isAuthorized && (grants.includes(action) || grants.includes('manage'));
    }

    _getName(profile) {
        return (
            profile?.additionalData?.visibleName ||
            profile?.localizedNames?.find((name) => name.languageTag === this.lang)?.name ||
            profile?.name ||
            profile?.identifier ||
            ''
        );
    }

    _createActions(profile) {
        const actions = document.createElement('div');
        actions.className = 'row-actions';
        // Tabulator inserts this container into its own shadow root.
        actions.style.display = 'flex';
        actions.style.gap = '0.5rem';
        actions.style.justifyContent = 'flex-end';
        const addButton = (action, icon, title, callback) => {
            if (!this._canAct(profile, action)) return;
            const button = this.createScopedElement('dbp-icon-button');
            button.setAttribute('icon-name', icon);
            button.setAttribute('lang', this.lang);
            button.title = title;
            button.setAttribute(
                'aria-label',
                `${button.title}: ${this._getName(profile)} (${profile.identifier})`,
            );
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                void callback();
            });
            actions.append(button);
        };
        addButton('update', 'pencil', this._i18n.t('manage-career-profiles.edit'), () =>
            this._openEdit(profile),
        );
        addButton('delete', 'trash', this._i18n.t('manage-career-profiles.delete'), () =>
            this._openDelete(profile),
        );
        return actions;
    }

    _getTableOptions() {
        const t = (key, options) => this._i18n.t(key, options);
        return {
            langs: {en: {}, de: {}},
            index: 'identifier',
            layout: 'fitColumns',
            rowHeader: {
                formatter: 'rowSelection',
                titleFormatter: 'rowSelection',
                titleFormatterParams: {rowRange: 'visible'},
                headerSort: false,
                resizable: false,
                frozen: true,
                width: 40,
                minWidth: 40,
                hozAlign: 'center',
                headerHozAlign: 'center',
            },
            placeholder: t('manage-career-profiles.no-profiles'),
            columnDefaults: {vertAlign: 'middle', minWidth: 160},
            data: this._profiles.map((profile) => {
                const data = profile.additionalData ?? {};
                return {
                    identifier: profile.identifier,
                    name: this._getName(profile),
                    studyProgram: formatStudentStudies(data, this.lang),
                    teaser: this.lang === 'en' ? data.teaserEn || data.teaser : data.teaser,
                    visibility: getCareerProfileVisibilityLabel(data, t),
                    availability: data.availability || '',
                    dateCreated: profile.dateCreated || '',
                    owner: data.studentCreatorId || data.studentPersonIdentifier || '',
                    profile,
                };
            }),
            columns: [
                {
                    title: t('manage-career-profiles.column-name'),
                    field: 'name',
                    formatter: 'plaintext',
                },
                {
                    title: t('browse-career-profiles.column-study-program'),
                    field: 'studyProgram',
                    formatter: 'plaintext',
                },
                {
                    title: t('manage-career-profiles.column-teaser'),
                    field: 'teaser',
                    formatter: 'plaintext',
                },
                {
                    title: t('career-profile-form.field-visibility'),
                    field: 'visibility',
                    formatter: 'plaintext',
                },
                {
                    title: t('career-profile-form.field-availability'),
                    field: 'availability',
                    formatter: 'plaintext',
                },
                {
                    title: t('manage-career-profiles.column-created'),
                    field: 'dateCreated',
                    formatter: 'plaintext',
                },
                {
                    title: t('manage-career-profiles.column-owner'),
                    field: 'owner',
                    formatter: 'plaintext',
                },
                {
                    title: t('manage-career-profiles.column-id'),
                    field: 'identifier',
                    formatter: 'plaintext',
                },
                {
                    title: '',
                    field: 'actions',
                    // Pinned to the right like in the other tables, also hosts the column configuration
                    frozen: true,
                    headerSort: false,
                    hozAlign: 'right',
                    headerHozAlign: 'right',
                    width: 100,
                    minWidth: 100,
                    widthGrow: 0,
                    widthShrink: 0,
                    formatter: (cell) => this._createActions(cell.getRow().getData().profile),
                },
            ],
        };
    }

    async _syncTable() {
        const table = /** @type {CustomTabulatorTable} */ (
            this.renderRoot.querySelector('#manage-career-profiles-table')
        );
        if (!table) return;
        const options = this._getTableOptions();
        table.options = options;
        table.data = options.data;
        if (!table.tabulatorTable) {
            await table.updateComplete;
            if (!table.tabulatorTable && !table.tableBuilding) table.buildTable();
            return;
        }
        table.tabulatorTable.setLocale(this.lang);
        table.tabulatorTable.setColumns(options.columns);
        await table.tabulatorTable.replaceData(options.data);
    }

    async _openEdit(profile) {
        if (!this._canAct(profile, 'update')) return;
        // Same dialog as on the career profile page, in admin mode to keep the student's ownership
        await /** @type {CareerProfileEditDialogElement} */ (
            this._('#career-profile-edit-dialog')
        )?.open({...profile});
    }

    async _openDelete(profile) {
        if (!this._canAct(profile, 'delete')) return;
        this._bulkDeleteProfiles = [];
        this._deleteProfile = profile;
        await this.updateComplete;
        this._('#admin-delete-modal')?.open();
    }

    _handleSelectionChanged(event) {
        this._selectedProfiles = (event.detail?.rows ?? []).map((row) => row.getData().profile);
    }

    _getDeletableProfiles(profiles) {
        return profiles.filter((profile) => this._canAct(profile, 'delete'));
    }

    _getBulkActionOptions() {
        const t = (key, options) => this._i18n.t(key, options);
        const deletableCount = this._getDeletableProfiles(this._selectedProfiles).length;
        // Deleting all profiles at once is intentionally not offered, only explicitly selected rows
        return [
            {
                value: 'delete-selected',
                label: t('manage-career-profiles.delete-selected-items', {n: deletableCount}),
                iconName: 'delete-selection',
                disabled: deletableCount === 0,
            },
        ];
    }

    _handleBulkAction(event) {
        if (event.detail?.option?.value === 'delete-selected') {
            void this._openBulkDelete(this._selectedProfiles);
        }
    }

    async _openBulkDelete(profiles) {
        if (this._loading || this._deleting) return;
        const deletableProfiles = this._getDeletableProfiles(profiles);
        if (!deletableProfiles.length) return;
        this._deleteProfile = null;
        this._bulkDeleteProfiles = [...deletableProfiles];
        await this.updateComplete;
        this._('#admin-delete-modal')?.open();
    }

    async _handleSaved() {
        await this._fetchProfiles();
    }

    async _confirmDelete() {
        if (this._bulkDeleteProfiles.length) {
            await this._confirmBulkDelete();
            return;
        }
        const profile = this._deleteProfile;
        if (!profile || !this.auth?.token || this._deleting || !this._canAct(profile, 'delete'))
            return;
        this._deleting = true;
        try {
            const response = await fetch(
                `${this.entryPointUrl}/formalize/forms/${encodeURIComponent(profile.identifier)}`,
                {method: 'DELETE', headers: {Authorization: `Bearer ${this.auth.token}`}},
            );
            if (!response.ok) throw new Error(String(response.status));
            this._('#admin-delete-modal')?.close();
            this._deleteProfile = null;
            this._notify(this._i18n.t('manage-career-profiles.delete-success'), 'success');
            await this._fetchProfiles();
        } catch (error) {
            console.error('Error deleting career profile:', error);
            this._notify(this._i18n.t('manage-career-profiles.delete-error'), 'danger');
        } finally {
            this._deleting = false;
        }
    }

    async _confirmBulkDelete() {
        if (!this.auth?.token || this._deleting) return;
        this._deleting = true;
        const profiles = [...this._bulkDeleteProfiles];
        let deleted = 0;
        const failed = [];
        try {
            // Keep individual results so a failed request never hides successful deletions.
            for (const profile of profiles) {
                try {
                    if (!this._canAct(profile, 'delete') || !this.auth?.token)
                        throw new Error('Permission changed');
                    const response = await fetch(
                        `${this.entryPointUrl}/formalize/forms/${encodeURIComponent(profile.identifier)}`,
                        {method: 'DELETE', headers: {Authorization: `Bearer ${this.auth.token}`}},
                    );
                    if (!response.ok) throw new Error(String(response.status));
                    deleted++;
                } catch (error) {
                    console.error('Error deleting career profile in bulk:', error);
                    failed.push(profile);
                }
            }
            this._('#admin-delete-modal')?.close();
            this._bulkDeleteProfiles = [];
            this._notify(
                failed.length
                    ? this._i18n.t('manage-career-profiles.bulk-delete-partial', {
                          deleted,
                          failed: failed.length,
                      })
                    : this._i18n.t('manage-career-profiles.bulk-delete-success', {n: deleted}),
                failed.length ? 'danger' : 'success',
            );
            await this._fetchProfiles();
        } finally {
            this._deleting = false;
        }
    }

    _notify(body, type) {
        sendNotification({
            summary: this._i18n.t('manage-career-profiles.title'),
            body,
            type,
            timeout: type === 'danger' ? 0 : 8,
        });
    }

    render() {
        const t = (key, options) => this._i18n.t(key, options);
        if (!this.isLoggedIn() && !this.isAuthPending()) {
            return html`
                <dbp-login-required-warning
                    subscribe="auth,lang"
                    @dbp-login-requested=${(event) => {
                        this.sendSetPropertyEvent('requested-login-status', 'logged-in');
                        event.preventDefault();
                    }}></dbp-login-required-warning>
            `;
        }
        if (!this._isAuthorized)
            return html`
                <h2>${t('manage-career-profiles.title')}</h2>
                <p>${t('manage-career-profiles.not-authorized')}</p>
            `;
        const isBulkDelete = this._bulkDeleteProfiles.length > 0;
        const storageKey = this.auth?.['user-id']
            ? `bulletin-manage-career-profiles-${this.auth['user-id']}`
            : '';
        return html`
            <h2>${t('manage-career-profiles.title')}</h2>
            <p>${t('manage-career-profiles.description')}</p>
            <div class="table-toolbar">
                <dbp-select
                    ?disabled=${this._loading || this._deleting}
                    @change=${(event) => this._handleBulkAction(event)}
                    label="${t('manage-career-profiles.actions-button-text')}"
                    align="left"
                    allow-expand
                    .options=${this._getBulkActionOptions()}></dbp-select>
                <button
                    class="button"
                    ?disabled=${this._loading || this._deleting}
                    @click=${this._fetchProfiles}>
                    <dbp-icon name="spinner-arrow" aria-hidden="true"></dbp-icon>
                    ${t('manage-career-profiles.refresh')}
                </button>
            </div>
            ${
                this._loading
                    ? html`
                          <dbp-mini-spinner text=${t('loading-message')}></dbp-mini-spinner>
                      `
                    : ''
            }
            ${
                this._loadError
                    ? html`
                          <p role="alert">${t('manage-career-profiles.load-error')}</p>
                      `
                    : ''
            }
            <dbp-tabulator-table
                id="manage-career-profiles-table"
                identifier="manage-career-profiles-table"
                lang=${this.lang}
                pagination-enabled
                pagination-size="10"
                select-rows-enabled
                @dbp-tabulator-table-selection-count-changed=${this._handleSelectionChanged}
                column-configuration-enabled
                column-configuration-in-header
                .paginationSizeStorageKey=${storageKey}
                .columnConfigurationStorageKey=${storageKey}
                .columnConfigurationExcludedFields=${['actions']}
                .options=${this._getTableOptions()}></dbp-tabulator-table>
            <dbp-career-profile-edit-dialog
                id="career-profile-edit-dialog"
                admin-mode
                lang=${this.lang}
                lang-dir=${this.langDir}
                .auth=${this.auth}
                entry-point-url=${this.entryPointUrl}
                @dbp-edit-form-saved=${this._handleSaved}></dbp-career-profile-edit-dialog>
            <dbp-modal
                id="admin-delete-modal"
                class="modal modal--confirmation"
                modal-id="admin-career-profile-delete"
                title="${
                    isBulkDelete
                        ? t('manage-career-profiles.bulk-delete-title')
                        : t('manage-career-profiles.delete')
                }"
                lang=${this.lang}
                subscribe="lang">
                <div slot="content">
                    <p>
                        ${
                            isBulkDelete
                                ? t('manage-career-profiles.bulk-delete-confirmation', {
                                      n: this._bulkDeleteProfiles.length,
                                  })
                                : t('manage-career-profiles.delete-confirmation', {
                                      name: this._getName(this._deleteProfile),
                                  })
                        }
                    </p>
                    <ul>
                        <li>${t('manage-career-profiles.delete-confirmation-li-submissions')}</li>
                        <li>${t('manage-career-profiles.delete-confirmation-li-irreversible')}</li>
                    </ul>
                </div>
                <menu slot="footer" class="footer-menu">
                    <button
                        class="button is-secondary"
                        type="button"
                        ?disabled=${this._deleting}
                        @click=${() => this._('#admin-delete-modal')?.close()}>
                        <dbp-icon name="close" aria-hidden="true"></dbp-icon>
                        <span class="button-label">${t('manage-career-profiles.cancel')}</span>
                    </button>
                    <button
                        class="button is-danger"
                        type="button"
                        ?disabled=${this._deleting}
                        @click=${this._confirmDelete}>
                        ${
                            this._deleting
                                ? html`
                                      <dbp-mini-spinner></dbp-mini-spinner>
                                  `
                                : html`
                                      <dbp-icon name="trash" aria-hidden="true"></dbp-icon>
                                  `
                        }
                        <span class="button-label">
                            ${t('manage-career-profiles.delete-button')}
                        </span>
                    </button>
                </menu>
            </dbp-modal>
        `;
    }

    static get styles() {
        return [
            commonStyles.getThemeCSS(),
            commonStyles.getGeneralCSS(),
            commonStyles.getButtonCSS(),
            css`
                :host {
                    display: block;
                }
                dbp-tabulator-table {
                    display: block;
                    margin-top: 1rem;
                }
                .row-actions {
                    display: flex;
                    gap: 0.5rem;
                    justify-content: flex-end;
                }
                .table-toolbar {
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    gap: 1rem;
                    margin-top: 1.5rem;
                }
                .modal-width {
                    --dbp-modal-max-width: 70rem;
                }
                /* Compact confirmation dialog, same as the other delete confirmations */
                .modal--confirmation {
                    --dbp-modal-width: 320px;
                    --dbp-modal-max-width: 360px;
                    --dbp-modal-min-height: auto;
                }
                .modal--confirmation ul {
                    list-style: disc;
                    margin: 0.5em 0 0;
                    padding-left: 1.25em;
                }
                .modal--confirmation .footer-menu {
                    padding: 0;
                    display: flex;
                    justify-content: flex-end;
                    gap: 1em;
                    margin-block: 2em 0;
                }
                .modal--confirmation .button {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.35rem;
                }
            `,
        ];
    }
}

commonUtils.defineCustomElement(
    'dbp-bulletin-manage-career-profiles',
    ManageCareerProfilesActivity,
);
