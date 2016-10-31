# PublishInfo
Namespace: `Plugins.PublishInfo`

This plugin can be used for article-boxes to display a list of dates and names of every time the article have been published.
You can easily create your own plugins to add functionality to Labrador in edit-mode.

Config-example for article-structure:
```json
"plugins": {
    "article_info": {
        "autoStart": false,
        "path": "Plugins.PublishInfo",
        "appendToAppMenu": false
    }
}
```

The structure-model will create an instance of the plugin "Plugins.PublishInfo" when needed ("autoStart" = false).

This plugin ships with a css-file. This is included in the front-pages that needs it like this (f.eks: /view/page/front/default/edit_properties.json):
```json
"filesForMainWindow": {
    "css": [
        "/view-resources/lib/edit/plugins/PublishInfo/PublishInfo.css"
    ]
},
```
 
Config-example for menu-item triggering the plugin:
```json
"time": {
    "group": "g5",
    "trigger": ["click"],
    "callback": "triggerPluginMethod",
    "title": "Publish-history",
    "params": {
        "plugin": "article_info",
        "fn": "display"
    }
}
```
This button will run the method "display" on the plugin "article_info". If the plugin do not exist it will be created.

