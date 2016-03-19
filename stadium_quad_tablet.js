/* JSON Message structure
{
	type: 	The type of this JSON object. 
			system
			usermsg
	event: 	The event name that is used to define the rest of the structure.
			See: Event enumeration in common.js
}
*/
var g_video_item = 2;
var g_menu_item = 0;
var g_tile_item = 0;
var g_video_full_screen_mode = false;
var socket = null;
var g_tile_group = 0;
var g_xpos = 0;
var g_ypos = 0;
var g_tiles_left_pos = new Array();
var g_process_tile_move = false;
var g_ps4_tile0 = false;
var g_ps4_tile1 = false;
var g_ps4_tile2 = false;
var g_ps4_tile3 = false;
var g_ps4_tv_input = false;

var tv_set = {};
tv_set.tv_4k_1 = SonyTV('http://192.168.1.28/sony/IRCC');

$(document).ready(() => {
    main();
    init();
});

function main() {
    for (var x = 0; x < 10; x++) {
        add_tile({
            'left': 20 + 540 * x,
            'top': 0,
            'width': 523,
            'height': 523,
            'background': x,
            'bgsize': "cover",
            'index': x
        });
    }
}

function add_tile(c) {
    $('#div_tiles').append(
        '<div ' +
        'class="div_tile"' +
        'tabindex="0"' +
        'onfocus="show_description(' + (c.index) + ')"' +
        'onmouseover="show_description(' + (c.index) + ')"' +
        'onkeydown="monitor_tile_key_down(' + (c.index) + ')"' +
        'id="div_tile_img_id_' + (c.index) + '"' +
        'style="left: ' + (c.left) + 'px;' +
        '		top: 0px;' +
        '		width: 523px;' +
        '		height: 523px;' +
        '		background-image: url(image/' + (c.index) + '.jpg);' +
        '		background-size:"cover";' +
        '		background-color: none; ' +
        '		z-index:1000;">' +
        '</div>'
    );
}

function onMessage(evt) {
    var msg = JSON.parse(evt.data); //PHP sends Json data

	if(msg === null)
		return;
	
    console.log("tv receive:{0} {1} {2}".format(msg.message, msg.name, msg.color));

    switch (msg.color) {
        case Event.video_events2:
            break;
        case Event.dragdrop2:
            break;
        case Event.stitch_split_8k:
            break;
        case Event.seek_time:
            var video = findVideo(msg);
            video.currentTime = msg.videoPosition;
            break;
    }
}

function init() {
    socket = new WebSocket('ws://' + websocket_server_ip + ':9000/');
    console.log("websocket server IP:" + websocket_server_ip);

    socket.addEventListener("message", onMessage, false);

    document.addEventListener("keydown", function(e) {
        switch (e.keyCode) {
            case 70: //'f' - full screen
                toggleFullScreen();
                break;
            case 82: //'r' - reload
                location.reload();
                break;
            case 65: //'a'
                for (var idx = 0; idx < 4; idx++) {
                    var video = findVideo(idx);
                    video.play();
                }
                break;
            case 49: //'1'
                test_tv_http_control("HDMI1");
                break;
            case 50: //'2'
                test_tv_http_control("HDMI2");
                break;
            case 51: //'3'
                test_tv_http_control("HDMI3");
                break;
            case 52: //'4'
                test_tv_http_control("HDMI4");
                break;
            case 53: //'5'
                for (var idx = 0; idx < 4; idx++) {
                    var vid = findVideo(idx);
                    vid.muted = true; //mute video 
                }
                break;
        }
    }, false);

    menu_HTML = '<ul><li id="menu_item_0" tabindex="0" onmouseover="process_menu_items(' + 0 + ')" onfocus="process_menu_items(' + 0 + ')" onkeydown="monitor_menu_keydown(' + 0 + ')" >Watch Now</li>' +
        '<li id="menu_item_1" tabindex="0" onmouseover="process_menu_items(' + 1 + ')" onfocus="process_menu_items(' + 1 + ')" onkeydown="monitor_menu_keydown(' + 1 + ')" >Sports</li>' +
        '<li id="menu_item_2" tabindex="0" onmouseover="process_menu_items(' + 2 + ')" onfocus="process_menu_items(' + 2 + ')" onkeydown="monitor_menu_keydown(' + 2 + ')" >Stats</li>' +
        '<li id="menu_item_3" tabindex="0" onmouseover="process_menu_items(' + 3 + ')" onfocus="process_menu_items(' + 3 + ')" onkeydown="monitor_menu_keydown(' + 3 + ')" >Stadium</li>' +
        '<li id="menu_item_4" tabindex="0" onmouseover="process_menu_items(' + 4 + ')" onfocus="process_menu_items(' + 4 + ')" onkeydown="monitor_menu_keydown(' + 4 + ')" >4K</li>' +
        '<li id="menu_item_5" tabindex="0" onmouseover="process_menu_items(' + 5 + ')" onfocus="process_menu_items(' + 5 + ')" onkeydown="monitor_menu_keydown(' + 5 + ')" >Games</li> </ul>'
    document.getElementById("menu_items").innerHTML = menu_HTML;

    var menu_item_0 = document.getElementById("menu_item_0");
    menu_item_0.style.fontWeight = "900";
    menu_item_0.style.color = "white";

    var img_tile_0 = document.getElementById("div_tile_img_id_0");
    img_tile_0.focus();

    vid_toggle_mute(0); //unmute vid 0  
    toggle_all(true); //start playing all videos

    var new_vid = null;
    var msg_id;

    for (var idx = 0; idx <= 9; idx++) {
        var tile_name = "div_tile_img_id_" + idx;
        var div_tile_obj = document.getElementById(tile_name);
        g_tiles_left_pos[idx] = parseInt(div_tile_obj.style.left, 10);
        console.log("left_pos tile" + idx + ": " + g_tiles_left_pos[idx]);
    }

    $('html, body').on('touchstart touchmove', function(e) {
        //prevent native touch activity like scrolling
        e.preventDefault();
    });

    $("#menu_item_0, #menu_item_1, #menu_item_2, #menu_item_3, #menu_item_4, #menu_item_5").bind('touchstart mousedown', function(e) {
        var menu_id;
        switch (e.target.id) {
            case "menu_item_0":
                menu_id = 0;
                break;
            case "menu_item_1":
                menu_id = 1;
                break;
            case "menu_item_2":
                menu_id = 2;
                break;
            case "menu_item_3":
                menu_id = 3;
                break;
            case "menu_item_4":
                menu_id = 4;
                break;
            case "menu_item_5":
                menu_id = 5;
                break;
            default:
                break;
        }
        process_menu_items(menu_id);
    });

    $("#vol_0,#vol_1, #vol_2, #vol_3").bind('touchstart mousedown', function(e) {
        e.stopPropagation();
        console.log('vol ' + e.target.id);
        var vol_id = -1;
        switch (e.target.id) {
            case "vol_0":
                vol_id = 0;
                break;
            case "vol_1":
                vol_id = 1;
                break;
            case "vol_2":
                vol_id = 2;
                break;
            case "vol_3":
                vol_id = 3;
                break;
            default:
                break;
        }
        var vol_msg = {
            message: vol_id,
            name: 77, //'m'
            color: Event.video_events2
        };
        vid_toggle_mute(vol_id);
        send_msg(vol_msg);
    });

    $("#vid0_tile, #vid1_tile, #vid2_tile, #vid3_tile, #vid_area_tile").bind('touchstart mousedown', function(e) {
        console.log('vid ' + e.type);
        var ps4_tile_present = false;

        switch (e.target.id) {
            case "div_vid_tile_id_0":
                msg_id = 0;
                if (g_ps4_tile0 == true) {
                    ps4_tile_present = true;
                }
                break;
            case "div_vid_tile_id_1":
                msg_id = 1;
                if (g_ps4_tile1 == true) {
                    ps4_tile_present = true;
                }
                break;
            case "div_vid_tile_id_2":
                msg_id = 2;
                if (g_ps4_tile2 == true) {
                    ps4_tile_present = true;
                }
                break;
            case "div_vid_tile_id_3":
                msg_id = 3;
                if (g_ps4_tile3 == true) {
                    ps4_tile_present = true;
                }
                break;
            default:
                break;
        }

        if (ps4_tile_present == true) {
            tv_set.tv_4k_1.sendCmd("HDMI2");
            g_ps4_tv_input = true;
            console.log("set HDMI2 ");
        }

        if (g_ps4_tv_input != true) {
            var msg = {
                message: msg_id,
                name: 87, //'w'
                color: Event.stitch_split_8k
            };
            send_msg(msg);
        }

        if (ps4_tile_present == false) {
            if (g_ps4_tv_input == true) {
                tv_set.tv_4k_1.sendCmd("HDMI1");
                g_ps4_tv_input = false;
                console.log("set HDMI1 ");
            }
        }

        vid_toggle_mute(msg_id);

        if (g_video_full_screen_mode == false) {
            $("#vid_area_tile").css("display", "block");
            g_video_full_screen_mode = true;
        } else {
            $("#vid_area_tile").css("display", "none");
            g_video_full_screen_mode = false;
        }
    });

    var time_touch;
    var drag_start = false;
    $(".div_tile").bind({
        touchstart: function(e) {
            console.log('touchstart');
            time_touch = new Date();
        },

        touchend: function(e) {
            console.log('touchend');
            var time_diff = new Date() - time_touch;
            if (time_diff < 200) {
                if (drag_start == false) { //tile tap detected, set tile video to full screen
                    console.log('tap');
                    var tile_vid = 'videos/' + ((+(this.id.substring(16))) + (+20)) + '.mp4';
                    var msg = {
                        message: 87, //'w' - full screen code
                        name: new_vid, //new video source
                        color: Event.stitch_split_8k
                    };
                } else {
                    console.log('tap, drag start');
                }
            } else {
                console.log('swipe');
            }
        }
    });

    var g_val = 0;

    $(".div_tile").draggable({
        helper: "clone",
        revert: "invalid",
        zIndex: 1000,
        appendTo: "body",
        opacity: 0.5,
        start: function(event, ui) {
            console.log('draggable start');
            drag_start = true;
            new_vid = ((+(this.id.substring(16))) + (+g_tile_group * 10)) + '.mp4';
            console.log(new_vid);
            g_xpos = ui.position.left;
            g_ypos = ui.position.top;
        },
        stop: function(event, ui) {
            console.log('draggable end');
            drag_start = false;
            var xmove = ui.position.left - g_xpos;
            var ymove = ui.position.top - g_ypos;

            // define the moved direction: right, bottom (when positive), left, up (when negative)
            var xd = xmove >= 0 ? ' To right: ' : ' To left: ';
            var yd = ymove >= 0 ? ' Bottom: ' : ' Up: ';

            console.log('The DIV was moved,\n\n' + xd + xmove + ' pixels \n' + yd + ymove + ' pixels');

            //save last offset
            if (g_process_tile_move == true) {
                for (var idx = 0; idx <= 9; idx++) {
                    g_tiles_left_pos[idx] += xmove;
                    console.log("left_pos tile" + idx + ": " + g_tiles_left_pos[idx]);
                }
            }
            g_val = 0;
        },
        drag: function(event, ui) {
            var x_move = ui.position.left - g_xpos;
            var y_move = ui.position.top - g_ypos;

            g_val++;
            if (g_val >= 0 && (y_move > (-60))) {
                process_tile_move(x_move);
                g_val = 0;
                g_process_tile_move = true;
            } else {
                g_process_tile_move = false;
            }
        }
    });

    $("#vid0_tile").droppable({
        drop: function(event, ui) {
            var tile_id = (+(ui.draggable.attr("id").substring(16))) + (+g_tile_group * 10);
            g_ps4_tile0 = false;
            if (tile_id == 53) {
                g_ps4_tile0 = true;
                console.log("vid0_tile: ps4 tile present");
            }
            $(this).css("opacity", "1");
            $("#div_vid_tile_id_0").attr("src", "videos/stadium_tablet/270/" + new_vid);
            $("#div_vid_tile_id_0").get(0).play();
            var msg = {
                message: 0, //vid_tile
                name: new_vid, //new video source
                color: Event.dragdrop2
            };
            send_msg(msg);
            vid_toggle_mute(0);
        },
        over: function(event, ui) {
            $(this).css("opacity", "0.6");
        },
        out: function(event, ui) {
            $(this).css("opacity", "1");
        }
    });

    $("#vid1_tile").droppable({
        drop: function(event, ui) {
            var tile_id = (+(ui.draggable.attr("id").substring(16))) + (+g_tile_group * 10);
            g_ps4_tile1 = false;
            if (tile_id == 53) {
                g_ps4_tile1 = true;
                console.log("vid1_tile: ps4 tile present");
            }
            $(this).css("opacity", "1");
            $("#div_vid_tile_id_1").attr("src", "videos/stadium_tablet/270/" + new_vid);
            $("#div_vid_tile_id_1").get(0).play();
            var msg = {
                message: 1, //vid_tile
                name: new_vid, //new video source
                color: Event.dragdrop2
            };
            send_msg(msg);
            vid_toggle_mute(1);
        },
        over: function(event, ui) {
            $(this).css("opacity", "0.6");
        },
        out: function(event, ui) {
            $(this).css("opacity", "1");
        }
    });

    $("#vid2_tile").droppable({
        drop: function(event, ui) {
            var tile_id = (+(ui.draggable.attr("id").substring(16))) + (+g_tile_group * 10);
            g_ps4_tile2 = false;
            if (tile_id == 53) {
                g_ps4_tile2 = true;
                console.log("vid2_tile: ps4 tile present");
            }

            $(this).css("opacity", "1");
            $("#div_vid_tile_id_2").attr("src", "videos/stadium_tablet/270/" + new_vid);
            $("#div_vid_tile_id_2").get(0).play();
            var msg = {
                message: 2, //vid_tile
                name: new_vid, //new video source
                color: Event.dragdrop2
            };
            send_msg(msg);
            vid_toggle_mute(2);
        },
        over: function(event, ui) {
            $(this).css("opacity", "0.6");
        },
        out: function(event, ui) {
            $(this).css("opacity", "1");
        }
    });

    $("#vid3_tile").droppable({
        drop: function(event, ui) {
            var tile_id = (+(ui.draggable.attr("id").substring(16))) + (+g_tile_group * 10);
            g_ps4_tile3 = false;
            if (tile_id == 53) {
                g_ps4_tile3 = true;
                console.log("vid3_tile: ps4 tile present");
            }
            $(this).css("opacity", "1");
            $("#div_vid_tile_id_3").attr("src", "videos/stadium_tablet/270/" + new_vid);
            $("#div_vid_tile_id_3").get(0).play();
            var msg = {
                message: 3, //vid_tile
                name: new_vid, //new video source
                color: Event.dragdrop2
            };
            send_msg(msg);
            vid_toggle_mute(3);
        },
        over: function(event, ui) {
            $(this).css("opacity", "0.6");
        },
        out: function(event, ui) {
            $(this).css("opacity", "1");
        }
    });
}

function test_tv_http_control(cmd) {
    console.log("test Sony TV IP control");
    tv_set.tv_4k_1.sendCmd(cmd);
}

function process_tile_move(x_move) {
    var pos_left;
    for (var idx = 0; idx <= 9; idx++) {
        var tile_name = "div_tile_img_id_" + idx;
        var div_tile_obj = document.getElementById(tile_name);
        pos_left = g_tiles_left_pos[idx] + x_move;
        div_tile_obj.style.left = pos_left + 'px';
    }
}

function send_msg(msg) {
    console.log("send1:" + msg.message + " " + msg.name + " " + msg.color);
    try {
        socket.send(JSON.stringify(msg));
    } catch (err) {
        console.log("error sending websocket message:" + err.message);
    }
}

function vid_toggle_mute(x) {
    for (var idx = 0; idx < 4; idx++) {
        var vol_graphic_name = "vol_" + idx;
        var vid = findVideo(idx);
        var vol_graphic = document.getElementById(vol_graphic_name);
        if (idx == x) {

            if (vid.muted == true) { //one video has to stay unmuted option
                vid.muted = false; //unmute video
                vol_graphic.style.backgroundImage = "url(image/speaker_icon_on.png)";
            }
        } else {
            if (vid.muted == false) {
                vid.muted = true; //mute video 
                vol_graphic.style.backgroundImage = "url(image/speaker_icon_off.png)";
            }
        }
    }
}

function toggle_all(e) {
    for (var idx = 0; idx < 4; idx++) {
        var video = findVideo(idx);

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
    var menu_element = findVideo(x);
    menu_element.focus();
}

function monitor_video_keydown(x) {
    var next_video = x;

    remove_detail_pop_up();

    var msg = {
        message: x,
        name: window.event.keyCode,
        color: Event.video_events2
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
        var img_tile = findVideo(next_video);
        img_tile.focus();
    } else {
        var item_id = "menu_item_" + g_menu_item;
        var menu_item = document.getElementById(item_id);
        menu_item.focus();
    }
    g_video_item = x;
}

function switch_video(x) {
    var vid_name_src = "div_vid_tile_src_id_" + x;

    var video = findVideo(x);
    var video_0 = findVideo(0);

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
    var video = findVideo(x);

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
        var video_tile = findVideo(g_video_item);
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
    var tile_group_1 = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19]; //sports 
    var tile_group_2 = [20, 21, 22, 23, 24, 25, 26, 27, 28, 29]; //stats
    var tile_group_3 = [30, 31, 32, 33, 34, 35, 36, 37, 38, 39]; //stadium
    var tile_group_4 = [40, 41, 42, 43, 44, 45, 46, 47, 48, 49]; //4K
    var tile_group_5 = [50, 51, 52, 53, 54, 55, 56, 57, 58, 59]; //Games

    switch (menu_item) {
        case 0:
            tile_group = tile_group_0; //watch now
            g_tile_group = 0;
            break;
        case 1:
            tile_group = tile_group_1; //sports
            g_tile_group = 1;
            break;
        case 2:
            tile_group = tile_group_2; //stats
            g_tile_group = 2;
            break;
        case 3:
            tile_group = tile_group_3; //stadium
            g_tile_group = 3;
            break;
        case 4:
            tile_group = tile_group_4; //4K
            g_tile_group = 4;
            break;
        case 5:
            tile_group = tile_group_5; //Games
            g_tile_group = 5;
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
    for (var idx = 0; idx < 6; idx++) {
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