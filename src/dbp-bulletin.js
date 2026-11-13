import '@webcomponents/scoped-custom-element-registry';
import {AppShell} from '@dbp-toolkit/app-shell';
import * as commonUtils from '@dbp-toolkit/common/utils';
import {Translated} from '@dbp-toolkit/common/src/translated';
import {getFeatureFlag, listFeatureFlags} from '@dbp-toolkit/common';
import {initializeFeatureFlags} from './featureFlags.js';
import './dbp-bulletin-job-offer-detail.js';

export class BulletinAppShell extends AppShell {
    constructor() {
        super();
        this.routes = [];
        this.defaultEnabledFeatureFlags = [];
        this.addEventListener('change', (event) => {
            const input = event
                .composedPath()
                .find((element) => element instanceof HTMLInputElement);
            if (input?.dataset.key && listFeatureFlags().includes(input.dataset.key)) {
                this._updateVisibleRoutes();
            }
        });
    }

    static get properties() {
        return {
            ...super.properties,
            defaultEnabledFeatureFlags: {
                type: Array,
                attribute: 'default-enabled-feature-flags',
            },
        };
    }

    connectedCallback() {
        super.connectedCallback();
        initializeFeatureFlags(this.defaultEnabledFeatureFlags);
        this._updateVisibleRoutes();
    }

    _updateVisibleRoutes() {
        const originalRoutes = this.routes;

        // Apply app feature gates before the toolkit's developer-mode and role checks.
        this.routes = originalRoutes.filter((routingName) => {
            const featureFlag = this.metadata[routingName]?.feature_flag;
            return !featureFlag || getFeatureFlag(featureFlag);
        });

        try {
            super._updateVisibleRoutes();
        } finally {
            this.routes = originalRoutes;
        }
    }
}

commonUtils.defineCustomElement('dbp-bulletin', BulletinAppShell);
commonUtils.defineCustomElement('dbp-translated', Translated);
