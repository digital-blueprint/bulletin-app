export const normalizeHttpUrl = (value) => {
    const trimmedValue = String(value ?? '').trim();
    if (!trimmedValue) {
        return '';
    }

    if (/^[a-z][a-z\d+.-]*:\/\//i.test(trimmedValue)) {
        return trimmedValue;
    }

    return `https://${trimmedValue}`;
};

export const isValidHttpUrl = (value, {allowEmpty = false} = {}) => {
    const normalizedValue = normalizeHttpUrl(value);
    if (!normalizedValue) {
        return allowEmpty;
    }
    if (/\s/.test(normalizedValue)) {
        return false;
    }

    try {
        const url = new URL(normalizedValue);
        return (
            ['http:', 'https:'].includes(url.protocol) &&
            url.hostname.includes('.') &&
            !url.hostname.startsWith('.') &&
            !url.hostname.endsWith('.')
        );
    } catch {
        return false;
    }
};
