/**
 * Converts a managed Formalize form into the shape expected by the job detail dialog.
 *
 * @param {Record<string, any>} form
 * @returns {Record<string, any>}
 */
export function getManagedJobOffer(form) {
    const additionalData = form?.additionalData ?? {};

    return {
        ...additionalData,
        identifier: form?.formId ?? '',
        title: additionalData.title || form?.formName || '',
        publishedAt: additionalData.publishedAt || form?.dateCreated || '',
        dataFeedSchema: form?.dataFeedSchema ?? '',
    };
}

/**
 * Opens a temporary read-only job detail dialog from the manage-forms overview.
 *
 * @param {Record<string, any>} host
 * @param {Record<string, any>} form
 * @returns {Promise<void>}
 */
export async function openManagedJobOfferPreview(host, form) {
    const container = host?.renderRoot ?? document.body;
    container.querySelector('[data-managed-job-offer-preview]')?.remove();

    const detail = /** @type {HTMLElement & Record<string, any>} */ (
        document.createElement('dbp-bulletin-job-offer-detail')
    );
    detail.dataset.managedJobOfferPreview = '';
    detail.setAttribute('subscribe', 'university-short-name');
    detail.job = getManagedJobOffer(form);
    detail.preview = true;
    detail.lang = host?.lang ?? 'en';
    detail.langDir = host?.langDir ?? '';
    detail.auth = host?.auth ?? {};
    detail.entryPointUrl = host?.entryPointUrl ?? '';
    detail.addEventListener('dbp-modal-closed', () => detail.remove(), {once: true});
    container.appendChild(detail);

    await detail.open();
}
