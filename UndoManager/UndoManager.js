/**
 * UndoManager.js
 * See UndoManager.md for documentation
 */

var Plugins = Plugins || {};

Plugins.UndoManager = function(params) {

    this.isActive = false;      // Used by the required plugin-method isActive() to tell Labrador if the plugin is currently active.
    this.history = [];          // List of states organized in groups by time.
    this.index = 0;             // Current position in history-change. Undo increases index, redo decreases index. 0 is last state, 1 is one group undone etc.
    this.timestamp = 0;         // Last registered change.
    this.grouplength = 1000;    // milliseconds. All events fired within this time-period is grouped together. 
    this.maxBackupLength = typeof(params.settings.maxBackupLength) !== "undefined" ? params.settings.maxBackupLength : 10; // Set to null or 0 to disable limit.
    this.settings = params.settings;

    this.start = function() {
        this.isActive = true;
        this.registerLabradorEvents();
    };

    this.stop = function() {
        this.isActive = false;
        this.unregisterLabradorEvents();
    };

    this.remove = function() {
        this.stop();
        this.history = [];
        this.timestamp = 0;
        this.index = 0;
    };

    this.registerLabradorEvents = function() {
       
        this.registerHotkeys();
        
        // Structure is removed.
        Lab.Event.on("lab-edit-will-remove-structure", "UndoManager-will-remove-structure", function(notification) {
            self.registerState("remove", notification.getData());
        });
        
        // Structure is added.
        Lab.Event.on("lab-edit-structure-is-added", "UndoManager-structure-is-added", function(notification) {
            self.registerState("add", notification.getData());
        });

        // A Labrador-tool has finished. Node-model has dirty fields and is not saved yet.
        // Store pre- and post-values.
        Lab.Event.on("lab-edit-tool-has-ended", "UndoManager-tool-has-ended", function(notification) {
            var data = notification.getData();
            var postEditState = { data: {} };
            var dirtyFields = data.model.dirtyFields || []; // structures has no dirtyFields ...
            for (var i = 0; i < dirtyFields.length; i++) {
                postEditState.data[dirtyFields[i]] = data.model.get(dirtyFields[i]);
            }
            data.postEditState = postEditState;

            // Model can be a node or a structure:
            if (data.model.classType == "content") {
                self.registerState("modifyNode", data);
            } else {
                self.registerState("modify", data);
            }
        });
        
        // Metadata is set or resize is done.
        Lab.Event.on("lab-edit-structure-is-changed", "UndoManager-structure-is-changed", function(notification) {
            self.registerState("modify", notification.getData());
        });
        
        // Two structures have replaced eachother.
        Lab.Event.on("lab-edit-structures-are-swapped", "UndoManager-structures-are-swapped", function(notification) {
            self.registerState("swapped", notification.getData());
        });
        
        // Persistent content created. Replace tmp-id(s) in history with newly created id(s).
        Lab.Event.on("lab-edit-content-is-created", "UndoManager-content-is-created", function(notification) {
            var data = notification.getData();
            self.updateIdInHistory(data.tmpId, data.id);
        });
    };

    this.unregisterLabradorEvents = function() {
        this.unregisterHotkeys();
        Lab.Event.off("lab-edit-will-remove-structure", "UndoManager-will-remove-structure");
        Lab.Event.off("lab-edit-structure-is-added", "UndoManager-structure-is-added");
        Lab.Event.off("lab-edit-tool-has-ended", "UndoManager-tool-has-ended");
        Lab.Event.off("lab-edit-structure-is-changed", "UndoManager-structure-is-changed");
        Lab.Event.off("lab-edit-structures-are-swapped", "UndoManager-structures-are-swapped");
        Lab.Event.off("lab-edit-content-is-created", "UndoManager-content-is-created");
    };

    this.registerHotkeys = function() {
        if (!this.settings.hotKeys) return;
        if (this.settings.hotKeys.undo) {
            Lab.KeyEventHandler.add({
                keyCode: this.settings.hotKeys.undo.keyCode,
                controlKey: this.settings.hotKeys.undo.controlKey,
                secondaryControlKey: this.settings.hotKeys.undo.secondaryControlKey,
                eventType: "keydown.UndoManager.undo", 
                overrideDisable: false,
                element: $lab(window), 
                callback: function(e) {
                    self.undo();
                }
            });
        }
        if (this.settings.hotKeys.redo) {
            Lab.KeyEventHandler.add({
                keyCode: this.settings.hotKeys.redo.keyCode,
                controlKey: this.settings.hotKeys.redo.controlKey,
                secondaryControlKey: this.settings.hotKeys.redo.secondaryControlKey,
                eventType: "keydown.UndoManager.redo", 
                overrideDisable: false,
                element: $lab(window), 
                callback: function(e) {
                    self.redo();
                }
            });
        }
    };

    this.unregisterHotkeys = function() {
        if (!this.settings.hotKeys) return;
        if (this.settings.hotKeys.undo) {
            Lab.KeyEventHandler.remove({
                keyCode: this.settings.hotKeys.undo.keyCode,
                controlKey: this.settings.hotKeys.undo.controlKey,
                secondaryControlKey: this.settings.hotKeys.undo.secondaryControlKey,
                eventType: "keydown.UndoManager.undo", 
            });
        }
        if (this.settings.hotKeys.redo) {
            Lab.KeyEventHandler.remove({
                keyCode: this.settings.hotKeys.redo.keyCode,
                controlKey: this.settings.hotKeys.redo.controlKey,
                secondaryControlKey: this.settings.hotKeys.redo.secondaryControlKey,
                eventType: "keydown.UndoManager.redo", 
            });
        }
    };

    // Add history-data.
    // Reorganize data from the Labrador-event to fit the UndoManager.
    this.registerState = function(type, data) {
        var currentTimestamp = new Date().getTime();
        var group = this.getCurrentGroup(currentTimestamp);

        if (type == "add") {

            // An event is fired for every new structure added.
            // So for an empty dropzone a dropped article may create:
            // 1: image
            // 2: article (with image)
            // 3: row (with article + image)
            // These are added instantly to the same group but we only need to store the parent (row).
            // Check if previous member of group is a child of this structure. If so: Remove it.
            if (group.length) {
                var previousStructureId = group[group.length-1].data.serialized.id;
                var currentId = data.model.getId();
                var hasPopped = false;
                for (var i = 0; i < data.model.children.length; i++) {
                    if (data.model.children[i].getId() == previousStructureId) {
                        group.pop();
                        hasPopped = true;
                    }
                }
                if (!hasPopped) {
                    // Add history-data to new group
                    group = this.createNextGroup();
                }
            }

            var siblingWidths = {};
            data.parent.children.forEach(function(child) {
                siblingWidths[child.getId()] = child.getWidth()
            });

            group.push({
                event: "add",
                undoMethod: "removeStructure", // Method (this.removeStructure)
                redoMethod: "addStructure", // Method
                data: {
                    serializedParent: data.parent.serialized(),
                    grandParentId: data.parent.parent ? data.parent.parent.getId() : null,
                    siblingWidths: siblingWidths,
                    serialized: data.model.serializedNode(),
                    index: data.index,
                    parentIndex: Lab.structureController.modelIndex(data.parent),
                    serializedType: "structure"
                }
            });

        } else if (type == "remove") {
            
            var siblingWidths = {};
            data.parent.children.forEach(function(child) {
                siblingWidths[child.getId()] = child.getWidth()
            });
            group.push({
                event: "remove",
                undoMethod: "addStructure",
                redoMethod: "removeStructure",
                data: {
                    serializedParent: data.parent.serialized(),
                    grandParentId: data.parent.parent ? data.parent.parent.getId() : null,
                    siblingWidths: siblingWidths,
                    serialized: data.model.serializedNode(),
                    index: data.index,
                    parentIndex: Lab.structureController.modelIndex(data.parent),
                    serializedType: "structure"
                }
            });

        } else if (type == "modify") {
            
            group.push({
                event: "modify",
                undoMethod: "modifyStructure",
                redoMethod: "modifyStructure",
                data: {
                    type: data.type,
                    field: data.field,
                    postValue: data.value,
                    preValue: data.preValue,
                    serialized: data.model.serializedNode(),
                    serializedType: "structure"
                }
            });

        } else if (type == "swapped") {
            
            group.push({
                event: "swapped",
                undoMethod: "swapStructure",
                redoMethod: "swapStructure",
                data: {
                    model1Serialized: data.model1.serialized(),
                    model2Serialized: data.model2.serialized(),
                    model1Id: data.model1.getId(),
                    model2Id: data.model2.getId(),
                }
            });

        } else if (type == "modifyNode") {
            
            group.push({
                event: "modifyNode",
                undoMethod: "modifyNode",
                redoMethod: "modifyNode",
                data: {
                    serialized: data.model.isDerived() ? data.model.getSourceNode().serialized() : data.model.serialized(),
                    preEditState: data.preEditState ? data.preEditState : { data: {} },
                    postEditState: data.postEditState,
                    serializedType: "node"
                }
            });
        }

        this.timestamp = currentTimestamp;
    };

    // Get group to store current state in. If group do not exist: Create it.
    this.getCurrentGroup = function(currentTimestamp) {
            
        // If history is undone and new state(s) are to be added: Remove states passed current index.
        // Note: The index represents the number of undo's from the end of the history-array.
        if (this.index > 0) {
            while (this.index > 0) {
                this.history.pop(); // Remove last (newest) state.
                this.index--;
            }
        }

        // Create a new group if needed.
        if (this.timestamp + this.grouplength < currentTimestamp) {
            var group = [];
            this.history.push(group);
        }

        // Check if limit is used and reached.
        if (this.maxBackupLength && this.history.length > this.maxBackupLength) {
            while (this.history.length > this.maxBackupLength) {
                this.history.shift(); // Remove first (oldest) state.
            }
        }

        return this.history[this.history.length-1];
    };

    this.createNextGroup = function() {
        var group = [];
        this.history.push(group);
        return group;
    };

    // event: "undo" or "redo"
    // This method is run every time undo or redo is called. "group" may be empty: No more data to undo/redo.
    this.applyStateForGroup = function(event, group) {
        if (!group) return;

        // Sys.logger.notice('Plugins.UndoManager: Modifying model(s) for group. Count: ' + group.length + '. type: "' + event + '". History: ' + this.history.length + ', index: ' + this.index);
        Lab.Dialog.status(Lab.Util.String.ucFirst(event) + ' changes ...'); // "Undo changes ...""

        group.forEach(function(historyData) {
            var methodKey = event + "Method";
            if (!self[historyData[methodKey]]) {
                Sys.logger.warning('Plugins.UndoManager: Cannot apply state for group. Missing method "' + historyData[methodKey] + '" for event "' + event + '".');
                return;
            }
            
            var value;
            if (historyData.event == "modifyNode") {
                value = event == "undo" ? historyData.data.preEditState : historyData.data.postEditState;
                if (event == "undo") {
                    // preEditState do not know what fields have been modified. 
                    // Use keys from postEditState and get values from preEditState (serialized data):
                    for (var key in historyData.data.postEditState.data) {
                        if (typeof(value.data[key]) == "undefined") value.data[key] = Lab.Util.Object.get(key, historyData.data.preEditState.serialized);
                    }
                }
            } else if (historyData.event == "modify") {
                
                value = {};
                if (historyData.data.type == "resize") historyData.data.field = "resize";
                value[historyData.data.field] = event == "undo" ? historyData.data.preValue : historyData.data.postValue;

            } else if (historyData.event == "add" || historyData.event == "remove") {

                value = historyData.data;
                
            } else if (historyData.event == "swapped") {

                value = historyData.data;

            } else {
                Sys.logger.warning('Plugins.UndoManager: Cannot apply state for event: "' + historyData.event + '". Event not supported.');
            }

            // Run specified method on the history-data:
            self[historyData[methodKey]]({
                id: historyData.data.serialized ? historyData.data.serialized.id : null,
                type: historyData.data.type ? historyData.data.type : historyData.event,
                value: value
            });
        });
        Lab.structureController.redrawFromQueue();
        Lab.appController.save();
    };

    this.getNextUndoGroup = function() {
        var indx = this.history.length - (this.index + 1);
        if (!this.history[indx]) return null;
        this.index++;
        return this.history[indx];
    };

    this.getNextRedoGroup = function() {
        var indx = this.history.length - this.index;
        if (!this.history[indx]) return null;
        this.index--;
        return this.history[indx];
    };

    this.undo = function() {
        this.applyStateForGroup(
            "undo", 
            this.getNextUndoGroup()
        );
    };

    this.redo = function() {
        this.applyStateForGroup(
            "redo", 
            this.getNextRedoGroup()
        );
    };

    // We're about to add a structure from serialized data.
    // Node-data may be deleted. If so we need to remove the id and all references to it
    // and replace the id with a tmp-id. Labrador will use this when creating new content.
    // Undo-manager swaps tmp-ids with the newly created id using the "lab-edit-content-is-created"-event.
    this.replaceNonpersistentIds = function(data) {
        if (data.node_id) {
            if (!Lab.nodeController.getModelById(data.node_id)) {
                var originalId = data.node_id;
                var tmpNodeId = Lab.Util.UUID.generateUUID();
                this.updateTmpIdInHistory(tmpNodeId, originalId);
            }
        }
        for (var i = data.children.length - 1; i >= 0; i--) {
            this.replaceNonpersistentIds(data.children[i]);
        }
        return data;
    };

    // Node-data is created. Update history-data. Remove tmpId and add id.
    this.updateIdInHistory = function(tmpId, id) {
        var self = this;
        this.history.forEach(function(item) {
            item.forEach(function(historyData) {
                self.updateIdInData(tmpId, id, historyData);
            });
        });
    };

    // Node-data is created. Update history-data for item in group. Remove tmpId and add id.
    this.updateIdInData = function(tmpId, id, historyData) {
        if (historyData.data.serializedType == "node") {
            this.updateIdInNodeData(tmpId, id, historyData.data.serialized);
            this.updateIdInNodeData(tmpId, id, historyData.data.preEditState.serialized);
        } else { // "structure"
            if (historyData.data.model1Serialized) {
                this.updateIdInStructureData(tmpId, id, historyData.data.model1Serialized);
                this.updateIdInStructureData(tmpId, id, historyData.data.model2Serialized);
            } else {
                this.updateIdInStructureData(tmpId, id, historyData.data.serialized);
            }
        }
    };

    // Recursive. Update by reference.
    this.updateIdInNodeData = function(tmpId, id, serialized) {
        if (serialized.tmpId == tmpId) {
            serialized.id = id;
            delete serialized.tmpId;
        }
        if (!serialized.children) return;
        serialized.children.forEach(function(child) {
            self.updateIdInNodeData(tmpId, id, child);
        });
    };

    // Recursive. Update by reference.
    this.updateIdInStructureData = function(tmpId, id, serialized) {
        if (serialized.tmpNodeId == tmpId) {
            delete serialized.tmpNodeId;
            serialized.node_id = id;
            if (serialized.nodeData) {
                delete serialized.nodeData.tmpId;
                serialized.nodeData.id = id;
            }
        }
        if (!serialized.children) return;
        var self = this;
        serialized.children.forEach(function(child) {
            self.updateIdInStructureData(tmpId, id, child);
        });
    };

    // Replace references to id with tmpId.
    // "node_id" -> "tmpNodeId", on node-model: "tmpId"
    // Check: 
    // node: data.serialized, data.preEditState.serialized
    // structure: data.serialized, data.serialized.nodeData
    this.updateTmpIdInHistory = function(tmpId, id) {
        var self = this;
        this.history.forEach(function(item) {
            item.forEach(function(historyData) {
                self.updateTmpIdInData(tmpId, id, historyData);
            });
        });
    };

    this.updateTmpIdInData = function(tmpId, id, historyData) {
        if (historyData.data.serializedType == "node") {
            this.updateTmpIdInNodeData(tmpId, id, historyData.data.serialized);
            if (historyData.data.preEditState.serialized) this.updateTmpIdInNodeData(tmpId, id, historyData.data.preEditState.serialized);
        } else { // "structure"
            if (historyData.data.model1Serialized) {
                this.updateTmpIdInStructureData(tmpId, id, historyData.data.model1Serialized);
                this.updateTmpIdInStructureData(tmpId, id, historyData.data.model2Serialized);
            } else {
                this.updateTmpIdInStructureData(tmpId, id, historyData.data.serialized);
            }
        }
    };

    // Recursive. Update by reference.
    this.updateTmpIdInNodeData = function(tmpId, id, serialized) {
        if (serialized.id == id) {
            serialized.tmpId = tmpId;
            delete serialized.id;
        }
        if (!serialized.children) return;
        serialized.children.forEach(function(child) {
            self.updateTmpIdInNodeData(tmpId, id, child);
        });
    };

    // Recursive. Update by reference.
    this.updateTmpIdInStructureData = function(tmpId, id, serialized) {
        if (serialized.node_id == id) {
            delete serialized.node_id;
            serialized.tmpNodeId = tmpId;
            if (serialized.nodeData) {
                serialized.nodeData.tmpId = tmpId;
                delete serialized.nodeData.id;
            }
        }
        if (!serialized.children) return;
        var self = this;
        serialized.children.forEach(function(child) {
            self.updateTmpIdInStructureData(tmpId, id, child);
        });
    };

    /**
     * Method to modify page-data - Add content
     */
    this.addStructure = function(historyData) {

        if (Lab.structureController.getModelById(historyData.id)) {
            return;
        }

        // Make sure node-references exist. If not: Use tmp-id(s).
        this.replaceNonpersistentIds(historyData.value.serialized);

        var parentStructure = Lab.structureController.getModelById(historyData.value.serializedParent.id);
        if (!parentStructure) {
            var grandParent = Lab.structureController.getModelById(historyData.value.grandParentId);
            if (grandParent) {
                parentStructure = Lab.structureController.unserialize(
                    historyData.value.serializedParent,
                    grandParent, 
                    grandParent.getNodeModel(), 
                    historyData.value.parentIndex,
                    true // skipLabNotification
                );
                grandParent.doRedraw();
                parent.Lab.windowController.insertStructure(parentStructure.getParent().getId(), parentStructure.getId(), Lab.structureController.modelIndex(parentStructure), Lab.structureController.serializedChildren(parentStructure));
                parent.Lab.windowController.redrawStructure(parentStructure.getId());
                // parent.Lab.windowController.redrawStructure(parentStructure.getId(), true);
            }
            if (!parentStructure) {
                Sys.logger.warning('Plugins.UndoManager: Cannot get parent ... State is not restored ...');
                return;
            }
        }

        var model = Lab.structureController.unserialize(
            historyData.value.serialized,
            parentStructure, 
            parentStructure.getNodeModel(), 
            historyData.value.index,
            true // skipLabNotification
        );
        
        if (!model) {
            Sys.logger.warning('Plugins.UndoManager: Cannot create structure-model to add.');
            return;
        }

        if (historyData.value.siblingWidths) {
            parentStructure.children.forEach(function(child) {
                var id = child.getId();
                if (historyData.value.siblingWidths[id]) child.setWidth(historyData.value.siblingWidths[id]);
            });
        }

        // Create persistent node-models. This must be done before creating content in secondary viewports.
        Lab.appController.create();
        
        // Update secondary viewports:
        parent.Lab.windowController.insertStructure(model.getParent().getId(), model.getId(), Lab.structureController.modelIndex(model), Lab.structureController.serializedChildren(model));

        // Redraw
        parent.Lab.windowController.queueRedrawForAllViewports(parentStructure, !model.isFullWidth());
        // parent.Lab.windowController.queueRedrawForAllViewports(parentStructure, true);
        parent.Lab.windowController.queueRedrawForAllViewports(model);
    };

    /**
     * Method to modify page-data - Remove content
     */
    this.removeStructure = function(historyData) {
        var model = Lab.structureController.getModelById(historyData.id);
        if (model) {
            var parentModel = model.getParent();
            model.remove(true); // Note: Set param (skipNotification) to true to skip posting a "lab-edit-will-remove-structure"-event. 
            if (parentModel) parent.Lab.windowController.queueRedrawForAllViewports(parentModel, !model.isFullWidth());
            // if (parentModel) parent.Lab.windowController.queueRedrawForAllViewports(parentModel, true);
        }
    };

    /**
     * Method to modify page-data - Update content (structureModel)
     */
    this.modifyStructure = function(historyData) {
        var model = Lab.structureController.getModelById(historyData.id);
        if (!model) {
            Sys.logger.warning('Plugins.UndoManager: Cannot find model by id: "' + historyData.id + '". Structure is not modified.');
            return;
        }
        if (historyData.type == "resize") {
            model.setWidth(historyData.value.resize);
        } else if (historyData.type == "metadata") {
            for (var key in historyData.value) {
                model.set(key, historyData.value[key], true); // Note: Set third param to true to skip posting a "lab-edit-structure-is-changed"-event. 
            }
        }
        parent.Lab.windowController.queueRedrawForAllViewports(model, true);
    };

    /**
     * Method to modify page-data - Replace content (structureModels)
     */
    this.swapStructure = function(historyData) {
        var model1 = Lab.structureController.getModelById(historyData.value.model1Id);
        var model2 = Lab.structureController.getModelById(historyData.value.model2Id);
        if (!model1 || !model2) {
            Sys.logger.warning('Plugins.UndoManager: Cannot swap models. Cannot find both model ' + historyData.value.model1Id + ' and ' + historyData.value.model2Id + '.');
            return;
        }
        Lab.structureController.swapModels(model1, model2, true, true);
        parent.Lab.windowController.swapModels(model1.getId(), model2.getId());
        parent.Lab.windowController.queueRedrawForAllViewports(model1);
        parent.Lab.windowController.queueRedrawForAllViewports(model2);
    };

    /**
     * Method to modify page-data - Update content (nodeModel)
     */
    this.modifyNode = function(historyData) {
        var model = Lab.nodeController.getModelById(historyData.id);
        if (!model) {
            Sys.logger.warning('Plugins.UndoManager: Cannot find model by id: "' + historyData.id + '". Node-model is not modified.');
            return;
        }
        for (var key in historyData.value.data) {
            model.set(key, historyData.value.data[key]);
        }
        parent.Lab.windowController.queueRedrawForAllViewports(model, true);
    };

    var self = this;

    return {
        // Required method for Labrador-plugins:
        start: function() {
            self.start();
        },
        // Required method for Labrador-plugins:
        stop: function() {
            self.stop();
        },
        // Required method for Labrador-plugins:
        remove: function() {
            self.remove();
        },
        // (bool) Required method for Labrador-plugins:
        isActive: function() {
            return self.isActive;
        },
        
        // Undo 
        undo: function() {
            return self.undo();
        },
        // Redo
        redo: function() {
            return self.redo();
        },
        // Debug
        getHistory: function() {
            return self.history;
        }
    };
};
