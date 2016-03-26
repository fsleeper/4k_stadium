var g_video_item = 0;
var g_video_full_screen_mode = false;
var socket = null;
var g_vid_full_screen = 0;
var divider_counter = 0;

$(document).ready(() => {
    init();
});

function init() {
    attachToSocket();
    mapPageKeyPresses();
	attachToControls();

    var control = findVideo("0");
	setFocus($(control));

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

function playVideos() {
	for (var idx = 0; idx < 4; idx++) {
		var video = findVideo(idx);
		video.play();
	}
}

function findMap(map, code) { 
	return map.key === code;
}

function send_AllVideoStatus() {
    // Find the current videos
    var tiles = $('.vid_tiles:visible').find('.video_tile');

	var msg = {
		action: Event.BroadcastServerStatus,
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

function change_divider() {
    var divider_item = document.getElementById("quad_divider");
    var divider_name;

    switch (divider_counter) {
        case 0: divider_name = "image/FrameDivider_wLogo_QuadView.png"; break;
        case 1: divider_name = "image/FrameDividerGold_QuadView.png"; break;
        case 2: divider_name = "image/FrameDividerRed_QuadView.png"; break;
        case 3: divider_name = "image/FrameDividerGray_QuadView.png"; break;
        case 4: divider_name = "image/FrameDivider_QuadView.png"; break;
    }

    divider_item.style.backgroundImage = "url(" + divider_name + ")";
    divider_counter++;

    if (divider_counter >= 5) {
        divider_counter = 0;
    }
}

function vid_toggle_mute(x) {
    for (var idx = 0; idx < 4; idx++) {
        var vid = findVideo(idx);
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
    for (var idx = 0; idx < 5; idx++) {
        var video = findVideo(idx);

        if (e == true) {
            if (idx != 4) {
                video.play();
            }
        } else {
            video.pause();
        }
    }

    if (e == false) {
        video = findVideo("7");
        video.pause();
    }
}

function changePosition(msg){
	var video = findVideo(msg);
	if(video) { // Did we find a video?
		
		// Get the old and new name
		var newVideo = "videos/stadium_tablet/270/{0}.mp4".format(msg.videoName);
		var src = video.currentSrc;
		
		// if the names are different we need to change the video
		if(src !== newVideo) {
			console.log("New Video: " + msg.videoName + "  Curr Video: " + src.substring(src.length-10));
			video.src = newVideo;
		}

		// If the paused states are different we need to get these in synchronized
		if(video.paused != msg.isPaused)
			if(msg.isPaused)
				video.pause();
			else
				video.play();
			
		var ct = currentPosition(video);
		var diff = Math.abs(ct-msg.videoPosition);
		if(diff >= .5)
			video.currentTime = msg.videoPosition;
	}
}

function onMessage(evt) {
    var msg = JSON.parse(evt.data); //PHP sends Json data

	if(msg === null)
		return;

	if (msg.clientId === getClientId())
	    return;

	var strmsg = JSON.stringify(msg);
    console.log("tv receive:" + strmsg);

	switch(msg.action){
		case Event.VideoPositionChange: changePosition(msg); break;
		case Event.video_events2: 		monitor_video_message(msg.message, msg.name); break;
		case Event.dragdrop2: 			monitor_touch_message(msg); break;
		case Event.stitch_split_8k: 	monitor_video_message(4, msg.name); break;
	}
}

function monitor_touch_message(msg) {
    var video = findVideo(msg);;

    video.pause();
    video.src = "videos/stadium_tv/720/" + msg.name;
    vid_toggle_mute(msg.message);
    video.play();
}

function process_video_items(x) {
    var control = findVideo(x);
	setFocus($(control));
    g_video_item = x;
}

function monitor_video_message(x, key) {
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
                toggle_full_screen_video(x, g_video_full_screen_mode);
            } else {
                toggle_full_screen_video(g_vid_full_screen, g_video_full_screen_mode);
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

function monitor_video_keydown(x) {
    var next_video = x;

    g_video_item = x;

    switch (getKeyValue()) {
        case KeyCode.ToggleAllPause:
            toggle_all(true);
            break;
        case KeyCode.ToggleMute:
            vid_toggle_mute(x);
            break;
        case KeyCode.StitchVideo:
            if (g_video_full_screen_mode == false) {
                toggle_full_screen_video(x, g_video_full_screen_mode);
            } else {
                toggle_full_screen_video(g_vid_full_screen, g_video_full_screen_mode);
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

function toggle_full_screen_video(x, fs_mode) {
    var vid_id_name = "id_vid" + 7;
    var vid_class_name = "vid" + 7;
    var video = findVideo("7");

    if (fs_mode == false) {
        console.log('fs: true');
        //toggle_all(false); //pause

        g_video_full_screen_mode = true;
        g_vid_full_screen = x;
        change_source_full_screen(x);

        document.getElementById("id_vid7").style.display = 'block';
        document.getElementById(vid_id_name).classList.remove(vid_class_name);
        document.getElementById(vid_id_name).classList.add("full_screen");
        vid_toggle_mute(x);
        video.play();
    } else {
        console.log('fs: false');
        toggle_all(false); //pause

        g_video_full_screen_mode = false;

        document.getElementById("id_vid7").style.display = 'none';
        document.getElementById(vid_id_name).classList.remove("full_screen");
        document.getElementById(vid_id_name).classList.add(vid_class_name);
        toggle_all(true);
    }
}



