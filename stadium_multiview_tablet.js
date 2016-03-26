var g_video_item = 2;
var g_menu_item = 0;
var g_tile_item = 0;
var g_video_full_screen_mode = false;
var socket = null;
var g_8k_stitch_mode = false;
var g_current_time_update = false;

$(document).ready(() => {
    init();
});

function init() {
    attachToSocket();
    mapPageKeyPresses();
	attachToControls();

	setFocus($("#div_vid_tile_id_0"));

    vid_toggle_mute(0); //unmute vid0
    toggle_all(true); //start playing all videos

    $('html, body').on('touchstart touchmove', function(e) {
        //prevent native touch activity like scrolling
        e.preventDefault();
    });

    var topVideo = document.getElementById("div_vid_tile_id_0");

    $("#stitch_toggle").bind('touchstart mousedown', function(e) {
        e.stopPropagation();
        e.preventDefault();
		
        if (topVideo.paused || topVideo.ended) {
            return false;
        }
        console.log("stitch2 " + e.type);
        if (e.type == "touchstart" || e.type == "mousedown") {
            toggle_stitch_mode();
        }
    });

    var time_touch;
	var isActive = false;
	
    $("#vid0_tile, #rectangle_div").bind({
        touchstart: function(e) {
            if (topVideo.paused || topVideo.ended) {
                return false;
            }
            console.log('touchstart');
            time_touch = new Date();
        },
        mousedown: function(e) {
            if (topVideo.paused || topVideo.ended) {
                return false;
            }
			isActive = !isActive;
            console.log('touchstart');
            time_touch = new Date();
        },

        touchend: function(e) {
            console.log('touchend');
            g_current_time_update = false;
            var time_diff = new Date() - time_touch;
            if (time_diff < 300) {
                console.log('tap');
                if (g_8k_stitch_mode == true) {
                    toggle_stitch_mode();
                } else {
                    if (g_video_full_screen_mode == true) {
                        var msg = {
                            message: 0,
                            name: KeyCode.StitchVideo,
							videoPosition: currentPosition(topVideo),
                            action: Event.stitch_split_8k
                        };
                        send_msg(msg);
                        g_video_full_screen_mode = false;
                    } else {
                        select_stitch_event_area(e);
                        g_video_full_screen_mode = true;
                    }
                }
            } else {
                console.log('swipe');
            }
        },
        mouseup: function(e) {
            console.log('touchend');
            g_current_time_update = false;
            var time_diff = new Date() - time_touch;
            if (time_diff < 300) {
                console.log('tap');
                if (g_8k_stitch_mode == true) {
                    toggle_stitch_mode();
                } else {
                    if (g_video_full_screen_mode == true) {
                        var msg = {
                            message: 0,
                            name: KeyCode.StitchVideo,
							videoPosition: currentPosition(topVideo),
                            action: Event.stitch_split_8k
                        };
                        send_msg(msg);
                        g_video_full_screen_mode = false;
                    } else {
                        select_stitch_event_area(e);
                        g_video_full_screen_mode = true;
                    }
                }
            } else {
                console.log('swipe');
            }
        },

        touchmove: function(e) {
            select_stitch_event_area(e);
        },
        mousemove: function(e) {
			if(!isActive)
				return;
            select_stitch_event_area(e);
        },
    });

    $("#vid1_tile, #vid2_tile, #vid3_tile, #vid4_tile, #vid5_tile").bind('touchstart mousedown', function(e) {
		var id = Number(this.id.replace("div_vid_tile_id_",""));

        if (g_8k_stitch_mode == true) {
            toggle_stitch_mode();
        } else {
            var msg = {
                message: id,
                name: KeyCode.StitchVideo,
				videoPosition: currentPosition(topVideo),
                action: Event.stitch_split_8k
            };
            send_msg(msg);

            vid_toggle_mute(id);
            if (g_video_full_screen_mode == false) {
                g_video_full_screen_mode = true;
            } else {
                g_video_full_screen_mode = false;
            }
        }
    });
}

function onMessage(evt) {
	
	var msg = JSON.parse(evt.data); //PHP sends Json data

	if(msg === null)
		return;
	
    // If the message is from this client just ignore it
    if (msg.clientId === getClientId())
        return;

	var strmsg = JSON.stringify(msg);
	console.log("tv receive:" + strmsg);

	switch (msg.action) {
		case Event.BroadcastServerStatus2:
			for(var idx in msg.videos){
				var item = msg.videos[idx];
				var video = findVideo(item);
				if(video) { // Did we find a video?
					
					// Get the location where the old file is pointed to
					var src = getVideoSource(video);

					// Now just rip out the name
					var names = src.split("/");
					var name = names[names.length-1];
					name = name.replace(".mp4","");
					
					// Build the new name
					var newVideo = src.replace(name, item.videoName);
					
					// if the names are different we need to change the video
					if(src !== newVideo) {
						console.log("New Video: " + item.videoName + "  Curr Video: " + src);
						video.src = newVideo;
					}

					// If the paused states are different we need to get these in synchronized
					if(video.paused != item.isPaused)
						if(item.isPaused)
							video.pause();
						else
							video.play();
						
					var ct = currentPosition(video);
					var diff = Math.abs(ct-item.videoPosition);
					if(diff >= .5)
						video.currentTime = item.videoPosition;
				}
			}
			break;
	}
}

function mapPageKeyPresses() {
    var pagekeymap = [
		{key:KeyCode.ToggleFullScreen, 	func:toggleFullScreen},
		{key:KeyCode.ReloadPage, 		func:() => { location.reload(); }},
		{key:KeyCode.PlayVideos, 		func:playVideos}
	];

    mapKeyPresses($(document), pagekeymap);
}

function attachToSocket() {
    console.log("websocket server IP:" + websocket_server_ip);
    socket = new WebSocket('ws://' + websocket_server_ip + ':9000/');
    socket.addEventListener("message", onMessage, false);
}

function playVideos(){
	for (var idx = 0; idx < 6; idx++) {
		var video = findVideo(idx);
		video.play();
	}
}

function update_current_time() {
    var vid_tile = document.getElementById("div_vid_tile_id_0");
    console.log("videoCurrentTime: " + currentPosition(vid_tile));
    var msg = {
        message: 0,
        name: currentPosition(vid_tile),
        action: Event.seek_time
    };
    send_msg(msg);
}

function select_stitch_event_area(e) {
    var x, y;
    var vid_tile = document.getElementById("div_vid_tile_id_0");
    var rect_div = document.getElementById("rectangle_div");
    rect_div.setAttribute("display", "block");

    if (vid_tile.paused || vid_tile.ended) {
        return false;
    }

    if (g_current_time_update == false) {
        update_current_time();
        g_current_time_update = true;
    }

	if(e.originalEvent.changedTouches != null || e.originalEvent.touches != null){
		var first_touch = e.originalEvent.changedTouches[0] || e.originalEvent.touches[0];

		x = first_touch.pageX;
		y = first_touch.pageY;
	}
	else{
		x = e.originalEvent.clientX;
		y = e.originalEvent.clientY;
	}

    if ((x - 480) < 0) {
        x = 480;
    } else if ((x + 480) > 3840) {
        x = 3840 - 480;
    }

    if ((y - 270) < 0) {
        y = 270;
    } else if ((y + 270) > 1080) {
        y = 1080 - 270;
    }

    var rec_x = x - 480;
    var rec_y = y - 270;

    rect_div.style.left = rec_x + 'px';
    rect_div.style.top = rec_y + 'px';

    var msg = {
        message: rec_x, //x
        name: rec_y, //y
        action: Event.stitch_events
    };
    send_msg(msg);

    g_video_full_screen_mode = true;
}

function toggle_stitch_mode() {
    var stitch_graphic = document.getElementById("stitch_toggle");
    var vid_tile = document.getElementById("div_vid_tile_id_0");

    if (g_8k_stitch_mode == false) {
        if (g_video_full_screen_mode == false) {
            g_video_full_screen_mode = true;
            g_8k_stitch_mode = true;
            stitch_graphic.style.backgroundImage = "url(image/icon_expand.png)";
            console.log("stitch expand");
            update_current_time(); //update current time for stitch video
            setTimeout(function() {
                var msg = {
                    message: true,
					videoPosition: currentPosition(vid_tile),
                    name: KeyCode.StitchVideo,
                    action: Event.stitch_split_8k
                };
                send_msg(msg);
            }, 300);
        } else {
            msg_val = 0;
            msg_key = KeyCode.StitchVideo;
            msg_type = Event.stitch_split_8k;
            vid_toggle_mute(0);
            g_video_full_screen_mode = false;
        }
    } else {
        g_video_full_screen_mode = false;
        g_8k_stitch_mode = false;
        stitch_graphic.style.backgroundImage = "url(image/icon_contract.png)";
        console.log("stitch contract");
        setTimeout(function() {
            var msg = {
                message: false,
                name: KeyCode.StitchVideo,
				videoPosition: currentPosition(vid_tile),
                action: Event.stitch_split_8k
            };
            send_msg(msg);
        }, 500);
    }
}

function vid_toggle_mute(x) {
    for (var idx = 0; idx < 6; idx++) {
        var vid_name = "div_vid_tile_id_" + idx;
        var vid = document.getElementById(vid_name);
        if (idx == x) {
            if (vid.muted == true) { //one video has to stay unmuted option
                vid.muted = false; //unmute video
            }
        } else {
            if (vid.muted == false) {
                vid.muted = true; //mute video 
            }
        }
    }
}

function toggle_all(e) {
    for (var idx = 0; idx < 6; idx++) {
        var vid_name = "div_vid_tile_id_" + idx;
        var video = document.getElementById(vid_name);

        if (e == true) {
            video.play();
        } else {
            video.pause();
        }
    }
}

function process_video_items(x) {
	var control = x;
	if(!isJqueryItem(control))
		control = $("#div_vid_tile_id_" + x);
	setFocus(control);
}

function monitor_video_keydown(video) {
	var x = Number(video.attr("data-panelNumber"));
	
    var next_video = x;

    var msg = {
        message: x,
        name: window.event.keyCode,
		videoPosition: currentPosition(video),
        action: Event.video_events
    };
    send_msg(msg);

    switch (getKeyValue()) {
        case KeyCode.PlayVideos:
            toggle_all(true);
            break;
        case KeyCode.ToggleMute:
            vid_toggle_mute(x);
            break;
        case KeyCode.TogglePause:
            play_pause(x);
            break;
        case KeyCode.SwitchVideo:
            if (x > 0) {
                switch_video(x);
            }
            break;
    }
    g_video_item = x;
}

