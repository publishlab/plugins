# PusherListener
Namespace: `Plugins.PusherListener`

This plugin is written specifically for Labrador Dashboards and will redraw contentboxes each time an article is published using Pusher WebSocket-events. 

The plugin only redraws contentboxes displaying articles from the same section as the published article.

Require CMS-version 3.0.13 or later and the plugin `Plugins.Pusher` to post updates.

## To install
- Move the plugin-folder `PusherListener` to `/view_resources/lib/edit/plugins/`.

- Add the plugin to a Dashboard-page using a property-file for edit-mode.
Config-example for page:
```json
"plugins": {
    "pusher_listener_plugin": {
        "autoStart": true,
        "path": "Plugins.PusherListener",
        "appendToAppMenu": "toggle"
    }
}
```

Please modify the plugin as needed.
