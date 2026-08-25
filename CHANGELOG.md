# Changelog

## Unreleased

- Added a new developer-only activity `generate-career-profiles` that creates random career profiles so more entries are shown on the browse career profiles page
- Added a new admin-only activity `generate-jobs` that creates random job offers so more entries are shown on the view job offers page; supports generating TU Graz (internal) positions, external (company) positions, or a random mix of both
- Manage job offers overview: added bulk removal of selected job offers, gated by each form's delete/manage permission; enabled via the `enable-forms-bulk-delete` attribute (off by default in formalize)
- View job offers: the activity is now always listed in the menu and on the start page, also for users that are not logged in; opening it asks them to log in. Enabled via the new `visible_when_logged_out` activity metadata flag
- View job offers: the additional filters (work location, weekly hours, areas of interest) are now hidden behind a "Filter öffnen" toggle so only the "Mein Traumjob ist:" dropdown, the search field and the toggle are shown initially
- View job offers: added a "Mein Traumjob ist:" dropdown (Alle / Studienbegleitend / Für Berufseinsteiger) and a "100% Remote" checkbox next to the work location filter; selecting "Studienbegleitend" preselects Steiermark, 100% Remote and max 20h, "Für Berufseinsteiger" preselects any location, 100% Remote and min 20h
- View job offers: added removable filter markers below the filters that show the active filters (styled after the cabinet-app current refinements), plus a "Filter löschen" action to clear all filters at once. The "Mein Traumjob ist" selection is not shown as a marker
- View job offers: unified the styling and position of the filter field labels
- View job offers: unified the placeholder texts of the search and filter fields with the browse career profiles activity
- View job offers: removed the "External application" section from the detail dialog of external job offers, the "Apply" button now leads to the company website directly
- Career profile: unified the styling of the subtitles in the profile view mode
- Career profile and browse career profiles: fixed the profile view mode not rendering because of a leftover call to the removed industries section, which for example made the back navigation on the company interest submissions page update the URL without showing the profile
- Career profile: the "Back to profile" navigation of the company interest submissions page now leads to the career profile overview instead of the profile view mode

## 0.1.0

- Inital release

## 0.1.1

- Trigger release
