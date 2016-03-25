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

    window.setInterval(send_AllVideoStatus, 1000);
}

function mapPageKeyPresses() {
    var pagekeymap;	// Initialized with the list of keypresses that occur across the page 
    // in general and associates with their handler

	pagekeymap = [
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
		var srcitems = video.src.split("/");
		
        var videoInfo = {
            videoTile: videoTile,
            videoPosition: video.currentTime,
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
		var newVideo = "{1}videos/stadium_tablet/270/{0}.mp4".format(msg.videoName, getSiteRoot());
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
			
		var ct = video.currentTime;
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
        case KeyCode.Left:
            next_video = ((x == 1) || (x == 3)) ? x - 1 : x;
            break;
        case KeyCode.Up:
            next_video = ((x < 2)) ? x : x - 2;
            break;
        case KeyCode.Right:
            next_video = ((x == 0) || (x == 2)) ? x + 1 : x;
            break;
        case KeyCode.Down:
            next_video = ((x == 0) || (x == 1)) ? x + 2 : x;
            break;
    }

    if (next_video != 100) {
        var control = findVideo(next_video);
		setFocus($(control));
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
        case KeyCode.Left:
            next_video = ((x == 1) || (x == 3)) ? x - 1 : x;
            break;
        case KeyCode.Up:
            next_video = ((x < 2)) ? x : x - 2;
            break;
        case KeyCode.Right:
            next_video = ((x == 0) || (x == 2)) ? x + 1 : x;
            break;
        case KeyCode.Down:
            next_video = ((x == 0) || (x == 1)) ? x + 2 : x;
            break;
    }

    if (next_video != 100) {
        var control = findVideo(next_video);
		setFocus($(control));
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

function change_source_full_screen(x) {
    var video = findVideo("7");
    var str_trim = (x == 4) ? 21 : 22;

    var video_tile = findVideo(x);
    var video_src = getVideoSource(video_tile);
    console.log("video full screen src orig:" + video_src);
    console.log("video src_full_screen:" + video_src.substring(str_trim));

    var vid_src = video_src; //video_src.substring(str_trim);
    video.src = vid_src; //"videos/stadium_tv/4K/" + vid_src;
    console.log("full screen video source: " + video.src);
}

function switch_video(x) {
    var vid_name_src = "div_vid_tile_src_id_" + x;

    var video = findVideo(x);
    var video_0 = findVideo("0");

    video.pause();
    video_0.pause();
    var video_src_tmp = video.getAttribute("src"); //video.src;
    var video_0_src_tmp = video_0.getAttribute("src"); //.src;

    video.src = video_0_src_tmp;
    video_0.src = video_src_tmp;

    video_0.load();
    video.load();
    video_0.play();
    video.play();
}

function play_pause(x) {
    var video = findVideo(x);

    if (video.paused) {
        console.log('play');
        video.play();
    } else {
        console.log('pause');
        video.pause();
    }
}

