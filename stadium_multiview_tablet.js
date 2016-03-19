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
    socket = new WebSocket('ws://' + websocket_server_ip + ':9000/');
    console.log("websocket server IP:" + websocket_server_ip);

    document.addEventListener("keydown", function(e) {
        switch (e.keyCode) {
            case 70: //'f' - full screen
                toggleFullScreen();
                break;
            case 82: //'r' - reload
                location.reload();
                break;
            case 65: //'a'
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
                            name: 87, //'w'
                            color: Event.stitch_split_8k
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

        mousedown: function(e) {},

        mousemove: function(e) {},

        mouseup: function(e) {}
    });

    $("#vid1_tile, #vid2_tile, #vid3_tile, #vid4_tile, #vid5_tile").bind('touchstart mousedown', function(e) {
        console.log("vid_box_event " + e.target.id);
        switch (e.target.id) {
            case "div_vid_tile_id_1":
                msg_id = 1;
                break;
            case "div_vid_tile_id_2":
                msg_id = 2;
                break;
            case "div_vid_tile_id_3":
                msg_id = 3;
                break;
            case "div_vid_tile_id_4":
                msg_id = 4;
                break;
            case "div_vid_tile_id_5":
                msg_id = 5;
                break;
            default:
                break;
        }

        if (g_8k_stitch_mode == true) {
            toggle_stitch_mode();
        } else {
            var msg = {
                message: msg_id,
                name: 87, //'w'
                color: Event.stitch_split_8k
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
        color: Event.seek_time
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
        color: Event.stitch_events
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
                msg_key = 87; //'w'
                msg_type = Event.stitch_split_8k;
                var msg = {
                    message: msg_val,
                    name: msg_key,
                    color: msg_type
                };
                send_msg(msg);
            }, 300);
        } else {
            msg_val = 0;
            msg_key = 87; //'w'
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
            msg_key = 87; //'w'
            msg_type = Even.8k_stitch_split;
            var msg = {
                message: msg_val,
                name: msg_key,
                color: msg_type
            };
            send_msg(msg);
        }, 500);
    }
}

function send_msg(msg) {
    console.log("send1:" + msg.message + " " + msg.name + " " + msg.color);
    socket.send(JSON.stringify(msg));
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

function show_description(x) {
    var image;
    var tile_name;

    tile_name = "div_tile_img_id_" + x;

    var img_tile = document.getElementById(tile_name);
    img_tile.focus();
}

function process_video_items(x) {
    var item_id = "div_vid_tile_id_" + x;
    var menu_element = document.getElementById(item_id);
    menu_element.focus();
}

function monitor_video_keydown(x) {
    var next_video = x;

    remove_detail_pop_up();

    var msg = {
        message: x,
        name: window.event.keyCode,
        color: Event.video_events
    };
    send_msg(msg);

    switch (window.event.keyCode) {
        case 73: // 'i'
            break;
        case 65: //'a'
            toggle_all(true);
            break;
        case 77: //'m'
            vid_toggle_mute(x);
            break;
        case 80: // 'p'
            play_pause(x);
            break;
        case 83: // 's'
            if (x > 0) {
                switch_video(x);
            }
            break;
        case 37: //'left'
            if ((x == 1) || (x == 3)) {
                next_video = x - 1;
            } else {
                next_video = x;
            }
            break;
        case 38: //'up'
            if ((x < 2)) {
                next_video = x;
            } else {
                next_video = x - 2;
            }
            break;
        case 39: //'right'
            if ((x == 0) || (x == 2)) {
                next_video = x + 1;
            } else {
                next_video = x;
            }
            break;
        case 40: //'down'
            if ((x == 0) || (x == 1)) {
                next_video = x + 2;
            } else {
                next_video = 100; //go to menu items
            }
            break;
    }
    if (next_video != 100) {
        var tile_name = "div_vid_tile_id_" + next_video;
        var img_tile = document.getElementById(tile_name);
        img_tile.focus();
    } else {
        var item_id = "menu_item_" + g_menu_item;
        var menu_item = document.getElementById(item_id);
        menu_item.focus();
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

function monitor_menu_keydown(x) {
    var next_item = x;
    remove_detail_pop_up();

    switch (window.event.keyCode) {
        case 13: // 'Enter'
            break;
        case 37: //'left'
            if (x > 0) {
                next_item = x - 1;
            } else {
                next_item = x;
            }
            break;
        case 38: //'up'
            next_item = 200;
            break;
        case 39: //'right'
            if (x < 4) {
                next_item = x + 1;
            } else {
                next_item = x;
            }
            break;
        case 40: //'down'
            next_item = 100; //move down to image tiles
            break;
    }

    if (next_item == 100) { //move down to image tiles
        var tile_name = "div_tile_img_id_0";
        var img_tile = document.getElementById(tile_name);
        img_tile.focus();
    } else if (next_item == 200) { //move up to video tiles
        var video_tile_name = "div_vid_tile_id_" + g_video_item;
        var video_tile = document.getElementById(video_tile_name);
        video_tile.focus();
    } else {
        var item_id = "menu_item_" + next_item;
        var menu_item = document.getElementById(item_id);
        menu_item.focus();
    }

    g_menu_item = x;
}

function process_menu_items(x) {
    var item_id = "menu_item_" + x;
    var menu_element = document.getElementById(item_id);
    menu_element.focus();

    change_menu_item_highlight(x);
    update_tiles(x);
}

function update_tiles(menu_item) {
    var tile_group;

    var tile_group_0 = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; //watch now
    var tile_group_1 = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]; //dad   
    var tile_group_2 = [20, 21, 22, 23, 24, 25, 26, 27, 28, 29]; //kids
    //    var tile_group_3 = [30,31,32,33,34,35,36,37,38,39];  //sports
    var tile_group_3 = [40, 41, 42, 43, 44, 45, 46, 47, 48, 49]; //netflix

    switch (menu_item) {
        case 0:
            tile_group = tile_group_0; //watch now
            break;
        case 1:
            tile_group = tile_group_1; //dad
            break;
        case 2:
            tile_group = tile_group_2; //kids
            break;
        default:
            return;
            break;
    }

    for (var idx = 0; idx < tile_group.length; idx++) {
        var r = tile_group[idx];
        var tile_name = "div_tile_img_id_" + idx;
        var img_tile = document.getElementById(tile_name);
        var img_name = "./image/" + r + ".jpg";
        img_tile.style.backgroundImage = "url(" + img_name + ")";
    }
}

function change_menu_item_highlight(x) {
    for (var idx = 0; idx < 4; idx++) {
        var menu_item = document.getElementById("menu_item_" + idx);
        menu_item.style.fontWeight = "600";
        menu_item.style.color = "#B7B7B7";
    }

    var menu_item_new = document.getElementById("menu_item_" + x);
    menu_item_new.style.fontWeight = "900";
    menu_item_new.style.color = "white";
}

function monitor_tile_key_down(x) {
    var next_tile = x;

    remove_detail_pop_up();

    switch (window.event.keyCode) {
        case 73: // 'i'
            show_detail_pop_up(x);
            break;
        case 83: // 's'
            show_full_screen_video(x, g_video_full_screen_mode);
            break;
        case 37: //'left'
            if (x > 0) {
                next_tile = x - 1;
            } else {
                next_tile = x;
            }
            break;
        case 38: //'up'
            next_tile = 100; //go to menu items
            break;
        case 39: //'right'
            if (x < 9) {
                next_tile = x + 1;
            } else {
                next_tile = x;
            }
            break;
        case 40: //'down'
            next_tile = x;
            break;
    }

    if (next_tile != 100) {
        var tile_name = "div_tile_img_id_" + next_tile;
        var img_tile = document.getElementById(tile_name);
        img_tile.focus();
    } else {
        var item_id = "menu_item_" + g_menu_item;
        var menu_item = document.getElementById(item_id);
        menu_item.focus();
    }

    g_tile_item = x;
}

function remove_detail_pop_up() {
    var temp = document.getElementById('preview_div');
    temp.style.display = 'none';
}

function show_detail_pop_up(x) {
    var image_name;
    switch (x) {
        case 0:
            image_name = 'details_0.jpg';
            break;
        case 1:
            image_name = 'details_1.jpg';
            break;
        case 2:
            image_name = 'details_2.jpg';
            break;
        case 9:
            image_name = 'details_9.jpg';
            break;
        default:
            return;
            break;
    }

    detail_HTML = '<div class="preview_temp_load"><img id="details_img" src="./image/' + image_name + '" border="0"></div>';
    document.getElementById("preview_div").innerHTML = detail_HTML;
    document.getElementById("preview_div").style.display = "block";
}

function show_full_screen_video(x, fs_mode) {
    var new_video;
    switch (x) {
        case 0:
            new_video = "wildalaska";
            break;
        case 1:
            new_video = "dexter";
            break;
        case 9:
            new_video = "walkingdead";
            break;
        default:
            return;
            break;
    }

    fs_video_HTML = '<video id="full_video" loop >' +
        '<source id="vid_src" src="videos/' + new_video + '.mp4"></video>';

    var fsv = document.getElementById("full_screen_video");
    fsv.innerHTML = fs_video_HTML;

    var fs = document.getElementById("full_video");

    if (fs_mode == false) {
        console.log('fs: true');
        fs.play();
        fs.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
        fs.style.display = 'inline';
        fs.style.visibility = 'visible';
        g_video_full_screen_mode = true;
    } else {
        console.log('fs: false');
        fs.pause();
        document.webkitCancelFullScreen();
        fs.style.display = 'none';
        fs.style.visibility = 'hidden';
        g_video_full_screen_mode = false;
        fsv.innerHTML = '';
        fs.innerHTML = '';
    }
}