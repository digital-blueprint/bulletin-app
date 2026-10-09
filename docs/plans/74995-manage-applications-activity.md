# Plan: Split "Manage job offers" into job offers and applications

Kanboard task: [74995 – formalize & bulletin: manage-forms adjustments](https://plan.tugraz.at/task/74995)

## Background

In formalize-app the former `dbp-formalize-manage-forms` activity was split into two activities:

| Activity                           | Routing name         | Lists forms where the user …                                                                 | Features                                                                                                          |
| ---------------------------------- | -------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `dbp-formalize-manage-forms`       | `manage-forms`       | has an edit right (`grantedFormActions` contains `update` or `manage`)                       | create, edit (row + dropdown), edit permissions, delete; routes `/`, `/<id>/edit`                                 |
| `dbp-formalize-manage-submissions` | `manage-submissions` | may read all submissions or at least one (own or shared), via `whereMayReadSubmissions=true` | submission lists, details, export, delete, tags, permissions; routes `/`, `/<id>`, `/<id>/details/<submissionId>` |

Shared web components in `vendor/formalize/src`:

- `ManageFormsOverviewPage` (`manage-forms-overview-page.js`): forms table, search, actions, URL state
- `FormSubmissions` (`form-submissions.js`, scoped as `dbp-formalize-form-submissions`): submission lists of one form
- `ManageFormsActivityBase` (`manage-forms-activity-base.js`): module and form loading, routing

The bulletin "Manage job offers" activity (`manage-job-offers`, element `dbp-formalize-manage-forms`) now behaves as the
forms-only activity. Until bulletin-app is adapted:

- It only lists job offers the user can edit.
- Job applications can no longer be opened from it.
- `enable-submission-permission-editing` and `hide-create-submission-button` are ignored there.

## Goal

- **Manage job offers** (`manage-job-offers`): create, edit, delete job offers and edit their permissions.
- **Manage applications** (new, e.g. `manage-job-applications`): view and manage applications (submissions) of the job
  offers where the user may read submissions.

## Steps

### 1. Update the formalize submodule

- [ ] Point `vendor/formalize` to the formalize-app commit containing the split.
- [ ] Check `npm run build` and `npm test` for breaking imports (`test/unit.js` imports `manage-forms-api.js`,
      `jobOfferForm.js` imports `apiCreateForm`/`apiUpdateForm`; both are unchanged).

### 2. Add the "Manage applications" activity

- [ ] Add `vendor/formalize/src/dbp-formalize-manage-submissions.js` to the `input` list in `rolldown.config.js`.
- [ ] Create `assets/dbp-formalize-manage-submissions.metadata.json` and `assets_custom/…` (same content):

    ```json
    {
        "element": "dbp-formalize-manage-submissions",
        "module_src": "dbp-formalize-manage-submissions.js",
        "routing_name": "manage-job-applications",
        "name": {"de": "Bewerbungen verwalten", "en": "Manage applications"},
        "short_name": {"de": "Bewerbungen verwalten", "en": "Manage applications"},
        "description": {
            "de": "Ermöglicht das Verwalten von Bewerbungen auf Stellenangebote",
            "en": "Enables managing applications for job offers"
        },
        "subscribe": "lang,lang-dir,entry-point-url,auth,html-overrides,base-path,routing-url,allow-list-frontend-keys,hide-create-submission-button,enable-submission-permission-editing"
    }
    ```

- [ ] Add the activity to `assets/dbp-bulletin.topic.metadata.json.ejs`, `assets_custom/dbp-bulletin.topic.metadata.json.ejs`
      and `app-template/topic.metadata.json` right after `dbp-formalize-manage-forms.metadata.json`.
- [ ] Decide on `required_roles` (see open questions).

### 3. Clean up the "Manage job offers" activity

- [ ] Remove `hide-create-submission-button` and `enable-submission-permission-editing` from the `subscribe` list in
      `assets/dbp-formalize-manage-forms.metadata.json` and `assets_custom/…`.
- [ ] Keep `enable-forms-bulk-delete` and `allow-list-frontend-keys`.

### 4. Adapt the job offer module actions

`src/modules/jobOfferForm.js` → `getManageFormsOverviewActions(context, actions)`:

- [ ] Use `context.activity` (`'manage-forms'` or `'manage-submissions'`) to decide which actions to return.
- [ ] Manage job offers: keep moving `edit` to the row, keep the preview action.
- [ ] Manage applications: keep `open-submissions` with the `list` icon; decide whether to show the preview action.
- [ ] Remove the `open-submissions` mapping from the job offers branch, it no longer exists there.

### 5. Move translation overrides

Overrides are scoped by element name. Strings now rendered by other elements must be moved in
`assets/translation-overrides/{de,en}/translation.json` and `assets_custom/translation-overrides/…`:

| Key                                          | From                                         | To                                      |
| -------------------------------------------- | -------------------------------------------- | --------------------------------------- |
| `manage-forms.open-forms`, `open-forms-aria` | `dbp-formalize-manage-forms`                 | `dbp-formalize-manage-submissions`      |
| `manage-forms.no-submission-data-available`  | `dbp-formalize-manage-forms`                 | `dbp-formalize-form-submissions`        |
| `manage-forms.back-text`                     | `dbp-formalize-manage-form-submissions-page` | unchanged, check it still applies       |
| `manage-forms.name`                          | `dbp-formalize-manage-forms`                 | also `dbp-formalize-manage-submissions` |

- [ ] Verify that the forms table column labels (`manage-forms.name`) are overridden: they are now built in
      `dbp-formalize-manage-forms-overview-page`, so the override may have to move there.
- [ ] Check the overview texts in the new activity (e.g. "No forms available") and add job-specific overrides.

### 6. Update links to applications

- [ ] `src/dbp-bulletin-generate-jobs.js`: the link `manage-job-offers/<id>` (applications of a job offer) must point
      to `manage-job-applications/<id>`; the `…/<id>/edit` link stays on `manage-job-offers`.
- [ ] Search for further links to `manage-job-offers/<id>` (job offer detail page, career profile, notifications, e-mails).
- [ ] Check the job offer preview (`src/modules/jobOfferPreview.js`) works from both activities (`host.renderRoot`, `host.auth`).

### 7. Tests and docs

- [ ] Unit tests: `getManageFormsOverviewActions()` per activity, metadata contains both activities.
- [ ] Manual test with a job offer manager, a company user and an applicant:
    - Manage job offers lists only editable job offers.
    - Manage applications lists job offers with readable applications, opening them shows the applications.
    - Deep links `manage-job-applications/<id>` and `…/details/<submissionId>` work.
- [ ] Update `README.md` and `CHANGELOG.md`.

## Open questions

1. **Naming and routing:** "Manage applications" / `manage-job-applications`?
2. **Roles:** Should the applications activity require `ROLE_BULLETIN_JOB_OFFER_MANAGER`, or be visible to everyone
   (e.g. applicants seeing their own applications)?
3. **Preview action:** Show the job offer preview in the applications activity too?
4. **Create submission button:** Keep `hide-create-submission-button` for applications?
5. **Old links:** Do existing bookmarks or e-mails link to `manage-job-offers/<id>`? If so, should that route redirect
   to the applications activity?
