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
    attachToControls();

    socket = new WebSocket('ws://' + websocket_server_ip + ':9000/');
    console.log("websocket server IP:" + websocket_server_ip);

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
        }
    }, false);

    var img_tile_0 = document.getElementById("div_vid_tile_id_0");
    img_tile_0.focus();

    vid_toggle_mute(0); //unmute vid0
    toggle_all(true); //start playing all videos

    var new_vid = null;

    $('html, body').on('touchstart touchmove', function(e) {
        //prevent native touch activity like scrolling
        e.preventDefault();
    });

    var msg_id;

    var vid_tile = document.getElementById("div_vid_tile_id_0");

    $("#stitch_toggle").bind('touchstart touchend touchmove mousedown touchcancel', function(e) {
        e.stopPropagation();
        e.preventDefault();
        if (vid_tile.paused || vid_tile.ended) {
            return false;
        }
        console.log("stitch2 " + e.type);
        if (e.type == "touchstart") {
            toggle_stitch_mode();
        }
    });

    var time_touch;

    $("#vid0_tile, #rectangle_div").bind({
        touchstart: function(e) {
            if (vid_tile.paused || vid_tile.ended) {
                return false;
            }
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
    });

    $("#vid1_tile, #vid2_tile, #vid3_tile, #vid4_tile, #vid5_tile").bind('touchstart mousedown', function(e) {
        console.log("vid_box_event " + e.target.id);
        switch (e.target.id) {
            case "div_vid_tile_id_1": msg_id = 1; break;
            case "div_vid_tile_id_2": msg_id = 2; break;
            case "div_vid_tile_id_3": msg_id = 3; break;
            case "div_vid_tile_id_4": msg_id = 4; break;
            case "div_vid_tile_id_5": msg_id = 5; break;
        }

        if (g_8k_stitch_mode == true) {
            toggle_stitch_mode();
        } else {
            var msg = {
                message: msg_id,
                name: KeyCode.StitchVideo,
                action: Event.stitch_split_8k
            };
            send_msg(msg);

            vid_toggle_mute(msg_id);
            if (g_video_full_screen_mode == false) {
                g_video_full_screen_mode = true;
            } else {
                g_video_full_screen_mode = false;
            }
        }
    });
}

function update_current_time() {
    var vid_tile = document.getElementById("div_vid_tile_id_0");
    console.log("videoCurrentTime: " + vid_tile.currentTime);
    var msg = {
        message: 0,
        name: vid_tile.currentTime,
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

    var first_touch = e.originalEvent.changedTouches[0] || e.originalEvent.touches[0];

    x = first_touch.pageX;
    y = first_touch.pageY;

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
    var msg_val;
    var msg_key;
    var msg_type;

    if (g_8k_stitch_mode == false) {
        if (g_video_full_screen_mode == false) {
            g_video_full_screen_mode = true;
            g_8k_stitch_mode = true;
            stitch_graphic.style.backgroundImage = "url(image/icon_expand.png)";
            console.log("stitch expand");
            update_current_time(); //update current time for stitch video
            setTimeout(function() {
                msg_val = true;
                msg_key = KeyCode.StitchVideo; 
                msg_type = Event.stitch_split_8k;
                var msg = {
                    message: msg_val,
                    name: msg_key,
                    action: msg_type
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
            msg_val = false;
            msg_key = KeyCode.StitchVideo;
            msg_type = Event.stitch_split_8k;
            var msg = {
                message: msg_val,
                name: msg_key,
                action: msg_type
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

function toggleFullScreen() {
    if (!document.fullscreenElement && // alternative standard method
        !document.mozFullScreenElement && !document.webkitFullscreenElement) { // current working methods
        if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
        } else if (document.documentElement.mozRequestFullScreen) {
            document.documentElement.mozRequestFullScreen();
        } else if (document.documentElement.webkitRequestFullscreen) {
            document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
        }
    } else {
        if (document.cancelFullScreen) {
            document.cancelFullScreen();
        } else if (document.mozCancelFullScreen) {
            document.mozCancelFullScreen();
        } else if (document.webkitCancelFullScreen) {
            document.webkitCancelFullScreen();
        }
    }
}

function process_video_items(x) {
    var item_id = "div_vid_tile_id_" + x;
    var menu_element = document.getElementById(item_id);
    menu_element.focus();
}

function monitor_video_keydown(x) {
    var next_video = x;

    var msg = {
        message: x,
        name: window.event.keyCode,
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
                next_video = 100; //go to menu items
            }
            break;
    }
    if (next_video != 100) {
        var tile_name = "div_vid_tile_id_" + next_video;
        var control = document.getElementById(tile_name);
        control.focus();
    }

    g_video_item = x;
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
