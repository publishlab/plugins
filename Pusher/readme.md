# Pusher
Namespace: `Plugins.Pusher`

This plugin posts data informing listeners about actions on current page using Pusher WebSocket-events and Labrador Events.

The following events are posted (through Pusher):
- Page opened
- Page published
- Page closed

This allows other plugins to act on the events.

Require CMS-version 3.0.13 or later.

## To install
- Move the plugin-folder `Pusher` to `/view_resources/lib/edit/plugins/`.

- Add the plugin to a Dashboard-page using a property-file for edit-mode.
Config-example for page:
```json
"plugins": {
    "pusher_plugin": {
        "autoStart": true,
        "path": "Plugins.Pusher",
        "appendToAppMenu": "toggle"
    }
}
```

Please modify the plugin as needed.
