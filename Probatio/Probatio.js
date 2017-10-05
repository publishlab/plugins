/**
 * Probatio
 * See readme.md for documentation.
 *
 * This plugin require two template-files in the folder /view_resources/view/plugin_support/probatio/
 */

var Plugins = Plugins || {};

Plugins.Probatio = function(params) {

    this.nodeModel = params.nodeModel;  // Instance of "ab_versions"-node. Each child is a version of article params.pageId.
    this.originalNodeData = null;       // Node data of original article.
    this.isActive = false;
    this.probatioNodeData = {
        pageId: null,                   // fields.pageId - ID of the article where children of the "ab_versions"-node is versions. 
        probatioId: null,               // fields.probatioId - Id of probatio-test (prId)
        probatioDates_json: {
             created: '', 
             updated: [] 
        },
        probatioSettings_json: {},      // fields.probatioSettings_json - Settings for test (this.probatioSettings)
    };
    this.probatioSettings = {           // Default data for probatio-test. Is updated by the GUI
        name: null,                     // the name of the Probatio
        description: null,              // description of the Probatio. Not required.
        state: 'draft',                 // Can be draft, published or unpublished
        testUrl: null,                  // the url the test should be shown on
        slotId: null,                   // the identifier of the element on the page where the test should be shown
        testMode: 'win_15_min',         // The Probatio mode. 'win' = winner mode, 'con' = continuous mode. Possible values are 'cont_5_min', 'cont_15_min', 'cont_30_min', 'cont_60_min', 'win_5_min', 'win_15_min', 'win_30_min', 'win_60_min'
        testExpire: '1_hour',           // When the test should automatically stop. '24_hour' or '1_hour'
    };

    this.probatioOptions = {
        state:          ['draft', 'published'], // 'unpublished' returns error from LP API
        testMode:       ['cont_5_min', 'cont_15_min', 'cont_30_min', 'cont_60_min', 'win_5_min', 'win_15_min', 'win_30_min', 'win_60_min'],
        testExpire:     ['24_hour', '1_hour'],
    }

    this.servicePath = params.settings.servicePath;
    this.probatioDataUrl = params.settings.probatioDataUrl;
    this.probatioPreviewEl = null;
    this.probatioPreviewMarkup = null;
    this.templateRenderer = params.templateRenderer;
    this.getTemplate = params.getTemplate; // function
    this.probatioTestData = null; // Preview of tests
    this.probatioStats = null;

    var instance = this;

    this.init = function(params) {

        var container = document.querySelector(params.settings.containerSelector);
        if (!container) {
            Sys.logger.warn('Plugins.Probatio: Cannot find container to draw in. Check param "containerSelector".');
            return;
        }

        if (!this.servicePath) {
            Sys.logger.warn('Plugins.Probatio: Missing param "servicePath". Cannot access the API. Exiting.');
            return;
        }

        if (!this.probatioDataUrl) {
            Sys.logger.warn('Plugins.Probatio: Missing param "probatioDataUrl". Test-preview disabled.');
        }
        
        this.pluginContainer = document.createElement('div');
        this.pluginContainer.className = 'probatio-plugin';
        this.pluginContainer.style = 'position:relative;';
        container.appendChild(this.pluginContainer);
        this.toggleBusy(true);

        Lab.Event.on("lab-edit-abversion-original-fetched", "Plugins.Probatio-abversion-original-fetched", function(notification) {
            
            // Labrador has now fetched data for the original article. Data available in the supplied notification.

            // Get notification-data:
            var data = notification.getData();
            instance.originalNodeData = data.nodeData;

            // Check if node is of required type ('ab_versions')
            if (instance.nodeModel.get('type') !== 'ab_versions') return instance.unpublished( { title: 'Probatio AB-test', description: 'Unsupported node-type "' + instance.nodeModel.get('type') + '". <br>Cannot use plugin with this node.'});

            // Check if the original article is published:
            if (instance.originalNodeData.fields.publishhidden === true || instance.originalNodeData.fields.publishhidden == "1") return instance.unpublished({ title: 'Probatio AB-test', description: 'This article is published hidden.<br>Please publish the article before creating an AB-test.' });
            if (!instance.originalNodeData.fields.published_url) return instance.unpublished({ title: 'Probatio AB-test', description: 'This article is unpublished.<br>Please publish the article before creating an AB-test.' });

            instance.draw();
            instance.updateTestPreview();
            instance.toggleBusy(false);
            // instance.getTestResults();
        });
    }

    this.toggleBusy = function(isBusy) {
        this.pluginContainer.className = 'probatio-plugin' + (isBusy ? ' labFn-isBusy' : '');
    }

    // Original article is not published. Display warning
    this.unpublished = function(data) {
        var markup = this.render('plugin_support/probatio/unpublished', data);
        this.pluginContainer.innerHTML = markup;
        instance.toggleBusy(false);
    }

    this.draw = function() {
        this.updateProbatioNodeData();
        this.createGui(this.pluginContainer);
        this.probatioPreviewEl.innerHTML = this.probatioPreviewMarkup;
    }

    // Display a preview of existing tests based on probatio-data:
    // This plugin may create / delete / modify tests. Always use fresh data:
    this.updateTestPreview = function() {
        if (!instance.probatioDataUrl) return;
        instance.getTestResults();
        var origClassName = instance.probatioPreviewEl.className;
        instance.probatioPreviewEl.className = origClassName + ' labFn-isBusy';
        var url = '/ajax/integration/get-collection?_service=proxy/json/&url=' + instance.probatioDataUrl;
        Lab.Util.Ajax.getJSON(url, function(resp) {
            instance.probatioTestData = resp;
            instance.drawTest();
            instance.probatioPreviewEl.className = origClassName;
        }, function() {
            instance.probatioPreviewEl.className = origClassName;
        });
    }

    this.drawTest = function() {
        var articleId = this.originalNodeData.id;
        var id = this.generateSlotId(this.originalNodeData.id);
        var testData = this.findTestData(this.probatioTestData);        
        // var markup = '<h5 style="width:100%;">Preview from Probatio</h5>';
        var markup = '';

        if (testData) {
            var testResults = this.getResultsForId(testData.prId, this.probatioStats);
            testData.variants.forEach(function(article) {
                if (!article) return;
                var statsMarkup = instance.statsForArticle(article, testResults);
                var articleMarkup = '<article class="large-6 left two-grid"><figure><img src="' + article.image + '" /></figure><p>' + article.title + '</p>' + statsMarkup + '</article>';
                markup += articleMarkup;
            })
            markup += instance.totalStats(testResults);
        } else {
            markup += '<p>No data ...</p>';
        }
        this.probatioPreviewMarkup = this.probatioPreviewEl.innerHTML = markup;
    }

    this.totalStats = function(testResults) {
        if (!testResults) return '';
        var markup = '<div style="width: 100%;">';
        markup += '<ul class="pb_stats large-6 left two-grid" style="margin-top: 0.5em;"><li class="pb_label">Run stats</li><li class="pb_stat" title="Runs: ' + testResults.totalRuns + '"><span class="pb_stat_label">Runs</span>' + instance.niceNumber(testResults.totalRuns) + '</li><li class="pb_stat" title="Winners: ' + testResults.totalWinners + '"><span class="pb_stat_label">Winners</span>' + instance.niceNumber(testResults.totalWinners) + '</li><li class="pb_stat" title="Draws: ' + (testResults.totalRuns - testResults.totalWinners) + '"><span class="pb_stat_label">Draws</span>' + instance.niceNumber(testResults.totalRuns - testResults.totalWinners) + '</li></ul>';
        markup += '<ul class="pb_stats large-6 left two-grid" style="margin-top: 0.5em;"><li class="pb_label">Total stats</li><li class="pb_stat" title="Views: ' + testResults.totalstats.pageviews + '"><span class="pb_stat_label">Views</span>' + instance.niceNumber(testResults.totalstats.pageviews) + '</li><li class="pb_stat" title="Clicks: ' + testResults.totalstats.clicks + '"><span class="pb_stat_label">Clicks</span>' + instance.niceNumber(testResults.totalstats.clicks) + '</li><li class="pb_stat" title="Clickratio: ' + testResults.totalstats.clickratio + '"><span class="pb_stat_label">CR</span>' + testResults.totalstats.clickratio + '%</li></ul>';
        markup += '</div>';
        return markup;
    }

    this.statsForArticle = function(article, testResults) {
        var result = '';
        if (!testResults) return result;
        testResults.test.variants.forEach(function(variant) {
            if (variant.id == article.id) {
                result = '<ul class="pb_stats ' + (variant.winner ? 'pb_winner' : '') + '"><li class="pb_stat pb_stat_pw" title="Views: ' + variant.pageviews + '"><span class="pb_stat_label">Views</span>' + instance.niceNumber(variant.pageviews) + '</li><li class="pb_stat pb_stat_cl" title="Clicks: ' + variant.clicks + '"><span class="pb_stat_label">Clicks</span>' + instance.niceNumber(variant.clicks) + '</li><li class="pb_stat pb_stat_cr" title="Clickratio: ' + variant.clickratio + '"><span class="pb_stat_label">CR</span>' + variant.clickratio + '</li></ul>';
            }
        });
        return result;
    }

    this.niceNumber = function(num, decimals) {        
        if (typeof(decimals) == 'undefined') decimals = 0;
        if (num > 999999) {
            var shortNum = num / 1000000;
            return parseFloat(Math.round(shortNum * 100) / 100).toFixed(decimals) + 'm';
        }
        if (num > 999) {
            var shortNum = num / 1000;
            return parseFloat(Math.round(shortNum * 100) / 100).toFixed(decimals) + 'k';
        }
        return parseFloat(Math.round(num * 100) / 100).toFixed(decimals);
    }

    // Get results for current test if exist, if not: newest test, if not: null.
    this.getResultsForId = function(id, stats) {
        if (!stats) return null;
        if (stats.data.attributes.tests.current) return { isCurrent: true, test: stats.data.attributes.tests.current, totalRuns: stats.data.attributes.totalRuns, totalWinners: stats.data.attributes.totalWinners, totalstats: stats.data.attributes.totalstats };
        if (stats.data.attributes.tests.finished.length) return { isCurrent: false, test: stats.data.attributes.tests.finished[0], totalRuns: stats.data.attributes.totalRuns, totalWinners: stats.data.attributes.totalWinners, totalstats: stats.data.attributes.totalstats };
        return null;
    }

    this.findTestData = function(probatioData) {
        var id = this.generateSlotId(this.originalNodeData.id);
        for (var url in probatioData) {
            if (probatioData[url][id]) return probatioData[url][id];
        }
        return null;
    }

    this.createGui = function(container) {

        var data = this.probatioNodeData.probatioSettings_json;
        var hasTest = this.probatioNodeData.probatioId ? true : false;

        // var stateList = [];
        // this.probatioOptions.state.forEach(function(state) {
        //     stateList.push({
        //         key: state,
        //         value: state,
        //         selected: state == data.state
        //     })
        // });

        var testModeList = [];
        this.probatioOptions.testMode.forEach(function(testMode) {
            testModeList.push({
                key: testMode,
                value: testMode,
                selected: testMode == data.testMode
            })
        });

        var testExpireList = [];
        this.probatioOptions.testExpire.forEach(function(testExpire) {
            testExpireList.push({
                key: testExpire,
                value: testExpire,
                selected: testExpire == data.testExpire
            })
        });

        var markup = this.render('plugin_support/probatio/settings_form', { 
            hasTest: hasTest,
            submit_title: hasTest ? 'Update' : 'Activate',
            delete_title: 'Delete',
            settings: {
                name: data.name,
                description: data.description,
                // states: stateList,
                testModes: testModeList,
                testExpires: testExpireList,
            }
        });
        container.innerHTML = markup;

        // Update probatio on submit
        var formEl = container.querySelector('form');
        formEl.addEventListener('submit', function(e) {
            e.preventDefault();
            instance.publish();
        }, false);

        // Delete-button:
        var deleteBtn = formEl.querySelector('.delete');
        deleteBtn.addEventListener('click', function(e) {
            instance.deleteTest();
        }, false);       

        // Update node-data on change.
        var inputElements = formEl.querySelectorAll('input,select,textarea');
        for (var i = 0; i < inputElements.length; i++) {
            inputElements[i].addEventListener('change', function(e) {
                var key = this.getAttribute('name');
                var value = this.value;
                if (!key || !value) {
                    Sys.logger.warn('Plugins.Probatio: Cannot set node data. Missing name-attribute or value. Name: "' + name + '" Value: "' + value + '".');
                    return;
                }
                instance.probatioNodeData.probatioSettings_json[key] = value;
                instance.setProbatioNodeData(instance.probatioNodeData.probatioSettings_json);
            }, false);
        }

        // Find container to draw preview inside:
        instance.probatioPreviewEl = container.querySelector('.probatio-preview');

        // Reload preview:
        var reloadBtn = formEl.querySelector('#reload-probatio-preview-btn');
        reloadBtn.addEventListener('click', function(e) {
            instance.updateTestPreview();
        });
    }

    // templatePath: 'plugin_support/probatio/settings'
    this.render = function(templatePath, data) {
        var template = this.getTemplate(templatePath);
        if (!template) {
            Sys.logger.warning('Plugins.Probatio: Cannot find template for path: "' + templatePath + '". GUI is incomplete.');
            return null;
        }
        return this.templateRenderer(
            template,
            data
        );
    }

    // Update data from disk to this.probatioNodeData
    this.updateProbatioNodeData = function() {
        for (var key in this.probatioNodeData) {
            var persistentData = this.nodeModel.get('fields.' + key);
            if (persistentData) {
                this.probatioNodeData[key] = persistentData;
            }
        }

        for (var key in this.probatioSettings) {
            if (typeof(this.probatioNodeData.probatioSettings_json[key]) == 'undefined') {
                this.probatioNodeData.probatioSettings_json[key] = this.probatioSettings[key];
            }
        }

        if (!this.probatioNodeData.probatioSettings_json.name) {
            this.probatioNodeData.probatioSettings_json.name = this.generateProbatioName(this.probatioNodeData.pageId);
        }

        if (!this.probatioNodeData.probatioSettings_json.slotId) {
            this.probatioNodeData.probatioSettings_json.slotId = this.generateSlotId(this.probatioNodeData.pageId);
        }

        // Always update url in case article is edited (tags etc. may alter the url)
        this.probatioNodeData.probatioSettings_json.testUrl = Lab.conf.getConfig('customer_front_url') + this.originalNodeData.fields.published_url;

    }

    this.generateProbatioName = function(articleId) {
        return 'lab_probatio_' + articleId;
    }

    this.generateSlotId = function(articleId) {
        return 'article_' + articleId;
    }

    this.setProbatioNodeData = function(data) {
        this.nodeModel.set('fields.probatioSettings_json', data);
        Lab.appController.save();
    }

    this.createImageCrop = function(images) {
        return images.pano;
    }

    this.getTestResults = function() {
        
        if (!this.probatioNodeData.probatioId) return;

        var requestData = {
            method: 'post',
            endpoint: 'probatio/' + this.probatioNodeData.probatioId + '/stats'
        }

        var callbackFn = function(resp) {
            var responseData;
            try {
                responseData = JSON.parse(resp);
            } catch (e) {
                Sys.logger.warning('Plugins.Probatio: Cannot parse response from Probatio: ' + resp);
                return;
            }
            instance.probatioStats = responseData;
            instance.drawTest();
        }

        instance.request(requestData, callbackFn, true);
    }

    // Create or update a probatio-test.
    // Diff is the endpoint:
    // - create: "probatio"
    // - update: "probatio/<probatio_id>"
    this.publish = function() {
        var hasTest = this.probatioNodeData.probatioId ? true : false;

        // Get current versions fram Labrador
        var data = Lab.appController.serializeVersions();

        if (data.versions.length < 2) {
            Lab.Dialog.warning('Missing versions', 'Remember to add at least two versions of the article before sending the test to Probatio.')
            return;
        }

        var attributes = {};
        for (var key in this.probatioNodeData.probatioSettings_json) {
            attributes[key] = this.probatioNodeData.probatioSettings_json[key];
        }
        attributes.variants = [];
        attributes.state = 'published';
        var imageError = false; // Probatio require an image to create a version.
        data.versions.forEach(function(versionData) {
            if (!versionData.images.pano) {
                imageError = true;
                return;
            }
            attributes.variants.push({
                image: instance.createImageCrop(versionData.images),
                title: versionData.title,
                text: versionData.subtitle,
                active: true
            })
        });

        if (imageError) {
            Lab.Dialog.warning('Missing image(s)', 'All versions require an image. <br>Please add image(s) and try again.');
            return;
        }

        var requestData = {
            method: 'post',
            endpoint: hasTest ? 'probatio/' + this.probatioNodeData.probatioId : 'probatio',
            query: {
                data: {
                    type: 'probatio',
                    id: this.probatioNodeData.probatioId,
                    attributes: attributes
                }
            }
        }

        var callbackFn = function(resp) {
            var responseData;
            try {
                responseData = JSON.parse(resp);
            } catch (e) {
                Sys.logger.warning('Plugins.Probatio: Cannot parse response from Probatio: ' + resp);
                return;
            }
            if (!responseData.data.id) {
                Sys.logger.warning('Plugins.Probatio: Response missing id.');
                return;
            }
            instance.nodeModel.set('fields.probatioId', responseData.data.id);
            var dates = instance.probatioNodeData.probatioDates_json;
            dates.created = responseData.data.attributes.createDate;
            dates.updated.push({ userId: Lab.appController.user.getUserId(), date: responseData.data.attributes.changeDate });
            instance.nodeModel.set('fields.probatioDates_json', dates);
            Lab.appController.save();
            instance.draw();
            Lab.Dialog.modal({
                title: 'AB-test ' + (hasTest ? 'updated' : 'created'),
                message: 'State: ' + responseData.data.attributes.state
            })
            instance.getTestResults();
        }

        instance.request(requestData, callbackFn);
    }

    this.deleteTest = function() {
        Lab.Dialog.modal({
            title: 'Delete this test?',
            btnTitle: 'Delete',
            callback: function() {
                instance.doDeleteTest();
            }
        })    
    }

    this.doDeleteTest = function() {
        var requestData = {
            method: 'delete',
            endpoint: 'probatio/' + this.probatioNodeData.probatioId
        }
        var callbackFn = function(resp) {
            var responseData;
            try {
                responseData = JSON.parse(resp);
            } catch (e) {
                Sys.logger.warning('Plugins.Probatio: Cannot parse response from Probatio: ' + resp);
                return;
            }
            if (!responseData.meta.deleted) {
                Sys.logger.warning('Plugins.Probatio: Response missing meta.');
                return;
            }
            instance.nodeModel.set('fields.probatioId', null);
            instance.probatioNodeData.probatioId = null;
            Lab.appController.save();
            instance.draw();
            Lab.Dialog.modal({
                title: 'AB-test deleted'
            })
        }
        instance.request(requestData, callbackFn);        
    }

    this.request = function(requestData, callback, skipUpdate) {
        
        /**
         * To debug:
         * requestData.debug = true;
         */

        instance.toggleBusy(true);
        Lab.Util.Ajax.ajax(
            'POST', 
            '/ajax/integration/get-collection?_service=' + instance.servicePath, 
            requestData,
            function (resp) {
                instance.toggleBusy(false);
                if (callback) callback(resp);
                if (skipUpdate) return;
                window.setTimeout(instance.updateTestPreview, 3500);
            }
        );
    }

    this.start = function() {
        this.isActive = true;
    }

    this.stop = function() {
        this.isActive = false;
    }

    this.remove = function() {
        this.stop();
    }

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
    }
}
