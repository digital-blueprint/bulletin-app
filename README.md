# Bulletin Application

[GitHub Repository](https://github.com/digital-blueprint/bulletin-app) |
[npmjs package](https://www.npmjs.com/package/@digital-blueprint/bulletin-app) |
[Unpkg CDN](https://unpkg.com/browse/@digital-blueprint/bulletin-app/)

[![Build, Test and Publish](https://github.com/digital-blueprint/bulletin-app/actions/workflows/build-test-publish.yml/badge.svg)](https://github.com/digital-blueprint/bulletin-app/actions/workflows/build-test-publish.yml)

Management of job offers.

## Prerequisites

- You need the [API server](https://gitlab.tugraz.at/dbp/relay/dbp-relay-server-template) running
- You need the [DbpRelayBulletinBundle](https://github.com/digital-blueprint/relay-bulletin-bundle) for the API server to persist and fetch submissions

## Local development

```bash
# get the source
git clone git@github.com:digital-blueprint/bulletin-app.git
cd bulletin-app
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

If you want to install the dbp bulletin app in a new folder `bulletin-app` you can call:

```bash
npx @digital-blueprint/cli install-app bulletin bulletin-app /
```

**Warning:** There may be issues when you run these commands as root user, best use a non-root user, like `www-data`.
To do this you can for example open a shell with `runuser -u www-data -- bash`.

Afterwards, you can point your Apache web-server to `bulletin-app/public`.

Make sure you are allowing `.htaccess` files in your Apache configuration.

Also make sure to add all of your resources you are using (like your API and Keycloak servers) to the
`Content-Security-Policy` in your `bulletin-app/public/.htaccess`, so the browser allows access to those sites.

You can also use this app directly from the [Unpkg CDN](https://unpkg.com/browse/@digital-blueprint/bulletin-app/)
for example like this: [dbp-bulletin/index.html](https://github.com/digital-blueprint/bulletin-app/tree/main/examples/dbp-bulletin/index.html)

Note that you will need a Keycloak server along with a client id for the domain you are running this html on.

### Update app

If you want to update the dbp bulletin app in the current folder you can call:

```bash
npx @digital-blueprint/cli update-app bulletin
```

**Warning:** There may be issues when you run these commands as root user, best use a non-root user, like `www-data`.
To do this you can for example open a shell with `runuser -u www-data -- bash`.

## Activities

This app has the following activities:

- `dbp-bulletin-view-job-offers`
- `dbp-bulletin-manage-job-offers`

You can find the documentation of the activity in the [bulletin activities documentation](https://github.com/digital-blueprint/bulletin-app/tree/main/src).

## Adapt app

### Functionality

You can add multiple attributes to the `<dbp-bulletin>` tag.

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
<dbp-bulletin auth requested-login-status analytics-event></dbp-bulletin>
```

### Design

For frontend design customizations, such as logo, colors, font, favicon, and more, take a look at the [theming documentation](https://dbp-demo.tugraz.at/dev-guide/frontend/theming/).

## "dbp-bulletin" slots

These are common slots for the app-shell. You can find the documentation of these slots in the [app-shell documentation](https://gitlab.tugraz.at/dbp/web-components/toolkit/-/tree/master/packages/app-shell).
For the app specific slots take a look at the [bulletin activities](https://github.com/digital-blueprint/bulletin-app/tree/main/src).

## Notice

We use autogenerated table headers for creating submission tables.

A [get query](https://api-demo.tugraz.at/#operations-Bulletin-getBulletinSubmissionItem) is made to dbp-relay.
This returns JSON. The JSON contains various data from previously submitted entries.

To post a form to the API, take a look at: [operations-Bulletin-postBulletinSubmissionCollection](https://api-demo.tugraz.at/#operations-Bulletin-postBulletinSubmissionCollection).
This request contains the form name (`form`) and the form data (`dataFeedElement`). The data must be valid JSON as a string, i.e. quotation marks must be escaped with `\"`.
The data keys of forms with the same `form` name must be consistent; otherwise, new keys are not displayed and old table headers may become inconsistent.
