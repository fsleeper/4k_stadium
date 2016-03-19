var g_video_item = 0;
var g_menu_item = 0;
var g_tile_item = 0;
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
    socket = new WebSocket('ws://localhost:9000/');
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
                for (var idx = 0; idx < 6; idx++) {
                    var video = findVideo(idx);
                    video.play();
                }
                break;
            case 66: //'b' - Change divider
                location.reload();
                break;
        }
    }, false);

    var img_tile_0 = document.getElementById("div_vid_tile_id_0");
    img_tile_0.focus();

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
        case 0:
            divider_name = "image/FrameDividerBlack_4KView.png";
            break;
        case 1:
            divider_name = "image/FrameDividerGold_4KView.png";
            break;
        case 2:
            divider_name = "image/FrameDividerRed_4KView.png";
            break;
        case 3:
            divider_name = "image/FrameDividerGray_4KView.png";
            break;
        case 4:
            divider_name = "image/FrameDivider_4KView.png";
            break;
        default:
            break;
    }

    divider_item.style.backgroundImage = "url(" + divider_name + ")";
    divider_counter++;

    if (divider_counter >= 5) {
        divider_counter = 0;
    }
}

function draw_video_test() {
    var vid_tile = document.getElementById("div_vid_tile_id_0");

    if (vid_tile.paused || vid_tile.ended) {
        return false;
    }

    var vid_canvas_obj = document.getElementById("vid_canvas");
    var ctx = vid_canvas_obj.getContext("2d");

    ctx.scale(1, 1);

    var x, y;

    var rect_div = document.getElementById("rectangle_div");
    rect_div.setAttribute("display", "block");

    $("#id_vid0, #rectangle_div").mousemove(function(e) {
        if (vid_tile.paused || vid_tile.ended) {
            return false;
        }

        x = e.pageX;
        y = e.pageY;

        console.log(x + ":: " + y);
        var rec_x = x;
        var rec_y = y;

        rect_div.style.left = rec_x + 'px';
        rect_div.style.top = rec_y + 'px';
        x = x * 2;
        y = y * 2;
        console.log(x + " *2 " + y);
    });


    var i = window.setInterval(function() {
        if (vid_tile.paused || vid_tile.ended) {
            return false;
        }

        ctx.drawImage(vid_tile, x, y, 1920, 1080, 0, 0, 1920, 1080);
    }, 1000 / 30);
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
	
    console.log("tv receive:{0} {1} {2}".format(msg.message, msg.name, msg.color));

    switch (msg.color) {
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
            console.log("recvd: " + msg.name);
            g_current_time = msg.name;
            break;
    }
	
    var type = msg.type; //general message type
    var umsg = msg.message; //vid tile
    var uname = msg.name; //key
    var ucolor = msg.color; //type

    console.log("tv receive:" + umsg + " " + uname + " " + ucolor);
    if (ucolor == Event.video_events) {
        monitor_video_message(umsg, uname);
    } else if (ucolor == Event.dragdrop) {
        monitor_touch_message(msg);
    } else if (ucolor == Event.stitch_events) {
        var x = umsg;
        var y = uname;
        draw_video(x, y);
    } else if (ucolor == Event.stitch_split_8k) {
        monitor_video_message(6, uname);
    } else if (ucolor == Event.seek_time) {
        console.log("recvd: " + uname);
        g_current_time = uname;
        var vid_tile = document.getElementById("div_vid_tile_id_0");
        vid_tile.currentTime = uname;
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

function toggleFullScreen() {
    if (!document.fullscreenElement && // alternative standard method
        !document.mozFullScreenElement &&
        !document.webkitFullscreenElement) { // current working methods
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

    if ((x % 2) == 0) {
        image = 'footer_01.jpg';
    } else {
        image = 'footer_02.jpg';
    }

    description_HTML = '<img id="footer_img" src="./image/' + image + '" alt="description" />'
    document.getElementById("footer").innerHTML = description_HTML;
    document.getElementById("footer").style.display = "block";
}

function process_video_items(x) {
    var item_id = "div_vid_tile_id_" + x;
    var menu_element = document.getElementById(item_id);
    menu_element.focus();
    g_video_item = x;
}

function monitor_video_message(x, key) {
    var next_video = x;

    g_video_item = x;

    switch (key) {
        case 73: // 'i'
            break;
        case 65: //'a'
            toggle_all(true);
            break;
        case 77: //'m'
            vid_toggle_mute(x);
            break;
        case 87: // 'w'
            if (g_video_full_screen_mode == false) {
                toggle_full_screen_video(x, g_video_full_screen_mode);
            } else {
                toggle_full_screen_video(g_vid_full_screen, g_video_full_screen_mode);
            }
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
            if ((x == 2) || (x == 4) || (x == 5)) {
                next_video = x - 1;
            } else {
                next_video = x;
            }
            break;
        case 38: //'up'
            if ((x == 0) || (x == 1)) {
                next_video = x - 1;
            } else if (x == 5) {
                next_video = 0;
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
                next_video = x;
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
}

function monitor_video_keydown(x) {
    var next_video = x;

    g_video_item = x;

    remove_detail_pop_up();

    switch (window.event.keyCode) {
        case 73: // 'i'
            break;
        case 65: //'a'
            toggle_all(true);
            break;
        case 77: //'m'
            vid_toggle_mute(x);
            break;
        case 87: // 'w'
            if (g_video_full_screen_mode == false) {
                toggle_full_screen_video(x, g_video_full_screen_mode);
            } else {
                toggle_full_screen_video(g_vid_full_screen, g_video_full_screen_mode);
            }
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
                next_video = x;
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
        case 3:
            tile_group = tile_group_3; //netflix
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
    for (var idx = 0; idx < 5; idx++) {
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