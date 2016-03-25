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
    attachToControls();

    socket = new WebSocket('ws://localhost:9000/');
    console.log("websocket server IP:" + websocket_server_ip);

    socket.addEventListener("message", onMessage, false);

    document.addEventListener("keydown", function(e) {
        switch (getKeyValue(e)) {
            case KeyCode.ToggleFullScreen:
                toggleFullScreen();
                break;
            case KeyCode.ReloadPage:
                location.reload();
                break;
            case KeyCode.PlayVideos:
                for (var idx = 0; idx < 6; idx++) {
                    var video = findVideo(idx);
                    video.play();
                }
                break;
            case KeyCode.ChangeDivider:
                change_divider();
                break;
        }
    }, false);

    var control = document.getElementById("div_vid_tile_id_0");
	setFocus(control);

    vid_toggle_mute(0); //unmute vid 0 
    toggle_all(true); //start playing all videos
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
	
	var strmsg = JSON.stringify(msg);
	console.log("tv receive:" + strmsg);

    switch (msg.action) {
        case Event.video_events:
            monitor_video_message(msg.message, msg.name);
            break;
        case Event.dragdrop:
            monitor_touch_message(msg);
            break;
		case Event.stitch_events:
			draw_video(msg.message, msg.name);
			break;
        case Event.stitch_split_8k:
            monitor_video_message(6, msg.name);
            break;
        case Event.seek_time:
            g_current_time = msg.name;
            var vid_tile = document.getElementById("div_vid_tile_id_0");
            vid_tile.currentTime = msg.name;
            break;
    }
}

function monitor_touch_message(msg) {
    var type = msg.type; //message type
    var vid_tile = msg.message; //vid tile
    var vid_src = msg.name; //new vid source
    var vid_name = "div_vid_tile_id_" + vid_tile;
    var video = document.getElementById(vid_name);

    video.pause();
    video.src = vid_src;
    video.play();
}

function process_video_items(x) {
    var item_id = "div_vid_tile_id_" + x;
    var control = document.getElementById(item_id);
    control.focus();
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
            if ((x == 2) || (x == 4) || (x == 5)) {
                next_video = x - 1;
            } else {
                next_video = x;
            }
            break;
        case KeyCode.Up:
            if ((x == 0) || (x == 1)) {
                next_video = x - 1;
            } else if (x == 5) {
                next_video = 0;
            } else {
                next_video = x - 2;
            }
            break;
        case KeyCode.Right:
            if ((x == 0) || (x == 2)) {
                next_video = x + 1;
            } else {
                next_video = x;
            }
            break;
        case KeyCode.Down:
            if ((x == 0) || (x == 1)) {
                next_video = x + 2;
            } else {
                next_video = x;
            }
            break;
    }

    if (next_video != 100) {
        var tile_name = "div_vid_tile_id_" + next_video;
        var img_tile = document.getElementById(tile_name);
        img_tile.focus();
    }
}

function monitor_video_keydown(x) {
    var next_video = x;

    g_video_item = x;

    switch (getKeyValue()) {
        case KeyCode.PlayVideos:
            toggle_all(true);
            break;
        case PlayVideos.ToggleMute:
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
            if ((x == 1) || (x == 3)) {
                next_video = x - 1;
            } else {
                next_video = x;
            }
            break;
        case KeyCode.Up:
            if ((x < 2)) {
                next_video = x;
            } else {
                next_video = x - 2;
            }
            break;
        case KeyCode.Right:
            if ((x == 0) || (x == 2)) {
                next_video = x + 1;
            } else {
                next_video = x;
            }
            break;
        case KeyCode.Down:
            if ((x == 0) || (x == 1)) {
                next_video = x + 2;
            } else {
                next_video = x;
            }
            break;
    }

    if (next_video != 100) {
        var tile_name = "div_vid_tile_id_" + next_video;
        var control = document.getElementById(tile_name);
        control.focus();
    }
}

function full_screen() {
    console.log("button pressed");
    toggle_full_screen_video(g_video_item, g_video_full_screen_mode);
}

function toggle_full_screen_video_canvas(x, fs_mode) {
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

function toggle_full_screen_video(x, fs_mode) {
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

function change_source_full_screen(x) {
    var vid_name = "div_vid_tile_id_" + 7;
    var video = document.getElementById(vid_name);
    var str_trim;

    if (x == 6) {
        str_trim = 21;
    } else {
        str_trim = 22;
    }

    var vid_tile = "div_vid_tile_src_id_" + x;
    var video_tile = document.getElementById(vid_tile);
    var video_src = video_tile.getAttribute("src");
    console.log("video full screen src orig:" + video_src);
    console.log("video src_full_screen:" + video_src.substring(str_trim));

    var vid_src = video_src.substring(str_trim);
    video.src = "videos/stadium_tv/4K/" + vid_src;
    console.log("full screen video source: " + video.src);
}

function switch_video(x) {
    var vid_name = "div_vid_tile_id_" + x;
    var vid_name_src = "div_vid_tile_src_id_" + x;

    var video = document.getElementById(vid_name);
    var video_0 = document.getElementById('div_vid_tile_id_0');

    var video_src = document.getElementById(vid_name_src);
    var video_0_src = document.getElementById('div_vid_tile_src_id_0');

    video.pause();
    video_0.pause();
    var video_src_tmp = video_src.src;
    var video_0_src_tmp = video_0_src.src;

    video_src.src = video_0_src_tmp;
    video_0_src.src = video_src_tmp;

    video_0.load();
    video.load();
    video_0.play();
    video.play();
}

function play_pause(x) {
    var vid_name = "div_vid_tile_id_" + x;
    var video = document.getElementById(vid_name);

    if (video.paused) {
        console.log('play');
        video.play();
    } else {
        console.log('pause');
        video.pause();
    }
}
