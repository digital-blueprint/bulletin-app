-- Creates the Formalize form used by src/modules/companyForm.js.
-- The form identifier is reused when a company form already exists.
SET @company_form_identifier = COALESCE(
    (SELECT identifier FROM formalize_forms WHERE frontend_key = 'bulletin-company' LIMIT 1),
    (SELECT identifier FROM formalize_forms WHERE frontend_key = 'company' LIMIT 1),
    UUID()
);

-- Keep the schema intentionally permissive for renderer-controlled fields.
-- Formalize still validates the required company name, while optional dbp form
-- elements can submit strings, booleans, arrays or empty values without causing
-- schema drift between the renderer and this setup script.
SET @company_data_feed_schema = JSON_OBJECT(
    'title', 'Company',
    'type', 'object',
    'properties', JSON_OBJECT(
        'name', JSON_OBJECT('type', 'string', 'minLength', 1, 'description', 'Name')
    ),
    'required', JSON_ARRAY('name')
);

INSERT INTO formalize_forms (
    identifier,
    name,
    date_created,
    creator_id,
    data_feed_schema,
    availability_starts,
    availability_ends,
    grant_based_submission_authorization,
    allowed_submission_states,
    allowed_actions_when_submitted,
    tag_permissions_for_submitters,
    max_num_submissions_per_creator,
    available_tags,
    frontend_key,
    additional_data
)
SELECT
    @company_form_identifier,
    'Companies',
    CURRENT_TIMESTAMP,
    NULL,
    @company_data_feed_schema,
    NULL,
    NULL,
    0,
    4,
    8,
    1,
    10000,
    NULL,
    'bulletin-company',
    NULL
WHERE NOT EXISTS (
    SELECT 1
    FROM formalize_forms
    WHERE identifier = @company_form_identifier
);

UPDATE formalize_forms
SET
    data_feed_schema = @company_data_feed_schema,
    frontend_key = 'bulletin-company'
WHERE identifier = @company_form_identifier
   OR frontend_key = 'company';

INSERT INTO formalize_localized_form_names (
    form_identifier,
    language_tag,
    name
)
SELECT @company_form_identifier, 'de', 'Firmen'
WHERE NOT EXISTS (
    SELECT 1
    FROM formalize_localized_form_names
    WHERE form_identifier = @company_form_identifier
      AND language_tag = 'de'
);

INSERT INTO formalize_localized_form_names (
    form_identifier,
    language_tag,
    name
)
SELECT @company_form_identifier, 'en', 'Companies'
WHERE NOT EXISTS (
    SELECT 1
    FROM formalize_localized_form_names
    WHERE form_identifier = @company_form_identifier
      AND language_tag = 'en'
);

-- For local/dev tests, this grants everyone read access to the form and manage access to its submissions.
INSERT INTO authorization_resources (
    identifier,
    resource_class,
    resource_identifier
)
SELECT
    UNHEX(REPLACE(UUID(), '-', '')),
    'DbpRelayFormalizeForm',
    @company_form_identifier
WHERE NOT EXISTS (
    SELECT 1
    FROM authorization_resources
    WHERE resource_class = 'DbpRelayFormalizeForm'
      AND resource_identifier = @company_form_identifier
);

INSERT INTO authorization_resources (
    identifier,
    resource_class,
    resource_identifier
)
SELECT
    UNHEX(REPLACE(UUID(), '-', '')),
    'DbpRelayFormalizeSubmissionCollection',
    @company_form_identifier
WHERE NOT EXISTS (
    SELECT 1
    FROM authorization_resources
    WHERE resource_class = 'DbpRelayFormalizeSubmissionCollection'
      AND resource_identifier = @company_form_identifier
);

INSERT INTO authorization_resource_action_grants (
    identifier,
    authorization_resource_identifier,
    dynamic_group_identifier,
    action
)
SELECT
    UNHEX(REPLACE(UUID(), '-', '')),
    ar.identifier,
    'everybody',
    'read'
FROM authorization_resources ar
WHERE ar.resource_class = 'DbpRelayFormalizeForm'
  AND ar.resource_identifier = @company_form_identifier
  AND NOT EXISTS (
      SELECT 1
      FROM authorization_resource_action_grants g
      WHERE g.authorization_resource_identifier = ar.identifier
        AND g.dynamic_group_identifier = 'everybody'
        AND g.action = 'read'
  );

INSERT INTO authorization_resource_action_grants (
    identifier,
    authorization_resource_identifier,
    dynamic_group_identifier,
    action
)
SELECT
    UNHEX(REPLACE(UUID(), '-', '')),
    ar.identifier,
    'everybody',
    'manage'
FROM authorization_resources ar
WHERE ar.resource_class = 'DbpRelayFormalizeSubmissionCollection'
  AND ar.resource_identifier = @company_form_identifier
  AND NOT EXISTS (
      SELECT 1
      FROM authorization_resource_action_grants g
      WHERE g.authorization_resource_identifier = ar.identifier
        AND g.dynamic_group_identifier = 'everybody'
        AND g.action = 'manage'
  );

-- For a safer user-specific grant, replace @user_identifier and run the two inserts below instead of the everybody grants.
-- SET @user_identifier = 'YOUR_USER_IDENTIFIER';
-- INSERT INTO authorization_resource_action_grants (
--     identifier,
--     authorization_resource_identifier,
--     user_identifier,
--     action
-- )
-- SELECT
--     UNHEX(REPLACE(UUID(), '-', '')),
--     ar.identifier,
--     @user_identifier,
--     'read'
-- FROM authorization_resources ar
-- WHERE ar.resource_class = 'DbpRelayFormalizeForm'
--   AND ar.resource_identifier = @company_form_identifier
--   AND NOT EXISTS (
--       SELECT 1
--       FROM authorization_resource_action_grants g
--       WHERE g.authorization_resource_identifier = ar.identifier
--         AND g.user_identifier = @user_identifier
--         AND g.action = 'read'
--   );
-- INSERT INTO authorization_resource_action_grants (
--     identifier,
--     authorization_resource_identifier,
--     user_identifier,
--     action
-- )
-- SELECT
--     UNHEX(REPLACE(UUID(), '-', '')),
--     ar.identifier,
--     @user_identifier,
--     'manage'
-- FROM authorization_resources ar
-- WHERE ar.resource_class = 'DbpRelayFormalizeSubmissionCollection'
--   AND ar.resource_identifier = @company_form_identifier
--   AND NOT EXISTS (
--       SELECT 1
--       FROM authorization_resource_action_grants g
--       WHERE g.authorization_resource_identifier = ar.identifier
--         AND g.user_identifier = @user_identifier
--         AND g.action = 'manage'
--   );
