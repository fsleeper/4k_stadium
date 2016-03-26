var g_video_item = 0;
var g_video_full_screen_mode = false;
var socket = null;
var g_vid_full_screen = 0;
var g_stitch_mode = false;
var g_x = 0;
var g_y = 0;
var g_current_time = 0;
var divider_counter = 0;
var draw_video_interval;

$(document).ready(() => {
    init();
});

function init() {
    attachToSocket();
    mapPageKeyPresses();
	attachToControls();

	setFocus($("#div_vid_tile_id_0"));

    vid_toggle_mute(0); //unmute vid 0 
    toggle_all(true); //start playing all videos
	
	window.setInterval(send_AllVideoStatus, REFRESH_CLIENT_INTERVAL);
}

function mapPageKeyPresses() {
    var pagekeymap = [
		{key:KeyCode.ToggleFullScreen, 	func:toggleFullScreen},
		{key:KeyCode.ReloadPage, 		func:() => { location.reload(); }},
		{key:KeyCode.PlayVideos, 		func:playVideos},
		{key:KeyCode.ChangeDivider,		func:change_divider}
	];

    mapKeyPresses($(document), pagekeymap);
}

function attachToSocket() {
    console.log("websocket server IP:" + websocket_server_ip);
    socket = new WebSocket('ws://' + websocket_server_ip + ':9000/');
    socket.addEventListener("message", onMessage, false);
}

function send_AllVideoStatus() {
	// This allows us to NOT tell the clients that the server videos are paused at the moment
	if(!STOP_WHEN_FULLSCREEN && g_video_full_screen_mode)
		return;
	
    // Find the current videos
    var tiles = $('.vid_tiles:visible').find('.video_tile');

	var msg = {
		action: Event.BroadcastServerStatus2,
		videos: []
	};

    // For each video found, send the name and current position of each video
    for (var idx = 0; idx < tiles.length; idx++) {
        var video = tiles[idx];
        var videoTile = video.id.replace(VIDEO_BASE_TAG, "");
		var srcitems = getVideoSource(video).split("/");
		
        var videoInfo = {
            videoTile: videoTile,
            videoPosition: currentPosition(video),
			videoName: srcitems[srcitems.length-1].replace(".mp4",""),
			isPaused: video.paused
        };
		msg.videos.push(videoInfo);
    }
	send_msg(msg);
}

function playVideos(){
	for (var idx = 0; idx < 6; idx++) {
		var video = findVideo(idx);
		video.play();
	}
}

function draw_video(x, y) {
    console.log("draw_video");
    var vid_tile = document.getElementById("div_vid_tile_id_0");
    if (vid_tile.paused || vid_tile.ended) {
        return false;
    }
    console.log(x + " recvd " + y);
    var vid_canvas_obj = document.getElementById("vid_canvas");
    var ctx = vid_canvas_obj.getContext("2d");
    ctx.scale(1, 1);

    var rect_div = document.getElementById("rectangle_div");
    rect_div.setAttribute("display", "block");
    var rec_x = x;
    var rec_y = y;

    rect_div.style.left = rec_x + 'px';
    rect_div.style.top = rec_y + 'px';

    g_x = rec_x;
    g_y = rec_y;

    if (g_stitch_mode == false) {
        g_stitch_mode = true;

        if (g_video_full_screen_mode == true) {
            toggle_full_screen_video(g_vid_full_screen, g_video_full_screen_mode);
        }

        toggle_full_screen_video_canvas(0, g_video_full_screen_mode);

        draw_video_interval = window.setInterval(function() {
            if (vid_tile.paused || vid_tile.ended) {
                return false;
            }
            ctx.drawImage(vid_tile, g_x, g_y, 960, 540, 0, 0, 3840, 2160);
        }, 20);
    }
}

function change_divider() {
    var divider_item = document.getElementById("divider");
    var divider_name;

    switch (divider_counter) {
        case 0: divider_name = "image/FrameDividerBlack_4KView.png"; break;
        case 1: divider_name = "image/FrameDividerGold_4KView.png"; break;
        case 2: divider_name = "image/FrameDividerRed_4KView.png"; break;
        case 3: divider_name = "image/FrameDividerGray_4KView.png"; break;
        case 4: divider_name = "image/FrameDivider_4KView.png"; break;
    }

    divider_item.style.backgroundImage = "url(" + divider_name + ")";
    divider_counter++;

    if (divider_counter >= 5) {
        divider_counter = 0;
    }
}

function vid_toggle_mute(x) {
    for (var idx = 0; idx < 8; idx++) {
        var vid_name = "div_vid_tile_id_" + idx;
        var vid = document.getElementById(vid_name);
        if (idx == x) {
            if (vid.muted == true) { //one video has to stay unmuted option
                console.log('unmute video:' + idx);
                vid.muted = false; //unmute video
            }
        } else {
            if (vid.muted == false) {
                console.log('mute video:' + idx);
                vid.muted = true; //mute video 
            }
        }
    }
}

function toggle_all(e) {
    for (var idx = 0; idx < 8; idx++) {
        var vid_name = "div_vid_tile_id_" + idx;
        var video = document.getElementById(vid_name);

        if (e == true) {
            if ((idx != 6) && (idx != 7)) {
                video.play();
            }
        } else {
            video.pause();
        }
    }
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
        case Event.video_events:
            monitor_video_message(msg.message, msg.name, msg.videoPosition);
            break;
		case Event.stitch_events:
			draw_video(msg.message, msg.name);
			break;
        case Event.stitch_split_8k:
            monitor_video_message(6, msg.name, msg.videoPosition);
            break;
        case Event.seek_time:
            g_current_time = msg.name;
            var vid_tile = document.getElementById("div_vid_tile_id_0");
            vid_tile.currentTime = msg.name;
            break;
    }
}

function process_video_items(control) {
	setFocus(control);
    g_video_item = Number(control.attr("data-panelNumber"));
}

function monitor_video_message(x, key, videoPosition) {
    var next_video = x;

    g_video_item = x;

    switch (getKeyValue(key)) {
        case KeyCode.PlayVideos:
            toggle_all(true);
            break;
        case KeyCode.ToggleMute:
            vid_toggle_mute(x);
            break;
        case KeyCode.StitchVideo:
            if (g_video_full_screen_mode == false) {
                toggle_full_screen_video(x, g_video_full_screen_mode, videoPosition);
            } else {
                toggle_full_screen_video(g_vid_full_screen, g_video_full_screen_mode, videoPosition);
            }
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
}

function monitor_video_keydown(video) {
	var x = Number(video.attr("data-panelNumber"));
    var next_video = x;

    g_video_item = x;

    switch (getKeyValue()) {
        case KeyCode.PlayVideos:
            toggle_all(true);
            break;
        case KeyCode.ToggleMute:
            vid_toggle_mute(x);
            break;
        case KeyCode.StitchVideo:
            if (g_video_full_screen_mode == false) {
                toggle_full_screen_video(x, g_video_full_screen_mode, currentPosition(video));
            } else {
                toggle_full_screen_video(g_vid_full_screen, g_video_full_screen_mode, currentPosition(video));
            }
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
}

function full_screen() {
    console.log("button pressed");
    toggle_full_screen_video(g_video_item, g_video_full_screen_mode);
}

function toggle_full_screen_video_canvas(x, fs_mode, videoPosition) {
    var vid_canvas = document.getElementById("vid_canvas");

    if (fs_mode == false) {
        console.log('fs canvas: true');

        for (var idx = 1; idx < 7; idx++) {
            var vid_name = "div_vid_tile_id_" + idx;
            var video = document.getElementById(vid_name);
            video.pause();
        }

        g_video_full_screen_mode = true;
        g_vid_full_screen = x;
        vid_canvas.style.display = 'block';
        vid_toggle_mute(x);
    } else {
        console.log('fs canvas: false');
        g_video_full_screen_mode = false;
        vid_canvas.style.display = 'none';
        window.clearInterval(draw_video_interval);
        g_stitch_mode = false;
        toggle_all(true);
    }
}

function toggle_full_screen_video(x, fs_mode, videoPosition) {
    var vid_id_name = "id_vid" + 7;
    var vid_class_name = "vid" + 7;
    var vid_name = "div_vid_tile_id_" + 7;
    var video = document.getElementById(vid_name);

    if (fs_mode == false) {
        console.log('fs: true');
        toggle_all(false); //pause

        g_video_full_screen_mode = true;
        g_vid_full_screen = x;
        change_source_full_screen(x);

        document.getElementById("id_vid7").style.display = 'block';
        document.getElementById(vid_id_name).classList.remove(vid_class_name);
        document.getElementById(vid_id_name).classList.add("full_screen");
        vid_toggle_mute(x);
        video.play();
		if(videoPosition != null) {
			video.currentTime = videoPosition + .100; // Add a slight adjustment
		}
    } else {
        console.log('fs: false');
        toggle_all(false); //pause

        if (g_stitch_mode == true) {
            console.log('g_stitch_mode==true; toggle fs')
            toggle_full_screen_video_canvas(0, g_video_full_screen_mode);
        }

        g_video_full_screen_mode = false;

        document.getElementById("id_vid7").style.display = 'none';
        document.getElementById(vid_id_name).classList.remove("full_screen");
        document.getElementById(vid_id_name).classList.add(vid_class_name);
        toggle_all(true);
    }
}
