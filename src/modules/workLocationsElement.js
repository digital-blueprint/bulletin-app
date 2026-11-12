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
    burgenland: [
        'eisenstadt',
        'oberwart',
        'neusiedl-am-see',
        'mattersburg',
        'guessing',
        'rust',
        'pinkafeld',
        'oberpullendorf',
        'jennersdorf',
        'frauenkirchen',
        'parndorf',
        'podersdorf-am-see',
        'illmitz',
        'kittsee',
        'gols',
        'poettsching',
        'grosspetersdorf',
        'stegersbach',
        'rechnitz',
        'deutschkreutz',
        'deutsch-jahrndorf',
        'winden-am-see',
        'jois',
        'breitenbrunn-am-neusiedler-see',
        'nickelsdorf',
    ],
    carinthia: [
        'klagenfurt',
        'villach',
        'wolfsberg',
        'spittal-an-der-drau',
        'feldkirchen',
        'sankt-veit-an-der-glan',
        'velden-am-woerther-see',
        'ferlach',
        'voelkermarkt',
        'bad-sankt-leonhard-im-lavanttal',
        'hermagor-pressegger-see',
        'radenthein',
        'bleiburg',
        'althofen',
        'sankt-andrae',
        'moosburg',
        'krumpendorf-am-woerthersee',
        'gmuend-in-kaernten',
        'millstatt-am-see',
        'seeboden-am-millstaetter-see',
        'bad-kleinkirchheim',
        'trebesing',
        'ossiach',
        'faak-am-see',
        'maria-saal',
        'ebenthal-in-kaernten',
        'eberndorf',
        'feistritz-im-rosental',
        'sankt-jakob-im-rosental',
    ],
    'lower-austria': [
        'sankt-poelten',
        'wiener-neustadt',
        'krems-an-der-donau',
        'baden',
        'moedling',
        'amstetten',
        'klosterneuburg',
        'schwechat',
        'stockerau',
        'tulln-an-der-donau',
        'korneuburg',
        'perchtoldsdorf',
        'neunkirchen',
        'ternitz',
        'waidhofen-an-der-ybbs',
        'melk',
        'hollabrunn',
        'zwettl',
        'waidhofen-an-der-thaya',
        'horn',
        'gmuend',
        'mistelbach',
        'gaenserndorf',
        'purkersdorf',
        'pressbaum',
        'bruck-an-der-leitha',
        'hainburg-an-der-donau',
        'ybbs-an-der-donau',
        'poechlarn',
        'bad-voeslau',
        'langenlois',
        'traiskirchen',
        'berndorf',
        'gumpoldskirchen',
        'brunn-am-gebirge',
        'guntramsdorf',
        'kottingbrunn',
        'voesendorf',
        'himberg',
        'fischamend',
        'wieselburg',
        'scheibbs',
        'lilienfeld',
        'herzogenburg',
        'traismauer',
        'haag',
        'sankt-valentin',
        'sankt-peter-in-der-au',
        'seitenstetten',
        'retz',
        'eggenburg',
        'laa-an-der-thaya',
        'poysdorf',
        'wolkersdorf-im-weinviertel',
    ],
    'upper-austria': [
        'linz',
        'wels',
        'steyr',
        'leonding',
        'traun',
        'braunau-am-inn',
        'ried-im-innkreis',
        'voecklabruck',
        'gmunden',
        'enns',
        'bad-ischl',
        'marchtrenk',
        'freistadt',
        'eferding',
        'laakirchen',
        'altheim',
        'perg',
        'schaerding',
        'gallneukirchen',
        'ansfelden',
        'bad-hall',
        'schwanenstadt',
        'voecklamarkt',
        'attnang-puchheim',
        'timelkam',
        'lenzing',
        'ebensee-am-traunsee',
        'altmuenster',
        'mondsee',
        'sankt-georgen-im-attergau',
        'grieskirchen',
        'peuerbach',
        'rohrbach-berg',
        'bad-leonfelden',
        'schwertberg',
        'mauthausen',
        'sankt-florian',
        'kremsmuenster',
    ],
    salzburg: [
        'salzburg-city',
        'hallein',
        'saalfelden',
        'sankt-johann-im-pongau',
        'bischofshofen',
        'zell-am-see',
        'seekirchen-am-wallersee',
        'neumarkt-am-wallersee',
        'oberndorf-bei-salzburg',
        'bad-hofgastein',
        'bad-gastein',
        'mittersill',
        'radstadt',
        'kuchl',
        'groedig',
        'eugendorf',
        'wals-siezenheim',
        'anif',
        'bergheim',
        'strasswalchen',
        'thalgau',
        'abtenau',
        'golling-an-der-salzach',
        'saalbach-hinterglemm',
        'kaprun',
    ],
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
        'knittelfeld',
        'trofaiach',
        'fuerstenfeld',
        'gleisdorf',
        'hartberg',
        'bad-radkersburg',
        'frohnleiten',
        'zeltweg',
        'koeflach',
        'mureck',
        'schladming',
        'rottenmann',
        'bad-aussee',
        'bad-mitterndorf',
        'groebming',
        'admont',
        'trieben',
        'eisenerz',
        'mariazell',
        'turnau',
        'sankt-marein-im-muerztal',
        'sankt-barbara-im-muerztal',
        'poellau',
        'vorau',
    ],
    tyrol: [
        'innsbruck',
        'kufstein',
        'telfs',
        'hall-in-tirol',
        'schwaz',
        'woergl',
        'lienz',
        'imst',
        'landeck',
        'kitzbuehel',
        'sankt-johann-in-tirol',
        'wattens',
        'jenbach',
        'mayrhofen',
        'seefeld-in-tirol',
        'reutte',
        'fuegen',
        'axams',
        'zirl',
        'rum',
        'voels',
        'sillian',
        'matrei-in-osttirol',
        'hopfgarten-im-brixental',
        'brixlegg',
        'kirchbichl',
        'kirchberg-in-tirol',
    ],
    vorarlberg: [
        'dornbirn',
        'feldkirch',
        'bregenz',
        'lustenau',
        'hohenems',
        'bludenz',
        'hard',
        'wolfurt',
        'rankweil',
        'goetzis',
        'lauterach',
        'nenzing',
        'bezau',
        'egg',
        'alberschwende',
        'schruns',
        'tschagguns',
        'lech',
    ],
    vienna: ['vienna-city'],
};

const CITY_LABELS = {
    abtenau: 'Abtenau',
    admont: 'Admont',
    alberschwende: 'Alberschwende',
    altheim: 'Altheim',
    altmuenster: 'Altmünster',
    althofen: 'Althofen',
    amstetten: 'Amstetten',
    anif: 'Anif',
    ansfelden: 'Ansfelden',
    'attnang-puchheim': 'Attnang-Puchheim',
    axams: 'Axams',
    'bad-aussee': 'Bad Aussee',
    'bad-gastein': 'Bad Gastein',
    'bad-hall': 'Bad Hall',
    'bad-hofgastein': 'Bad Hofgastein',
    'bad-ischl': 'Bad Ischl',
    'bad-kleinkirchheim': 'Bad Kleinkirchheim',
    'bad-leonfelden': 'Bad Leonfelden',
    'bad-mitterndorf': 'Bad Mitterndorf',
    'bad-radkersburg': 'Bad Radkersburg',
    'bad-sankt-leonhard-im-lavanttal': 'Bad Sankt Leonhard im Lavanttal',
    'bad-voeslau': 'Bad Vöslau',
    baden: 'Baden',
    bergheim: 'Bergheim',
    berndorf: 'Berndorf',
    bezau: 'Bezau',
    bischofshofen: 'Bischofshofen',
    bleiburg: 'Bleiburg',
    bludenz: 'Bludenz',
    'braunau-am-inn': 'Braunau am Inn',
    bregenz: 'Bregenz',
    'breitenbrunn-am-neusiedler-see': 'Breitenbrunn am Neusiedler See',
    brixlegg: 'Brixlegg',
    'bruck-an-der-leitha': 'Bruck an der Leitha',
    'bruck-an-der-mur': 'Bruck an der Mur',
    'brunn-am-gebirge': 'Brunn am Gebirge',
    'deutsch-jahrndorf': 'Deutsch Jahrndorf',
    deutschkreutz: 'Deutschkreutz',
    deutschlandsberg: 'Deutschlandsberg',
    dornbirn: 'Dornbirn',
    'ebensee-am-traunsee': 'Ebensee am Traunsee',
    'ebenthal-in-kaernten': 'Ebenthal in Kärnten',
    eberndorf: 'Eberndorf',
    eferding: 'Eferding',
    egg: 'Egg',
    eggenburg: 'Eggenburg',
    eisenerz: 'Eisenerz',
    eisenstadt: 'Eisenstadt',
    enns: 'Enns',
    eugendorf: 'Eugendorf',
    'faak-am-see': 'Faak am See',
    'feistritz-im-rosental': 'Feistritz im Rosental',
    feldbach: 'Feldbach',
    feldkirch: 'Feldkirch',
    feldkirchen: 'Feldkirchen',
    ferlach: 'Ferlach',
    fischamend: 'Fischamend',
    frauenkirchen: 'Frauenkirchen',
    freistadt: 'Freistadt',
    frohnleiten: 'Frohnleiten',
    fuegen: 'Fügen',
    fuerstenfeld: 'Fürstenfeld',
    gaenserndorf: 'Gänserndorf',
    gallneukirchen: 'Gallneukirchen',
    gleisdorf: 'Gleisdorf',
    gmuend: 'Gmünd',
    'gmuend-in-kaernten': 'Gmünd in Kärnten',
    gmunden: 'Gmunden',
    goetzis: 'Götzis',
    'golling-an-der-salzach': 'Golling an der Salzach',
    gols: 'Gols',
    graz: 'Graz',
    grieskirchen: 'Grieskirchen',
    groebming: 'Gröbming',
    groedig: 'Grödig',
    grosspetersdorf: 'Großpetersdorf',
    guessing: 'Güssing',
    gumpoldskirchen: 'Gumpoldskirchen',
    guntramsdorf: 'Guntramsdorf',
    haag: 'Haag',
    'hainburg-an-der-donau': 'Hainburg an der Donau',
    'hall-in-tirol': 'Hall in Tirol',
    hallein: 'Hallein',
    hard: 'Hard',
    hartberg: 'Hartberg',
    'hermagor-pressegger-see': 'Hermagor-Pressegger See',
    herzogenburg: 'Herzogenburg',
    himberg: 'Himberg',
    hohenems: 'Hohenems',
    hollabrunn: 'Hollabrunn',
    'hopfgarten-im-brixental': 'Hopfgarten im Brixental',
    horn: 'Horn',
    illmitz: 'Illmitz',
    imst: 'Imst',
    innsbruck: 'Innsbruck',
    jenbach: 'Jenbach',
    jennersdorf: 'Jennersdorf',
    jois: 'Jois',
    judenburg: 'Judenburg',
    kapfenberg: 'Kapfenberg',
    kaprun: 'Kaprun',
    'kirchberg-in-tirol': 'Kirchberg in Tirol',
    kirchbichl: 'Kirchbichl',
    kittsee: 'Kittsee',
    kitzbuehel: 'Kitzbühel',
    klagenfurt: 'Klagenfurt',
    klosterneuburg: 'Klosterneuburg',
    knittelfeld: 'Knittelfeld',
    koeflach: 'Köflach',
    korneuburg: 'Korneuburg',
    kottingbrunn: 'Kottingbrunn',
    'krems-an-der-donau': 'Krems an der Donau',
    kremsmuenster: 'Kremsmünster',
    'krumpendorf-am-woerthersee': 'Krumpendorf am Wörthersee',
    kuchl: 'Kuchl',
    kufstein: 'Kufstein',
    'laa-an-der-thaya': 'Laa an der Thaya',
    laakirchen: 'Laakirchen',
    landeck: 'Landeck',
    langenlois: 'Langenlois',
    lauterach: 'Lauterach',
    lech: 'Lech',
    leibnitz: 'Leibnitz',
    leoben: 'Leoben',
    leonding: 'Leonding',
    lenzing: 'Lenzing',
    lienz: 'Lienz',
    liezen: 'Liezen',
    lilienfeld: 'Lilienfeld',
    linz: 'Linz',
    lustenau: 'Lustenau',
    marchtrenk: 'Marchtrenk',
    'maria-saal': 'Maria Saal',
    mariazell: 'Mariazell',
    'matrei-in-osttirol': 'Matrei in Osttirol',
    mattersburg: 'Mattersburg',
    mauthausen: 'Mauthausen',
    mayrhofen: 'Mayrhofen',
    melk: 'Melk',
    'millstatt-am-see': 'Millstatt am See',
    mistelbach: 'Mistelbach',
    mittersill: 'Mittersill',
    moedling: 'Mödling',
    mondsee: 'Mondsee',
    moosburg: 'Moosburg',
    murau: 'Murau',
    mureck: 'Mureck',
    nenzing: 'Nenzing',
    neunkirchen: 'Neunkirchen',
    'neumarkt-am-wallersee': 'Neumarkt am Wallersee',
    'neusiedl-am-see': 'Neusiedl am See',
    nickelsdorf: 'Nickelsdorf',
    'oberndorf-bei-salzburg': 'Oberndorf bei Salzburg',
    oberpullendorf: 'Oberpullendorf',
    oberwart: 'Oberwart',
    ossiach: 'Ossiach',
    parndorf: 'Parndorf',
    perchtoldsdorf: 'Perchtoldsdorf',
    perg: 'Perg',
    peuerbach: 'Peuerbach',
    pinkafeld: 'Pinkafeld',
    'podersdorf-am-see': 'Podersdorf am See',
    poechlarn: 'Pöchlarn',
    poellau: 'Pöllau',
    poettsching: 'Pöttsching',
    poysdorf: 'Poysdorf',
    pressbaum: 'Pressbaum',
    purkersdorf: 'Purkersdorf',
    radenthein: 'Radenthein',
    radstadt: 'Radstadt',
    rankweil: 'Rankweil',
    rechnitz: 'Rechnitz',
    retz: 'Retz',
    reutte: 'Reutte',
    'ried-im-innkreis': 'Ried im Innkreis',
    'rohrbach-berg': 'Rohrbach-Berg',
    rottenmann: 'Rottenmann',
    rum: 'Rum',
    rust: 'Rust',
    'saalbach-hinterglemm': 'Saalbach-Hinterglemm',
    saalfelden: 'Saalfelden',
    'salzburg-city': 'Salzburg',
    'sankt-andrae': 'Sankt Andrä',
    'sankt-barbara-im-muerztal': 'Sankt Barbara im Mürztal',
    'sankt-florian': 'Sankt Florian',
    'sankt-georgen-im-attergau': 'Sankt Georgen im Attergau',
    'sankt-jakob-im-rosental': 'Sankt Jakob im Rosental',
    'sankt-johann-in-tirol': 'Sankt Johann in Tirol',
    'sankt-johann-im-pongau': 'Sankt Johann im Pongau',
    'sankt-marein-im-muerztal': 'Sankt Marein im Mürztal',
    'sankt-peter-in-der-au': 'Sankt Peter in der Au',
    'sankt-poelten': 'Sankt Pölten',
    'sankt-valentin': 'Sankt Valentin',
    'sankt-veit-an-der-glan': 'Sankt Veit an der Glan',
    schaerding: 'Schärding',
    scheibbs: 'Scheibbs',
    schladming: 'Schladming',
    schruns: 'Schruns',
    schwanenstadt: 'Schwanenstadt',
    schwaz: 'Schwaz',
    schwechat: 'Schwechat',
    schwertberg: 'Schwertberg',
    'seeboden-am-millstaetter-see': 'Seeboden am Millstätter See',
    'seefeld-in-tirol': 'Seefeld in Tirol',
    'seekirchen-am-wallersee': 'Seekirchen am Wallersee',
    seitenstetten: 'Seitenstetten',
    sillian: 'Sillian',
    'spittal-an-der-drau': 'Spittal an der Drau',
    stegersbach: 'Stegersbach',
    steyr: 'Steyr',
    stockerau: 'Stockerau',
    strasswalchen: 'Straßwalchen',
    telfs: 'Telfs',
    ternitz: 'Ternitz',
    thalgau: 'Thalgau',
    timelkam: 'Timelkam',
    traiskirchen: 'Traiskirchen',
    traismauer: 'Traismauer',
    traun: 'Traun',
    trebesing: 'Trebesing',
    trieben: 'Trieben',
    trofaiach: 'Trofaiach',
    tschagguns: 'Tschagguns',
    'tulln-an-der-donau': 'Tulln an der Donau',
    turnau: 'Turnau',
    'velden-am-woerther-see': 'Velden am Wörther See',
    'vienna-city': 'Wien',
    villach: 'Villach',
    voecklabruck: 'Vöcklabruck',
    voecklamarkt: 'Vöcklamarkt',
    voels: 'Völs',
    voelkermarkt: 'Völkermarkt',
    voesendorf: 'Vösendorf',
    voitsberg: 'Voitsberg',
    vorau: 'Vorau',
    'waidhofen-an-der-thaya': 'Waidhofen an der Thaya',
    'waidhofen-an-der-ybbs': 'Waidhofen an der Ybbs',
    'wals-siezenheim': 'Wals-Siezenheim',
    wattens: 'Wattens',
    weiz: 'Weiz',
    wels: 'Wels',
    'wiener-neustadt': 'Wiener Neustadt',
    wieselburg: 'Wieselburg',
    'winden-am-see': 'Winden am See',
    wolfsberg: 'Wolfsberg',
    woergl: 'Wörgl',
    wolfurt: 'Wolfurt',
    'wolkersdorf-im-weinviertel': 'Wolkersdorf im Weinviertel',
    'ybbs-an-der-donau': 'Ybbs an der Donau',
    'zell-am-see': 'Zell am See',
    zeltweg: 'Zeltweg',
    zirl: 'Zirl',
    zwettl: 'Zwettl',
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
        this.required = true;
        this.placeholder = '';
        this.label = '';
        const selectSuffix = commonUtils.makeId(24);
        this._selectId = `work-location-filter-${selectSuffix}`;
        this._labelId = `work-location-filter-label-${selectSuffix}`;

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
            required: {type: Boolean, reflect: true},
            placeholder: {type: String},
            label: {type: String},
        };
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            if (propName === 'lang') {
                void this._i18n.changeLanguage(this.lang);
            }

            if ((propName === 'lang' || propName === 'langDir') && this.langDir) {
                void setOverridesByGlobalCache(this._i18n, this);
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
            changedProperties.has('placeholder') ||
            changedProperties.has('label')
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

        this._applyAccessibleName();
    }

    /**
     * Select2 replaces the native select with its own combobox markup, which only references
     * the rendered selection text. Without this the screen reader announces no field name,
     * because a label outside of the shadow root can never be associated with the select.
     */
    _applyAccessibleName() {
        const accessibleName = this.label || this.placeholder;
        if (!accessibleName) {
            return;
        }

        const selection = this.renderRoot?.querySelector('.select2-selection');
        if (!selection) {
            return;
        }

        const labelledBy = selection.getAttribute('aria-labelledby') || '';
        const ids = labelledBy.split(/\s+/).filter(Boolean);
        if (!ids.includes(this._labelId)) {
            ids.unshift(this._labelId);
        }
        selection.setAttribute('aria-labelledby', ids.join(' '));
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
                    <label id="${this._labelId}" class="visually-hidden" for="${this._selectId}">
                        ${this.label || this.placeholder}
                    </label>
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

            .visually-hidden {
                position: absolute !important;
                clip: rect(1px, 1px, 1px, 1px);
                overflow: hidden;
                height: 1px;
                width: 1px;
                word-wrap: normal;
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
                font-size: 1em;
                font-weight: 300;
                position: absolute;
                right: 1.75rem;
                top: 50%;
                transform: translateY(-50%);
                z-index: 1;
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
        this.label = '';
        this.description = '';
        this.disabled = false;
        this.required = true;
        this._country = AUSTRIA_COUNTRY_CODE;
        this._region = '';
        this._city = '';
        this._regionSelectId = `work-location-region-${commonUtils.makeId(24)}`;
        this._citySelectId = `work-location-city-${commonUtils.makeId(24)}`;
        this._descriptionId = `work-locations-description-${commonUtils.makeId(24)}`;

        select2(window, $);
    }

    static get properties() {
        return {
            ...super.properties,
            lang: {type: String},
            langDir: {type: String, attribute: 'lang-dir'},
            value: {type: Array},
            label: {type: String},
            description: {type: String},
            disabled: {type: Boolean, reflect: true},
            required: {type: Boolean, reflect: true},
            _country: {state: true},
            _region: {state: true},
            _city: {state: true},
        };
    }

    update(changedProperties) {
        changedProperties.forEach((oldValue, propName) => {
            if (propName === 'lang') {
                void this._i18n.changeLanguage(this.lang);
            }

            if ((propName === 'lang' || propName === 'langDir') && this.langDir) {
                void setOverridesByGlobalCache(this._i18n, this);
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

        this._updateAriaDescribedBy();
    }

    /**
     * The description is rendered as a plain element above the selectors, so a screen reader
     * would skip it. Pointing the controls at it via aria-describedby makes it part of the
     * announcement of the field. Select2 hides the native select and builds its own markup,
     * so the elements the user actually focuses need the attribute as well.
     */
    _updateAriaDescribedBy() {
        const targets = this.renderRoot.querySelectorAll(
            'select, dbp-country-select, .select2-search__field, .select2-selection',
        );

        for (const target of targets) {
            if (this.description) {
                target.setAttribute('aria-describedby', this._descriptionId);
            } else {
                target.removeAttribute('aria-describedby');
            }
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
                },
            );
        } else {
            this._destroySelect2(this._citySelectId, 'change');
        }

        // Select2 rebuilds its markup outside of the Lit update cycle, so the description
        // association has to be re-applied to the newly created elements
        this._updateAriaDescribedBy();
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
    }

    _getSelectedLocation() {
        return {
            country: this._country,
            region: this._country === AUSTRIA_COUNTRY_CODE ? this._region : '',
            city: this._country === AUSTRIA_COUNTRY_CODE && this._region ? this._city : '',
        };
    }

    _canAddLocation() {
        const selectedKey = getLocationKey(this._getSelectedLocation());
        return (
            !this.disabled &&
            !!this._country &&
            !normalizeWorkLocations(this.value).some(
                (location) => getLocationKey(location) === selectedKey,
            )
        );
    }

    _addLocation() {
        if (!this._canAddLocation()) {
            return;
        }

        const nextLocations = normalizeWorkLocations([...this.value, this._getSelectedLocation()]);

        this.value = nextLocations;
        this._dispatchChange();
    }

    async _removeLocation(index) {
        this.value = this.value.filter((location, locationIndex) => locationIndex !== index);
        this._dispatchChange();

        // The focused delete button is removed together with its list item, which would make
        // the focus fall back to the beginning of the page. Keep it within the work locations.
        await this.updateComplete;
        this._focusAfterRemoval(index);
    }

    /**
     * Moves the focus to the delete button that took the place of the removed location,
     * or to the previous one if the last location was removed. If no locations are left,
     * the heading of the selected locations gets the focus.
     * @param {number} removedIndex
     */
    _focusAfterRemoval(removedIndex) {
        const deleteButtons = this.renderRoot.querySelectorAll('.delete-location-button');

        if (deleteButtons.length > 0) {
            const nextButton = deleteButtons[Math.min(removedIndex, deleteButtons.length - 1)];
            // The icon button does not delegate the focus, so focus its inner button directly
            const innerButton = /** @type {HTMLButtonElement|null} */ (
                nextButton.shadowRoot?.querySelector('button')
            );
            if (innerButton) {
                innerButton.focus();
                return;
            }
        }

        const heading = /** @type {HTMLElement|null} */ (
            this.renderRoot.querySelector('#selected-locations-heading')
        );
        heading?.focus();
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
        const canAddLocation = this._canAddLocation();
        const select2CSS = commonUtils.getAbsoluteURL(select2CSSPath);

        return html`
            <link rel="stylesheet" href="${select2CSS}" />
            <section class="work-locations">
                <h4 class="field-label company-info-title">
                    ${this.label || t('manage-job-offers.field-work-locations')}
                </h4>
                ${
                    this.description
                        ? html`
                              <div class="description" id="${this._descriptionId}">
                                  ${this.description}
                              </div>
                          `
                        : ''
                }

                <div class="selector-stack">
                    <label class="selector-label">
                        <span>
                            ${t('manage-job-offers.work-location-country')}
                            ${
                                this.required
                                    ? html`
                                          <span class="required-mark">*</span>
                                      `
                                    : ''
                            }
                        </span>
                        <dbp-country-select
                            lang="${this.lang}"
                            .value="${this._country}"
                            ?disabled="${this.disabled}"
                            @change="${(event) =>
                                this._onCountryChange(event)}"></dbp-country-select>
                    </label>

                    ${
                        this._country === AUSTRIA_COUNTRY_CODE
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
                            : ''
                    }
                    ${
                        this._country === AUSTRIA_COUNTRY_CODE && this._region
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
                            : ''
                    }

                    <button
                        class="button is-primary add-location-button ${
                            canAddLocation ? '' : 'disabled'
                        }"
                        type="button"
                        aria-label="${t('manage-job-offers.work-location-add-aria')}"
                        ?disabled="${!canAddLocation}"
                        @click="${() => {
                            this._addLocation();
                            this._resetSelection();
                        }}">
                        <dbp-icon name="plus" aria-hidden="true"></dbp-icon>
                        <span class="button-label">
                            ${t('manage-job-offers.work-location-add')}
                        </span>
                    </button>
                </div>

                <div class="selected-locations">
                    <h5 id="selected-locations-heading" tabindex="-1">
                        ${t('manage-job-offers.work-location-selected')}
                    </h5>
                    ${
                        selectedLocations.length > 0
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
                                                      title="${t(
                                                          'manage-job-offers.work-location-remove',
                                                      )}"
                                                      aria-label="${t(
                                                          'manage-job-offers.work-location-remove-aria',
                                                          {
                                                              location: getWorkLocationLabel(
                                                                  location,
                                                                  t,
                                                                  this.lang,
                                                              ),
                                                          },
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
                                      ${
                                          this.required
                                              ? html`
                                                    <span class="required-mark">*</span>
                                                `
                                              : ''
                                      }
                                  </p>
                              `
                    }
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
                margin: 0.75rem 0;
            }

            .field-label {
                font-weight: bolder;
                margin: 0;
            }

            /* Matches the description styling of the toolkit form elements */
            .description {
                color: var(--dbp-muted);
                font-size: 0.875rem;
                line-height: 1.4;
                margin-bottom: 0.25em;
            }

            .selector-stack {
                display: flex;
                gap: 10px;
                align-items: flex-end;
                justify-content: space-between;
            }

            .selector-stack button {
                flex-shrink: 0;
            }

            .selector-label {
                display: grid;
                grid-template-columns: minmax(0, 1fr);
                flex: 1 1 auto;
                min-width: 0;
                max-width: 50%;
            }

            .selector-label .select,
            .selector-label .field,
            .selector-label .select2-control {
                min-width: 0;
            }

            .selector-label,
            .selector-label dbp-country-select,
            .selector-label select {
                font-weight: 300;
            }

            .selector-label > span {
                margin-bottom: 3px;
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
                flex-wrap: nowrap;
            }

            .selector-label
                .select2-container--default
                .select2-selection--single
                .select2-selection__rendered {
                display: block;
                flex: 1 1 0;
                min-width: 0;
                overflow: hidden;
                padding-right: 0;
                white-space: nowrap !important;
                text-overflow: ellipsis !important;
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

            .required-mark {
                color: var(--dbp-accent);
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

            /* Programmatic focus target after the last location was removed */
            #selected-locations-heading:focus {
                outline: none;
            }

            #selected-locations-heading:focus-visible {
                outline: 1px solid var(--dbp-accent);
                outline-offset: 2px;
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

            @media (max-width: 700px) {
                .selector-stack {
                    flex-direction: column;
                    align-items: stretch;
                }

                .selector-label {
                    flex: none;
                }

                .selector-stack button {
                    align-self: flex-end;
                }
                .work-locations {
                    margin-top: 1rem;
                }
            }
        `;
    }
}

export default WorkLocationsElement;
