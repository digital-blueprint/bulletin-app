import '@webcomponents/scoped-custom-element-registry';
import {AppShell} from '@dbp-toolkit/app-shell';
import * as commonUtils from '@dbp-toolkit/common/utils';
import {Translated} from '@dbp-toolkit/common/src/translated';

export class BulletinAppShell extends AppShell {
    _updateVisibleRoutes() {
        const originalRequiredRoles = new Map();
        const isLoggedIn = this.auth?.['login-status'] === 'logged-in';

        // Adapt any-role requirements to the toolkit's all-role visibility check.
        for (const routingName of this.routes) {
            const activity = this.metadata[routingName];

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
        }
    }
}

commonUtils.defineCustomElement('dbp-bulletin', BulletinAppShell);
commonUtils.defineCustomElement('dbp-translated', Translated);
