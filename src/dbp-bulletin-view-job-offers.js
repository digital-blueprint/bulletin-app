import {css, html} from 'lit';
import * as commonUtils from '@dbp-toolkit/common/utils';
import * as commonStyles from '@dbp-toolkit/common/src/styles.js';
import DBPBulletinLitElement from './dbp-bulletin-lit-element.js';

class ViewJobOffers extends DBPBulletinLitElement {
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

commonUtils.defineCustomElement('dbp-bulletin-view-job-offers', ViewJobOffers);
