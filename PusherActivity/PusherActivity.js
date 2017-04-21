/**
 * PusherActivity
 * See readme.md for documentation
 */

var Plugins = Plugins || {};

Plugins.PusherActivity = function(params) {

    this.isActive = false;
    this.pusher = null;
    this.activityContainer = null;
    this.activityList = {}; // key = node-id
    this.timeoutIds = {
        container: null
    };
    var instance = this;

    this.init = function(params) {
        // Load plugin-resources:
        params.loader.addCss('/view-resources/dashboard/lib/edit/plugins/PusherActivity/PusherActivity.css', null, null, true);
        this.pusher = new Lab.Util.Notification.Factory();
        this.drawPageActivity();
    };

    this.listen = function() {
        this.pusher.edit_page().on('lab-edit-page-opened', function(data) {
            instance.registerActivity(data, data.page.id, true);
        });
        this.pusher.leave_page().on('lab-edit-will-leave-page', function(data) {
            instance.registerActivity(data, data.page.id, false);
        });
    };

    this.unlisten = function() {
        this.pusher.edit_page().un('lab-edit-page-opened');
        this.pusher.leave_page().un('lab-edit-will-leave-page');
    };

    this.registerActivity = function(data, pageId, isActive) {
        this.activityList[pageId] = {
            data: data,
            active: isActive
        };
        this.drawPageActivity();
        this.highlightActivity(pageId);
    }

    this.drawPageActivity = function() {
        if (!this.activityContainer) {
            this.activityContainer = document.createElement('div');
            this.activityContainer.setAttribute('id', 'plugins-pusher-activity');
            this.activityContainer.setAttribute('title', 'Plugin - PusherActivity');
            parent.document.getElementsByTagName('body')[0].appendChild(this.activityContainer);
            this.activityContainer.addEventListener('click', instance.toggleActivityContainer, false);
        }

        var pagesArray = [];
        for (var pageId in this.activityList) {
            pagesArray.push(this.activityList[pageId]);
        }
        
        var template = LabApi.getTemplate('plugin_support/PusherActivity/activity');
        var markup = Lab.renderTemplate(template, { pages: pagesArray });
        this.activityContainer.innerHTML = markup;
        
        var container = this.activityContainer.querySelector('div');
        container.addEventListener('click', function(e) {
            e.stopPropagation();
        }, false);

        var boxes = this.activityContainer.querySelectorAll('[data-page-id]');
        for (var i = 0; i < boxes.length; i++) {
            this.addClickHandle(boxes[i]);
        }
        if (pagesArray.length) {
            var infoElement = document.createElement('div');
            infoElement.setAttribute('class', 'ppa-info');
            infoElement.innerHTML = 'Activity: "A": Article, "F": Front-page. Green: Open page. Gray: Closed page. Blink: Status-change';
            this.activityContainer.appendChild(infoElement);
            infoElement.addEventListener('click', function(e) {
                e.stopPropagation();
            }, false);
        }
    }

    this.highlightActivity = function(pageId) {
        var articleBox = this.activityContainer.querySelector('[data-page-id="' + pageId + '"]');
        if (articleBox) this.highlightElement(articleBox, 2000, pageId);
        var isHiglighted = this.activityContainer.getAttribute('data-ppa-highlight');
        if (isHiglighted) return;
        this.highlightElement(this.activityContainer, 2000, 'container');
    }

    this.highlightElement = function(element, duration, elementName) {
        element.setAttribute('data-ppa-highlight', true);
        window.clearTimeout(this.timeoutIds[elementName]);
        this.timeoutIds[elementName] = window.setTimeout(function() {
            element.removeAttribute('data-ppa-highlight');
        }, duration);
    }

    this.addClickHandle = function(element) {
        element.addEventListener('click', function(e) {
            e.stopPropagation();
            var id = this.getAttribute('data-page-id');
            if (instance.activityList[id]) {
                var pageData = instance.activityList[id];
                if (!pageData.data.page.site.alias) pageData.data.page.site.alias = parent.Lab.Util.Site.getAliasById(pageData.data.page.site.id);
                var template = LabApi.getTemplate('plugin_support/PusherActivity/page_info');
                Lab.Dialog.modal({
                    title: pageData.data.page.type.charAt(0).toUpperCase() + pageData.data.page.type.slice(1) + ' ' + pageData.data.page.id,
                    markup: Lab.renderTemplate(template, { data: pageData.data, active: pageData.active }),
                })
            }

        }, false);
    }

    this.toggleActivityContainer = function(e) {
        if (this.getAttribute('id') !== 'plugins-pusher-activity') return;
        if (this.className == 'ppa-open') {
            this.className = '';
        } else {
            this.className = 'ppa-open';
        }
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
