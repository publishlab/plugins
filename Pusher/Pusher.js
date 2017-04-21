/**
 * Pusher
 * See readme.md for documentation
 */

var Plugins = Plugins || {};

Plugins.Pusher = function(params) {

    this.isActive = false;
    this.pusher = null;
    var instance = this;

    this.init = function(params) {
        this.pusher = new Lab.Util.Notification.Factory();

        // Post to channel 'private-lab_edit_page' to inform listeners that this page is now opened for editing:
        this.emit([this.pusher.edit_page()], 'lab-edit-page-opened', {
            description: 'Page is opened for editing',
            page: this.getPageData(),
            user: this.getUserData()
        });
    };

    this.registerEventListeners = function() {
        Lab.Event.on('lab-edit-page-is-published', 'Plugins.Pusher-page-is-published', this.publishCallback);
        Lab.Event.on('lab-edit-will-leave-page', 'Plugins.Pusher-will-leave-page', function(notification) {
            // Post to channel 'private-lab_leave_page' to inform listeners that this page is now closing:
            instance.emit([instance.pusher.leave_page()], 'lab-edit-will-leave-page', {
                description: 'Page is closing',
                page: instance.getPageData(),
                user: instance.getUserData()
            });
        });
    };

    this.unregisterEventListeners = function() {
        Lab.Event.off('lab-edit-page-is-published', 'Plugins.Pusher-page-is-published');
        Lab.Event.off('lab-edit-will-leave-page', 'Plugins.Pusher-will-leave-page');
    };

    // Page is published
    this.publishCallback = function(notification) {

        var data = {
            description: 'Page is published',
            page: instance.getPageData(),
            user: instance.getUserData()
        }

        var channelList = [];

        // Post event 'lab-edit-page-is-published' to channel 'private-lab_global'
        channelList.push(instance.pusher.publish());

        // Post event 'lab-edit-page-is-published' to channel 'private-lab_node_<node-id>'
        channelList.push(instance.pusher.node());

        instance.emit(channelList, notification.getName(), data);
    };

    this.emit = function(channelList, event, data) {
        channelList.forEach(function(channel) {
            if (channel) {
                Sys.logger.debug('Plugins.Pusher: Emitting data for event "' + event + '" to channel "' + channel.name + '".');
                data.channel = channel.name;
                channel.emit(event, data);
            }
        });
    }

    this.getPageData = function() {
        var pageNode = Lab.nodeController.getPageNode();
        return {
            type: pageNode.get('type'),
            id: pageNode.get('id'),
            tags: pageNode.get('tags'),
            section: pageNode.get('primaryTags.section'),
            title: pageNode.get('fields.title'),
            url: Lab.conf.getConfig('customer_front_url') + pageNode.get('fields.published_url'),
            url_edit: Lab.conf.getConfig('customer_cms_url') + '/edit/' + pageNode.get('type') + '/id/' + pageNode.get('id'),
            status: pageNode.get('status'),
            visibility_status: pageNode.get('fields.visibility_status'),
            site: {
                id: LabApi.page.getSiteId(),
                alias: LabApi.page.getSiteAlias()
            }
        }
    };

    this.getUserData = function() {
        return {
            id: LabApi.user.getUserId(),
            name: LabApi.user.getUserName(),
            email: LabApi.user.getUserEmail()
        }
    }

    this.start = function() {
        this.isActive = true;
        this.registerEventListeners();
    };

    this.stop = function() {
        this.unregisterEventListeners();
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
