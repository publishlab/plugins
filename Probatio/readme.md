# Probatio AB-tests
Namespace: `Plugins.Probatio`

This plugin is written to extend functionality on a Labrador `ab_versions`-page.
The `ab_versions`-page lets user create versions of an article and this plugin passes these versions on to Linkpulse Probatio, creating an ab-test.

Rendering and data-collection of the test is outside the scope of this plugin.

The plugin renders its GUI using a renderer supplied to the plugin by Labrador, `params.templateRenderer`, and using the method `params.getTemplate` to get the template-files used.

### Installation

The plugin require the following templates (Mustache):
- `/view_resources/view/plugin_support/probatio/unpublished.template.mustache`
- `/view_resources/view/plugin_support/probatio/settings_form.template.mustache`

Move the template-files supplied with this plugin to the specified folder in your Labrador-view. Create the folders if they do not exist.

Assign the plugin to a `ab_versions`-page in edit-mode:

Config-example for ab_version-page:
```json
"plugins": {
    "probatio": {
        "autoStart": true,
        "path": "Plugins.Probatio",
        "containerSelector": "#lab-versions-buttons",
        "servicePath": "customer/<customer_name>/probatio/",
        "probatioDataUrl": "http://example.com/data.json"
    }
}
```

The node-model will create an instance of the plugin "Plugins.Probatio" when page has loaded (`autoStart` = true).  
### Settings
- `autoStart` (boolean) (optional) Should the plugin start on page-load?
- `path` (string) (required) The namespace path for the plugin.
- `containerSelector` (string) (required) Selector for the dom-element the plugin can draw inside.   
- `servicePath` (string) (required) Path to Labrador Integration-services where the Linkpulse API-authorization is defined.   
- `probatioDataUrl` (string) (required) Url for Probatio test-data. If missing, Probatio-previews are disabled.

Please use and modify this plugin as needed. If you want to share your modifications, please create a pull-request at https://github.com/publishlab/plugins.

@category    Labrador  
@package     Labrador 3.0  
@author      stian.andersen@publishlab.com  
@copyright   (c) 2017 PublishLab AS [http://www.publishlab.com](http://www.publishlab.com)  
@version     1.0  
