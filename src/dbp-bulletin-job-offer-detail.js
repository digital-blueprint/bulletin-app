import {css, html} from 'lit';
import {createRef, ref} from 'lit/directives/ref.js';
import {ScopedElementsMixin} from '@dbp-toolkit/common/src/scoped/ScopedElementsMixin.js';
import {Modal, Icon} from '@dbp-toolkit/common';
import {DbpStringElement} from '@dbp-toolkit/form-elements';
import * as commonUtils from '@dbp-toolkit/common/utils';
import * as commonStyles from '@dbp-toolkit/common/src/styles.js';
import DBPBulletinLitElement from './dbp-bulletin-lit-element.js';
import {sendNotification} from '@dbp-toolkit/common';
import {Notification} from '@dbp-toolkit/notification';

export class JobOfferDetail extends ScopedElementsMixin(DBPBulletinLitElement) {
    constructor() {
        super();
        /** @type {object|null} The job offer to display */
        this.job = null;
        /** @type {string} First name entered in the application form */
        this._firstName = '';
        /** @type {string} Last name entered in the application form */
        this._lastName = '';
        /** @type {string} Email address entered in the application form */
        this._email = '';
        /** @type {string} Free-text message entered in the application form */
        this._message = '';
        /** @type {boolean} Whether the share dropdown is open */
        this._shareDropdownOpen = false;
        /** @type {boolean} Whether the application form submission is in progress */
        this._isSubmitting = false;
        /** @type {import('lit/directives/ref.js').Ref} Ref to the first-name field element */
        this._firstNameRef = createRef();
        /** @type {import('lit/directives/ref.js').Ref} Ref to the last-name field element */
        this._lastNameRef = createRef();
        /** @type {import('lit/directives/ref.js').Ref} Ref to the email field element */
        this._emailRef = createRef();
        /** @type {import('lit/directives/ref.js').Ref} Ref to the message field element */
        this._messageRef = createRef();
    }

    static get scopedElements() {
        return {
            'dbp-modal': Modal,
            'dbp-icon': Icon,
            'dbp-string-element': DbpStringElement,
            'dbp-notification': Notification,
        };
    }

    static get properties() {
        return {
            ...super.properties,
            job: {type: Object},
            _firstName: {state: true},
            _lastName: {state: true},
            _email: {state: true},
            _message: {state: true},
            _shareDropdownOpen: {state: true},
            _isSubmitting: {state: true},
        };
    }

    /** Opens the modal dialog. */
    open() {
        const modal = this.shadowRoot?.querySelector('dbp-modal');
        if (modal) {
            modal.open();
        }
    }

    /** Closes the modal dialog. */
    close() {
        const modal = this.shadowRoot?.querySelector('dbp-modal');
        if (modal) {
            modal.close();
        }
    }

    /** Clears all inline validation errors from the application form fields. */
    _clearFormErrors() {
        const fields = [
            this._firstNameRef.value,
            this._lastNameRef.value,
            this._emailRef.value,
            this._messageRef.value,
        ];
        fields.filter(Boolean).forEach((field) => {
            field.errorMessages = [];
        });
    }

    /**
     * Returns the English value when the current language is English and the English text is
     * non-empty; otherwise returns the primary (default-language) value.
     * @param {string} primary - The primary language value.
     * @param {string} en - The English language value (may be empty string).
     * @returns {string}
     */
    _localized(primary, en) {
        return this.lang === 'en' && en ? en : primary;
    }

    /**
     * Renders the requirements list, preferring the English list when the current language is
     * English and the English list is non-empty.
     * @param {object} job
     * @param {Function} t
     * @returns {import('lit').TemplateResult|string}
     */
    _renderRequirements(job, t) {
        const enReqs = Array.isArray(job.requirementsEn) ? job.requirementsEn : [];
        const primaryReqs = Array.isArray(job.requirements) ? job.requirements : [];
        const reqs = this.lang === 'en' && enReqs.length > 0 ? enReqs : primaryReqs;

        if (reqs.length === 0) {
            return '';
        }

        return html`
            <h4 class="requirements-heading">${t('job-offer-detail.requirements')}</h4>
            <ul class="requirements-list">
                ${reqs.map(
                    (req) => html`
                        <li>${req}</li>
                    `,
                )}
            </ul>
        `;
    }

    /**
     * Formats an ISO date string (YYYY-MM-DD) to DD.MM.YYYY.
     * @param {string} isoDate
     * @returns {string}
     */
    formatDate(isoDate) {
        const [year, month, day] = isoDate.split('-');
        return `${day}.${month}.${year}`;
    }

    /**
     * Handles the share button — uses native share if available, otherwise toggles the custom share dropdown.
     */
    async onShare() {
        if ('share' in navigator) {
            try {
                await navigator.share({
                    title: this.job.title,
                    text: this.job.description.slice(0, 100),
                    url: this.getShareUrl(),
                });
            } catch (error) {
                if (error.name !== 'AbortError') {
                    console.error('Error:', error);
                    sendNotification({
                        summary: this._i18n.t('job-offer-detail.notification.error-heading'),
                        body: this._i18n.t('job-offer-detail.notification.error-body'),
                        type: 'danger',
                        timeout: 0,
                        replaceId: 'dbp-notification-apply',
                        targetNotificationId: 'dbp-notification-apply',
                    });
                }
            }
        } else {
            this._shareDropdownOpen = !this._shareDropdownOpen;
        }
    }

    /**
     * Returns the canonical URL for sharing the job offer.
     * @returns {string}
     */
    getShareUrl() {
        return `${window.location.origin}${window.location.pathname}`;
    }
    // Shares the job offer using copying the URL.
    async shareCopy() {
        const url = this.getShareUrl();
        const i18n = this._i18n;
        const t = (key) => (i18n ? i18n.t(key) : key);
        try {
            await navigator.clipboard.writeText(url);
            sendNotification({
                summary: t('job-offer-detail.notification.success-heading'),
                body: t('job-offer-detail.notification.success-body'),
                icon: 'checkmark',
                type: 'success',
                replaceId: 'dbp-notification-copy',
                targetNotificationId: 'dbp-notification-copy',
                timeout: 5,
            });
        } catch {
            window.open(url, '_blank');
        }
        this._shareDropdownOpen = false;
    }
    // Shares the job offer via email
    shareViaEmail() {
        const url = this.getShareUrl();
        const subject = this.job.title;
        const body = this.job.title + '\n\n' + this.job.description.slice(0, 100) + '\n\n' + url;
        window.open(
            `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
            '_self',
        );
    }
    // Shares the job offer on WhatsApp.
    shareOnWhatsApp() {
        const url = this.getShareUrl();
        const text = this.job.title + '\n' + this.job.description.slice(0, 100) + '\n';
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
    }
    /*
     // Shares the job offer on Facebook.
    shareOnFacebook() {
        const url = this.getShareUrl();
        window.open(
            `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
            '_blank',
        );
    }
    // Shares the job offer on LinkedIn.
    shareOnLinkedIn() {
        const url = this.getShareUrl();
        window.open(
            `https://www.linkedin.com/sharing/share-offline?url=${encodeURIComponent(url)}"`,
            '_blank',
        );
    }
     // Shares the job offer on Xing.
    shareOnXing() {
        const url = this.getShareUrl();
        window.open(`https://www.xing.com/spi/shares/new?url=${encodeURIComponent(url)}`, '_blank');
    }
    */
    /**
     * Returns a customValidator function for the message field that enforces a 50-character minimum.
     * Returning a bound function avoids recreating it on every render.
     * @returns {Function}
     */
    get _messageValidator() {
        const i18n = this._i18n;
        const t = (key, opts) => (i18n ? i18n.t(key, opts) : key);
        return (value) => {
            if (value && value.length < 50) {
                return [t('job-offer-detail.message-min-length', {current: value.length})];
            }
            return [];
        };
    }

    /**
     * Calls handleErrors() on every form field to reveal inline validation messages.
     * Returns true only when all fields pass validation.
     * @returns {boolean}
     */
    _validateForm() {
        const fields = [
            this._firstNameRef.value,
            this._lastNameRef.value,
            this._emailRef.value,
            this._messageRef.value,
        ];
        return fields
            .filter(Boolean)
            .map((field) => field.handleErrors())
            .every(Boolean);
    }

    /**
     * Handles the application form submission by posting to the formalize submissions API.
     * The job's identifier is the formalize form ID, so we can POST to
     * /formalize/submissions with the form reference set to /formalize/forms/<identifier>.
     * @param {Event} e
     */
    async onSubmit(e) {
        e.preventDefault();

        const i18n = this._i18n;
        const t = (key) => (i18n ? i18n.t(key) : key);

        if (!this.job || !this.entryPointUrl || !this.auth?.token) {
            return;
        }

        // Trigger inline validation on all fields before submitting
        if (!this._validateForm()) {
            return;
        }

        this._isSubmitting = true;

        const submissionData = {
            givenName: this._firstName,
            familyName: this._lastName,
            email: this._email,
            freeText: this._message,
            // Include the person identifier from the auth token if available
            personIdentifier: this.auth.person_id ?? '',
        };

        const formData = new FormData();
        formData.append('form', '/formalize/forms/' + this.job.identifier);
        formData.append('dataFeedElement', JSON.stringify(submissionData));
        // Use binary submission state 2 (submitted), matching the pattern in JobOfferFormElement
        formData.append('submissionState', '2');

        try {
            const response = await fetch(this.entryPointUrl + '/formalize/submissions', {
                method: 'POST',
                headers: {
                    Authorization: 'Bearer ' + this.auth.token,
                },
                body: formData,
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                console.error('Failed to submit application:', response.status, errorBody);
                const apiMessage = errorBody.description || errorBody['hydra:description'] || '';
                const body = apiMessage
                    ? `${t('job-offer-detail.notification.submit-error-body')}\n${apiMessage}`
                    : t('job-offer-detail.notification.submit-error-body');
                sendNotification({
                    summary: t('job-offer-detail.notification.submit-error-heading'),
                    body: body,
                    type: 'danger',
                    timeout: 0,
                    replaceId: 'dbp-notification-apply',
                    targetNotificationId: 'dbp-notification-apply',
                });
                return;
            }

            sendNotification({
                summary: t('job-offer-detail.notification.success-heading'),
                body: t('job-offer-detail.apply-success'),
                icon: 'checkmark',
                type: 'success',
                timeout: 5,
                replaceId: 'dbp-notification-apply',
                targetNotificationId: 'dbp-notification-apply',
            });

            this._firstName = '';
            this._lastName = '';
            this._email = '';
            this._message = '';
            this._clearFormErrors();
            this.close();
        } catch (error) {
            console.error('Error submitting application:', error);
            sendNotification({
                summary: t('job-offer-detail.notification.submit-error-heading'),
                body: t('job-offer-detail.notification.submit-error-body'),
                type: 'danger',
                timeout: 0,
                replaceId: 'dbp-notification-apply',
                targetNotificationId: 'dbp-notification-apply',
            });
        } finally {
            this._isSubmitting = false;
        }
    }

    render() {
        const job = this.job;
        const i18n = this._i18n;
        const t = (key) => (i18n ? i18n.t(key) : key);
        return html`
            <dbp-modal
                modal-id="job-offer-detail-dialog"
                lang="${this.lang}"
                style="--dbp-modal-min-width: min(95vw, 700px); --dbp-modal-max-width: min(95vw, 700px); --dbp-modal-max-height: 90vh; --dbp-modal-content-overflow-y: auto;">
                <div slot="header">
                    <dbp-notification
                        id="dbp-notification-copy"
                        lang="en"
                        inline></dbp-notification>
                    <dbp-notification
                        id="dbp-notification-apply"
                        lang="${this.lang}"
                        inline></dbp-notification>
                </div>
                <!-- Title slot -->
                <div slot="title">
                    <h2 class="modal-title">${job ? job.title : ''}</h2>
                </div>
                <!-- Main content slot — empty when no job is selected -->
                <div slot="content" class="detail-content">
                    ${job
                        ? html`
                              <!-- Meta row: left column = key-value pairs, right column = tag + actions -->
                              <div class="meta-row">
                                  <dl class="meta-list">
                                      <div class="meta-item">
                                          <dt>${t('job-offer-detail.published-at')}:</dt>
                                          <dd>${this.formatDate(job.publishedAt)}</dd>
                                      </div>
                                      <div class="meta-item">
                                          <dt>${t('job-offer-detail.deadline')}:</dt>
                                          <dd>${this.formatDate(job.deadline)}</dd>
                                      </div>
                                      <div class="meta-item">
                                          <dt>${t('job-offer-detail.start-date')}:</dt>
                                          <dd>${job.startDate}</dd>
                                      </div>
                                      <div class="meta-item">
                                          <dt>${t('job-offer-detail.weekly-hours')}:</dt>
                                          <dd>${job.weeklyHours}</dd>
                                      </div>
                                      <div class="meta-item">
                                          <dt>${t('job-offer-detail.organization')}:</dt>
                                          <dd>
                                              ${this._localized(
                                                  job.organization,
                                                  job.organizationEn ?? '',
                                              )}
                                          </dd>
                                      </div>
                                  </dl>

                                  <div class="meta-actions">
                                      ${job.areaOfInterest
                                          ? html`
                                                <span class="job-tag">${job.areaOfInterest}</span>
                                            `
                                          : ''}
                                      <div class="action-buttons">
                                          <div class="share-button-container">
                                              <button
                                                  class="button is-secondary"
                                                  type="button"
                                                  @click="${this.onShare}">
                                                  <dbp-icon
                                                      class="btn-icon"
                                                      name="share2"
                                                      aria-hidden="true"></dbp-icon>
                                                  ${t('job-offer-detail.share')}
                                              </button>
                                              ${this._shareDropdownOpen
                                                  ? html`
                                                        <div class="share-dropdown">
                                                            <button
                                                                class="button"
                                                                @click="${this.shareCopy}">
                                                                <dbp-icon
                                                                    name="link"
                                                                    aria-hidden="true"
                                                                    class="btn-icon"></dbp-icon>
                                                                ${t('job-offer-detail.share-copy')}
                                                            </button>
                                                            <button
                                                                class="button"
                                                                @click="${this.shareViaEmail}">
                                                                <dbp-icon
                                                                    name="envelope"
                                                                    aria-hidden="true"
                                                                    class="btn-icon"></dbp-icon>
                                                                ${t('job-offer-detail.share-email')}
                                                            </button>
                                                            <button
                                                                class="button"
                                                                @click="${this.shareOnWhatsApp}">
                                                                <dbp-icon
                                                                    name="whatsapp"
                                                                    aria-hidden="true"
                                                                    class="btn-icon"></dbp-icon>
                                                                ${t(
                                                                    'job-offer-detail.share-whatsapp',
                                                                )}
                                                            </button>
                                                            <!--
                                                            <button
                                                                class="button"
                                                                @click="${this.shareOnLinkedIn}">
                                                                <dbp-icon
                                                                    name="linkedin-original"
                                                                    aria-hidden="true"
                                                                    class="btn-icon"></dbp-icon>
                                                                ${t(
                                                                'job-offer-detail.share-linkedin',
                                                            )}
                                                            </button>
                                                            <button
                                                                class="button"
                                                                @click="${this.shareOnFacebook}">
                                                                <dbp-icon
                                                                    name="facebook"
                                                                    aria-hidden="true"
                                                                    class="btn-icon"></dbp-icon>
                                                                ${t(
                                                                'job-offer-detail.share-facebook',
                                                            )}
                                                            </button>
                                                            <button
                                                                class="button"
                                                                @click="${this.shareOnXing}">
                                                                <dbp-icon
                                                                    name="share2"
                                                                    aria-hidden="true"
                                                                    class="btn-icon"></dbp-icon>
                                                                ${t('job-offer-detail.share-xing')}
                                                            </button>-->
                                                        </div>
                                                    `
                                                  : ''}
                                          </div>
                                          <button
                                              class="button is-primary apply-anchor-btn"
                                              type="button"
                                              @click="${() => {
                                                  const form =
                                                      this.shadowRoot?.querySelector('.apply-form');
                                                  if (form) {
                                                      form.scrollIntoView({behavior: 'smooth'});
                                                  }
                                              }}">
                                              <dbp-icon
                                                  class="btn-icon"
                                                  name="checkmark"
                                                  aria-hidden="true"></dbp-icon>
                                              ${t('job-offer-detail.apply')}
                                          </button>
                                      </div>
                                  </div>
                              </div>

                              <!-- Job description: use English text when language is English and available -->
                              <p class="job-description">
                                  ${this._localized(job.description, job.descriptionEn ?? '')}
                              </p>

                              <!-- Requirements section: use English requirements when language is English and available -->
                              ${this._renderRequirements(job, t)}

                              <!-- Application form -->
                              <form class="apply-form" @submit="${this.onSubmit}" novalidate>
                                  <h4 class="apply-heading">
                                      ${t('job-offer-detail.application-title')}
                                  </h4>

                                  <div class="form-row">
                                      <dbp-string-element
                                          ${ref(this._firstNameRef)}
                                          name="first-name"
                                          lang="${this.lang}"
                                          label="${t('job-offer-detail.first-name')}"
                                          .value="${this._firstName}"
                                          required
                                          autocomplete="given-name"
                                          @change="${(e) =>
                                              (this._firstName =
                                                  e.detail.value)}"></dbp-string-element>

                                      <dbp-string-element
                                          ${ref(this._lastNameRef)}
                                          name="last-name"
                                          lang="${this.lang}"
                                          label="${t('job-offer-detail.last-name')}"
                                          .value="${this._lastName}"
                                          required
                                          autocomplete="family-name"
                                          @change="${(e) =>
                                              (this._lastName =
                                                  e.detail.value)}"></dbp-string-element>

                                      <dbp-string-element
                                          ${ref(this._emailRef)}
                                          name="email"
                                          lang="${this.lang}"
                                          label="${t('job-offer-detail.email')}"
                                          .value="${this._email}"
                                          type="email"
                                          required
                                          autocomplete="email"
                                          @change="${(e) =>
                                              (this._email = e.detail.value)}"></dbp-string-element>
                                  </div>

                                  <dbp-string-element
                                      ${ref(this._messageRef)}
                                      name="message"
                                      lang="${this.lang}"
                                      label="${t('job-offer-detail.message')}"
                                      .value="${this._message}"
                                      required
                                      .customValidator="${this._messageValidator}"
                                      rows="4"
                                      @change="${(e) =>
                                          (this._message = e.detail.value)}"></dbp-string-element>

                                  <div class="form-footer">
                                      <button
                                          class="button is-primary"
                                          type="submit"
                                          ?disabled="${this._isSubmitting}">
                                          ${t('job-offer-detail.submit')}
                                      </button>
                                  </div>
                              </form>
                          `
                        : ''}
                </div>
            </dbp-modal>
        `;
    }

    static get styles() {
        return css`
            ${commonStyles.getThemeCSS()}
            ${commonStyles.getGeneralCSS()}
            ${commonStyles.getButtonCSS()}

            /* Meta section: info on the left, tag+actions on the right */
            .meta-row {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 1rem;
                flex-wrap: wrap;
                margin-bottom: 1.5rem;
            }

            .meta-list {
                margin: 0;
                padding: 0;
                list-style: none;
            }

            .meta-item {
                display: flex;
                gap: 0.35rem;
                margin-bottom: 0.2rem;
                font-size: 1rem;
            }

            .meta-item dt {
                font-weight: 700;
                white-space: nowrap;
            }

            .meta-item dd {
                margin: 0;
            }

            /* Right-side tag and action buttons */
            .meta-actions {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 0.75rem;
                flex-shrink: 0;
            }

            /* Outlined area-of-interest badge */
            .job-tag {
                display: inline-block;
                border: 1px solid var(--dbp-content);
                border-radius: 2px;
                padding: 0.1rem 0.4rem;
                font-size: 1rem;
                color: var(--dbp-content);
            }

            .action-buttons {
                display: flex;
                gap: 0.5rem;
                flex-wrap: wrap;
                justify-content: flex-end;
            }

            .action-buttons .button {
                display: inline-flex;
                align-items: center;
                gap: 0.35rem;
                white-space: nowrap;
            }

            .btn-icon {
                flex-shrink: 0;
                top: 0;
            }

            /* Description paragraph */
            .job-description {
                margin: 0 0 1.5rem 0;
                line-height: 1.6;
            }

            /* Requirements section */
            .requirements-heading {
                font-size: 1.1rem;
                font-weight: 700;
                margin: 0 0 0.75rem 0;
            }

            .requirements-list {
                margin: 0 0 1.5rem 0;
                padding-left: 1.4rem;
                line-height: 1.6;
            }

            .requirements-list li {
                margin-bottom: 0.4rem;
            }

            /* Application form */
            .apply-form {
                border: var(--dbp-border);
                border-radius: var(--dbp-border-radius);
                padding: 1.25rem;
                margin-top: 1.5rem;
            }

            .apply-heading {
                font-size: 1.1rem;
                font-weight: 700;
                margin: 0 0 1rem 0;
            }

            /* Three-column form row for first name, last name, email */
            .form-row {
                display: grid;
                grid-template-columns: 1fr 1fr 1fr;
                gap: 1rem;
                margin-bottom: 0.75rem;
            }

            @media (max-width: 560px) {
                .form-row {
                    grid-template-columns: 1fr;
                }
            }

            .form-row dbp-string-element {
                margin-bottom: 0;
            }

            /* Vertical spacing for the message element */
            .apply-form dbp-string-element {
                display: block;
                margin-bottom: 0.75rem;
            }

            .form-footer {
                display: flex;
                justify-content: flex-end;
                margin-top: 1rem;
            }

            /* Detail content padding */
            .detail-content {
                padding: 0.25rem 0;
            }

            @media (max-width: 560px) {
                .meta-row {
                    flex-direction: column;
                }

                .meta-actions {
                    align-items: flex-start;
                }
                .share-dropdown {
                    left: 0;
                    right: initial;
                }
            }

            /* Share dropdown styles */
            .share-dropdown {
                position: absolute;
                top: 100%;
                right: 0;
                background: white;
                border: 1px solid var(--dbp-border);
                border-radius: var(--dbp-border-radius);
                box-shadow:
                    rgba(0, 0, 0, 0.08) 0px 6px 24px,
                    rgba(0, 0, 0, 0.06) 0px 2px 8px;
                z-index: 10;
                display: flex;
                flex-direction: column;
                gap: 3px;
                padding: 0px;
                width: max-content;
            }

            .share-dropdown .button {
                justify-content: flex-start;
                border: none;
                padding: 10px 10px;
                gap: 10px;
            }

            .share-button-container {
                position: relative;
            }
            .share-button-container button {
                position: relative;
                z-index: 11;
            }
        `;
    }
}

commonUtils.defineCustomElement('dbp-bulletin-job-offer-detail', JobOfferDetail);
