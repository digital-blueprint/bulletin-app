import {assert} from 'chai';

import '../src/dbp-jobportal-view-job-offers';
import '../src/dbp-jobportal.js';

suite('dbp-jobportal-view-job-offers basics', () => {
    let node;

    suiteSetup(async () => {
        node = document.createElement('dbp-jobportal-view-job-offers');
        document.body.appendChild(node);
        await node.updateComplete;
    });

    suiteTeardown(() => {
        node.remove();
    });

    test('should render', () => {
        assert(!!node.shadowRoot);
    });
});
