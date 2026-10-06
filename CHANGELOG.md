# Changelog

## Unreleased

- Create and edit job offer: when saving fails, the warning now lists all required fields that are missing or invalid (e.g. "Stellenbezeichnung", "Wochenstunden", "Ende der Veröffentlichung") instead of only asking to fill in all required fields. All invalid fields show their inline error at once (previously only the fields up to the first invalid one), the organizational unit shows an inline error too, and the focus moves to the first invalid field. A missing work location is now reported together with the other fields
- Create and edit job offer: position title and description no longer have to be filled in German; they are required in at least one language (German or English). The German fields stay marked as required until the English title and description are complete, and the English fields become required once English text was started. Job offers, their detail view, sharing texts and the manage job offers table fall back to the other language when a text is missing in the current language
- View job offers: added an "Only university jobs" checkbox next to the "Mein Traumjob ist:" dropdown that hides job offers of external companies; it is preselected when "Studienbegleitend" is chosen, shown as an "Arbeitgeber" filter marker, and only available when external jobs are enabled
- Import companies: after a dry run the CSV file stays loaded, so the real import can be started with "Jetzt importieren" (in the import card and at the end of the dry-run report) without selecting the file again; a confirmation dialog shows how many companies will be created and overwritten. Changing an option after the dry run marks the report as outdated and requires a "Testlauf wiederholen" on the loaded file. The loaded file is cleared after the real import
- Import companies: added a "Testlauf (nichts speichern)" checkbox that is checked by default; in a dry run the CSV file is evaluated with all selected options, but no companies are created or overwritten, and the report shows how many companies would be imported, overwritten or skipped
- Import companies: added an optional "Nach letzter Stellenanzeige filtern" checkbox that reveals a date selector; when enabled, only companies whose "Letzte Stellenanzeige" CSV column is on or after the selected date are imported, all others (including empty dates) are listed in a new "Wegen letzter Stellenanzeige übersprungen" report section
- Generate career profiles: generated profiles now contain German and English study names, so the "Studienfächer" column no longer shows English labels in the German UI
- Manage job offers: moved Edit from the Actions dropdown into each permitted job-offer row using the centralized Formalize action-placement API; row actions are ordered View, Edit, Show submissions
- Manage job offers: added a read-only job-offer preview action to the overview table, reusing the public detail modal while hiding sharing and application controls
- Create and edit job offer dialog and the career profile edit dialog: added skip links at the end of the form that jump straight to the primary save button and to the close button in the dialog header, so keyboard and screen reader users no longer have to tab back through all fields to save or abort
- Manage job offers: the open-applications button in the job offers table read as "Stellenangebote verwalten" for every row, because the translation override dropped the form name placeholder; it now names the job offer via a separate `open-forms-aria` override while the tooltip stays short
- Remember the selected pagination size per user, activity, and browser in browse career profiles, manage job offers, and manage user-defined fields
- Added a new developer-only activity `generate-career-profiles` that creates random career profiles so more entries are shown on the browse career profiles page
- Added a new admin-only activity `generate-jobs` that creates random job offers so more entries are shown on the view job offers page; supports generating TU Graz (internal) positions, external (company) positions, or a random mix of both
- Manage job offers overview: added bulk removal of selected job offers, gated by each form's delete/manage permission; enabled via the `enable-forms-bulk-delete` attribute (off by default in formalize)
- View job offers: the activity is now always listed in the menu and on the start page, also for users that are not logged in; opening it asks them to log in. Enabled via the new `visible_when_logged_out` activity metadata flag
- View job offers: the additional filters (work location, weekly hours, areas of interest) are now hidden behind a "Filter öffnen" toggle so only the "Mein Traumjob ist:" dropdown, the search field and the toggle are shown initially
- View job offers: added a "Mein Traumjob ist:" dropdown (Alle / Studienbegleitend / Für Berufseinsteiger) and a "100% Remote" checkbox next to the work location filter; selecting "Studienbegleitend" preselects Steiermark, 100% Remote and max 20h, "Für Berufseinsteiger" preselects any location, 100% Remote and min 20h
- View job offers: added removable filter markers below the filters that show the active filters (styled after the cabinet-app current refinements), plus a "Filter löschen" action to clear all filters at once. The "Mein Traumjob ist" selection is not shown as a marker
- View job offers: selecting a "Mein Traumjob ist" preset now keeps the additional filters collapsed while showing its active filter markers; the areas of interest filter now uses its own row and the weekly-hours fields are more compact
- View job offers: unified the styling and position of the filter field labels
- View job offers: unified the placeholder texts of the search and filter fields with the browse career profiles activity
- View job offers: removed the "External application" section from the detail dialog of external job offers, the "Apply" button now leads to the company website directly
- Career profile: unified the styling of the subtitles in the profile view mode
- Career profile and browse career profiles: fixed the profile view mode not rendering because of a leftover call to the removed industries section, which for example made the back navigation on the company interest submissions page update the URL without showing the profile
- Career profile: the "Back to profile" navigation of the company interest submissions page now leads to the career profile overview instead of the profile view mode
- Browse career profiles: the "View profile" table action button now has a row-specific `aria-label` naming the applicant, while the tooltip stays short
- Manage job offers: the work location remove buttons now have an `aria-label` and a tooltip naming the location, so the repeated icon buttons can be told apart
- The decorative `hr` dividers below the section headings of the company form, the job offer form and the job offer detail view are now hidden from screen readers via `aria-hidden`
- View job offers and job offer detail: the areas of interest tags are now rendered as a real list with explicit `list`/`listitem` roles, which the `list-style: none` styling removed in some browsers
- View job offers and job offer detail: the areas of interest tags now flow inline next to their label, so single tags wrap one after another instead of the whole tag block moving to the next line
- Career profile and browse career profiles: the study program, areas of interest and work location lists now carry explicit `list`/`listitem` roles and an `aria-label`, and the study program tags no longer nest a `span` inside the list item

## 0.1.0

- Inital release

## 0.1.1

- Trigger release
