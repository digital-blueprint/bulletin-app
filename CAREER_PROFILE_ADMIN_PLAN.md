# Career profile administration handoff

Task: https://plan.tugraz.at/task/74352

## Goal

Users with `ROLE_BULLETIN_CAREER_PROFILE_ADMIN` should be able to edit and delete every career profile they can read. The role is restricted to developers for now.

## Implemented frontend

- `manage-career-profiles` activity, enabled by `career-profiles` and the admin role.
- Lists career-profile Formalize forms returned by the API, following Hydra pagination. It does not apply the browse activity's audience filter.
- Edit/delete buttons depend on each form's `grantedActions` (`update`, `delete` or `manage`).
- Right-pinned row actions and table configuration, checkbox selection, and an Actions dropdown.
- Bulk deletion only acts on explicitly selected profiles with delete permission. There is no delete-all action.
- Compact delete confirmation with cancel/delete footer buttons and partial-failure feedback.
- Editing preserves the existing profile name and student ownership.
- `src/modules/careerProfileEditDialog.js` is shared by the career-profile page and the management activity. It provides the same pinned save header, scrolling form, required-field note and keyboard skip links.
- Admin mode uses only the profile's saved studies and does not fetch the administrator's person data.
- German and English translations, metadata for both builds, documentation and changelog entries.

The middleware frontend role is already configured in `config/packages/dbp_relay_frontend.yaml`:

```yaml
ROLE_BULLETIN_CAREER_PROFILE_ADMIN: 'user.get("ROLE_DEVELOPER")'
```

## Repository locations

On this machine the repositories were sibling checkouts under `Code/VPU`:

- `Apps/bulletin-app` (this repository).
- `MiddlewareAPI` (middleware configuration and university-specific bundle).

Use the corresponding checkouts on the other machine. Synchronize both repositories, including these local commits, before continuing. No push was requested in this session.

## Remaining work

### 1. Verify backend permissions before changing them

- [ ] Log in as a developer and inspect `GET /formalize/forms?perPage=9999&whereFrontendKeyIn[]=career-profile` for profiles created by another student.
- [ ] Inspect the returned `grantedActions`; try editing/deleting a disposable profile owned by another user.
- [ ] Confirm whether the collection-level `manage_resource_collection_policy` actually grants item-level rights in the currently installed authorization bundle. Do not assume this from its name alone.

Relevant middleware paths:

- `config/packages/dbp_relay_authorization.yaml`: `DbpRelayFormalizeForm` collection policy and the `dbp_developers` dynamic group.
- `bundles/TugrazBundle/EventSubscriber/FormAddedPostEventSubscriber.php`: `setCareerProfileFormPermissions()` currently adds read grants for staff and the career-profile readers group, plus interest-submission creation grants.
- `bundles/TugrazBundle/Common/Bulletin.php`: frontend key and readers-group identifier.
- `bundles/TugrazBundle/Common/Formalize.php`: resource/action constants.
- `vendor/dbp/relay-formalize-bundle/src/Authorization/AuthorizationService.php`: form registration and item grants.
- `vendor/dbp/relay-formalize-bundle/src/Service/FormalizeService.php`: `getFormsCurrentUserIsAuthorizedToRead()`.
- `vendor/dbp/relay-authorization-bundle/src/Service/InternalResourceActionGrantService.php`: collection versus item grant evaluation.

These vendor paths are references, not the preferred place for application-specific changes.

### 2. Grant administration rights for new profiles if missing

- [ ] In `FormAddedPostEventSubscriber::setCareerProfileFormPermissions()`, grant developers the required item actions on each new career-profile form.
- [ ] Prefer the minimal `update` and `delete` actions if those meet the requirement. If using `manage`, verify its broader effects on permission administration first.
- [ ] Use the existing `dbp_developers` dynamic group for the current developer-only requirement. Use existing resource/action constants or add suitable constants consistently.
- [ ] Leave ownership grants and staff/readers read access intact. Do not grant administration rights on job offers, company forms or unrelated forms.
- [ ] Do not add submission-collection management grants merely for deleting a profile: first verify how the existing form deletion endpoint removes related submissions.

### 3. Backfill existing profiles

- [ ] Follow the middleware's existing migration/post-migration conventions to apply the same grants to existing forms with `frontendKey == "career-profile"`.
- [ ] Inspect how formalize and authorization use separate entity managers/databases before selecting the migration approach.
- [ ] Use the grant service or established migration helpers; avoid duplicate grants and preserve existing permissions.
- [ ] Verify rerunning the backfill does not duplicate grants and that unrelated forms are untouched.

Useful starting points: `bundles/TugrazBundle/Migrations/AbstractAuthorizationEntityManagerMigration.php`, `Version20260728082200.php` (career-profile readers group), and migrations that add resource grants. Search for the existing company-form post-migration mentioned in the middleware changelog for a cross-database example.

### 4. Add meaningful middleware tests and changelog entry

- [ ] Test new career-profile creation grants, existing-profile backfill, developer versus non-developer access, and exclusion of unrelated frontend keys.
- [ ] Ensure a developer can edit/delete another user's profile without changing its name or ownership.
- [ ] Verify the student still has access after an admin edit.
- [ ] Verify a failed bulk deletion leaves the remaining profiles visible and reports successes/failures correctly.
- [ ] Add an Unreleased middleware changelog entry referencing task #74352 and the actual permission/backfill changes.
- [ ] Follow `MiddlewareAPI/AGENTS.md` and the repository's test/check commands and commit hooks.

### 5. Authenticated frontend acceptance check

- [ ] Rebuild and start the frontend with the updated middleware.
- [ ] Log in manually through SSO; assistants must not attempt login.
- [ ] Verify the menu requires the admin role and feature flag.
- [ ] Test profiles owned by another user, generated profiles, and unreleased profiles.
- [ ] Verify the editor is identical on both activities, including scrolling, pinned save header, keyboard navigation, saving and errors.
- [ ] Verify right-pinned action/configuration column while horizontally scrolling and after applying saved column configuration.
- [ ] Verify no delete-all option is offered; deleting selected rows requires confirmation.
- [ ] Test both languages and narrow screens.

## Visibility and authorization distinction

The management table shows every career-profile form the API returns as readable. Staff and members of the career-profile readers group currently receive read access in the middleware, regardless of the profile's `additionalData.visibility` selection. The browse activity applies that audience selection separately in the frontend.

The new frontend admin role controls activity access; it does not itself grant backend item permissions. The earlier suggestion that developers lacked item permissions still needs the runtime/bundle verification described above. This is the main unresolved backend question.

Backend enforcement of the student's audience choice is separate from the admin-management task. Record it as follow-up work if required; do not silently change ordinary reader access while implementing admin grants.

## Verification completed in this session

- `npm run check` passed.
- `npm test`: 117 tests passed in Firefox and Chromium.
- Custom build passed; both builds passed earlier before extracting the shared dialog.
- Shared editor visually checked in Playwright with synthetic profile/auth data, without SSO login or writes to the real API.

## Translation extraction note

Use `n` for interpolated item counts where pluralization is not needed, matching the other activities. Passing `count` makes i18next-cli generate plural keys; ensure all generated forms are translated before considering checks complete. Keep translation calls literal so extraction does not prune strings passed indirectly to action-button helpers.
