import {getFeatureFlag, registerFeatureFlag, setFeatureFlag} from '@dbp-toolkit/common';

export const CAREER_PROFILES_FEATURE_FLAG = 'career-profiles';
export const EXTERNAL_JOBS_FEATURE_FLAG = 'external-jobs';
export const FEATURE_FLAGS = [CAREER_PROFILES_FEATURE_FLAG, EXTERNAL_JOBS_FEATURE_FLAG];

for (const featureFlag of FEATURE_FLAGS) {
    registerFeatureFlag(featureFlag);
}

export function isFeatureEnabled(featureFlag) {
    return getFeatureFlag(featureFlag);
}

export function initializeFeatureFlags(defaultEnabledFeatureFlags) {
    for (const featureFlag of FEATURE_FLAGS) {
        const defaultEnabled = defaultEnabledFeatureFlags.includes(featureFlag);
        const defaultKey = `dbp-feature-default-${featureFlag}`;
        const previousDefault = localStorage.getItem(defaultKey);
        const currentDefault = String(defaultEnabled);

        if (previousDefault === null || previousDefault !== currentDefault) {
            setFeatureFlag(featureFlag, defaultEnabled);
            localStorage.setItem(defaultKey, currentDefault);
        }
    }
}
