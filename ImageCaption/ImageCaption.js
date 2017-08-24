/**
 * ImageCaption
 * See readme.md for documentation.
 *
 * This plugin require the template-file 'image.template.mustache' in the folder /view_resources/view/plugin_support/ImageCaption/
 */

var Plugins = Plugins || {};

Plugins.ImageCaption = function(params) {

    this.gui = null;
    this.imageId = null;
    this.params = params;
    this.templateRenderer = params.templateRenderer;
    this.getTemplate = params.getTemplate; // function

    this.edit = function() {
        var id = this.getId();
        if (!id) {
            Sys.logger.warning('Plugins.ImageCaption: Cannot get id of original image.');
            return;
        }

        // If triggered while crop is beeing edited, end editing.
        Lab.appController.endActiveTools();

        Lab.Dialog.modal({
            title: ' ',
            markup: '<div class="labFn-isBusy" style="height:7em; position:relative; text-align: center; padding-top: 6em; color: gray;">Fetching image-data ...</div>',
            disableButtons: true
        });

        var self = this;

        // Fetch data for image:
        Lab.Util.Ajax.getJSON('/ajax/node/get-node?id=' + id, function(resp) {
            self.editImagedata(resp.data);
        });
    }

    this.editImagedata = function(imagedata) {

        var imgSrc = Lab.conf.getConfig('image_server') + '?imageId=' + imagedata.id + '&width=220';
        var publishedDate = imagedata.fields.published ? Lab.Util.Date.format('d/m Y', new Date(imagedata.fields.published * 1000)) : '--';
        var informalText = '<b>ID</b>: ' + imagedata.id + ' <b>Size</b>: ' + imagedata.fields.width + ' x ' + imagedata.fields.height + '<br><b>Published</b>: ' + publishedDate;
        var self = this;

        Lab.Dialog.modal({
            title: 'Edit original image',
            markup: this.render('plugin_support/ImageCaption/image', { 
                src: imgSrc
            }),
            formSettings: [{
                label: 'Caption',
                value: imagedata.fields.caption,
                key: 'caption', // caption, byline
                type: 'textarea',
                attributes: {
                    style: 'width: 350px; min-height: 150px;',
                }
            }, {
                label: 'Byline',
                value: imagedata.fields.byline,
                key: 'byline', // caption, byline
            }],
            callback: function(resp) {
                resp.data.forEach(function(data) {
                    if (data.key == 'caption') imagedata.fields.caption = data.value;
                    if (data.key == 'byline') imagedata.fields.byline = data.value;
                });
                self.save(imagedata);
            },
            width: 610,
            btnTitle: 'Save',
            secondaryBtnTitle: 'Cancel',
            informalText: informalText
        })
    }

    this.save = function(dataObject) {
        var nodeData = {
            json: {
                id: this.imageId,
                type: dataObject.type,
                node: JSON.stringify([{
                    id: this.imageId,
                    type: dataObject.type,
                    fields: {
                        caption: dataObject.fields.caption,
                        byline: dataObject.fields.byline,
                    }
                }]),
                structure: null
            }
        };
        Lab.Util.Ajax.ajax('POST', '/ajax/node/save-node-and-data', nodeData, function(resp) {
            // console.log('save, resp: %o', resp);
        });
    }

    this.getId = function() {
        if (this.imageId) return this.imageId;
        if (!this.params.nodeModel) return null;
        var id = this.params.nodeModel.get('instance_of');
        if (!id) return null;
        this.imageId = id;
        return this.imageId;
    }

    this.render = function(templatePath, data) {
        var template = this.getTemplate(templatePath);
        if (!template) {
            Sys.logger.warning('Plugins.ImageCaption: Cannot find template for path: "' + templatePath + '". GUI is incomplete.');
            return null;
        }
        return this.templateRenderer(
            template,
            data
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
        edit: function() {
            return self.edit();
        }
    }
}
