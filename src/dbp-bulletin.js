import '@webcomponents/scoped-custom-element-registry';
import {css} from 'lit';
import {AppShell} from '@dbp-toolkit/app-shell';
import * as commonUtils from '@dbp-toolkit/common/utils';
import {Translated} from '@dbp-toolkit/common/src/translated';

export class BulletinAppShell extends AppShell {
    static get styles() {
        return [
            super.styles,
            css`
                :host(.sticky-footer-active) main {
                    padding-bottom: 4rem;
                }

                :host(.sticky-footer-active) footer {
                    position: fixed;
                    right: max(15px, calc((100vw - 1400px) / 2 + 15px));
                    bottom: 0;
                    left: max(15px, calc((100vw - 1400px) / 2 + 15px));
                    z-index: 1000;
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0.5rem 0 1rem;
                    background-color: var(--dbp-background);
                    box-shadow: 0 -0.25rem 0.75rem rgba(0, 0, 0, 0.08);
                }
            `,
        ];
    }

    update(changedProperties) {
        if (changedProperties.has('activeView')) {
            this._updateStickyFooterState();
        }

        super.update(changedProperties);
    }

    _updateStickyFooterState() {
        this.classList.toggle('sticky-footer-active', this.activeView === 'view-job-offers');
    }
}

commonUtils.defineCustomElement('dbp-bulletin', BulletinAppShell);
commonUtils.defineCustomElement('dbp-translated', Translated);
