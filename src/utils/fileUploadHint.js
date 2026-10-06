/**
 * Builds a single, combined hint text for file upload limits,
 * e.g. "(e.g. resume, CV, etc.; max. 5 files and 10 MB per file)".
 *
 * If both limits are set they are merged into one sentence, otherwise only the
 * available limit is shown. Returns an empty string if neither limits nor
 * examples are given.
 * @param {(key: string, options?: Record<string, unknown>) => any} t - The translation function
 * @param {object} [options]
 * @param {number|null} [options.maxFiles] - Maximum number of files
 * @param {number|null} [options.maxSizeMb] - Maximum size per file in MB
 * @param {string} [options.examples] - Already translated examples of expected files
 * @returns {string}
 */
export function getFileUploadLimitHint(t, {maxFiles = null, maxSizeMb = null, examples = ''} = {}) {
    const hasMaxFiles = typeof maxFiles === 'number' && Number.isFinite(maxFiles) && maxFiles > 0;
    const hasMaxSize = typeof maxSizeMb === 'number' && Number.isFinite(maxSizeMb) && maxSizeMb > 0;

    let limits = '';
    if (hasMaxFiles && hasMaxSize) {
        limits = t('file-upload.limit-files-and-size', {count: maxFiles, size: maxSizeMb});
    } else if (hasMaxFiles) {
        limits = t('file-upload.limit-files', {count: maxFiles});
    } else if (hasMaxSize) {
        limits = t('file-upload.limit-size', {size: maxSizeMb});
    }

    if (examples && limits) {
        return String(t('file-upload.hint-with-examples', {examples, limits}));
    }

    // Only one part is available, so wrap it in parentheses without a separator
    const content = limits || examples;
    return content ? String(t('file-upload.hint', {content})) : '';
}
