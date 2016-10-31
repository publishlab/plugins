# Labrador Plugins-repository

This repository contains a number of plugins you can use to enhance the editing-functionality of [Labrador CMS](http://publishlab.com).

Please use and modify the plugin you find here as needed. If you want to share plugins you create with other Labrador-users please create a pull-request.

## About Labrador-plugins
If you need to enhance Labrador-editing you can use plugins. Plugins supply additional functionality to the CMS and are only run in edit-mode. They can be initialized by any node- or structure-model. 

Labrador ships with some plugins and you can easily write your own. This article will describe how to use and write plugins. 

## Use an existing plugin
In this example we'll use a plugin from default view-resources named PublishInfo (Plugins.PublishInfo). The plugin is used on article-boxes to display publishing-information for the original article. It displays a list of users and time-stamps for each publish-action. 

Plugins can auto-start on page load or start when needed. For this plugin we'll start it when user clicks a button in the article-menu displayed for each article-box on a front page. This ensures that the plugin do not use any resources before it is displayed. 

To add a plugin we include a plugins-object in a property-file for the structure of article-boxes in edit-mode. In default view this can be done in the file `/view/structure/article/edit_properties.json`:

```json
"plugins": {
    "publish_info": {
        "autoStart": false,
        "path": "Plugins.PublishInfo",
        "appendToAppMenu": false
    }
}
```

- `publish_info` (string) is the name this plugin can be accessed with for the structure. 
- `autoStart` (bool) Should the plugin start on page-load? (Default false)
- `path` (string) Namespace-path for the plugin. 
- `appendToAppMenu` (bool / string) If "toggle" or "label" a button is added to the Labrador-menu. This should only be used if there is one instance of the plugin for a page. If "toggle" is set the button will start and stop the plugin when clicked. 

If a plugin needs any other input you can add it to the object. 

Since we lazy-load the plugin we need to start it somewhere. This can be done using a menu-button in the menu for the article. In default view this can be done in the file /view/menu_settings/structure/article.json: 
```json
{
    ...
    "items": {
        ...
        "time": {
            "group": "g5",
            "trigger": ["click"],
            "callback": "triggerPluginMethod",
            "title": "Publish-history",
            "params": {
                "plugin": "publish_info",
                "fn": "display"
            }
        }
    }
}
```

The menu-item "time" will display a time-symbol and when clicked it will run the method "display" on the plugin "publish_info" that we specified for the structure. If the plugin hasn't started yet it will start now. 

Callback-methods related to plugins for menu-items

- `triggerPluginMethod` Run the method specified in "params.fn" on the plugin specified in "params.plugin". 
- `triggerPluginMethodForChild` Run the method specified in "params.fn" on the plugin specified in "params.plugin" on child of type specified in "params.childType". 
- `togglePlugin` Turn plugin specified in "params.plugin" on or off. 

Example: 
```json
"some_on_off_switch": {
    "type": "boolean",
    "value": false,
    "onValue": true,
    "offValue": false,
    "onValueCondition": "lab-plugin-is-active",
    "onValueConditionParam": true,
    "callback": "togglePlugin",
    "params": {
        "plugin": "name_of_plugin",
        "setBoolValueOnClick": true
    }
}
```
This button will display a on-state if the plugin is active and a off-state if not. 

## Create a plugin
A plugin must be accessible for Labrador in the global namespace. You can store it in your own namespace (My.Namespace.Plugins.MyPlugin) or as a global function (function MyPlugin(params) {}). 

When an instance of the plugin is created the plugin reseives one argument: An object with the following attributes: 
- `cmsUrl` (string) Url for editing 
- `isMainViewport` (bool) Is the plugin run in the main viewport? 
- `nodeModel` (NodeModel) The node-model the plugin is run for 
- `pageId` (int) ID of current page-node 
- `settings` (object) Data specified in the config for the plugin 
- `structureModel` (StructureModel) The structure-model the plugin is run for 
- `userId` (int) ID of current user 
- `viewport` (string) Name of current viewport 
- `viewports` (array) List of all viewports 

Labrador require these public methods for any plugin: 
- `start (void) Start the plugin 
- `stop (void) Stop the plugin 
- `remove (void) Remove the plugin. Any cleanup (memory or DOM-elements, event-listeners, repeating tasks) should be done here. 
- `isActive (bool) true if plugin is active, false if not. 

If your plugin listen to Labrador-events or use any repeating tasks these should be stopped in the remove-handler. This is called when a contentbox is removed.
