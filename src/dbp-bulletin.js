import '@webcomponents/scoped-custom-element-registry';
import {AppShell} from '@dbp-toolkit/app-shell';
import * as commonUtils from '@dbp-toolkit/common/utils';
import {Translated} from '@dbp-toolkit/common/src/translated';
import {FEATURE_FLAGS, initializeFeatureFlags, isFeatureEnabled} from './featureFlags.js';

export class BulletinAppShell extends AppShell {
    constructor() {
        super();
        this.defaultEnabledFeatureFlags = [];
        this._handleFeatureFlagChange = this._handleFeatureFlagChange.bind(this);
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
        this.addEventListener('change', this._handleFeatureFlagChange);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this.removeEventListener('change', this._handleFeatureFlagChange);
    }

    _handleFeatureFlagChange(event) {
        const changedFeatureFlag = event
            .composedPath()
            .find((element) => FEATURE_FLAGS.includes(element?.dataset?.key))?.dataset?.key;
        if (!changedFeatureFlag) return;

        this._updateVisibleRoutes();
        this._lastElm?.requestUpdate();
    }

    _updateVisibleRoutes() {
        const originalRequiredRoles = new Map();
        const originalVisibility = new Map();
        const isLoggedIn = this.auth?.['login-status'] === 'logged-in';

        // Adapt any-role requirements to the toolkit's all-role visibility check.
        for (const routingName of this.routes) {
            const activity = this.metadata[routingName];

            if (activity.feature_flag && !isFeatureEnabled(activity.feature_flag)) {
                originalVisibility.set(activity, activity.visible);
                activity.visible = false;
            }

            // Activities marked as "visible_when_logged_out" stay in the menu for anonymous
            // users, so that they can open them and are asked to log in by the activity itself.
            if (!isLoggedIn && activity.visible_when_logged_out) continue;

            const requiredAnyRoles = activity.required_any_roles ?? [];
            if (requiredAnyRoles.length === 0) continue;

            originalRequiredRoles.set(activity, activity.required_roles);
            if (!requiredAnyRoles.some((role) => this._roles.includes(role))) {
                activity.required_roles = [...activity.required_roles, null];
            }
        }

        try {
            super._updateVisibleRoutes();
        } finally {
            for (const [activity, requiredRoles] of originalRequiredRoles) {
                activity.required_roles = requiredRoles;
            }
            for (const [activity, visible] of originalVisibility) {
                activity.visible = visible;
            }
        }
    }
}

commonUtils.defineCustomElement('dbp-bulletin', BulletinAppShell);
commonUtils.defineCustomElement('dbp-translated', Translated);
