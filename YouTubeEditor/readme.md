#YouTubeEditor
Namespace: `Plugins.YouTubeEditor`

Plugin to set start- and stop-points in an embedded YouTube-video.

Result is stored on `fields.video_start` and `fields.video_end` on the node-model.

Template can use this when creating the embed-url for the video.

The plugin is only tested with HTML5-video. Flash-version may or may not work.

Please use and modify the plugin as needed.

Youtube-documentation: 
- https://developers.google.com/youtube/iframe_api_reference
- https://developers.google.com/youtube/player_parameters#Parameters

Config-example to include the plugin on all youtube-boxes `/view/structure/youtube/edit_properties.json`:
```json
"plugins": {
    "youtube_editor": {
        "autoStart": false,
        "path": "Plugins.YouTubeEditor",
        "appendToAppMenu": false
    }
}
```

Config-example to display a button to start the plugin `/view/menu_settings/structure/article.json`
```json
{
    ...    
    "items": {
        ...
        "video_edit": {
            "trigger": ["click"],
            "callback": "triggerPluginMethodForChild",
            "displayCondition": "hasChildOfType",
            "params": {
                "childType": "youtube",
                "plugin": "youtube_editor",
                "fn": "displayEditor"
            },
            "group": "g5",
            "title": "Edit video"
        }
    }
}
```
The button `video_edit` is added to all article-boxes that contains a child of type `youtube`. 
When clicking the button the method `displayEditor` is run on the plugin. If it is not already started it will start now.

This plugin is shipped with a CSS file that should be included in the page-template in edit-mode.
This is done when initializing the plugin.

@category    Labrador
@package     Labrador 3
@author      stian.andersen@publishlab.com
@copyright   Copyright (c) 2016 PublishLab AS (http://www.publishlab.com)
@version     1.0