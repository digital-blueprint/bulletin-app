import {css, html} from 'lit';
import {ScopedElementsMixin} from '@dbp-toolkit/common/src/scoped/ScopedElementsMixin.js';
import {Modal, Icon} from '@dbp-toolkit/common';
import * as commonUtils from '@dbp-toolkit/common/utils';
import * as commonStyles from '@dbp-toolkit/common/src/styles.js';
import DBPBulletinLitElement from './dbp-bulletin-lit-element.js';

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
    }

    static get scopedElements() {
        return {
            'dbp-modal': Modal,
            'dbp-icon': Icon,
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
     * Formats an ISO date string (YYYY-MM-DD) to DD.MM.YYYY.
     * @param {string} isoDate
     * @returns {string}
     */
    formatDate(isoDate) {
        const [year, month, day] = isoDate.split('-');
        return `${day}.${month}.${year}`;
    }

    /**
     * Handles the share button — writes the canonical job URL to the clipboard.
     */
    async onShare() {
        const job = this.job;
        if (!job) return;
        const url = `${window.location.origin}${window.location.pathname}#job/${job.identifier}`;
        try {
            await navigator.clipboard.writeText(url);
        } catch {
            // Fallback: open the URL in a new tab if clipboard access is denied
            window.open(url, '_blank');
        }
    }

    /**
     * Handles the application form submission.
     * @param {Event} e
     */
    onSubmit(e) {
        e.preventDefault();
        // TODO: Wire this up to a real API endpoint.
        // For now, log the form data as a placeholder.
        const i18n = this._i18n;
        const t = (key) => (i18n ? i18n.t(key) : key);
        console.log('Application submitted:', {
            job: this.job?.identifier,
            firstName: this._firstName,
            lastName: this._lastName,
            email: this._email,
            message: this._message,
        });
        alert(t('job-offer-detail.apply-success'));
        this._firstName = '';
        this._lastName = '';
        this._email = '';
        this._message = '';
        this.close();
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
                <!-- Title slot -->
                <div slot="title">
                    <h3 class="modal-title">${job ? job.title : ''}</h3>
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
                                          <dd>${job.organization}</dd>
                                      </div>
                                  </dl>

                                  <div class="meta-actions">
                                      <span class="job-tag">${job.areaOfInterest}</span>
                                      <div class="action-buttons">
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

                              <!-- Job description -->
                              <p class="job-description">${job.description}</p>

                              <!-- Requirements section -->
                              ${job.requirements && job.requirements.length > 0
                                  ? html`
                                        <h4 class="requirements-heading">
                                            ${t('job-offer-detail.requirements')}
                                        </h4>
                                        <ul class="requirements-list">
                                            ${job.requirements.map(
                                                (req) => html`
                                                    <li>${req}</li>
                                                `,
                                            )}
                                        </ul>
                                    `
                                  : ''}

                              <!-- Application form -->
                              <form class="apply-form" @submit="${this.onSubmit}" novalidate>
                                  <h4 class="apply-heading">
                                      ${t('job-offer-detail.application-title')}
                                  </h4>

                                  <div class="form-row">
                                      <div class="field">
                                          <label class="label" for="apply-first-name">
                                              ${t('job-offer-detail.first-name')}
                                              <span class="required-mark" aria-hidden="true">
                                                  *
                                              </span>
                                          </label>
                                          <div class="control">
                                              <input
                                                  id="apply-first-name"
                                                  class="input"
                                                  type="text"
                                                  required
                                                  .value="${this._firstName}"
                                                  @input="${(e) =>
                                                      (this._firstName = e.target.value)}"
                                                  autocomplete="given-name" />
                                          </div>
                                      </div>

                                      <div class="field">
                                          <label class="label" for="apply-last-name">
                                              ${t('job-offer-detail.last-name')}
                                              <span class="required-mark" aria-hidden="true">
                                                  *
                                              </span>
                                          </label>
                                          <div class="control">
                                              <input
                                                  id="apply-last-name"
                                                  class="input"
                                                  type="text"
                                                  required
                                                  .value="${this._lastName}"
                                                  @input="${(e) =>
                                                      (this._lastName = e.target.value)}"
                                                  autocomplete="family-name" />
                                          </div>
                                      </div>

                                      <div class="field">
                                          <label class="label" for="apply-email">
                                              ${t('job-offer-detail.email')}
                                              <span class="required-mark" aria-hidden="true">
                                                  *
                                              </span>
                                          </label>
                                          <div class="control">
                                              <input
                                                  id="apply-email"
                                                  class="input"
                                                  type="email"
                                                  required
                                                  .value="${this._email}"
                                                  @input="${(e) => (this._email = e.target.value)}"
                                                  autocomplete="email" />
                                          </div>
                                      </div>
                                  </div>

                                  <div class="field">
                                      <label class="label" for="apply-message">
                                          ${t('job-offer-detail.message')}
                                      </label>
                                      <div class="control">
                                          <textarea
                                              id="apply-message"
                                              class="textarea"
                                              rows="4"
                                              .value="${this._message}"
                                              @input="${(e) =>
                                                  (this._message = e.target.value)}"></textarea>
                                      </div>
                                  </div>

                                  <div class="form-footer">
                                      <button class="button is-primary" type="submit">
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
                font-size: 0.95rem;
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
                font-size: 0.8rem;
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

            .form-row .field {
                margin-bottom: 0;
            }

            .required-mark {
                color: var(--dbp-danger, #e53935);
                margin-left: 0.1rem;
            }

            .form-footer {
                display: flex;
                justify-content: flex-end;
                margin-top: 1rem;
            }

            /* Textarea inherits input styling */
            .textarea {
                width: 100%;
                resize: vertical;
                min-height: 6rem;
                font-family: inherit;
                font-size: inherit;
                padding: 0.5rem 0.75rem;
                border: var(--dbp-border);
                border-radius: var(--dbp-border-radius);
                background: var(--dbp-background);
                color: var(--dbp-content);
                box-sizing: border-box;
            }

            .textarea:focus {
                outline: none;
                border-color: var(--dbp-accent);
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
            }
        `;
    }
}

commonUtils.defineCustomElement('dbp-bulletin-job-offer-detail', JobOfferDetail);
