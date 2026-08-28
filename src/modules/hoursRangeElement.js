import {css, html, nothing} from 'lit';
import * as commonStyles from '@dbp-toolkit/common/styles';
import DBPLitElement from '@dbp-toolkit/common/dbp-lit-element';
import {setOverridesByGlobalCache} from '@dbp-toolkit/common/i18next.js';
import {createInstance} from '../i18n.js';

export const HOURS_MIN = 0;
export const HOURS_MAX = 99;
export const HOURS_STEP = 0.5;

/**
 * Converts a decimal hours value into a comparable number of hours or null.
 *
 * Empty and invalid values are treated as missing.
 *
 * @param {unknown} value
 * @returns {number|null}
 */
export const parseOptionalHours = (value) => {
    if (value === '' || value === null || value === undefined) {
        return null;
    }

    const normalized = String(value).replace(',', '.');

    if (!/^\d{1,2}(?:\.\d{1,2})?$/.test(normalized)) {
        return null;
    }

    const hours = Number(normalized);

    if (!Number.isFinite(hours) || hours < HOURS_MIN || hours > HOURS_MAX) {
        return null;
    }

    return hours;
};

/**
 * Converts a value into a finite number or null.
 *
 * Empty and invalid values are treated as missing.
 *
 * @param {unknown} value
 * @returns {number|null}
 */
const parseOptionalNumber = (value) => {
    if (value === '' || value === null || value === undefined) {
        return null;
    }

    const normalized = String(value).replace(',', '.');
    const parsed = Number(normalized);

    return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Checks that an optional hours range is ordered from minimum to maximum.
 *
 * @param {unknown} min
 * @param {unknown} max
 * @returns {boolean}
 */
export const isHoursRangeValid = (min, max) => {
    const minHours = parseOptionalNumber(min);
    const maxHours = parseOptionalNumber(max);

    return minHours === null || maxHours === null || minHours <= maxHours;
};

/**
 * Sanitizes an hours value while preserving one optional decimal separator.
 *
 * Examples:
 * "12.5" -> "12.5"
 * "12,5" -> "12.5"
 * "abc12.55" -> "12.5"
 *
 * @param {unknown} rawValue
 * @param {number} min
 * @param {number} max
 * @returns {string}
 */
export const sanitizeHoursValue = (rawValue, min = HOURS_MIN, max = HOURS_MAX) => {
    const raw = String(rawValue ?? '')
        .replace(',', '.')
        .replace(/[^0-9.]/g, '')
        .replace(/(\..*?)\..*/g, '$1');

    if (raw === '') {
        return '';
    }

    const [rawHours = '', ...decimalParts] = raw.split('.');
    const hours = rawHours.slice(0, String(Math.trunc(max)).length);
    const decimals = decimalParts.join('').slice(0, 2);

    // Preserve intermediate input such as "12."
    if (raw.includes('.') && decimals === '') {
        return `${hours}.`;
    }

    if (!raw.includes('.')) {
        const numericHours = Number(hours);

        if (!Number.isFinite(numericHours)) {
            return '';
        }

        return String(Math.min(max, Math.max(min, numericHours)));
    }

    const value = Number(`${hours}.${decimals}`);

    return String(Math.min(max, Math.max(min, value)));
};

/**
 * Checks whether a scalar weekly-hours value is inside a filter range.
 *
 * @param {string|number|null|undefined} weeklyHours
 * @param {string|number|null|undefined} min
 * @param {string|number|null|undefined} max
 * @returns {boolean}
 */
export const isHoursInRange = (weeklyHours, min, max) => {
    const hours = parseOptionalHours(weeklyHours);
    const minHours = parseOptionalHours(min);
    const maxHours = parseOptionalHours(max);

    // An entirely empty filter matches everything.
    if (minHours === null && maxHours === null) {
        return true;
    }

    // A bounded filter cannot match a missing or invalid job value.
    if (hours === null) {
        return false;
    }

    return (minHours === null || hours >= minHours) && (maxHours === null || hours <= maxHours);
};

/**
 * Checks whether a job-hours range overlaps a filter range.
 *
 * Empty bounds are treated as unbounded. When both job bounds are absent,
 * scalarHours is used as a fallback.
 *
 * @param {string|number|null|undefined} jobMin
 * @param {string|number|null|undefined} jobMax
 * @param {string|number|null|undefined} filterMin
 * @param {string|number|null|undefined} filterMax
 * @param {string|number|null|undefined} scalarHours
 * @returns {boolean}
 */
export const isHoursRangeInRange = (jobMin, jobMax, filterMin, filterMax, scalarHours = null) => {
    const offerMin = parseOptionalNumber(jobMin);
    const offerMax = parseOptionalNumber(jobMax);
    const selectedMin = parseOptionalNumber(filterMin);
    const selectedMax = parseOptionalNumber(filterMax);

    if (selectedMin === null && selectedMax === null) {
        return true;
    }

    if (offerMin === null && offerMax === null) {
        return isHoursInRange(scalarHours, selectedMin, selectedMax);
    }

    if (offerMin !== null && offerMax !== null && offerMin > offerMax) {
        return false;
    }

    const effectiveOfferMin = offerMin ?? offerMax;
    const effectiveOfferMax = offerMax ?? offerMin;
    return (
        (selectedMin === null || effectiveOfferMin >= selectedMin) &&
        (selectedMax === null || effectiveOfferMax <= selectedMax)
    );
};

/**
 * Returns the display and search representation of a job's hours.
 *
 * @param {string|number|null|undefined} min
 * @param {string|number|null|undefined} max
 * @param {string|number|null|undefined} scalarHours
 * @returns {string}
 */
export const formatHoursRange = (min, max, scalarHours = '') => {
    const parsedMin = parseOptionalHours(min);
    const parsedMax = parseOptionalHours(max);

    if (parsedMin === null && parsedMax === null) {
        return String(scalarHours ?? '').trim();
    }

    return [parsedMin, parsedMax].filter((value) => value !== null).join(' – ');
};

export class HoursRangeElement extends DBPLitElement {
    constructor() {
        super();

        this._i18n = createInstance();

        this.lang = this._i18n.language;
        this.langDir = '';
        this.min = '';
        this.max = '';
        this.label = '';
        this.disabled = false;
        this.required = false;
        this.hoursMin = HOURS_MIN;
        this.hoursMax = HOURS_MAX;
        this.step = HOURS_STEP;
    }

    static get properties() {
        return {
            ...super.properties,
            lang: {type: String},
            langDir: {type: String, attribute: 'lang-dir'},
            min: {type: String},
            max: {type: String},
            label: {type: String},
            disabled: {type: Boolean, reflect: true},
            required: {type: Boolean, reflect: true},
            hoursMin: {type: Number, attribute: 'hours-min'},
            hoursMax: {type: Number, attribute: 'hours-max'},
            step: {type: Number},
        };
    }

    update(changedProperties) {
        if (changedProperties.has('lang')) {
            this._i18n.changeLanguage(this.lang);
        }

        if (this.langDir && (changedProperties.has('lang') || changedProperties.has('langDir'))) {
            setOverridesByGlobalCache(this._i18n, this);
        }

        super.update(changedProperties);
    }

    _sanitize(value) {
        return sanitizeHoursValue(value, this.hoursMin, this.hoursMax, this.step);
    }

    _onMinInput(event) {
        const input = event.currentTarget;
        const value = this._sanitize(input.value);

        input.value = value;
        this.min = value;

        this._validateRange();
        this._dispatchChange();
    }

    _onMaxInput(event) {
        const input = event.currentTarget;
        const value = this._sanitize(input.value);

        input.value = value;
        this.max = value;

        this._validateRange();
        this._dispatchChange();
    }

    _validateRange() {
        const minInput = this.renderRoot?.querySelector('.hours-range-min');
        const maxInput = this.renderRoot?.querySelector('.hours-range-max');

        const invalid = !isHoursRangeValid(this.min, this.max);

        const message = invalid
            ? this._i18n.t('hours-range.invalid-range', {
                  defaultValue: 'Minimum hours must not exceed maximum hours.',
              })
            : '';

        minInput?.setCustomValidity(message);
        maxInput?.setCustomValidity(message);
    }

    _dispatchChange() {
        this.dispatchEvent(
            new CustomEvent('change', {
                detail: {
                    min: this.min,
                    max: this.max,
                    valid: this.checkValidity(),
                },
                bubbles: true,
                composed: true,
            }),
        );
    }

    checkValidity() {
        this._validateRange();
        const inputs = this.renderRoot?.querySelectorAll('input') ?? [];
        return [...inputs].every((input) => input.checkValidity());
    }

    reportValidity() {
        this._validateRange();
        const inputs = this.renderRoot?.querySelectorAll('input') ?? [];

        for (const input of inputs) {
            if (!input.reportValidity()) {
                return false;
            }
        }

        return true;
    }

    render() {
        const t = (key, options) => this._i18n.t(key, options);
        const label = this.label || t('hours-range.label');

        return html`
            <fieldset class="field" ?disabled=${this.disabled}>
                ${
                    label
                        ? html`
                              <legend class="label">
                                  ${label}
                                  ${
                                      this.required
                                          ? html`
                                                <span class="required-star" aria-hidden="true">
                                                    *
                                                </span>
                                            `
                                          : nothing
                                  }
                              </legend>
                          `
                        : nothing
                }

                <div class="control hours-range">
                    <input
                        id="hours-range-min"
                        type="text"
                        inputmode="decimal"
                        pattern="\\d{1,2}(?:[.,]\\d{1,2})?"
                        class="input hours-range-min"
                        .value=${this.min}
                        min=${this.hoursMin}
                        max=${this.hoursMax}
                        step=${this.step}
                        ?disabled=${this.disabled}
                        ?required=${this.required}
                        aria-required=${this.required ? 'true' : 'false'}
                        placeholder="${t('hours-range.min-placeholder')}"
                        @input=${this._onMinInput} />

                    <span class="range-separator" aria-hidden="true">–</span>

                    <input
                        id="hours-range-max"
                        type="text"
                        inputmode="decimal"
                        pattern="\\d{1,2}(?:[.,]\\d{1,2})?"
                        class="input hours-range-max"
                        .value=${this.max}
                        min=${this.hoursMin}
                        max=${this.hoursMax}
                        step=${this.step}
                        ?disabled=${this.disabled}
                        ?required=${this.required}
                        aria-required=${this.required ? 'true' : 'false'}
                        placeholder="${t('hours-range.max-placeholder')}"
                        @input=${this._onMaxInput} />
                </div>
            </fieldset>
        `;
    }

    static get styles() {
        return css`
            ${commonStyles.getThemeCSS()}
            ${commonStyles.getGeneralCSS()}

            :host {
                display: block;
                width: 100%;
                min-width: 0;
            }

            fieldset {
                min-width: 0;
                padding: 0;
                border: 0;
                margin-top: var(--hours-range-fieldset-margin-top, 0);
                margin-right: var(--hours-range-fieldset-margin-right, 0);
                margin-bottom: var(--hours-range-fieldset-margin-bottom, 0);
                margin-left: var(--hours-range-fieldset-margin-left, 0);
            }

            .label {
                font-size: var(--hours-range-label-font-size, 1rem);
                font-weight: var(--hours-range-label-font-weight, normal);
                margin-bottom: var(--hours-range-label-margin-bottom, 0.25rem);
            }

            .hours-range {
                display: flex;
                align-items: center;
                gap: var(--hours-range-gap, 0.5rem);
                width: 100%;
                min-width: 0;
            }

            .hours-range .input {
                flex: 1 1 0;
                width: 0;
                min-width: 0;
                max-width: var(--hours-range-input-max-width, none);
                box-sizing: border-box;
                min-height: 2rem;
                font-size: 1rem;
                border: var(--dbp-border);
            }

            .hours-range .input::placeholder {
                font-family: var(--hours-range-placeholder-font-family, inherit);
                font-size: var(--hours-range-placeholder-font-size, inherit);
                font-weight: var(--hours-range-placeholder-font-weight, normal);
                color: var(--hours-range-placholder-color, var(--dbp-muted));
            }

            .range-separator {
                flex: 0 0 auto;
            }

            .required-star {
                color: var(--dbp-danger, red);
            }
        `;
    }
}

export default HoursRangeElement;
