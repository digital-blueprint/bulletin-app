import {css, html} from 'lit';
import {ScopedElementsMixin, Icon, IconButton} from '@dbp-toolkit/common';
import * as commonStyles from '@dbp-toolkit/common/styles';
import * as commonUtils from '@dbp-toolkit/common/utils';
import DBPLitElement from '@dbp-toolkit/common/dbp-lit-element';
import {setOverridesByGlobalCache} from '@dbp-toolkit/common/i18next.js';
import {CountrySelect} from '@dbp-toolkit/country-select';
import {createInstance} from '../i18n.js';
import $ from 'jquery';
import select2 from 'select2';
import select2LangDe from '../../vendor/toolkit/packages/form-elements/src/i18n/de/select2';
import select2LangEn from '../../vendor/toolkit/packages/form-elements/src/i18n/en/select2';
import select2CSSPath from 'select2/dist/css/select2.min.css';

const AUSTRIA_COUNTRY_CODE = 'AT';

const AUSTRIA_REGIONS = [
    'burgenland',
    'carinthia',
    'lower-austria',
    'upper-austria',
    'salzburg',
    'styria',
    'tyrol',
    'vorarlberg',
    'vienna',
];

const AUSTRIA_CITIES_BY_REGION = {
    burgenland: ['eisenstadt', 'oberwart', 'neusiedl-am-see', 'mattersburg', 'guessing'],
    carinthia: ['klagenfurt', 'villach', 'wolfsberg', 'spittal-an-der-drau', 'feldkirchen'],
    'lower-austria': [
        'sankt-poelten',
        'wiener-neustadt',
        'krems-an-der-donau',
        'baden',
        'moedling',
        'amstetten',
    ],
    'upper-austria': ['linz', 'wels', 'steyr', 'leonding', 'traun', 'braunau-am-inn'],
    salzburg: ['salzburg-city', 'hallein', 'saalfelden', 'sankt-johann-im-pongau', 'bischofshofen'],
    styria: [
        'graz',
        'leoben',
        'kapfenberg',
        'bruck-an-der-mur',
        'weiz',
        'deutschlandsberg',
        'feldbach',
        'leibnitz',
        'liezen',
        'murau',
        'voitsberg',
        'judenburg',
    ],
    tyrol: ['innsbruck', 'kufstein', 'telfs', 'hall-in-tirol', 'schwaz', 'woergl', 'lienz'],
    vorarlberg: ['dornbirn', 'feldkirch', 'bregenz', 'lustenau', 'hohenems', 'bludenz'],
    vienna: ['vienna-city'],
};

const CITY_LABELS = {
    amstetten: 'Amstetten',
    baden: 'Baden',
    bischofshofen: 'Bischofshofen',
    bludenz: 'Bludenz',
    'braunau-am-inn': 'Braunau am Inn',
    graz: 'Graz',
    bregenz: 'Bregenz',
    'bruck-an-der-mur': 'Bruck an der Mur',
    deutschlandsberg: 'Deutschlandsberg',
    dornbirn: 'Dornbirn',
    eisenstadt: 'Eisenstadt',
    feldbach: 'Feldbach',
    feldkirch: 'Feldkirch',
    feldkirchen: 'Feldkirchen',
    guessing: 'Güssing',
    'hall-in-tirol': 'Hall in Tirol',
    hallein: 'Hallein',
    hohenems: 'Hohenems',
    innsbruck: 'Innsbruck',
    judenburg: 'Judenburg',
    kapfenberg: 'Kapfenberg',
    klagenfurt: 'Klagenfurt',
    'krems-an-der-donau': 'Krems an der Donau',
    kufstein: 'Kufstein',
    leibnitz: 'Leibnitz',
    leoben: 'Leoben',
    leonding: 'Leonding',
    lienz: 'Lienz',
    liezen: 'Liezen',
    linz: 'Linz',
    lustenau: 'Lustenau',
    mattersburg: 'Mattersburg',
    moedling: 'Mödling',
    murau: 'Murau',
    'neusiedl-am-see': 'Neusiedl am See',
    oberwart: 'Oberwart',
    saalfelden: 'Saalfelden',
    'salzburg-city': 'Salzburg',
    'sankt-johann-im-pongau': 'Sankt Johann im Pongau',
    'sankt-poelten': 'Sankt Pölten',
    schwaz: 'Schwaz',
    'spittal-an-der-drau': 'Spittal an der Drau',
    steyr: 'Steyr',
    telfs: 'Telfs',
    traun: 'Traun',
    'vienna-city': 'Wien',
    villach: 'Villach',
    voitsberg: 'Voitsberg',
    weiz: 'Weiz',
    wels: 'Wels',
    'wiener-neustadt': 'Wiener Neustadt',
    wolfsberg: 'Wolfsberg',
    woergl: 'Wörgl',
};

export const getLocationKey = (location) =>
    [location.country, location.region ?? '', location.city ?? ''].join('|');

/**
 * Expands a location into itself plus all of its hierarchical ancestors.
 * The hierarchy is country > region > city, so a location with a city produces
 * the country-only, country+region and full country+region+city locations.
 * @param {{country: string, region?: string, city?: string}} location
 * @returns {Array<{country: string, region: string, city: string}>}
 */
export const getLocationHierarchy = (location) => {
    const country = typeof location?.country === 'string' ? location.country : '';
    const region = typeof location?.region === 'string' ? location.region : '';
    const city = typeof location?.city === 'string' ? location.city : '';

    if (!country) {
        return [];
    }

    const hierarchy = [{country, region: '', city: ''}];

    if (region) {
        hierarchy.push({country, region, city: ''});
    }

    if (region && city) {
        hierarchy.push({country, region, city});
    }

    return hierarchy;
};

const areWorkLocationArraysEqual = (left, right) => {
    if (left === right) {
        return true;
    }

    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
        return false;
    }

    return left.every(
        (location, index) => getLocationKey(location) === getLocationKey(right[index]),
    );
};

export const normalizeWorkLocations = (value) => {
    if (!Array.isArray(value)) {
        return [];
    }

    const locations = value
        .map((location) => ({
            country: typeof location?.country === 'string' ? location.country : '',
            region: typeof location?.region === 'string' ? location.region : '',
            city: typeof location?.city === 'string' ? location.city : '',
        }))
        .filter((location) => location.country);

    return [...new Map(locations.map((location) => [getLocationKey(location), location])).values()];
};

export const getWorkLocationLabel = (location, t, lang = 'de') => {
    const country = location.country
        ? new Intl.DisplayNames([lang], {type: 'region'}).of(location.country) || location.country
        : '';
    const region = location.region
        ? t(`manage-job-offers.work-location-region-${location.region}`)
        : '';
    const city = location.city ? CITY_LABELS[location.city] || location.city : '';

    return [city, region, country].filter(Boolean).join(', ');
};

export const getWorkLocationPathLabel = (location, t, lang = 'de') => {
    const country = location.country
        ? new Intl.DisplayNames([lang], {type: 'region'}).of(location.country) || location.country
        : '';
    const region = location.region
        ? t(`manage-job-offers.work-location-region-${location.region}`)
        : '';
    const city = location.city ? CITY_LABELS[location.city] || location.city : '';

    return [country, region, city].filter(Boolean).join(' > ');
};

export const getWorkLocationLabels = (value, t, lang = 'de') =>
    normalizeWorkLocations(value).map((location) => getWorkLocationLabel(location, t, lang));

export const getDefaultInternalWorkLocations = () => [
    {
        country: AUSTRIA_COUNTRY_CODE,
        region: 'styria',
        city: 'graz',
    },
];

export class WorkLocationSelectElement extends DBPLitElement {
    constructor() {
        super();
        this._i18n = createInstance();
        this.lang = this._i18n.language;
        this.langDir = '';
        this.value = '';
        this.locations = [];
        this.disabled = false;
        this.placeholder = '';
        this._selectId = `work-location-filter-${commonUtils.makeId(24)}`;

        select2(window, $);
    }

    static get properties() {
        return {
            ...super.properties,
            lang: {type: String},
            langDir: {type: String, attribute: 'lang-dir'},
            value: {type: String},
            locations: {type: Array},
            disabled: {type: Boolean, reflect: true},
            placeholder: {type: String},
        };
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            if (propName === 'lang') {
                this._i18n.changeLanguage(this.lang);
            }

            if ((propName === 'lang' || propName === 'langDir') && this.langDir) {
                setOverridesByGlobalCache(this._i18n, this);
            }

            if (propName === 'locations') {
                const normalizedLocations = normalizeWorkLocations(this.locations);
                if (!areWorkLocationArraysEqual(this.locations, normalizedLocations)) {
                    this.locations = normalizedLocations;
                }
            }
        });

        super.update(changedProperties);
    }

    updated(changedProperties) {
        super.updated(changedProperties);

        if (
            changedProperties.has('lang') ||
            changedProperties.has('value') ||
            changedProperties.has('locations') ||
            changedProperties.has('disabled') ||
            changedProperties.has('placeholder')
        ) {
            const availableValues = new Set(this._getLocationItems().map((item) => item.value));
            if (this.value && !availableValues.has(this.value)) {
                this.value = '';
                this._dispatchChange();
                return;
            }

            this._syncSelect2Control();
        }
    }

    disconnectedCallback() {
        this._destroySelect2();
        super.disconnectedCallback();
    }

    _getSelect2Language() {
        return this.lang === 'de' ? select2LangDe() : select2LangEn();
    }

    _getSelect2() {
        const select = this.renderRoot?.querySelector(`#${this._selectId}`);
        return select ? $(select) : null;
    }

    _destroySelect2() {
        const select = this._getSelect2();
        if (select?.hasClass('select2-hidden-accessible')) {
            select.select2('destroy');
            select.off('change');
        }
    }

    _syncSelect2Control() {
        const select = this._getSelect2();
        if (!select) {
            return;
        }

        if (select.hasClass('select2-hidden-accessible')) {
            select.select2('destroy');
            select.off('change');
        }

        select
            .select2({
                width: '100%',
                language: this._getSelect2Language(),
                allowClear: true,
                placeholder: this.placeholder,
                dropdownParent: this.$('#work-location-select-dropdown'),
            })
            .on('change', () => {
                const nextValue = select.val() || '';
                if (nextValue !== this.value) {
                    this.value = nextValue;
                    this._dispatchChange();
                }
            });

        select.val(this.value || '').trigger('change.select2');
    }

    $(selector) {
        return $(this.renderRoot.querySelector(selector));
    }

    _getLocationItems() {
        const t = (key, opts) => this._i18n.t(key, opts);

        return normalizeWorkLocations(this.locations)
            .map((location) => ({
                value: getLocationKey(location),
                label: getWorkLocationPathLabel(location, t, this.lang),
                location,
            }))
            .sort((a, b) => a.label.localeCompare(b.label, this.lang));
    }

    _dispatchChange() {
        const selectedLocation = this._getLocationItems().find((item) => item.value === this.value);

        this.dispatchEvent(
            new CustomEvent('change', {
                detail: {value: this.value, location: selectedLocation?.location ?? null},
                bubbles: true,
                composed: true,
            }),
        );
    }

    render() {
        const select2CSS = commonUtils.getAbsoluteURL(select2CSSPath);
        const locationItems = this._getLocationItems();

        return html`
            <link rel="stylesheet" href="${select2CSS}" />
            <div class="select">
                <div>
                    <div class="select2-control control">
                        <select
                            id="${this._selectId}"
                            name="work-location-filter"
                            class="select"
                            ?disabled="${this.disabled || locationItems.length === 0}">
                            <option></option>
                            ${locationItems.map(
                                ({value, label}) => html`
                                    <option value="${value}" ?selected="${value === this.value}">
                                        ${label}
                                    </option>
                                `,
                            )}
                        </select>
                    </div>
                </div>
                <div id="work-location-select-dropdown"></div>
            </div>
        `;
    }

    static get styles() {
        return css`
            ${commonStyles.getThemeCSS()}
            ${commonStyles.getGeneralCSS()}
            ${commonStyles.getSelect2CSS()}

            :host {
                display: block;
            }

            .select2-control.control {
                width: 100%;
            }

            .select2-container {
                width: 100% !important;
            }

            .select2-container--default .select2-selection--single {
                align-items: center;
                box-sizing: border-box;
                display: flex;
                height: var(--work-location-select-height, 2.2em) !important;
                position: relative;
            }

            .select2-container--default .select2-selection--single .select2-selection__rendered {
                flex: 1;
                line-height: normal;
                padding-left: calc(0.625em - 1px);
                padding-right: 2.75rem;
            }

            .select2-container--default .select2-selection--single .select2-selection__clear {
                align-items: center;
                bottom: 0;
                display: inline-flex;
                float: none;
                height: 100%;
                line-height: 1;
                margin-right: 0;
                padding-right: 0;
                font-size: 1.3em;
                font-weight: 300;
                position: absolute;
                right: 1.75rem;
                top: 50%;
                transform: translateY(-50%);
                z-index: 1;
                margin-top: -3px;
            }

            .select2-container--default .select2-selection--single .select2-selection__arrow {
                height: 100%;
                right: 0.25rem;
                top: 0;
            }

            #work-location-select-dropdown {
                position: relative;
            }
        `;
    }
}

export class WorkLocationsElement extends ScopedElementsMixin(DBPLitElement) {
    static get scopedElements() {
        return {
            'dbp-country-select': CountrySelect,
            'dbp-icon-button': IconButton,
            'dbp-icon': Icon,
        };
    }

    constructor() {
        super();
        this._i18n = createInstance();
        this.lang = this._i18n.language;
        this.langDir = '';
        this.value = [];
        this.disabled = false;
        this.disabledButton = false;
        this._country = AUSTRIA_COUNTRY_CODE;
        this._region = '';
        this._city = '';
        this._regionSelectId = `work-location-region-${commonUtils.makeId(24)}`;
        this._citySelectId = `work-location-city-${commonUtils.makeId(24)}`;

        select2(window, $);
    }

    static get properties() {
        return {
            ...super.properties,
            lang: {type: String},
            langDir: {type: String, attribute: 'lang-dir'},
            value: {type: Array},
            disabled: {type: Boolean, reflect: true},
            disabledButton: {type: Boolean},
            _country: {state: true},
            _region: {state: true},
            _city: {state: true},
        };
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            if (propName === 'lang') {
                this._i18n.changeLanguage(this.lang);
            }

            if ((propName === 'lang' || propName === 'langDir') && this.langDir) {
                setOverridesByGlobalCache(this._i18n, this);
            }

            if (propName === 'value') {
                const normalizedValue = normalizeWorkLocations(this.value);
                if (!areWorkLocationArraysEqual(this.value, normalizedValue)) {
                    this.value = normalizedValue;
                }
            }
        });

        super.update(changedProperties);
    }

    updated(changedProperties) {
        super.updated(changedProperties);

        if (
            changedProperties.has('lang') ||
            changedProperties.has('_country') ||
            changedProperties.has('_region') ||
            changedProperties.has('_city')
        ) {
            this._syncSelect2Controls();
        }
    }

    disconnectedCallback() {
        this._destroySelect2(this._regionSelectId, 'change');
        this._destroySelect2(this._citySelectId, 'change');
        super.disconnectedCallback();
    }

    _getSelect2Language() {
        return this.lang === 'de' ? select2LangDe() : select2LangEn();
    }

    _getSelect2(id) {
        const select = this.renderRoot?.querySelector(`#${id}`);
        return select ? $(select) : null;
    }

    _destroySelect2(id, eventName) {
        const select = this._getSelect2(id);
        if (select?.hasClass('select2-hidden-accessible')) {
            select.select2('destroy');
            select.off(eventName);
        }
    }

    _initSingleSelect2(id, dropdownId, value, placeholder, onChange) {
        const select = this._getSelect2(id);
        if (!select) {
            return;
        }

        if (select.hasClass('select2-hidden-accessible')) {
            select.select2('destroy');
            select.off('change');
        }

        select
            .select2({
                width: '100%',
                language: this._getSelect2Language(),
                allowClear: true,
                placeholder,
                dropdownParent: this.$(`#${dropdownId}`),
            })
            .on('change', () => onChange(select.val() || ''));

        select.val(value || '').trigger('change.select2');
    }

    _syncSelect2Controls() {
        if (this._country === AUSTRIA_COUNTRY_CODE) {
            this._initSingleSelect2(
                this._regionSelectId,
                'work-location-region-dropdown',
                this._region,
                this._i18n.t('manage-job-offers.work-location-region-placeholder'),
                (value) => {
                    const previousRegion = this._region;
                    this._region = value;
                    if (this._region !== previousRegion) {
                        this._city = '';
                    }
                    this.disabledButton = false;
                },
            );
        } else {
            this._destroySelect2(this._regionSelectId, 'change');
        }

        if (this._country === AUSTRIA_COUNTRY_CODE && this._region) {
            this._initSingleSelect2(
                this._citySelectId,
                'work-location-city-dropdown',
                this._city,
                this._i18n.t('manage-job-offers.work-location-city-placeholder'),
                (value) => {
                    this._city = value;
                    this.disabledButton = false;
                },
            );
        } else {
            this._destroySelect2(this._citySelectId, 'change');
        }
    }

    $(selector) {
        return $(this.renderRoot.querySelector(selector));
    }

    _getRegionItems(t) {
        return Object.fromEntries(
            AUSTRIA_REGIONS.map((region) => [
                region,
                t(`manage-job-offers.work-location-region-${region}`),
            ]),
        );
    }

    _getCityItems(t) {
        return Object.fromEntries(
            (AUSTRIA_CITIES_BY_REGION[this._region] ?? []).map((city) => [city, CITY_LABELS[city]]),
        );
    }

    _onCountryChange(event) {
        this._country = event.detail.value || '';
        if (this._country !== AUSTRIA_COUNTRY_CODE) {
            this._region = '';
            this._city = '';
        }

        if (this._country !== '') {
            this.disabledButton = false;
        }
    }
    _addLocation() {
        if (!this._country) {
            this.disabledButton = true;
            return;
        }

        const location = {
            country: this._country,
            region: this._country === AUSTRIA_COUNTRY_CODE ? this._region : '',
            city: this._country === AUSTRIA_COUNTRY_CODE && this._region ? this._city : '',
        };
        const nextLocations = normalizeWorkLocations([...this.value, location]);

        this.value = nextLocations;
        this._dispatchChange();
    }

    _removeLocation(index) {
        this.value = this.value.filter((location, locationIndex) => locationIndex !== index);
        this._dispatchChange();
    }

    _dispatchChange() {
        this.dispatchEvent(
            new CustomEvent('change', {
                detail: {value: this.value},
                bubbles: true,
                composed: true,
            }),
        );
    }
    _resetSelection() {
        this._city = '';
        this._region = '';
    }
    render() {
        const t = (key, opts) => this._i18n.t(key, opts);
        const regionItems = this._getRegionItems(t);
        const cityItems = this._getCityItems(t);
        const selectedLocations = normalizeWorkLocations(this.value);
        const select2CSS = commonUtils.getAbsoluteURL(select2CSSPath);

        return html`
            <link rel="stylesheet" href="${select2CSS}" />
            <section class="work-locations">
                <h4 class="field-label company-info-title">
                    ${t('manage-job-offers.field-work-locations')}
                </h4>

                <div class="selector-stack">
                    <label class="selector-label">
                        <span>${t('manage-job-offers.work-location-country')}</span>
                        <dbp-country-select
                            lang="${this.lang}"
                            .value="${this._country}"
                            ?disabled="${this.disabled}"
                            @change="${(event) =>
                                this._onCountryChange(event)}"></dbp-country-select>
                    </label>

                    ${this._country === AUSTRIA_COUNTRY_CODE
                        ? html`
                              <label class="selector-label">
                                  <span>${t('manage-job-offers.work-location-region')}</span>
                                  <div class="select">
                                      <div class="field">
                                          <div class="select2-control control">
                                              <select
                                                  id="${this._regionSelectId}"
                                                  name="work-location-region"
                                                  class="select"
                                                  ?disabled="${this.disabled}">
                                                  <option></option>
                                                  ${Object.entries(regionItems).map(
                                                      ([value, label]) => html`
                                                          <option
                                                              value="${value}"
                                                              ?selected="${value === this._region}">
                                                              ${label}
                                                          </option>
                                                      `,
                                                  )}
                                              </select>
                                          </div>
                                      </div>
                                      <div id="work-location-region-dropdown"></div>
                                  </div>
                              </label>
                          `
                        : ''}
                    ${this._country === AUSTRIA_COUNTRY_CODE && this._region
                        ? html`
                              <label class="selector-label">
                                  <span>${t('manage-job-offers.work-location-city')}</span>
                                  <div class="select">
                                      <div class="field">
                                          <div class="select2-control control">
                                              <select
                                                  id="${this._citySelectId}"
                                                  name="work-location-city"
                                                  class="select"
                                                  ?disabled="${this.disabled}">
                                                  <option></option>
                                                  ${Object.entries(cityItems).map(
                                                      ([value, label]) => html`
                                                          <option
                                                              value="${value}"
                                                              ?selected="${value === this._city}">
                                                              ${label}
                                                          </option>
                                                      `,
                                                  )}
                                              </select>
                                          </div>
                                      </div>
                                      <div id="work-location-city-dropdown"></div>
                                  </div>
                              </label>
                          `
                        : ''}

                    <button
                        class="button is-primary add-location-button ${this.disabledButton
                            ? 'disabled'
                            : ''}"
                        type="button"
                        ?disabled="${this.disabledButton || !this._country}"
                        @click="${() => {
                            this._addLocation();
                            this._resetSelection();
                            this.disabledButton = true;
                        }}">
                        <dbp-icon name="plus" aria-hidden="true"></dbp-icon>
                        ${t('manage-job-offers.work-location-add')}
                    </button>
                </div>

                <div class="selected-locations">
                    <h5>${t('manage-job-offers.work-location-selected')}</h5>
                    ${selectedLocations.length > 0
                        ? html`
                              <ul class="selected-location-list">
                                  ${selectedLocations.map(
                                      (location, index) => html`
                                          <li>
                                              <span>
                                                  ${getWorkLocationLabel(location, t, this.lang)}
                                              </span>
                                              <dbp-icon-button
                                                  class="delete-location-button"
                                                  icon-name="trash"
                                                  ?disabled="${this.disabled}"
                                                  aria-label="${t(
                                                      'manage-job-offers.work-location-remove',
                                                  )}"
                                                  @click="${() =>
                                                      this._removeLocation(
                                                          index,
                                                      )}"></dbp-icon-button>
                                          </li>
                                      `,
                                  )}
                              </ul>
                          `
                        : html`
                              <p class="empty-selection">
                                  ${t('manage-job-offers.work-location-empty')}
                              </p>
                          `}
                </div>
            </section>
        `;
    }

    static get styles() {
        return css`
            ${commonStyles.getThemeCSS()}
            ${commonStyles.getGeneralCSS()}
            ${commonStyles.getButtonCSS()}
            ${commonStyles.getSelect2CSS()}

            .work-locations {
                margin-bottom: 1rem;
            }

            .field-label {
                font-size: 18px;
                font-weight: 400;
                margin: 10px 0;
            }

            .selector-stack {
                display: flex;
                gap: 10px;
                align-items: flex-end;
            }

            .selector-stack button {
                margin-left: auto;
            }

            .selector-label {
                display: grid;
                flex: 1;
                max-width: 50%;
            }

            .selector-label,
            .selector-label dbp-country-select,
            .selector-label select {
                font-weight: 300;
            }

            .select2-control.control {
                width: 100%;
            }

            .selector-label .select2-container {
                font-weight: 300;
                width: 100% !important;
            }

            .selector-label .select2-container--default .select2-selection--single {
                position: relative;
            }

            .selector-label .select2-container--default .select2-selection__clear {
                margin-top: -3px;
            }

            .selector-label
                .select2-container--default
                .select2-selection--single
                .select2-selection__rendered {
                padding-right: 1rem;
            }

            #work-location-region-dropdown,
            #work-location-city-dropdown {
                position: relative;
            }

            .add-location-button {
                justify-self: start;
                height: max-content;
            }
            .disabled {
                opacity: 0.5;
            }
            .selected-locations {
                margin-top: 1rem;
                background-color: var(--dbp-selected);
                padding: 5px 10px;
            }

            .selected-locations h5 {
                font-size: 1rem;
                font-weight: 400;
            }

            .selected-location-list {
                display: grid;
                margin: 0;
                padding: 0;
            }

            .selected-location-list li {
                align-items: center;
                display: flex;
                gap: 0.75rem;
                justify-content: space-between;
            }

            .delete-location-button {
                flex-shrink: 0;
            }

            .empty-selection {
                color: var(--dbp-muted);
                margin: 0;
            }
        `;
    }
}

export default WorkLocationsElement;
