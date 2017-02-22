/**
 * PublishInfo
 * See readme.md for documentation
 */

var Plugins = Plugins || {};

Plugins.PublishInfo = function(params) {
    
    this.nodeModel = params.nodeModel;
    this.structureModel = params.structureModel;
    
    this.isActive = false;

    this.init = function(params) {
        // Add required CSS-file. Set fourth argument to true to load the file in the main window (where the GUI is displayed)
        params.loader.addCss('/view-resources/lib/edit/plugins/PublishInfo/PublishInfo.css', null, null, true);
    };

    this.start = function() {
        this.isActive = true;
    };

    this.stop = function() {
        this.isActive = false;
    };

    this.remove = function() {
        this.stop;
    };

    this.getId = function() {
        if (!this.nodeModel && this.structureModel) {
            this.nodeModel = this.structureModel.getNodeModel();
        }
        return this.nodeModel ? this.nodeModel.get("instance_of") : null;
    };

    this.displayPublishInfo = function() {
        var articleId = this.getId();
        if (!articleId) {
            Sys.logger.warning('Plugin PublishInfo: Cannot get article-data. Missing id (instance_of) ...');
            Lab.Dialog.message({
                title: '<span class="lab-icon-Labrador-head" style="font-size:3em; display:block; text-align:center;"></span><span style="text-align:center; display: block;">Cannot get article. <br>Missing id.</span>'
            });
            return;
        }

        Lab.Dialog.message({
            title: '<span class="lab-icon-Labrador-head" style="font-size:3em; display:block; text-align:center;"></span><span style="text-align:center; display: block;">Getting article ...</span>'
        });

        var url = '/ajax/node/get-node?id=' + articleId;

        // Get data for article:
        Lab.Util.Ajax.getJSON(
            url,
            function(resp) { //success
                if (!resp.data || !resp.data.fields) {
                    Sys.logger.warnign('Plugin PublishInfo: Missing data for article #' + articleId + '.');
                    return;
                }

                var content = [], c, f = resp.data.fields, messageEl = $lab('<ul>').addClass("PublishInfo");
                var dateHander = new Labrador.Date.DateTime();
                var created = resp.data.fields.created || null; 

                messageEl.click(function(e) {
                    e.stopPropagation();
                });

                content.push({
                    markup: '<li><h1>' + f.title + '</h1></li>'
                });

                content.push({
                    markup: '<li><p>Publish-history for article# ' + articleId + ' - Created: ' + dateHander.timestampToNiceDate(created) + ' - <a target="_blank" href="/edit/article/id/' + articleId + '">Edit article</a></p></li>'
                });

                if (resp.data.fields.last_published_by) {
                    // Display a list of last published-times including user ...
                    var last_published_by = JSON.parse(resp.data.fields.last_published_by);
                    if (last_published_by.length) {
                        last_published_by.reverse();
                        var list = $lab('<ul />').addClass("publishList");
                        var idArray = [];
                        content.push({
                            markup: '<li class="publishData header"><span class="status">Status</span><span class="timestamp">Publish time</span><span class="user-name">User name</span><span class="user-email">User email</span></li>'
                        });
                        last_published_by.forEach(function(publishData) {
                            var userId = publishData[0];
                            var timestamp = publishData[1];
                            var status = publishData[2];
                            list.append('<li class="publishData ' + (status == "H" ? "hidden" : "visible") + '" data-user-id="' + userId + '"><span class="status">' + status + '</span><span class="timestamp" data-timestamp="' + timestamp + '">' + dateHander.timestampToNiceDate(timestamp) + '</span><span class="user-name">' + userId + '</span><span class="user-email">--</span></li>');
                            if (!Lab.Util.Array.inArray(idArray, userId)) {
                                idArray.push(userId);
                            }
                        });
                        content.push({markup: list});
                        // Get data for users in the list:
                        var userUrl = "/ajax/user/get-users-by-ids?ids=" + idArray.join(",");
                        Lab.Util.Ajax.getJSON(
                            userUrl,
                            function(resp) {
                                resp.forEach(function(user) {
                                    messageEl.find('[data-user-id="' + user.userid + '"]').each(function(i) {
                                        $lab(this).find(".user-name").text(user.firstname + ' ' + user.lastname);
                                        $lab(this).find(".user-email").html('<a href="mailto:' + user.googleid + '" target="_blank">' + user.googleid + '</a>');
                                    });
                                });
                            }
                        );
                    }
                }

                content.forEach(function(item) {
                    messageEl.append($lab(item.markup));
                });

                // Display a modal window with the info:
                var self = this;
                Lab.appController.displayModal({
                    hideKeys: [27], // 13 = enter, 27 = escape
                    id: "plugin-PublishInfo",
                    allowMenus: true,
                    mainWindow: true
                });
                var container = Lab.appController.modalWindow.handler.getContainer();
                container.append(messageEl);
            }
        );
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
        },
        // Method specified for menu-button. Display info about this article.
        display: function() {
            self.displayPublishInfo();
        }
    };
};
