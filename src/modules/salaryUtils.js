/**
 * Parses a non-negative monthly salary in euros with at most two decimal places.
 * Empty values and legacy free-text salaries are not converted.
 * @param {unknown} value
 * @returns {number|null}
 */
export function parseMonthlySalary(value) {
    const text = String(value ?? '').trim();
    if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
        return null;
    }

    const amount = Number(text);
    return Number.isFinite(amount) ? amount : null;
}
