import {css, html} from 'lit';
import {ScopedElementsMixin} from '@dbp-toolkit/common/src/scoped/ScopedElementsMixin.js';
import {Icon, MiniSpinner} from '@dbp-toolkit/common';
import {Modal} from '@dbp-toolkit/common/src/modal.js';
import {Notification} from '@dbp-toolkit/notification';
import * as commonStyles from '@dbp-toolkit/common/src/styles.js';
import DBPLitElement from '@dbp-toolkit/common/dbp-lit-element';
import {setOverridesByGlobalCache} from '@dbp-toolkit/common/i18next.js';
import {createInstance} from '../i18n.js';
import {CareerProfileEditFormElement} from './careerProfileForm.js';

/**
 * Dialog to create or edit a career profile. It is shared by the activities that edit career
 * profiles, so students and administrators get the exact same editor.
 *
 * Usage:
 *   await dialog.open(profile); // Or open() to create a new profile
 *
 * The dialog closes itself after saving and re-dispatches the `dbp-edit-form-saved` event
 * of the form (bubbles, composed) with the saved form in `event.detail.form`.
 */
export class CareerProfileEditDialogElement extends ScopedElementsMixin(DBPLitElement) {
    static get scopedElements() {
        return {
            'dbp-icon': Icon,
            'dbp-mini-spinner': MiniSpinner,
            'dbp-modal': Modal,
            'dbp-notification': Notification,
            'dbp-career-profile-edit-form': CareerProfileEditFormElement,
        };
    }

    constructor() {
        super();
        this._i18n = createInstance();
        this.lang = this._i18n.language;
        this.langDir = '';
        this.auth = {};
        this.entryPointUrl = '';
        this.currentStudentStudies = [];
        this.adminMode = false;
        this._profile = null;
        this._isSubmitting = false;
    }

    static get properties() {
        return {
            ...super.properties,
            lang: {type: String},
            langDir: {type: String, attribute: 'lang-dir'},
            auth: {type: Object},
            entryPointUrl: {type: String, attribute: 'entry-point-url'},
            currentStudentStudies: {type: Array, attribute: false},
            adminMode: {type: Boolean, attribute: 'admin-mode'},
            _profile: {state: true},
            _isSubmitting: {state: true},
        };
    }

    update(changedProperties) {
        if (changedProperties.has('lang')) {
            void this._i18n.changeLanguage(this.lang);
        }

        if ((changedProperties.has('lang') || changedProperties.has('langDir')) && this.langDir) {
            void setOverridesByGlobalCache(this._i18n, this);
        }

        super.update(changedProperties);
    }

    /**
     * Opens the dialog for the given profile, or for a new profile if none is given.
     * @param {object|null} profile
     */
    async open(profile = null) {
        this._profile = profile;
        await this.updateComplete;
        const form = /** @type {CareerProfileEditFormElement} */ (
            this._('#career-profile-edit-form')
        );
        await form?.updateComplete;
        if (!profile) {
            form?.resetForCreate();
        }
        this._('#career-profile-edit-modal')?.open();
    }

    close() {
        this._('#career-profile-edit-modal')?.close();
    }

    async _saveProfile() {
        const form = /** @type {CareerProfileEditFormElement} */ (
            this._('#career-profile-edit-form')
        );
        if (!form || this._isSubmitting) {
            return;
        }

        this._isSubmitting = true;
        try {
            await form.submit();
        } finally {
            this._isSubmitting = false;
        }
    }

    _handleProfileSaved() {
        // The event of the form bubbles out of this dialog on its own, so only close here
        this.close();
    }

    /**
     * Moves focus from the skip link at the end of the profile form to the primary
     * save button in the pinned modal header. Falls back to the action bar while the
     * save button is disabled and therefore not focusable.
     */
    _skipToSaveButton() {
        const saveButton = /** @type {HTMLButtonElement} */ (this._('#career-profile-save-button'));
        if (saveButton && !saveButton.disabled) {
            saveButton.focus();
            return;
        }

        /** @type {HTMLElement} */ (this._('#career-profile-actions-bar'))?.focus();
    }

    /**
     * Moves focus to the modal's close button. It lives inside the modal's shadow
     * root, so we have to go through the modal's public API.
     */
    _skipToCloseButton() {
        /** @type {Modal} */ (this._('#career-profile-edit-modal'))?.focusCloseButton();
    }

    render() {
        const t = (key, opts) => this._i18n.t(key, opts);
        const title = this._profile
            ? t('career-profile.edit-profile')
            : t('career-profile.create-profile');

        return html`
            <dbp-modal
                id="career-profile-edit-modal"
                modal-id="career-profile-edit-modal"
                subscribe="lang"
                class="modal-width">
                <div slot="title">
                    <h2 class="modal-title">${title}</h2>
                </div>
                <div slot="header" class="modal-header">
                    <div id="career-profile-actions-bar" class="dialog-actions-bar" tabindex="-1">
                        <p class="required-field-note">
                            <span class="required-asterisk">*</span>
                            ${t('career-profile-form.required-field-note')}
                        </p>
                        <button
                            id="career-profile-save-button"
                            class="button is-primary save-button"
                            type="button"
                            ?disabled="${this._isSubmitting}"
                            @click="${() => this._saveProfile()}">
                            ${
                                this._isSubmitting
                                    ? html`
                                          <dbp-mini-spinner></dbp-mini-spinner>
                                      `
                                    : html`
                                          <dbp-icon name="save" aria-hidden="true"></dbp-icon>
                                      `
                            }
                            <span class="button-label">
                                ${t('career-profile-form.save-profile')}
                            </span>
                        </button>
                    </div>
                </div>
                <div slot="content">
                    <dbp-notification
                        id="career-profile-form-notification"
                        lang="${this.lang}"></dbp-notification>
                    <dbp-career-profile-edit-form
                        id="career-profile-edit-form"
                        class="career-profile-edit-form"
                        lang="${this.lang}"
                        lang-dir="${this.langDir}"
                        ?admin-mode="${this.adminMode}"
                        .auth="${this.auth}"
                        entry-point-url="${this.entryPointUrl}"
                        .existingForm="${this._profile}"
                        .currentStudentStudies="${this.currentStudentStudies}"
                        @dbp-edit-form-saved="${
                            this._handleProfileSaved
                        }"></dbp-career-profile-edit-form>

                    <!--
                        Skip links to the dialog actions, which sit in the pinned modal header
                        and therefore come before the form in the tab order.
                    -->
                    <div class="skip-links">
                        <button type="button" class="skip-link" @click="${this._skipToSaveButton}">
                            ${t('career-profile-form.skip-to-save-button', {
                                label: t('career-profile-form.save-profile'),
                            })}
                        </button>
                        <button type="button" class="skip-link" @click="${this._skipToCloseButton}">
                            ${t('career-profile-form.skip-to-close-button')}
                        </button>
                    </div>
                </div>
            </dbp-modal>
        `;
    }

    static get styles() {
        return [
            commonStyles.getGeneralCSS(),
            commonStyles.getButtonCSS(),
            commonStyles.getNotificationCSS(),
            css`
                h2 {
                    margin: 0;
                    font-weight: 300;
                }

                .modal-title {
                    font-weight: 300;
                    margin: 0;
                }

                .required-field-note {
                    margin-top: 0;
                }

                .required-asterisk {
                    color: var(--dbp-accent);
                }

                .dialog-actions-bar {
                    display: flex;
                    justify-content: space-between;
                    padding-bottom: 1em;
                }

                .save-button {
                    height: max-content;
                }

                .button {
                    gap: 0.35rem;
                }

                /* Fallback focus target while the save button is disabled */
                #career-profile-actions-bar:focus {
                    outline: none;
                }

                #career-profile-actions-bar:focus-visible {
                    outline: 1px solid var(--dbp-accent);
                    outline-offset: 2px;
                }

                /* Skip links: hidden until they receive keyboard focus */
                .skip-link {
                    position: absolute !important;
                    clip: rect(1px, 1px, 1px, 1px);
                    overflow: hidden;
                    height: 1px;
                    width: 1px;
                    word-wrap: normal;
                    appearance: none;
                    border: none;
                    padding: 0;
                    background: none;
                    font: inherit;
                    color: var(--dbp-accent);
                    text-decoration: underline;
                    cursor: pointer;
                }

                .skip-link:focus-visible {
                    position: static !important;
                    clip: auto;
                    overflow: visible;
                    display: inline-block;
                    height: auto;
                    width: auto;
                }

                /* Only the focused link becomes visible, so the gap never shows twice */
                .skip-links:focus-within {
                    display: flex;
                    margin-top: 1rem;
                }

                .modal-width {
                    --dbp-modal-min-width: min(95vw, 900px);
                    --dbp-modal-max-width: min(95vw, 900px);
                    --dbp-modal-max-height: 90vh;
                    --dbp-modal-content-overflow-y: auto;
                }

                .career-profile-edit-form {
                    --dbp-label-margin-bottom: 3px;
                }

                @media (max-width: 560px) {
                    .modal-width {
                        --dbp-modal-min-width: unset;
                        --dbp-modal-max-width: unset;
                    }
                }
            `,
        ];
    }
}
