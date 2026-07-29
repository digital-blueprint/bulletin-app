# Changelog

## Unreleased

- Added a new developer-only activity `generate-career-profiles` that creates random career profiles so more entries are shown on the browse career profiles page
- Added a new admin-only activity `generate-jobs` that creates random job offers so more entries are shown on the view job offers page; supports generating TU Graz (internal) positions, external (company) positions, or a random mix of both
- Manage job offers overview: added bulk removal of selected job offers, gated by each form's delete/manage permission; enabled via the `enable-forms-bulk-delete` attribute (off by default in formalize)
- View job offers: the activity is now always listed in the menu and on the start page, also for users that are not logged in; opening it asks them to log in. Enabled via the new `visible_when_logged_out` activity metadata flag
- View job offers: unified the styling and position of the filter field labels
- View job offers: unified the placeholder texts of the search and filter fields with the browse career profiles activity
- View job offers: removed the "External application" section from the detail dialog of external job offers, the "Apply" button now leads to the company website directly
- Career profile: unified the styling of the subtitles in the profile view mode

## 0.1.0

- Inital release

## 0.1.1

- Trigger release
