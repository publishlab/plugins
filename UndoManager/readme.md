# UndoManager
Namespace: `Plugins.UndoManager`

Let user undo and redo changes made to a page in current session.

Only one instance of this plugin should be used for a page.

Register activity using Labrador-events and store serialized data (in memory) in groups organized by time. All states are the result of changes already happened. A user-action may involve several event-notification. If a user adds an article-box to a new row both the row and the article will trigger an "lab-edit-structure-is-added"-event.

Undoing this should not be done in two steps but in one. This is done by storing the serialized data for both events in one chunk. When undoing, all data in the chunk is deserialized and added. The stored data must be sufficient to apply states before and after any supported modification. 

Any supported event results in one of these actions:
- add
- remove
- update
- swap

Add is undone by removing and redone by adding, remove is undone by adding and redone by removing. 

Update is undone and redone by modifying.

When node-models are to be inserted a check is done to see if it still exist. If it has been persistently deleted a new node-model is created with the same data and references in structures are updated.

Navigating through the history (undo or redo) is done by modifying this.index. The history-array is not modified. this.index is used to find the correct group to use to apply a state by. If this.index > 0 when adding new states all history after this point is removed (the history-array is modified). So if the user makes a change to the page, undo it and then makes another change the first change is lost.

This plugin do not ship with any user interface. Assign keybord-hotkeys and/or add a menu-item to use it.

Config-example for a property-file used by all page-nodes that will use the undo-manager:
```json
"plugins": {
    "UndoManager": {
        "autoStart": true,
        "path": "Plugins.UndoManager",
        "appendToAppMenu": "toggle",
        "maxBackupLength": 10,
        "hotKeys": {
            "undo": {
                "keyCode": 90,
                "controlKey": "labCtrlKey"
            },
            "redo": {
                "keyCode": 90,
                "controlKey": "labCtrlKey",
                "secondaryControlKey": "shiftKey"
            }
        }
    }
}
```

@category    Labrador
@package     Labrador 3.0
@author      stian.andersen@publishlab.com
@copyright   Copyright (c) 2016 PublishLab AS [http://www.publishlab.com](http://www.publishlab.com)
@version     1.0