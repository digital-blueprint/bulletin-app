# Jobportal Application

[GitHub Repository](https://github.com/digital-blueprint/jobportal-app) |
[npmjs package](https://www.npmjs.com/package/@digital-blueprint/jobportal-app) |
[Unpkg CDN](https://unpkg.com/browse/@digital-blueprint/jobportal-app/) |
[Jobportal Bundle](https://github.com/digital-blueprint/relay-jobportal-bundle)

[![Build, Test and Publish](https://github.com/digital-blueprint/jobportal-app/actions/workflows/build-test-publish.yml/badge.svg)](https://github.com/digital-blueprint/jobportal-app/actions/workflows/build-test-publish.yml)

Management of job offers created via external systems.

## Prerequisites

- You need the [API server](https://gitlab.tugraz.at/dbp/relay/dbp-relay-server-template) running
- You need the [DbpRelayJobportalBundle](https://github.com/digital-blueprint/relay-jobportal-bundle) for the API server to persist and fetch submissions

## Local development

```bash
# get the source
git clone git@github.com:digital-blueprint/jobportal-app.git
cd jobportal-app
git submodule update --init

# install dependencies
npm install

# constantly build dist/bundle.js and run a local web-server on port 8001
npm run watch

# constantly build dist/bundle.js and run a local web-server on port 8001 using a custom assets directory assets_local/
npm run watch-local

# run tests
npm test
```

Jump to <https://localhost:8001>, and you should get a Single Sign On login page.

## Using this app as pre-built package

### Install app

If you want to install the dbp jobportal app in a new folder `jobportal-app` you can call:

```bash
npx @digital-blueprint/cli install-app jobportal jobportal-app /
```

**Warning:** There may be issues when you run these commands as root user, best use a non-root user, like `www-data`.
To do this you can for example open a shell with `runuser -u www-data -- bash`.

Afterwards, you can point your Apache web-server to `jobportal-app/public`.

Make sure you are allowing `.htaccess` files in your Apache configuration.

Also make sure to add all of your resources you are using (like your API and Keycloak servers) to the
`Content-Security-Policy` in your `jobportal-app/public/.htaccess`, so the browser allows access to those sites.

You can also use this app directly from the [Unpkg CDN](https://unpkg.com/browse/@digital-blueprint/jobportal-app/)
for example like this: [dbp-jobportal/index.html](https://github.com/digital-blueprint/jobportal-app/tree/main/examples/dbp-jobportal/index.html)

Note that you will need a Keycloak server along with a client id for the domain you are running this html on.

### Update app

If you want to update the dbp jobportal app in the current folder you can call:

```bash
npx @digital-blueprint/cli update-app jobportal
```

**Warning:** There may be issues when you run these commands as root user, best use a non-root user, like `www-data`.
To do this you can for example open a shell with `runuser -u www-data -- bash`.

## Activities

This app has the following activities:

- `dbp-jobportal-view-job-offers`
- `dbp-jobportal-manage-job-offers`

You can find the documentation of the activity in the [jobportal activities documentation](https://github.com/digital-blueprint/jobportal-app/tree/main/src).

## Adapt app

### Functionality

You can add multiple attributes to the `<dbp-jobportal>` tag.

| attribute name          | value   | description                                                                                                   |
| ----------------------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| `provider-root`         | Boolean | [app-shell](https://gitlab.tugraz.at/dbp/web-components/toolkit/-/tree/master/packages/app-shell)             |
| `lang`                  | String  | [language-select](https://gitlab.tugraz.at/dbp/web-components/toolkit/-/tree/master/packages/language-select) |
| `entry-point-url`       | String  | [app-shell](https://gitlab.tugraz.at/dbp/web-components/toolkit/-/tree/master/packages/app-shell)             |
| `keycloak-config`       | Object  | [app-shell](https://gitlab.tugraz.at/dbp/web-components/toolkit/-/tree/master/packages/app-shell)             |
| `base-path`             | String  | [app-shell](https://gitlab.tugraz.at/dbp/web-components/toolkit/-/tree/master/packages/app-shell)             |
| `src`                   | String  | [app-shell](https://gitlab.tugraz.at/dbp/web-components/toolkit/-/tree/master/packages/app-shell)             |
| `html-overrides`        | String  | [common](https://gitlab.tugraz.at/dbp/web-components/toolkit/-/tree/master/packages/common)                   |
| `themes`                | Array   | [theme-switcher](https://gitlab.tugraz.at/dbp/web-components/toolkit/-/tree/master/packages/theme-switcher)   |
| `darkModeThemeOverride` | String  | [theme-switcher](https://gitlab.tugraz.at/dbp/web-components/toolkit/-/tree/master/packages/theme-switcher)   |

#### Mandatory attributes

If you are not using the `provider-root` attribute to "terminate" all provider attributes
you need to manually add these attributes so that the topic will work properly:

```html
<dbp-jobportal auth requested-login-status analytics-event></dbp-jobportal>
```

### Design

For frontend design customizations, such as logo, colors, font, favicon, and more, take a look at the [theming documentation](https://dbp-demo.tugraz.at/dev-guide/frontend/theming/).

## "dbp-jobportal" slots

These are common slots for the app-shell. You can find the documentation of these slots in the [app-shell documentation](https://gitlab.tugraz.at/dbp/web-components/toolkit/-/tree/master/packages/app-shell).
For the app specific slots take a look at the [jobportal activities](https://github.com/digital-blueprint/jobportal-app/tree/main/src).

## Notice

We use autogenerated table headers for creating submission tables.

A [get query](https://api-demo.tugraz.at/#operations-Jobportal-getJobportalSubmissionItem) is made to dbp-relay.
This returns JSON. The JSON contains various data from previously submitted entries.

To post a form to the API, take a look at: [operations-Jobportal-postJobportalSubmissionCollection](https://api-demo.tugraz.at/#operations-Jobportal-postJobportalSubmissionCollection).
This request contains the form name (`form`) and the form data (`dataFeedElement`). The data must be valid JSON as a string, i.e. quotation marks must be escaped with `\"`.
The data keys of forms with the same `form` name must be consistent; otherwise, new keys are not displayed and old table headers may become inconsistent.
