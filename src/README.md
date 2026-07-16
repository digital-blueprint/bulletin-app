# Bulletin activities

Here you can find the individual activities of the `bulletin` app. If you want to use the whole app, look at [bulletin](https://github.com/digital-blueprint/bulletin-app).

## Usage of an activity

You can use every activity alone. Take a look at our examples [here](https://github.com/digital-blueprint/bulletin-app/tree/main/examples).

## Activities

### dbp-bulletin-view-job-offers

Note that you will need a Keycloak server along with a client ID for the domain you are running this HTML on.

#### Attributes

- `lang` (optional, default: `de`): set to `de` or `en` for German or English
    - example `lang="de"`
- `entry-point-url` (optional, default is the TU Graz entry point URL): entry point URL to access the API
    - example `entry-point-url="https://api-dev.tugraz.at"`
- `auth` object: you need to set that object property for the auth token
    - example auth property: `{token: "THE_BEARER_TOKEN"}`
    - note: most often this should be an attribute that is not set directly, but subscribed at a provider
- `university-short-name` (optional): the short name of the university to display for internal job offers
    - example `university-short-name="TUGraz"`

#### Slots

You use template tags to inject slots into the activity.
These templates will be converted to div containers when the page is loaded and will not show up before that.

### dbp-bulletin-browse-career-profiles

Enables you to explore student career profiles for potential job candidates.

Note that you will need a Keycloak server along with a client ID for the domain you are running this HTML on.

#### Attributes

- `lang` (optional, default: `de`): set to `de` or `en` for German or English
    - example `lang="de"`
- `entry-point-url` (optional, default is the TU Graz entry point URL): entry point URL to access the API
    - example `entry-point-url="https://api-dev.tugraz.at"`
- `auth` object: you need to set that object property for the auth token
    - example auth property: `{token: "THE_BEARER_TOKEN"}`
    - note: most often this should be an attribute that is not set directly, but subscribed at a provider

#### Slots

You use template tags to inject slots into the activity.
These templates will be converted to div containers when the page is loaded and will not show up before that.

### dbp-bulletin-career-profile

Enables students to create unsolicited applications as career profiles.

Note that you will need a Keycloak server along with a client ID for the domain you are running this HTML on.

#### Attributes

- `lang` (optional, default: `de`): set to `de` or `en` for German or English
    - example `lang="de"`
- `entry-point-url` (optional, default is the TU Graz entry point URL): entry point URL to access the API
    - example `entry-point-url="https://api-dev.tugraz.at"`
- `auth` object: you need to set that object property for the auth token
    - example auth property: `{token: "THE_BEARER_TOKEN"}`
    - note: most often this should be an attribute that is not set directly, but subscribed at a provider

#### Slots

You use template tags to inject slots into the activity.
These templates will be converted to div containers when the page is loaded and will not show up before that.

### dbp-bulletin-generate-jobs

Generates random job offers for testing purposes. This activity requires the `ROLE_BULLETIN_ADMIN` role.

Note that you will need a Keycloak server along with a client ID for the domain you are running this HTML on.

#### Attributes

- `lang` (optional, default: `de`): set to `de` or `en` for German or English
    - example `lang="de"`
- `entry-point-url` (optional, default is the TU Graz entry point URL): entry point URL to access the API
    - example `entry-point-url="https://api-dev.tugraz.at"`
- `auth` object: you need to set that object property for the auth token
    - example auth property: `{token: "THE_BEARER_TOKEN"}`
    - note: most often this should be an attribute that is not set directly, but subscribed at a provider

#### Slots

You use template tags to inject slots into the activity.
These templates will be converted to div containers when the page is loaded and will not show up before that.

### dbp-bulletin-import-companies

Imports companies from a CSV file. This activity requires the `ROLE_BULLETIN_ADMIN` role.

Note that you will need a Keycloak server along with a client ID for the domain you are running this HTML on.

#### Attributes

- `lang` (optional, default: `de`): set to `de` or `en` for German or English
    - example `lang="de"`
- `entry-point-url` (optional, default is the TU Graz entry point URL): entry point URL to access the API
    - example `entry-point-url="https://api-dev.tugraz.at"`
- `auth` object: you need to set that object property for the auth token
    - example auth property: `{token: "THE_BEARER_TOKEN"}`
    - note: most often this should be an attribute that is not set directly, but subscribed at a provider
- `nextcloud-auth-url` (optional): Nextcloud auth URL used to select the CSV file to import
    - example `nextcloud-auth-url="https://nextcloud.example.com/index.php/apps/webapppassword"`
- `nextcloud-web-dav-url` (optional): Nextcloud WebDAV URL used to access the CSV file
    - example `nextcloud-web-dav-url="https://nextcloud.example.com/remote.php/dav/files"`
- `nextcloud-name` (optional): name of the Nextcloud instance shown in the file picker
    - example `nextcloud-name="Nextcloud"`
- `nextcloud-file-url` (optional): Nextcloud file URL used to open files in the web interface
    - example `nextcloud-file-url="https://nextcloud.example.com/apps/files/?dir="`

#### Slots

You use template tags to inject slots into the activity.
These templates will be converted to div containers when the page is loaded and will not show up before that.

## Design Note

To ensure a uniform and responsive design, these activities should occupy 100% width of the window when the activity width is under 768 px.

## Mandatory attributes

If you are not using the `provider-root` attribute to "terminate" all provider attributes
you need to manually add these attributes so that the topic will work properly:

```html
<dbp-bulletin auth requested-login-status analytics-event entry-point-url></dbp-bulletin>
```
