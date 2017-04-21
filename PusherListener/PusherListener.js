/**
 * PusherListener
 * See readme.md for documentation
 */

var Plugins = Plugins || {};

Plugins.PusherListener = function(params) {

    this.isActive = false;
    this.pusher = null;
    this.activityContainer = null;
    this.activityList = {}; // key = node-id

    var instance = this;

    this.init = function(params) {
        this.pusher = new Lab.Util.Notification.Factory();
    };

    this.listen = function() {
        this.pusher.publish().on('lab-edit-page-is-published', this.publishCallback);
    };

    this.unlisten = function() {
        this.pusher.publish().un('lab-edit-page-is-published');
    };

    // A page is published
    this.publishCallback = function(data) {
        
        Lab.Dialog.status('PusherListener: ' + Lab.Util.String.ucFirst(data.page.type) + ' ' + data.page.id + ' is published.')

        if (data.page.type !== 'article') return;

        // Get string matching 'section'-query of article_list-boxes (like "section:nyheter AND")
        var filteredSection = 'section:' + data.page.section + ' AND';

        // Find content-boxes of type 'article_list' displaying articles with identical section as the published article.
        var articleLists = Lab.structureController.getModelsByType('article_list');
        var matchedBoxes = [];
        articleLists.forEach(function(structureModel) {
            // Check section-settings:
            var sectionQuery = structureModel.getNodeModel().get('fields.sectionQuery');
            if (sectionQuery == filteredSection || sectionQuery == '') {
                matchedBoxes.push(structureModel);
            }
        });
        if (!matchedBoxes.length) return;
        Sys.logger.debug('Plugins.PusherListener: Will redraw ' + matchedBoxes.length + ' content-box(es) for published article ' + data.page.id + ' in section ' + data.page.section);
        matchedBoxes.forEach(function(structureModel) {
            structureModel.getNodeModel().invalidateCacheForContent();
            Lab.structureController.addToRedrawQueue(structureModel);
        });
        Lab.structureController.redrawFromQueue();
    }

    this.start = function() {
        this.isActive = true;
        this.listen();
    };

    this.stop = function() {
        this.unlisten();
        this.isActive = false;
    };

    this.remove = function() {
        this.stop;
    };

    this.init(params);

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
        }
    };
};
