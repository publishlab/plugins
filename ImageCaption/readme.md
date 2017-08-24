# Edit original image-data
Namespace: `Plugins.ImageCaption`

This plugin can be used with images to edit original captions and bylines.

### Installation

The plugin require the following templates (Mustache):
- `/view_resources/view/plugin_support/ImageCaption/image.template.mustache`

Config-example to assign the plugin for image-nodes:
```json
"plugins": {
    "ImageCaption": {
        "autoStart": false,
        "path": "Plugins.ImageCaption"
    }
}
```

Example of button to start the plugin:
```json
{
    "some_menu": {
        ...
        "items": {
            "settings": {
                "trigger": ["click"],
                "callback": "triggerPluginMethod",
                "title": "Edit caption on original image",
                "params": {
                    "plugin": "ImageCaption",
                    "fn": "edit"
                }
            },
            ...
        },
        "params": {}
    }
}
```

Please use and modify this plugin as needed. If you want to share your modifications, please create a pull-request at https://github.com/publishlab/plugins.

@category    Labrador  
@package     Labrador 3.0  
@author      stian.andersen@publishlab.com  
@copyright   (c) 2017 PublishLab AS [http://www.publishlab.com](http://www.publishlab.com)  
@version     1.0  
