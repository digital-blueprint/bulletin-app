import {css, html} from 'lit';
import * as commonUtils from '@dbp-toolkit/common/utils';
import * as commonStyles from '@dbp-toolkit/common/src/styles.js';
import {ScopedElementsMixin} from '@dbp-toolkit/common/src/scoped/ScopedElementsMixin.js';
import {Icon, Modal} from '@dbp-toolkit/common';
import DBPBulletinLitElement from './dbp-bulletin-lit-element.js';
import {JobOfferDialog} from './dbp-bulletin-job-offer-dialog.js';
import {getAreaOfInterestLabels} from './modules/jobOfferForm.js';

export class JobOfferPreviewDialog extends ScopedElementsMixin(DBPBulletinLitElement) {
    static get scopedElements() {
        return {
            'dbp-icon': Icon,
            'dbp-modal': Modal,
            'dbp-bulletin-job-offer-dialog': JobOfferDialog,
        };
    }

    constructor() {
        super();
        /** @type {object|null} The job offer currently being previewed */
        this.job = null;
    }

    static get properties() {
        return {
            ...super.properties,
            job: {state: true},
        };
    }

    /**
     * Opens the preview dialog with the given job offer.
     * @param {object} job
     */
    open(job) {
        this.job = job;
        const modal = this._('dbp-modal');
        if (modal) {
            modal.open();
        }
    }

    /** Closes the preview dialog. */
    close() {
        const modal = this._('dbp-modal');
        if (modal) {
            modal.close();
        }
    }

    /** Opens the edit dialog pre-filled with the current job. */
    _onEdit() {
        const editDialog = this._('dbp-bulletin-job-offer-dialog');
        if (editDialog) {
            editDialog.open(this.job);
        }
    }

    /**
     * Formats an ISO date string (YYYY-MM-DD) to a locale-aware display string.
     * Falls back to the raw value when parsing fails.
     * @param {string} dateStr
     * @returns {string}
     */
    _formatDate(dateStr) {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString(this.lang === 'de' ? 'de-AT' : 'en-GB');
        } catch {
            return dateStr;
        }
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
            <div class="area-badges">
                ${areaOfInterestLabels.map(
                    (label) => html`
                        <span class="area-badge">${label}</span>
                    `,
                )}
            </div>
        `;
    }

    _localized(primary, en = '') {
        return this.lang === 'en' && en ? en : primary;
    }

    _localizedList(primary, en = []) {
        return this.lang === 'en' && Array.isArray(en) && en.length > 0 ? en : primary;
    }

    render() {
        const i18n = this._i18n;
        const t = (key) => (i18n ? i18n.t(key) : key);
        const job = this.job;

        return html`
            <dbp-modal
                modal-id="job-offer-preview-dialog"
                lang="${this.lang}"
                style="--dbp-modal-min-width: min(95vw, 760px); --dbp-modal-max-width: min(95vw, 760px); --dbp-modal-max-height: 90vh; --dbp-modal-content-overflow-y: auto;">
                <div slot="title">
                    <h3 class="preview-title">
                        ${job ? this._localized(job.title, job.titleEn ?? '') : ''}
                    </h3>
                </div>

                <div slot="content" class="preview-content">
                    ${job
                        ? html`
                              <!-- Meta information row: left = key-value fields, right = badge + action buttons -->
                              <div class="meta-row">
                                  <div class="meta-fields">
                                      <p class="meta-item">
                                          <strong>${t('job-offer-preview.published-at')}:</strong>
                                          ${this._formatDate(job.publishedAt)}
                                      </p>
                                      <p class="meta-item">
                                          <strong>${t('job-offer-preview.deadline')}:</strong>
                                          ${this._formatDate(job.deadline)}
                                      </p>
                                      <p class="meta-item">
                                          <strong>${t('job-offer-preview.start-date')}:</strong>
                                          ${job.startDate ?? ''}
                                      </p>
                                      <p class="meta-item">
                                          <strong>${t('job-offer-preview.weekly-hours')}:</strong>
                                          ${this._localized(
                                              job.weeklyHours ?? '',
                                              job.weeklyHoursEn ?? '',
                                          )}
                                      </p>
                                      <p class="meta-item">
                                          <strong>${t('job-offer-preview.organization')}:</strong>
                                          ${this._localized(
                                              job.organization ?? '',
                                              job.organizationEn ?? '',
                                          )}
                                      </p>
                                  </div>

                                  <!-- Right column: area badge at top, action buttons at bottom -->
                                  <div class="meta-right">
                                      ${this._renderAreaOfInterestTags(job, t)}
                                      <div class="action-buttons">
                                          <button
                                              class="button is-secondary action-btn"
                                              type="button"
                                              @click="${this._onEdit}">
                                              <dbp-icon
                                                  class="btn-icon"
                                                  name="pencil"
                                                  aria-hidden="true"></dbp-icon>
                                              ${t('job-offer-preview.edit')}
                                          </button>
                                          <button
                                              class="button is-secondary action-btn"
                                              type="button"
                                              @click="${() =>
                                                  console.log(
                                                      'Delete job offer:',
                                                      job.identifier,
                                                  )}">
                                              <dbp-icon
                                                  class="btn-icon"
                                                  name="trash"
                                                  aria-hidden="true"></dbp-icon>
                                              ${t('job-offer-preview.delete')}
                                          </button>
                                          <button
                                              class="button is-primary action-btn"
                                              type="button"
                                              @click="${() =>
                                                  console.log(
                                                      'View applications for:',
                                                      job.identifier,
                                                  )}">
                                              <dbp-icon
                                                  class="btn-icon"
                                                  name="users"
                                                  aria-hidden="true"></dbp-icon>
                                              ${t('job-offer-preview.view-applications')}
                                          </button>
                                      </div>
                                  </div>
                              </div>

                              <!-- Description -->
                              <p class="description">
                                  ${this._localized(job.description, job.descriptionEn ?? '')}
                              </p>

                              <!-- Requirements section -->
                              ${this._localizedList(job.requirements, job.requirementsEn).length > 0
                                  ? html`
                                        <h4 class="section-heading">
                                            ${t('job-offer-preview.requirements')}
                                        </h4>
                                        <ul class="requirements-list">
                                            ${this._localizedList(
                                                job.requirements,
                                                job.requirementsEn,
                                            ).map(
                                                (req) => html`
                                                    <li>${req}</li>
                                                `,
                                            )}
                                        </ul>
                                    `
                                  : ''}

                              <!-- Optional link -->
                              ${this._localized(job.linkName ?? '', job.linkNameEn ?? '') &&
                              this._localized(job.linkUrl ?? '', job.linkUrlEn ?? '')
                                  ? html`
                                        <p class="link-row">
                                            <a
                                                href="${this._localized(
                                                    job.linkUrl,
                                                    job.linkUrlEn ?? '',
                                                )}"
                                                target="_blank"
                                                rel="noopener noreferrer">
                                                ${this._localized(
                                                    job.linkName,
                                                    job.linkNameEn ?? '',
                                                )}
                                            </a>
                                        </p>
                                    `
                                  : ''}
                          `
                        : ''}
                </div>
            </dbp-modal>

            <!-- Edit dialog — nested inside the preview dialog -->
            <dbp-bulletin-job-offer-dialog
                lang="${this.lang}"
                @dbp-job-offer-update="${(e) =>
                    console.log('Updated job offer:', e.detail)}"></dbp-bulletin-job-offer-dialog>
        `;
    }

    static get styles() {
        return css`
            ${commonStyles.getThemeCSS()}
            ${commonStyles.getGeneralCSS()}
            ${commonStyles.getButtonCSS()}

            .preview-title {
                margin: 0;
                font-size: 1.4rem;
                font-weight: 700;
            }

            .preview-content {
                display: flex;
                flex-direction: column;
                gap: 1rem;
            }

            /* Top meta row: left = key-value list, right = badge + buttons */
            .meta-row {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                gap: 1.5rem;
            }

            .meta-fields {
                display: flex;
                flex-direction: column;
                gap: 0.1rem;
            }

            .meta-item {
                margin: 0;
                font-size: 0.95rem;
            }

            /* Right column: badge pinned to top, buttons pushed to bottom */
            .meta-right {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                justify-content: space-between;
                gap: 1rem;
                flex-shrink: 0;
            }

            /* Area-of-interest badge */
            .area-badges {
                display: flex;
                flex-wrap: wrap;
                gap: 0.4rem;
                justify-content: flex-end;
            }

            .area-badge {
                display: inline-block;
                padding: 0.25rem 0.75rem;
                border: 1px solid var(--dbp-content-surface, #333);
                border-radius: 2px;
                font-size: 0.9rem;
            }

            /* Action buttons row */
            .action-buttons {
                display: flex;
                gap: 0.75rem;
                flex-wrap: wrap;
                justify-content: flex-end;
            }

            .action-btn {
                display: inline-flex;
                align-items: center;
                gap: 0.4rem;
            }

            /* Icon inside buttons */
            .btn-icon {
                flex-shrink: 0;
                top: 0;
            }

            /* Job description */
            .description {
                margin: 0;
                line-height: 1.6;
            }

            /* Requirements heading */
            .section-heading {
                font-size: 1.1rem;
                font-weight: 700;
                margin: 0.5rem 0 0.5rem;
            }

            /* Requirements list */
            .requirements-list {
                margin: 0;
                padding-left: 1.5rem;
                display: flex;
                flex-direction: column;
                gap: 0.4rem;
            }

            .requirements-list li {
                line-height: 1.5;
            }

            /* Optional link */
            .link-row {
                margin: 0;
            }
        `;
    }
}

commonUtils.defineCustomElement('dbp-bulletin-job-offer-preview-dialog', JobOfferPreviewDialog);
