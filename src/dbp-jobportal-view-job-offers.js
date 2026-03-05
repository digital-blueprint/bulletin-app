import {css, html} from 'lit';
import * as commonUtils from '@dbp-toolkit/common/utils';
import * as commonStyles from '@dbp-toolkit/common/src/styles.js';
import DBPJobportalLitElement from './dbp-jobportal-lit-element.js';

class ViewJobOffers extends DBPJobportalLitElement {
    render() {
        return html`
            <div class="notification is-info">
                View job offers activity placeholder: functionality will be added here.
            </div>
        `;
    }

    static get styles() {
        return css`
            ${commonStyles.getNotificationCSS()}

            .notification {
                margin-bottom: 0;
            }
        `;
    }
}

commonUtils.defineCustomElement('dbp-jobportal-view-job-offers', ViewJobOffers);
