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

#### Slots

You use templates tags to inject slots into the activity.
These templates will be converted to div containers when the page is loaded and will not show up before that.

### dbp-bulletin-manage-job-offers

A hidden activity used by the application to manage job offer entries.

#### Attributes

- `routing-url`: identifier used by the activity routing
    - example `routing-url="manage-job-offers"`
- `lang` (optional, default: `de`): set to `de` or `en` for German or English
    - example `lang="de"`
- `entry-point-url` (optional, default is the TU Graz entry point URL): entry point URL to access the API
    - example `entry-point-url="https://api-dev.tugraz.at"`
- `auth` object: you need to set that object property for the auth token
    - example auth property: `{token: "THE_BEARER_TOKEN"}`
    - note: most often this should be an attribute that is not set directly, but subscribed at a provider

## Design Note

To ensure a uniform and responsive design, these activities should occupy 100% width of the window when the activity width is under 768 px.

## Mandatory attributes

If you are not using the `provider-root` attribute to "terminate" all provider attributes
you need to manually add these attributes so that the topic will work properly:

```html
<dbp-bulletin auth requested-login-status analytics-event entry-point-url></dbp-bulletin>
```
