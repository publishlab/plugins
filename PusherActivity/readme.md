# PusherActivity
Namespace: `Plugins.PusherActivity`

This plugin notifies user when a Labrador page is opened for editing or closed using Pusher WebSocket-events. 

Require CMS-version 3.0.13 or later and the plugin `Plugins.Pusher` to post updates.

PusherActivity can be used on any page that wants to display Labrador-activity.

## To install
- Move the plugin-folder `PusherActivity` to `/view_resources/lib/edit/plugins/`. If you use the plugin in a Dashboard, move the folder to `/view_resources/dashboard/lib/edit/plugins/`.

- Move the template-files stored in the `templates`-folder to `/view_resources/view/plugin_support/PusherActivity/`. If you use the plugin in a Dashboard, move the template-files to `/view_resources/dashboard/view/plugin_support/PusherActivity/`

- Add the plugin to a page using a property-file for edit-mode.
Config-example for page:
```json
"plugins": {
    "pusher_activity_plugin": {
        "autoStart": true,
        "path": "Plugins.PusherActivity",
        "appendToAppMenu": "toggle"
    }
}
```

Please modify the plugin as needed.
