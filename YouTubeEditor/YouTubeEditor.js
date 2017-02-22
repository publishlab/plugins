/**
 * YouTubeEditor.js
 * See YouTubeEditor.md for documentation
*/

var Plugins = Plugins || {};

Plugins.YouTubeEditor = function(params) {
    
    this.nodeModel = params.nodeModel;
    this.structureModel = params.structureModel;
    this.playerAPI = null;
    this.isActive = false;
    this.fields = { // Data to store on the node-model.
        video_start: 0,
        video_end: null,
    };
    this.progressId = null;
    this.duration = null;
    this.sliderEl = null;
    this.sliderUpdateFrq = 1000;
    this.timerElCurrent = null;
    this.selectedPointsElement = null;
    this.isPlaying = false;
    this.btn_play = null;
    this.version = "1.0";

    this.init = function(params) {
        // Add required CSS-file.
        params.loader.addCss('/view-resources/lib/edit/plugins/YouTubeEditor/YouTubeEditor.css', null, null);
    };

    this.start = function() {
        this.isActive = true;
        this.getData();
    };

    this.stop = function() {
        this.isActive = false;
        this.cleanup();
    };

    this.remove = function() {
        // No cleanup nessesary ...
    };

    this.getData = function() {
        this.fields.video_start = this.nodeModel.get("fields.video_start") || 0;
        this.fields.video_end = this.nodeModel.get("fields.video_end") || null;
    };

    this.cleanup = function() {
        if (this.playerAPI) {
            this.playerAPI.stopVideo();
            this.playerAPI.destroy();
        }
        this.stopTimer(); 
        this.unregisterKeyEvents();
    };

    this.registerKeyEvents = function() {
        Lab.KeyEventHandler.add({
            keyCode: 32, // Space
            eventType: "keydown.YouTubeEditor", 
            element: $lab(window), 
            callback: function(e) {
                self.toggleVideo();
            }
        });
        Lab.KeyEventHandler.add({
            keyCode: 37, // Left arrow
            eventType: "keydown.YouTubeEditor", 
            element: $lab(window), 
            callback: function(e) {
                self.jump(-5);
            }
        });
        Lab.KeyEventHandler.add({
            keyCode: 37, // Left arrow + Shift
            controlKey: "shiftKey",
            eventType: "keydown.YouTubeEditor", 
            element: $lab(window), 
            callback: function(e) {
                self.gotoStartPoint();
            }
        });
        Lab.KeyEventHandler.add({
            keyCode: 39, // Right arrow
            eventType: "keydown.YouTubeEditor", 
            element: $lab(window), 
            callback: function(e) {
                self.jump(5);
            }
        });
        Lab.KeyEventHandler.add({
            keyCode: 39, // Right arrow + Shift
            controlKey: "shiftKey",
            eventType: "keydown.YouTubeEditor", 
            element: $lab(window), 
            callback: function(e) {
                self.gotoEndPoint();
            }
        });
    };

    this.unregisterKeyEvents = function() {
        Lab.KeyEventHandler.remove({
            keyCode: 32,
            eventType: "keydown.YouTubeEditor", 
        });
        Lab.KeyEventHandler.remove({
            keyCode: 37,
            eventType: "keydown.YouTubeEditor", 
        });
        Lab.KeyEventHandler.remove({
            keyCode: 39,
            eventType: "keydown.YouTubeEditor", 
        });
        Lab.KeyEventHandler.remove({
            keyCode: 37,
            controlKey: "shiftKey",
            eventType: "keydown.YouTubeEditor", 
        });
        Lab.KeyEventHandler.remove({
            keyCode: 39,
            controlKey: "shiftKey",
            eventType: "keydown.YouTubeEditor", 
        });
    };

    this.createPlayer = function(id, w, h) {
        return new YT.Player('YouTubeEditorContainer', {
            height: h ? h : '390',
            width: w ? w : '640',
            videoId: id,
            playerVars: { 
                // 'autoplay': 1, 
                'controls': 0,
                'disablekb': 1
            },
            events: {
                'onReady': self.onPlayerReady,
                'onStateChange': self.onPlayerStateChange
            }
        });
    };

    // The API will call this function when the video player is ready.
    // Note: this referes to window ...
    this.onPlayerReady = function(event) {
        self.editorGui.append(self.createControls());
        self.duration = self.playerAPI.getDuration();
        self.updateSelectedPointsElement();

        // Start video on load:
        self.startVideo();
        
        // Start timer to update time-based Gui:
        self.startTimer();
        
    };

    this.onPlayerStateChange = function(params) {
        /*
        Data:
        -1 (unstarted)
        0 (ended)
        1 (playing)
        2 (paused)
        3 (buffering)
        5 (video cued).
        */
        if (params.data == 1) {
            self.setIsPlaying(true);
        } else {
            self.setIsPlaying(false);
        }
    };

    this.setIsPlaying = function(isPlaying) {
        this.isPlaying = isPlaying;
        if (isPlaying) {
            this.btn_play.addClass("playing");
        } else {
            this.btn_play.removeClass("playing");
        }
    };

    // allowSeekAhead: When dragging timeline it should be set to false. For playback: true.
    this.goto = function(seconds, allowSeekAhead) {
        this.playerAPI.seekTo(seconds, allowSeekAhead);
    };

    this.gotoStartPoint = function() {
        var start = self.fields.video_start || 0;
        self.goto(start, true);
    };

    this.gotoEndPoint = function() {
        var end = self.fields.video_end || self.duration;
        self.goto(end, true);
    };

    this.jump = function(seconds) {
        var currentTime = this.playerAPI.getCurrentTime();
        var newTime = currentTime + seconds;
        if (newTime < 0) newTime = 0;
        if (newTime > this.duration) newTime = this.duration;
        this.goto(newTime, true);
    };

    this.startVideo = function() {
        this.playerAPI.playVideo();
    };

    this.stopVideo = function() {
        this.playerAPI.pauseVideo();
    };

    this.toggleVideo = function() {
        if (this.isPlaying) {
            this.stopVideo();
        } else {
            this.startVideo();
        }
    };

    this.startTimer = function() {
        this.stopTimer();
        this.progressId = window.setInterval(function() {
            self.updateSlider();
        }, this.sliderUpdateFrq);
        self.updateSlider();
    };

    this.stopTimer = function() {
        window.clearInterval(this.progressId);
    };

    this.updateSlider = function() {
        var currentTime = this.playerAPI.getCurrentTime();
        this.updateTimeEl(currentTime);
        this.sliderEl.val(currentTime);
    };

    this.updateTimeEl = function(seconds) {
        if (!seconds) seconds = this.playerAPI.getCurrentTime();
        self.timerElCurrent.text(this.secondsToTime(seconds));
    };

    this.updateSelectedPointsElement = function() {
        var start = this.fields.video_start || 0;
        var end = this.fields.video_end || this.duration;
        var prePercent = (this.fields.video_start / this.duration) * 100;
        var postPercent = 100 - ((end / this.duration) * 100);
        var selectionPercent = 100 - (prePercent + postPercent);
        this.selectedPointsElement.html('<span style="width:' + prePercent + '%;" class="pre-selection"></span><span style="width:' + selectionPercent + '%;" class="selection"></span><span style="width:' + postPercent + '%;" class="post-selection"></span><div style="margin-left:' + prePercent + '%;" class="time-label start">' + this.secondsToTime(start) + '</div><div style="margin-right:' + postPercent + '%;"class="time-label end">' + this.secondsToTime(end) + '</div>');
    };

    // input (seconds) is a float-value. display time: "02:47" or "01:02:47"
    this.secondsToTime = function(input) {
        var sec_num = parseInt(input, 10);
        var hours   = Math.floor(sec_num / 3600);
        var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
        var seconds = sec_num - (hours * 3600) - (minutes * 60);
        var hoursString = "";
        if (hours > 0) {
            if (hours < 10) { 
                hoursString = "0" + hours + ":"; 
            } else {
                hoursString = hours + ":";
            }
        }
        if (minutes < 10) { minutes = "0" + minutes; }
        if (seconds < 10) { seconds = "0" + seconds; }
        return hoursString + minutes + ':' + seconds;
    };

    this.set = function(key, value) {
        this.fields[key] = value;
        this.updateSelectedPointsElement();
    };

    // Store set fields on the node-model and save.
    this.save = function() {
        for (var key in this.fields) {
            this.nodeModel.set("fields." + key, this.fields[key]);
        }
        Lab.appController.save();
    };

    this.createControls = function() {
        var el = $lab('<div style="position:relative;"></div>');
        var duration = self.playerAPI.getDuration();
        
        self.selectedPointsElement = $lab('<div class="yte-selected"></div>');
        el.append(self.selectedPointsElement);
        
        var sliderContainer = $lab('<div class="yte-slider"></div>');
        self.sliderEl = $lab('<input type="range" min="0" max="' + duration + '" step="1" value="0"/>');
        sliderContainer.append(self.sliderEl);
        el.append(sliderContainer);
        self.sliderEl.change(function(e) {
            self.goto($lab(this).val(), true);
        });
        self.sliderEl.on("input", function(e) {
            self.goto($lab(this).val(), true);
        });

        var leftEl = $lab('<div class="yte-group left-group"></div>');
        var centerEl = $lab('<div class="yte-group center-group"></div>');
        var rightEl = $lab('<div class="yte-group right-group"></div>');
        el.append(leftEl);
        el.append(centerEl);
        el.append(rightEl);

        var btn_start_point = $lab('<span title="Set start-point" class="yte-btn lab-icon-start_point"></span>');
        btn_start_point.click(function() {
            var currentTime = self.playerAPI.getCurrentTime();
            if (self.fields.video_end && currentTime >= self.fields.video_end) {
                Sys.logger.warning('Plugins.YouTubeEditor: Cannot set start-point after end-point.');
                return;
            }
            self.set("video_start", Math.round(currentTime));
        });
        leftEl.append(btn_start_point);

        var btn_end_point = $lab('<span title="Set end-point" class="yte-btn lab-icon-end_point"></span>');
        btn_end_point.click(function() {
            var currentTime = self.playerAPI.getCurrentTime();
            if (self.fields.video_start && currentTime <= self.fields.video_start) {
                Sys.logger.warning('Plugins.YouTubeEditor: Cannot set end-point before start-point.');
                return;
            }
            self.set("video_end", Math.round(currentTime));
        });
        leftEl.append(btn_end_point);

        var btn_from_start = $lab('<span title="Play from start-point (Shift + Left Arrow)" class="yte-btn lab-icon-from_start"></span>');
        btn_from_start.click(function() {
            self.gotoStartPoint();
        });
        centerEl.append(btn_from_start);

        var btn_backward = $lab('<span title="Move backward (Left Arrow)" class="yte-btn lab-icon-backward"></span>');
        btn_backward.click(function() {
            self.jump(-5);
        });
        centerEl.append(btn_backward);

        this.btn_play = $lab('<span title="Play / pause (Space)" class="yte-btn lab-icon-play playing"></span>');
        this.btn_play.click(function() {
            self.toggleVideo();
        });
        centerEl.append(this.btn_play);

        var btn_forward = $lab('<span title="Move forward (Right Arrow)" class="yte-btn lab-icon-forward"></span>');
        btn_forward.click(function() {
            self.jump(5);
        });
        centerEl.append(btn_forward);

        var btn_from_end = $lab('<span title="Play from end-point (Shift + Right Arrow)" class="yte-btn lab-icon-from_end"></span>');
        btn_from_end.click(function() {
            self.gotoEndPoint();
        });
        centerEl.append(btn_from_end);

        var timerContainer = $lab('<div class="yte-timer"><span id="yte-time-current">0:00</span> / <span id="yte-time-total">' + self.secondsToTime(duration) + '</span></div>');
        el.append(timerContainer);
        self.timerElCurrent = timerContainer.find("#yte-time-current");

        el.append($lab('<div class="yte-about"><span class="lab-icon-video_edit"></span> Labrador YouTube-Editor v' + self.version + '.</div>'));

        var saveBtn = $lab('<button>Save</button>');
        saveBtn.click(function() {
            self.save();
            Lab.appController.hideModal();

        });
        rightEl.append(saveBtn);

        return el;
    };

    this.displayEditor = function() {

        if (!this.nodeModel) {
            Sys.logger.warning('Plugins.YouTubeEditor: Missing node-model. Cannot start editor.');
            return;
        }

        this.registerKeyEvents();
        
        var videoId = this.nodeModel.get("fields.vid");
        if (!videoId) {
            Sys.logger.warning('Plugins.YouTubeEditor: Missing video-id. Cannot edit.');
            return;
        }

        var scrollTop = $lab(parent.window).scrollTop() + 30;
        this.editorGui = $lab('<div>').addClass("YouTubeEditor").css("margin-top", scrollTop + "px");
        this.editorGui.append('<div id="YouTubeEditorContainer" style="width:800px;"></div>');
        this.editorGui.click(function(e) {
            e.stopPropagation();
        });

        // Display a modal window with the video-editor:
        Lab.appController.displayModal({
            hideKeys: [27], // 13 = enter, 27 = escape
            id: "plugin-PublishInfo",
            allowMenus: false,
            mainWindow: false,
            callback: function() {
                self.stop();
            }
        });
        var container = Lab.appController.modalWindow.handler.getContainer();
        container.append(this.editorGui);

        var playerWidth = $lab("#YouTubeEditorContainer").width();
        var playerHeight = parseInt((playerWidth / 1.77), 10);

        if (typeof(YT) !== "undefined") {
            this.playerAPI = this.createPlayer(videoId, playerWidth, playerHeight);
        } else {
            // First time
            var scriptElement = document.createElement('script');
            scriptElement.setAttribute('id','plugin_youtube_editor_script');
            scriptElement.setAttribute('src','https://www.youtube.com/iframe_api');
            document.head.appendChild(scriptElement);
            window.onYouTubeIframeAPIReady = function() {
                self.playerAPI = self.createPlayer(videoId, playerWidth, playerHeight);
            }            
        }
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
        displayEditor: function() {
            self.displayEditor();
        }
    };
};
