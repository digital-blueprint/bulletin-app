import {css, html} from 'lit';
import {ScopedElementsMixin} from '@dbp-toolkit/common/src/scoped/ScopedElementsMixin.js';
import {Modal, Icon} from '@dbp-toolkit/common';
import * as commonUtils from '@dbp-toolkit/common/utils';
import * as commonStyles from '@dbp-toolkit/common/src/styles.js';
import DBPBulletinLitElement from './dbp-bulletin-lit-element.js';
import {sendNotification} from '@dbp-toolkit/common';
import {Notification} from '@dbp-toolkit/notification';
import {getAreaOfInterestLabels, JobOfferFormElement} from './modules/jobOfferForm.js';

export class JobOfferDetail extends ScopedElementsMixin(DBPBulletinLitElement) {
    constructor() {
        super();
        /** @type {object|null} The job offer to display */
        this.job = null;
        /** @type {boolean} Whether the share dropdown is open */
        this._shareDropdownOpen = false;
    }

    static get scopedElements() {
        return {
            'dbp-modal': Modal,
            'dbp-icon': Icon,
            'dbp-notification': Notification,
            'dbp-bulletin-job-offer-form': JobOfferFormElement,
        };
    }

    static get properties() {
        return {
            ...super.properties,
            job: {type: Object},
            _shareDropdownOpen: {state: true},
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

    _getLocalizedTitle(job) {
        return this._localized(job.title ?? '', job.titleEn ?? '');
    }

    _getLocalizedDescription(job) {
        return this._localized(job.description ?? '', job.descriptionEn ?? '');
    }

    _renderAreaOfInterestTags(job, t) {
        const areaOfInterestLabels = getAreaOfInterestLabels(
            job.areasOfInterest ?? job.areaOfInterest,
            t,
        );

        if (areaOfInterestLabels.length === 0) {
            return '';
        }

        return html`
            <div class="job-tags">
                ${areaOfInterestLabels.map(
                    (label) => html`
                        <span class="job-tag">${label}</span>
                    `,
                )}
            </div>
        `;
    }

    /**
     * Renders the localized job description while preserving line breaks from the stored text.
     * @param {object} job
     * @returns {import('lit').TemplateResult}
     */
    _renderDescription(job) {
        const description = this._getLocalizedDescription(job);
        const lines = description.split(/\r?\n/);

        return html`
            <p class="job-description">
                ${lines.map((line, index) =>
                    index === 0
                        ? line
                        : html`
                              <br />
                              ${line}
                          `,
                )}
            </p>
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
                const title = this._getLocalizedTitle(this.job);
                const description = this._getLocalizedDescription(this.job);
                await navigator.share({
                    title,
                    text: description.slice(0, 100),
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
        const url = new URL(window.location.href);
        url.search = '';
        url.hash = '';

        return url.toString();
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
        const title = this._getLocalizedTitle(this.job);
        const description = this._getLocalizedDescription(this.job);
        const subject = title;
        const body = title + '\n\n' + description.slice(0, 100) + '\n\n' + url;
        window.open(
            `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
            '_self',
        );
    }
    // Shares the job offer on WhatsApp.
    shareOnWhatsApp() {
        const url = this.getShareUrl();
        const title = this._getLocalizedTitle(this.job);
        const description = this._getLocalizedDescription(this.job);
        const text = title + '\n' + description.slice(0, 100) + '\n';
        window.open(`https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`, '_blank');
    }
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
        const title = this._getLocalizedTitle(this.job);
        const text = title + '\n' + url;
        window.open(
            `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`,
            '_blank',
        );
    }
    // Shares the job offer on Instagram (opens Instagram website, no direct share API available).
    shareOnInstagram() {
        window.open('https://www.instagram.com/', '_blank');
    }
    // Shares the job offer on Discord by opening Discord and keeping the URL ready to paste.
    async shareOnDiscord() {
        await this.shareCopy();
        window.open('https://discord.com/channels/@me', '_blank');
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
                    <h2 class="modal-title">${job ? this._getLocalizedTitle(job) : ''}</h2>
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
                                          <dd>
                                              ${this._localized(
                                                  job.weeklyHours,
                                                  job.weeklyHoursEn ?? '',
                                              )}
                                          </dd>
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
                                      ${this._renderAreaOfInterestTags(job, t)}
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
                                                                    name="facebook-original"
                                                                    aria-hidden="true"
                                                                    class="btn-icon"></dbp-icon>
                                                                ${t(
                                                                    'job-offer-detail.share-facebook',
                                                                )}
                                                            </button>
                                                            <button
                                                                class="button"
                                                                @click="${this.shareOnInstagram}">
                                                                <dbp-icon
                                                                    name="instagram-original"
                                                                    aria-hidden="true"
                                                                    class="btn-icon"></dbp-icon>
                                                                ${t(
                                                                    'job-offer-detail.share-instagram',
                                                                )}
                                                            </button>
                                                            <button
                                                                class="button"
                                                                @click="${this.shareOnDiscord}">
                                                                <dbp-icon
                                                                    name="share2"
                                                                    aria-hidden="true"
                                                                    class="btn-icon"></dbp-icon>
                                                                ${t(
                                                                    'job-offer-detail.share-discord',
                                                                )}
                                                            </button>
                                                        </div>
                                                    `
                                                  : ''}
                                          </div>
                                          <button
                                              class="button is-primary apply-anchor-btn"
                                              type="button"
                                              @click="${() => {
                                                  // Scroll to the job offer form component
                                                  const formEl = this.shadowRoot?.querySelector(
                                                      'dbp-bulletin-job-offer-form',
                                                  );
                                                  if (formEl) {
                                                      formEl.scrollIntoView({behavior: 'smooth'});
                                                  }
                                              }}">
                                              <dbp-icon
                                                  class="btn-icon"
                                                  name="chevron-down"
                                                  aria-hidden="true"></dbp-icon>
                                              ${t('job-offer-detail.apply')}
                                          </button>
                                      </div>
                                  </div>
                              </div>

                              <!-- Job description: use English text when language is English and available -->
                              ${this._renderDescription(job)}

                              <!-- Contact information block shown when provided; use English value when language is English -->
                              ${job.contactInformation || job.contactInformationEn
                                  ? html`
                                        <div class="contact-information">
                                            <h3 class="contact-information-heading">
                                                ${t('job-offer-detail.contact-information')}
                                            </h3>
                                            <p>
                                                ${(this.lang === 'en' &&
                                                    job.contactInformationEn) ||
                                                job.contactInformation}
                                            </p>
                                        </div>
                                    `
                                  : ''}

                              <!-- Application form rendered by the JobOfferFormElement component -->
                              <dbp-bulletin-job-offer-form
                                  lang="${this.lang}"
                                  .job="${job}"
                                  .auth="${this.auth}"
                                  entry-point-url="${this.entryPointUrl}"
                                  form-identifier="${job.identifier}"
                                  notification-target-id="dbp-notification-apply"></dbp-bulletin-job-offer-form>
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
                display: grid;
                grid-template-columns: minmax(0, 1fr) max-content;
                align-items: flex-start;
                column-gap: 1rem;
                margin-bottom: 1.5rem;
            }

            .meta-list {
                margin: 0;
                padding: 0;
                list-style: none;
                min-width: 0;
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

            /* Right-side tag and action buttons stay in the second grid column */
            .meta-actions {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 0.75rem;
                min-width: 0;
            }

            /* Outlined area-of-interest badge */
            .job-tags {
                display: flex;
                flex-wrap: wrap;
                gap: 0.4rem;
                justify-content: flex-end;
                max-width: min(100%, 28rem);
            }

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

            /* Contact information block */
            .contact-information {
                margin: 0 0 1.5rem 0;
            }

            .contact-information-heading {
                font-size: 1rem;
                font-weight: 700;
                margin: 0 0 0.4rem 0;
            }

            .contact-information p {
                margin: 0;
                line-height: 1.6;
                white-space: pre-wrap;
            }

            /* Detail content padding */
            .detail-content {
                padding: 0.25rem 0;
            }

            @media (max-width: 560px) {
                .meta-row {
                    display: flex;
                    flex-direction: column;
                }

                .meta-actions {
                    align-items: flex-start;
                }

                .job-tags {
                    justify-content: flex-start;
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
