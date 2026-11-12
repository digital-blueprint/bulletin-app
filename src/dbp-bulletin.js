import '@webcomponents/scoped-custom-element-registry';
import {AppShell} from '@dbp-toolkit/app-shell';
import * as commonUtils from '@dbp-toolkit/common/utils';
import {Translated} from '@dbp-toolkit/common/src/translated';
import './dbp-bulletin-job-offer-detail.js';

export class BulletinAppShell extends AppShell {}

commonUtils.defineCustomElement('dbp-bulletin', BulletinAppShell);
commonUtils.defineCustomElement('dbp-translated', Translated);
