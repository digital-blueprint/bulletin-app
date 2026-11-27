import {css} from 'lit';

export const listMarkerStyles = css`
    ul:not(.tag-list) {
        padding-left: 2px;
    }

    ul:not(.tag-list) > li {
        list-style: none;
        padding-left: 0.75rem;
        position: relative;
    }

    ul:not(.tag-list) > li::before {
        content: '•';
        left: 0;
        position: absolute;
    }
`;
