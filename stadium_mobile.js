var g_video_item = 0;
var g_menu_item = 0;
var g_tile_item = 0;
var g_video_full_screen_mode = false;
var socket = null;
var g_vid_full_screen = 0;
var local_ip = '192.168.10.200';
//var local_ip 				 = '192.168.1.31';
var items_source_list = [0, 0, 0, 0, 0];

var text_desc = [
    ["Chargers Vs. 49ers", "ChargersVs49ers detail info", "0.mp3"], //  0
    ["Family Feud", "FamilyFeud detail info", "1.mp3"], //  1                        
    ["Curious George", "CuriousGeorge detail info", "2.mp3"], //  2
    ["Chicago Fire", "Chicagofire detail info", "3.mp3"], //  3
    ["Jeopardy", "Jeopardy detail info", "4.mp3"], //  4
    ["Today", "Today detail info", "5.mp3"], //  5
    ["San Diego Living", "SanDiegoLiving detail info", "6.mp3"], //  6
    ["Late Show With David Letterman", "LateShowWithDavidLetterman detail info", "7.mp3"], //  7
    ["The Price is Right", "ThePriceIsRight detail info", "8.mp3"], //  8
    ["The Talk", "TheTalk detail info", "9.mp3"], //  9
    ["Volleyball", "Volleyball detail info", "10.mp3"], // 10
    ["Rowing", "Rowing detail info", "11.mp3"], // 11
    ["Waterpolo", "Waterpolo detail info", "12.mp3"], // 12
    ["Chargers Vs. 49ers", "ChargersVs49ers detail info", "13.mp3"], // 13
    ["Bengals Vs. Steelers", "BengalsVsSteelers detail info", "14.mp3"], // 14
    ["College Basketball", "CollegeBasketball detail info", "15.mp3"], // 15
    ["Packers Vs. Cowboys", "PackersVsCowboys detail info", "16.mp3"], // 16
    ["The NFL Today", "TheNFLToday detail info", "17.mp3"], // 17
    ["Army Vs. Navy", "ArmyVsNavy detail info", "18.mp3"] // 18
]

$(document).ready(() => {
        init();
    )
};

function init() {
    socket = new WebSocket('ws://' + local_ip + ':9000/');
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
        }
    }, false);

    //0,4,5,6
    aud_toggle_source(1, 0);
    aud_toggle_source(2, 4);
    aud_toggle_source(3, 5);
    aud_toggle_source(4, 6);
    vid_toggle_mute(1);
    switch_stream(1);

    $(".prog_tile").bind('touchstart mousedown', function(e) {
        e.stopPropagation();
        console.log(e.target.id);
        var vol_id = -1;
        switch (e.target.id) {
            case "prog0_tile":
                vol_id = 0;
                break;
            case "prog1_tile":
                vol_id = 1;
                break;
            case "prog2_tile":
                vol_id = 2;
                break;
            case "prog3_tile":
                vol_id = 3;
                break;
            case "prog4_tile":
                vol_id = 4;
                break;
            default:
                break;
        }
        if (vol_id != 0) { //skip first tile, which is radio for now
            vid_toggle_mute(vol_id);
            switch_stream(vol_id);
        }
    });
}

function aud_toggle_source(text_id, aud_id) {
    document.getElementById("info_text_" + text_id).innerHTML = text_desc[aud_id][0];
    items_source_list[text_id] = text_desc[aud_id][2];
    document.getElementById("div_vid_tile_id_0").play();
    console.log(text_desc[0][0] + " " + text_desc[0][1] + " " + text_desc[0][2]);
}

function switch_stream(x) {
    var video_item = document.getElementById("div_vid_tile_id_0");
    if (x > 0 && x < text_desc.length) {
        var video_src = "http://" + local_ip + "/4K_stadium/audio/" + items_source_list[x];
        video_item.setAttribute("src", video_src);
        video_item.play();
        console.log(text_desc.length);
    } else {
        console.log("index exceeded array values");
    }
}

function vid_toggle_mute(x) {
    for (var idx = 1; idx < 5; idx++) {
        var vol_graphic_name = "vol_" + idx;
        var text_name = "info_text_" + idx;
        var text_item = document.getElementById(text_name);
        var vol_graphic = document.getElementById(vol_graphic_name);
        if (idx == x) {
            vol_graphic.style.backgroundImage = "url(image/phoneapp_soundon.png)";
            text_item.style.fontWeight = "900";
            text_item.style.color = "orange";
        } else {
            vol_graphic.style.backgroundImage = "url(image/phoneapp_soundoff.png)";
            text_item.style.fontWeight = "600";
            text_item.style.color = "white";
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

function onMessage(evt) {
    var msg = JSON.parse(evt.data); //PHP sends Json data
    var type = msg.type; //message type
    var umsg = msg.message; //vid tile
    var uname = msg.name; //key
    var ucolor = msg.color; //color

    console.log("tv receive:" + umsg + " " + uname);
    if (ucolor == Event.video_events2) {} else if (ucolor == Event.dragdrop2) {
        monitor_touch_message(msg);
    }
}

function monitor_touch_message(msg) {
    var type = msg.type; //message type
    var vid_tile = msg.message; //vid tile
    var vid_src = msg.name; //new vid source
    console.log("vid_tile: " + vid_tile + " parseInt: " + parseInt(vid_src, 10) + " vid_src: " + vid_src);
    aud_toggle_source(vid_tile + 1, parseInt(vid_src, 10));
    vid_toggle_mute(vid_tile + 1);
    switch_stream(vid_tile + 1);
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

function toggle_full_screen_video(x, fs_mode) {
    var vid_id_name = "id_vid" + x;
    var vid_class_name = "vid" + x;
    var classlist = document.getElementById(vid_id_name).classList;
    var vid_name = "div_vid_tile_id_" + x;
    var video = document.getElementById(vid_name);

    if (fs_mode == false) {
        console.log('fs: true');
        toggle_all(false); //pause
        g_video_full_screen_mode = true;
        g_vid_full_screen = x;
        document.getElementById(vid_id_name).classList.remove(vid_class_name);
        document.getElementById(vid_id_name).classList.add("full_screen");
        vid_toggle_mute(x);
        video.play();
    } else {
        console.log('fs: false');
        g_video_full_screen_mode = false;
        document.getElementById(vid_id_name).classList.remove("full_screen");
        document.getElementById(vid_id_name).classList.add(vid_class_name);
        toggle_all(true);
    }
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