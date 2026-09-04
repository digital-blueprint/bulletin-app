import {css, html} from 'lit';
import {ScopedElementsMixin} from '@dbp-toolkit/common/src/scoped/ScopedElementsMixin.js';
import {Modal, Icon} from '@dbp-toolkit/common';
import * as commonUtils from '@dbp-toolkit/common/utils';
import * as commonStyles from '@dbp-toolkit/common/src/styles.js';
import DBPBulletinLitElement from './dbp-bulletin-lit-element.js';
import {sendNotification} from '@dbp-toolkit/common';
import {Notification} from '@dbp-toolkit/notification';
import {
    getAreaOfInterestLabels,
    JobOfferFormElement,
    getJobCategoryLabel,
} from './modules/jobOfferForm.js';
import {getWorkLocationLabels} from './modules/workLocationsElement.js';
import {formatHoursRange} from './modules/hoursRangeElement.js';

export class JobOfferDetail extends ScopedElementsMixin(DBPBulletinLitElement) {
    constructor() {
        super();
        /** @type {object|null} The job offer to display */
        this.job = null;
        /** @type {boolean} Whether the share dropdown is open */
        this._shareDropdownOpen = false;
        this._onDocumentPointerDown = this._handleDocumentPointerDown.bind(this);
        this.universityShortName = '';
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
            universityShortName: {type: String, attribute: 'university-short-name'},
        };
    }

    connectedCallback() {
        super.connectedCallback();
        document.addEventListener('pointerdown', this._onDocumentPointerDown);
    }

    disconnectedCallback() {
        document.removeEventListener('pointerdown', this._onDocumentPointerDown);
        super.disconnectedCallback();
    }

    /** Opens the modal dialog. */
    async open() {
        await this.updateComplete;
        const modal = this.shadowRoot?.querySelector('dbp-modal');

        if (!modal) {
            return;
        }

        await modal.updateComplete;

        if (modal.modalDialog) {
            modal.open();
        }
    }

    /** Closes the modal dialog. */
    close() {
        this._shareDropdownOpen = false;
        const modal = this.shadowRoot?.querySelector('dbp-modal');
        if (modal?.modalDialog) {
            modal.close();
        }
    }
    /**
     * Renders a list section when at least one item is available.
     * @param {string} title
     * @param {unknown} value
     * @returns {import('lit').TemplateResult|string}
     */

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

    _localizedList(primary, en) {
        const primaryItems = Array.isArray(primary) ? primary : [];
        const enItems = Array.isArray(en) ? en : [];

        return this.lang === 'en' && enItems.length > 0 ? enItems : primaryItems;
    }

    _getLocalizedTitle(job) {
        return this._localized(job.title ?? '', job.titleEn ?? '');
    }

    _getLocalizedDescription(job) {
        return this._localized(job.description ?? '', job.descriptionEn ?? '');
    }

    _getLocalizedContractDuration(job) {
        return this._localized(job.contractDuration ?? '', job.contractDurationEn ?? '');
    }

    _getLocalizedContactInformation(job) {
        return this._localized(job.contactInformation ?? '', job.contactInformationEn ?? '');
    }

    _getLocalizedLinkName(job) {
        return this._localized(job.linkName ?? '', job.linkNameEn ?? '');
    }

    _getLocalizedLinkURL(job) {
        return this._localized(job.linkUrl ?? '', job.linkUrlEn ?? '');
    }

    _getLocalizedLink(job) {
        const linkURL = this._getLocalizedLinkURL(job);
        const linkName = this._getLocalizedLinkName(job);

        return html`
            <a class="meta-job-link" href="${linkURL}" target="_blank" rel="noopener noreferrer">
                ${linkName || linkURL}
            </a>
        `;
    }
    _getLocalizedRequirements(job) {
        const items = this._localizedList(job.requirements, job.requirementsEn);
        if (items.length === 0) {
            return '';
        }

        return html`
            <ul class="job-overview-list">
                ${items.map(
                    (item) => html`
                        <li>${item}</li>
                    `,
                )}
            </ul>
        `;
    }

    _getLocalizedQualification(job) {
        const items = this._localizedList(job.requiredQualification, job.requiredQualificationEn);
        if (items.length === 0) {
            return '';
        }

        return html`
            <ul class="job-overview-list">
                ${items.map(
                    (item) => html`
                        <li>${item}</li>
                    `,
                )}
            </ul>
        `;
    }

    _getLocalizedResponsibilities(job) {
        const items = this._localizedList(job.responsibilities, job.responsibilitiesEn);
        if (items.length === 0) {
            return '';
        }

        return html`
            <ul class="job-overview-list">
                ${items.map(
                    (item) => html`
                        <li>${item}</li>
                    `,
                )}
            </ul>
        `;
    }

    _getWeOffer(job) {
        const items = this._localizedList(job.weOffer, job.weOfferEn);
        if (items.length === 0) {
            return '';
        }

        return html`
            <ul class="job-overview-list">
                ${items.map(
                    (item) => html`
                        <li>${item}</li>
                    `,
                )}
            </ul>
        `;
    }

    _getJobCategory(job) {
        const t = (key) => this._i18n.t(key);
        const jobCategoryLabel = job.jobCategory ? getJobCategoryLabel(job.jobCategory, t) : '';
        return html`
            ${jobCategoryLabel}
        `;
    }

    _getLocalizedMonthlySalary(job) {
        return this._localized(job.salary ?? '', job.salaryEn ?? '');
    }

    _renderAreaOfInterestTags(job) {
        const t = (key) => this._i18n.t(key);
        const areaOfInterestLabels = getAreaOfInterestLabels(
            job.areasOfInterest ?? job.areaOfInterest,
            t,
        );

        if (areaOfInterestLabels.length === 0) {
            return '';
        }

        return html`
            <div class="job-tags">
                <span class="tag-label">${t('view-job-offers.areas-of-interest')}:</span>
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

    _isExternalJob(job = this.job) {
        return job?.jobOfferType === 'external';
    }

    _getExternalJobUrl(job = this.job) {
        try {
            const url = new URL(String(job?.externalJobUrl ?? '').trim());
            return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
        } catch {
            return '';
        }
    }

    _getCompanyValue(companyData, primaryKey, fallbackKeys = []) {
        const keys = [primaryKey, ...fallbackKeys];
        const value = keys.map((key) => companyData?.[key]).find((item) => item);

        return Array.isArray(value) ? value.join(', ') : String(value ?? '').trim();
    }

    _renderCompanyMetaItem(label, value) {
        if (!value) {
            return '';
        }

        return html`
            <div class="company-info-item">
                <dt>${label}:</dt>
                <dd>${value}</dd>
            </div>
        `;
    }

    _renderCompanyTextBlock(title, value) {
        if (!value) {
            return '';
        }

        const lines = value.split(/\r?\n/);

        return html`
            <section class="company-info-block">
                <h4 class="company-info-title">${title}</h4>
                <p>
                    ${lines.map((line, index) =>
                        index === 0
                            ? line
                            : html`
                                  <br />
                                  ${line}
                              `,
                    )}
                </p>
            </section>
        `;
    }

    _renderCompanyInformation(job, t) {
        const companyData = job.companyData ?? {};
        const companyName =
            this._getCompanyValue(companyData, 'name', ['companyName']) || job.companyName;
        const department = this._getCompanyValue(companyData, 'abteilung', ['department']);
        const address = this._getCompanyValue(companyData, 'adresse', ['address']);
        const postalCode = this._getCompanyValue(companyData, 'plz', ['postalCode']);
        const city = this._getCompanyValue(companyData, 'ort', ['city']);
        const contactPerson = this._getCompanyValue(companyData, 'kontaktperson', ['contactName']);
        const phone = this._getCompanyValue(companyData, 'telefonnummer', ['contactPhone']);
        const email = this._getCompanyValue(companyData, 'email', ['contactEmail']);
        const website = this._getCompanyValue(companyData, 'url', ['website']);
        const teaser = this._getCompanyValue(companyData, 'teaser');
        const description = this._getCompanyValue(companyData, 'beschreibung', ['description']);
        const products = this._getCompanyValue(companyData, 'produkte', ['products']);
        const locations = this._getCompanyValue(companyData, 'standorte', ['locations']);
        const employeesNational = this._getCompanyValue(companyData, 'mitarbeiter_national');
        const employeesTotal = this._getCompanyValue(companyData, 'mitarbeiter_gesamt');
        const rdEmployees = this._getCompanyValue(companyData, 'fe_beschaeftigte');
        const sectorValues = companyData.branchen ?? companyData.relation_partner_branchen ?? [];
        const sectors = (
            Array.isArray(sectorValues) ? sectorValues : String(sectorValues).split(/[,;|]/)
        )
            .map((value) => String(value).trim())
            .filter(Boolean)
            .map((value) => t(`company-form.industry-${value}`, {defaultValue: value}))
            .join(', ');
        const location = [postalCode, city].filter(Boolean).join(' ');

        if (
            !companyName &&
            !department &&
            !address &&
            !location &&
            !sectors &&
            !employeesNational &&
            !employeesTotal &&
            !rdEmployees &&
            !email &&
            !website &&
            !description
        ) {
            return '';
        }

        return html`
            <div class="apply-submit-wrapper">
                <h3>${t('job-offer-detail.company')}</h3>
                <hr />
                <dl class="company-info-list">
                    ${this._renderCompanyMetaItem(t('company-form.field-name'), companyName)}
                    ${this._renderCompanyMetaItem(t('company-form.field-department'), department)}
                    ${this._renderCompanyMetaItem(t('company-form.field-address'), address)}
                    ${this._renderCompanyMetaItem(t('company-form.field-city'), location)}
                    ${this._renderCompanyMetaItem(
                        t('company-form.field-contact-person'),
                        contactPerson,
                    )}
                    ${this._renderCompanyMetaItem(t('company-form.field-phone-number'), phone)}
                    ${this._renderCompanyMetaItem(
                        t('company-form.field-email'),
                        email
                            ? html`
                                  <a
                                      class="meta-job-link"
                                      href="mailto:${email}"
                                      rel="noopener noreferrer">
                                      ${email}
                                  </a>
                              `
                            : '',
                    )}
                    ${this._renderCompanyMetaItem(
                        t('company-form.field-url'),
                        website
                            ? html`
                                  <a
                                      class="meta-job-link"
                                      href="${website}"
                                      target="_blank"
                                      rel="noopener noreferrer">
                                      ${website}
                                  </a>
                              `
                            : '',
                    )}
                    ${this._renderCompanyMetaItem(t('company-form.field-industries'), sectors)}
                    ${this._renderCompanyMetaItem(
                        t('company-form.field-employees-national'),
                        employeesNational,
                    )}
                    ${this._renderCompanyMetaItem(
                        t('company-form.field-employees-total'),
                        employeesTotal,
                    )}
                    ${this._renderCompanyMetaItem(
                        t('company-form.field-rd-employees'),
                        rdEmployees,
                    )}
                </dl>
                ${this._renderCompanyTextBlock(t('company-form.field-teaser'), teaser)}
                ${this._renderCompanyTextBlock(t('company-form.field-description'), description)}
                ${this._renderCompanyTextBlock(t('company-form.field-products'), products)}
                ${this._renderCompanyTextBlock(t('company-form.field-locations'), locations)}
            </div>
        `;
    }

    _renderJobMetaItem(label, value) {
        if (!value) {
            return '';
        }

        return html`
            <div class="meta-item">
                <span class="meta-item-label">${label}:</span>
                ${value}
            </div>
        `;
    }

    _renderWorkLocationList(labels) {
        const i18n = this._i18n;
        const t = (key) => (i18n ? i18n.t(key) : key);
        if (!labels.length) {
            return '';
        }

        return html`
            <span class="meta-item-label">${t('manage-job-offers.field-work-locations')}:</span>
            ${labels.map(
                (label) => html`
                    <span class="work-location-list-item">${label}</span>
                `,
            )}
        `;
    }

    _handleApply() {
        if (this._isExternalJob()) {
            const externalJobUrl = this._getExternalJobUrl();
            if (externalJobUrl) {
                window.open(externalJobUrl, '_blank', 'noopener,noreferrer');
            }
            return;
        }

        const formEl = this.shadowRoot?.querySelector('dbp-bulletin-job-offer-form');
        if (formEl) {
            formEl.scrollIntoView({behavior: 'smooth'});
        }
    }

    /**
     * Returns a truncated description for sharing (personalizable length, word-boundary safe).
     * @param {object} job
     * @param {number} maxLen
     * @returns {string}
     */
    _getShareDescription(job = this.job, maxLen = 180) {
        const raw = this._getLocalizedDescription(job).trim().replace(/\s+/g, ' ');
        if (raw.length <= maxLen) {
            return raw;
        }
        const sliced = raw.slice(0, maxLen);
        const lastSpace = sliced.lastIndexOf(' ');
        return (lastSpace > 40 ? sliced.slice(0, lastSpace) : sliced).trim() + '…';
    }

    /**
     * Builds the i18n-personalizable e-mail/share payload (same text for both channels).
     * All wording is defined via i18n so the final copy can be confirmed without code changes.
     * @returns {{subject: string, body: string, url: string}}
     */
    _getShareEmailData() {
        const t = (key, opts) => this._i18n.t(key, opts);
        const title = this._getLocalizedTitle(this.job);
        const url = this.getShareUrl();
        const description = this._getShareDescription(this.job, 180);
        const organization = this.getOrganizationLabel(this.job) || '';
        const organizationSuffix = organization
            ? t('job-offer-detail.share-email-body-organization-suffix', {organization})
            : '';
        const subject = t('job-offer-detail.share-email-subject', {
            title,
            organization,
            organizationSuffix,
        });
        const body = t('job-offer-detail.share-email-body', {
            title,
            organization,
            organizationSuffix,
            description,
            url,
        });
        return {subject, body, url, title, description, organization, organizationSuffix};
    }

    /**
     * Handles the share button — uses native share if available, otherwise toggles the custom share dropdown.
     * Uses the same i18n template as mailto for consistency.
     */
    async onShare() {
        if ('share' in navigator) {
            try {
                const {subject, body, url} = this._getShareEmailData();
                await navigator.share({
                    title: subject,
                    text: body,
                    url,
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
        const {subject, body} = this._getShareEmailData();
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

    _handleDocumentPointerDown(event) {
        if (!this._shareDropdownOpen) {
            return;
        }

        const shareContainer = this.shadowRoot?.querySelector('.share-button-container');
        if (!shareContainer || event.composedPath().includes(shareContainer)) {
            return;
        }

        this._shareDropdownOpen = false;
    }

    _handleModalClosed() {
        this._shareDropdownOpen = false;
    }

    getInternalFavicon(job) {
        const i18n = this._i18n;
        const t = (key) => (i18n ? i18n.t(key) : key);
        let getfaviconURL = commonUtils.getAssetURL(
            '@digital-blueprint/bulletin-app',
            'icon/favicon.svg',
        );

        if (!job.externalJobUrl) {
            return html`
                <img
                    src="${getfaviconURL}"
                    aria-label="${t('manage-job-offers.job-type-internal')}" />
            `;
        }
    }

    getInternalLogo(job) {
        const i18n = this._i18n;
        const t = (key) => (i18n ? i18n.t(key) : key);
        const logoUrl = commonUtils.getAssetURL('@digital-blueprint/bulletin-app', 'icon/logo.svg');

        if (!job.externalJobUrl) {
            return html`
                <img
                    src="${logoUrl}"
                    alt="${t('manage-job-offers.job-type-internal')} Job"
                    class="internal-logo"
                    loading="lazy" />
            `;
        }
        return '';
    }

    _renderPartnerCompanyMarker(job, t) {
        if (job.jobOfferType === 'internal' || !job.isFromPartnerCompany) {
            return null;
        }

        return html`
            <span class="partner-company-marker" title="${t('view-job-offers.partner-company')}">
                <dbp-icon name="star" aria-hidden="true"></dbp-icon>
                ${t('view-job-offers.partner')}
            </span>
        `;
    }

    getOrganizationLabel(job) {
        if (job.jobOfferType === 'internal') {
            return this.universityShortName;
        }

        const companyName = job.companyName ?? '';
        if (job.jobOfferType !== 'external' || !job.isFromPartnerCompany) {
            return companyName;
        }

        const website = job.companyData?.url ?? job.companyData?.website ?? '';
        try {
            const companyUrl = new URL(String(website).trim());
            if (['http:', 'https:'].includes(companyUrl.protocol)) {
                return html`
                    <a
                        class="partner-company-link"
                        href="${companyUrl.href}"
                        target="_blank"
                        rel="noopener noreferrer">
                        ${companyName}
                    </a>
                `;
            }
        } catch {
            // Fall back to plain name when no valid website is available.
        }

        return companyName;
    }

    render() {
        const job = this.job;
        const i18n = this._i18n;
        const t = (key, options) => (i18n ? i18n.t(key, options) : key);
        const isExternalJob = this._isExternalJob(job);
        const workLocationLabels = getWorkLocationLabels(job?.workLocations, t, this.lang);
        const localizedContractDuration = job ? this._getLocalizedContractDuration(job) : '';
        const localizedWeeklyHours = job
            ? this._localized(
                  formatHoursRange(job.weeklyHoursMin, job.weeklyHoursMax, job.weeklyHours),
                  job.weeklyHoursEn ?? '',
              )
            : '';
        const localizedMonthlySalary = job ? this._getLocalizedMonthlySalary(job) : '';
        const localizedContactInformation = job ? this._getLocalizedContactInformation(job) : '';
        const localizedLinkUrl = job ? this._getLocalizedLinkURL(job) : '';
        return html`
            <dbp-modal
                modal-id="job-offer-detail-dialog"
                lang="${this.lang}"
                @dbp-modal-closed="${this._handleModalClosed}"
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
                    ${
                        job
                            ? html`
                                  <!-- Meta row: left column = key-value pairs, right column = tag + actions -->
                                  <div class="content-wrapper">
                                      <div class="meta-row">
                                          <dl class="meta-list">
                                              ${this._renderPartnerCompanyMarker(job, t)}
                                              <div class="meta-item favicon">
                                                  ${
                                                      isExternalJob
                                                          ? html`
                                                                <span class="job-meta-type">
                                                                    ${this.getOrganizationLabel(job)}
                                                                </span>
                                                            `
                                                          : this.getInternalLogo(job)
                                                  }
                                              </div>

                                              ${
                                                  !isExternalJob
                                                      ? html`
                                                            <div class="meta-item">
                                                                <span class="meta-item-label">
                                                                    ${t('job-offer-detail.organization')}:
                                                                </span>

                                                                ${this._localized(
                                                                    job.organization,
                                                                    job.organizationEn ?? '',
                                                                )}
                                                            </div>
                                                        `
                                                      : ''
                                              }
                                              <div class="meta-item">
                                                  <span class="meta-item-label">
                                                      ${t('job-offer-detail.published-at')}:
                                                  </span>
                                                  ${this.formatDate(job.publishedAt)}
                                              </div>
                                              <div class="meta-item">
                                                  <span class="meta-item-label">
                                                      ${t('job-offer-detail.deadline')}:
                                                  </span>
                                                  ${this.formatDate(job.deadline)}
                                              </div>
                                              <div class="meta-item work-location">
                                                  ${this._renderWorkLocationList(
                                                      workLocationLabels.map((label) =>
                                                          label.split(', ').slice(0, 2).join(', '),
                                                      ),
                                                  )}
                                              </div>
                                          </dl>

                                          <div class="meta-actions">
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
                                                      ${
                                                          this._shareDropdownOpen
                                                              ? html`
                                                                    <div class="share-dropdown">
                                                                        <button
                                                                            class="button"
                                                                            @click="${this.shareCopy}">
                                                                            <dbp-icon
                                                                                name="link"
                                                                                aria-hidden="true"
                                                                                class="btn-icon"></dbp-icon>
                                                                            ${t(
                                                                                'job-offer-detail.share-copy',
                                                                            )}
                                                                        </button>
                                                                        <button
                                                                            class="button"
                                                                            @click="${this.shareViaEmail}">
                                                                            <dbp-icon
                                                                                name="envelope"
                                                                                aria-hidden="true"
                                                                                class="btn-icon"></dbp-icon>
                                                                            ${t(
                                                                                'job-offer-detail.share-email',
                                                                            )}
                                                                        </button>
                                                                        <button
                                                                            class="button"
                                                                            @click="${
                                                                                this.shareOnWhatsApp
                                                                            }">
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
                                                                            @click="${
                                                                                this.shareOnLinkedIn
                                                                            }">
                                                                            <dbp-icon
                                                                                name="linkedin-original"
                                                                                aria-hidden="true"
                                                                                class="btn-icon"></dbp-icon>
                                                                            ${t(
                                                                                'job-offer-detail.share-linkedin',
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                `
                                                              : ''
                                                      }
                                                  </div>
                                                  ${
                                                      // For external job offers the button leads to
                                                      // the company website, so it is only useful
                                                      // when a valid link is available.
                                                      isExternalJob && !this._getExternalJobUrl(job)
                                                          ? ''
                                                          : html`
                                                                <button
                                                                    class="button is-primary apply-anchor-btn"
                                                                    type="button"
                                                                    @click="${() =>
                                                                        this._handleApply()}">
                                                                    <dbp-icon
                                                                        class="btn-icon"
                                                                        name="send-diagonal"
                                                                        aria-hidden="true"></dbp-icon>
                                                                    ${t('job-offer-detail.apply')}
                                                                </button>
                                                            `
                                                  }
                                              </div>
                                          </div>
                                      </div>

                                      <div>
                                          <div class="apply-submit-wrapper">
                                              <h3>${t('job-offer-detail.job-description')}</h3>
                                              <hr />
                                              <div class="job-description-wrapper">
                                                  ${
                                                      job?.startDate ||
                                                      localizedContractDuration ||
                                                      localizedWeeklyHours ||
                                                      localizedMonthlySalary ||
                                                      localizedContactInformation ||
                                                      localizedLinkUrl ||
                                                      job?.remote ||
                                                      job?.jobCategory
                                                          ? html`
                                                                <div
                                                                    class="job-description-meta-list">
                                                                    ${
                                                                        job?.startDate
                                                                            ? html`
                                                                                  <div
                                                                                      class="meta-item">
                                                                                      <span
                                                                                          class="meta-item-label">
                                                                                          ${t('job-offer-detail.start-date')}:
                                                                                      </span>
                                                                                      ${this.formatDate(job.startDate)}
                                                                                  </div>
                                                                              `
                                                                            : ''
                                                                    }
                                                                    ${
                                                                        localizedContractDuration
                                                                            ? html`
                                                                                  <div
                                                                                      class="meta-item">
                                                                                      <span
                                                                                          class="meta-item-label">
                                                                                          ${t('job-offer-detail.contract-duration')}:
                                                                                      </span>
                                                                                      ${localizedContractDuration}
                                                                                  </div>
                                                                              `
                                                                            : ''
                                                                    }
                                                                    ${
                                                                        localizedWeeklyHours
                                                                            ? html`
                                                                                  <div
                                                                                      class="meta-item">
                                                                                      <span
                                                                                          class="meta-item-label">
                                                                                          ${t('job-offer-detail.weekly-hours')}:
                                                                                      </span>
                                                                                      ${localizedWeeklyHours}
                                                                                  </div>
                                                                              `
                                                                            : ''
                                                                    }
                                                                    ${
                                                                        localizedMonthlySalary
                                                                            ? html`
                                                                                  <div
                                                                                      class="meta-item">
                                                                                      <span
                                                                                          class="meta-item-label">
                                                                                          ${t('job-offer-detail.monthly-salary')}:
                                                                                      </span>

                                                                                      ${localizedMonthlySalary}
                                                                                  </div>
                                                                              `
                                                                            : ''
                                                                    }
                                                                    ${
                                                                        localizedContactInformation
                                                                            ? html`
                                                                                  <div
                                                                                      class="meta-item">
                                                                                      <span
                                                                                          class="meta-item-label">
                                                                                          ${t('job-offer-detail.contact-information')}:
                                                                                      </span>

                                                                                      ${localizedContactInformation}
                                                                                  </div>
                                                                              `
                                                                            : ''
                                                                    }
                                                                    ${
                                                                        localizedLinkUrl
                                                                            ? html`
                                                                                  <div
                                                                                      class="meta-item">
                                                                                      <span
                                                                                          class="meta-item-label">
                                                                                          ${t('job-offer-detail.link')}:
                                                                                      </span>
                                                                                      ${this._getLocalizedLink(job)}
                                                                                  </div>
                                                                              `
                                                                            : ''
                                                                    }
                                                                    ${
                                                                        job?.remote
                                                                            ? html`
                                                                                  <div
                                                                                      class="meta-item">
                                                                                      <span
                                                                                          class="meta-item-label">
                                                                                          ${t('job-offer-detail.remote')}:
                                                                                      </span>
                                                                                      ${t('job-offer-detail.yes')}
                                                                                  </div>
                                                                              `
                                                                            : ''
                                                                    }
                                                                    ${
                                                                        job?.jobCategory
                                                                            ? html`
                                                                                  <div
                                                                                      class="meta-item">
                                                                                      <span
                                                                                          class="meta-item-label">
                                                                                          ${t('job-offer-detail.job-category')}:
                                                                                      </span>
                                                                                      ${this._getJobCategory(job)}
                                                                                  </div>
                                                                              `
                                                                            : ''
                                                                    }
                                                                </div>
                                                            `
                                                          : ''
                                                  }
                                                  ${
                                                      job.areasOfInterest?.length > 0
                                                          ? html`
                                                                <div class="tag">
                                                                    ${this._renderAreaOfInterestTags(job, t)}
                                                                </div>
                                                            `
                                                          : ''
                                                  }
                                              </div>
                                              ${this._renderDescription(job)}
                                              ${
                                                  this._localizedList(
                                                      job.requirements,
                                                      job.requirementsEn,
                                                  ).length > 0 ||
                                                  this._localizedList(
                                                      job.requiredQualification,
                                                      job.requiredQualificationEn,
                                                  ).length > 0 ||
                                                  this._localizedList(
                                                      job.responsibilities,
                                                      job.responsibilitiesEn,
                                                  ).length > 0 ||
                                                  this._localizedList(job.weOffer, job.weOfferEn)
                                                      .length > 0
                                                      ? html`
                                                            <div class="additional-info">
                                                                ${
                                                                    this._localizedList(
                                                                        job.requirements,
                                                                        job.requirementsEn,
                                                                    ).length > 0
                                                                        ? html`
                                                                              <div
                                                                                  class="meta-item additional-item">
                                                                                  <span
                                                                                      class="meta-item-label">
                                                                                      ${t('job-offer-detail.requirements')}:
                                                                                  </span>
                                                                                  ${this._getLocalizedRequirements(job)}
                                                                              </div>
                                                                          `
                                                                        : ''
                                                                }
                                                                ${
                                                                    this._localizedList(
                                                                        job.requiredQualification,
                                                                        job.requiredQualificationEn,
                                                                    ).length > 0
                                                                        ? html`
                                                                              <div
                                                                                  class="meta-item additional-item">
                                                                                  <span
                                                                                      class="meta-item-label">
                                                                                      ${t('job-offer-detail.qualifications')}:
                                                                                  </span>
                                                                                  ${this._getLocalizedQualification(job)}
                                                                              </div>
                                                                          `
                                                                        : ''
                                                                }
                                                                ${
                                                                    this._localizedList(
                                                                        job.responsibilities,
                                                                        job.responsibilitiesEn,
                                                                    ).length > 0
                                                                        ? html`
                                                                              <div
                                                                                  class="meta-item additional-item">
                                                                                  <span
                                                                                      class="meta-item-label">
                                                                                      ${t('job-offer-detail.responsibilities')}:
                                                                                  </span>
                                                                                  ${this._getLocalizedResponsibilities(job)}
                                                                              </div>
                                                                          `
                                                                        : ''
                                                                }
                                                                ${
                                                                    this._localizedList(
                                                                        job.weOffer,
                                                                        job.weOfferEn,
                                                                    ).length > 0
                                                                        ? html`
                                                                              <div
                                                                                  class="meta-item additional-item">
                                                                                  <span
                                                                                      class="meta-item-label">
                                                                                      ${t('job-offer-detail.we-offer')}:
                                                                                  </span>
                                                                                  ${this._getWeOffer(job)}
                                                                              </div>
                                                                          `
                                                                        : ''
                                                                }
                                                            </div>
                                                        `
                                                      : ''
                                              }
                                          </div>
                                      </div>

                                      ${isExternalJob ? this._renderCompanyInformation(job, t) : ''}

                                      <!-- Application form rendered by the JobOfferFormElement component.
                                           External job offers are applied for on the company website,
                                           so no application form is shown for them. -->
                                      ${
                                          isExternalJob
                                              ? ''
                                              : html`
                                                    <dbp-bulletin-job-offer-form
                                                        lang="${this.lang}"
                                                        .job="${job}"
                                                        .auth="${this.auth}"
                                                        entry-point-url="${this.entryPointUrl}"
                                                        form-identifier="${job.identifier}"
                                                        notification-target-id="dbp-notification-apply"></dbp-bulletin-job-offer-form>
                                                `
                                      }
                                  </div>
                              `
                            : ''
                    }
                </div>
            </dbp-modal>
        `;
    }

    static get styles() {
        return css`
            ${commonStyles.getThemeCSS()}
            ${commonStyles.getGeneralCSS()}
            ${commonStyles.getButtonCSS()}

            .content-wrapper {
                padding-right: 8px;
            }
            /* Meta section: info on the left, tag+actions on the right */
            .meta-row {
                display: grid;
                grid-template-columns: minmax(0, 1fr) max-content;
                align-items: flex-start;
                column-gap: 1rem;
            }

            .meta-list {
                margin: 0;
                padding: 0;
                list-style: none;
                min-width: 0;
                display: flex;
                flex-direction: column;
                justify-content: flex-end;
                gap: 2px;
            }

            .meta-item {
                display: inline;
                gap: 0.35rem;
                align-items: center;
            }

            .favicon {
                display: flex;
                gap: 0.35rem;
                align-items: center;
            }

            .meta-item-label,
            .tag-label,
            .company-info-item dt,
            .company-info-block h4 {
                font-weight: bolder;
            }

            .meta-item img {
                width: 100px;
            }

            .internal-logo {
                width: auto;
                object-fit: contain;
            }

            .job-meta-type {
                color: var(--dbp-primary);
                font-weight: bolder;
            }

            .partner-company-marker {
                display: flex;
                gap: 0.25rem;
                color: var(--dbp-primary);
                font-size: 1rem;
                font-weight: bolder;
                white-space: nowrap;
            }

            .partner-company-link {
                color: var(--dbp-primary);
            }

            .meta-item dt {
                font-weight: bolder;
                white-space: nowrap;
            }

            .meta-item dd {
                margin: 0;
                text-wrap-mode: nowrap;
            }

            .work-location {
                display: block;
            }

            .work-location-list {
                list-style: none;
            }

            .work-location-list-item {
                display: inline-block;
                border: 1px solid var(--dbp-content);
                border-radius: 2px;
                padding: 0.1rem 0.4rem;
                color: var(--dbp-content);
                margin-bottom: 0.2rem;
            }
            .meta-item.tag {
                margin-top: 0.5rem;
            }

            /* Right-side tag and action buttons stay in the second grid column */
            .meta-actions {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                gap: 0.75rem;
                min-width: 0;
                height: 100%;
                justify-content: end;
            }

            .meta-job-link {
                text-decoration: underline;
                color: var(--dbp-primary);
            }

            /* Outlined area-of-interest badge */
            .job-tags {
                display: flex;
                flex-wrap: wrap;
                gap: 0.2rem;
                justify-content: flex-start;
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

            /* Description paragraph */

            .job-description {
                flex: 3;
                padding: 10px 0;
            }

            h3 {
                margin: 0px;
                font-size: 1.3rem;
                font-weight: 400;
            }

            hr {
                margin-bottom: 1rem;
            }

            .job-description-wrapper {
                gap: 2px;
                display: flex;
                flex-direction: column;
            }

            .job-description-meta-list {
                display: flex;
                flex-direction: column;
                gap: 2px;
                flex: 2;
            }

            .job-overview-list {
                padding-left: 2px;
                list-style: none;
            }

            .additional-info {
                display: grid;
                grid-template-columns: 1fr;
                gap: 10px 1rem;
            }

            .additional-item li::before {
                content: '•';
                margin-right: 0.5rem;
            }

            .apply-submit-wrapper {
                margin-top: 2rem;
            }
            .company-info {
                border: var(--dbp-border);
                border-radius: var(--dbp-border-radius);
                margin: 0 0 1.5rem 0;
                padding: 1rem;
            }

            .company-info h3 {
                font-size: 1.1rem;
                font-weight: 700;
                margin: 0 0 0.75rem 0;
            }

            .company-info-block {
                margin-top: 0.5rem;
            }

            .company-info-list {
                display: grid;
                gap: 0.5rem 1rem;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                margin: 0;
            }

            .company-info-item {
                display: grid;
                align-content: start;
            }

            .company-info-item dd,
            .company-info-block p {
                margin: 0;
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

                .company-info-list {
                    grid-template-columns: 1fr;
                }

                .share-dropdown {
                    left: 0;
                    right: initial;
                }

                .action-buttons {
                    justify-content: start;
                }
            }

            /* Share dropdown styles */
            .share-dropdown {
                position: absolute;
                top: 100%;
                right: 0;
                background: var(--dbp-background);
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
