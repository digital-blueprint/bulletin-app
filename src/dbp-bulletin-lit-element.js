import '@webcomponents/scoped-custom-element-registry';
import DBPLitElement from '@dbp-toolkit/common/dbp-lit-element';
import {createInstance} from './i18n';
import {AuthMixin, LangMixin} from '@dbp-toolkit/common';

export default class DBPBulletinLitElement extends LangMixin(
    AuthMixin(DBPLitElement),
    createInstance,
) {
    constructor() {
        super();
        this._initialized = false;
        this.entryPointUrl = '';
        this.basePath = '';
    }

    static get properties() {
        return {
            ...super.properties,
            entryPointUrl: {type: String, attribute: 'entry-point-url'},
            basePath: {type: String, attribute: 'base-path'},
        };
    }

    loginCallback() {
        if (!this._initialized) {
            this.initialize();
            this._initialized = true;
        }
    }

    initialize() {}
}
