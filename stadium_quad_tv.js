
// Event and KeyCode are initialized from common.js once we know the page/scripts are loaded
var Event;
var KeyCode;

var g_video_item = 0;
var g_menu_item = 0;
var g_tile_item = 0;
var g_video_full_screen_mode = false;
var socket = null;
var g_vid_full_screen = 0;
var g_current_time = 0;
var divider_counter = 0;
var pagekeymap;							// Initialized with the list of keypresses that occur across the page in general and associates with their handler

function playVideos() {
	for (var idx = 0; idx < 4; idx++) {
		var video = findVideo(idx);
		video.play();
	}
}

function findMap(map, code) { 
	return map.key === code;
}

function init() {
	pagekeymap = [
		{key:KeyCode.ToggleFullScreen, 	func:toggleFullScreen},
		{key:KeyCode.ReloadPage, 		func:() => { location.reload(); }},
		{key:KeyCode.PlayVideos, 		func:playVideos},
		{key:KeyCode.ChangeDivider,		func:change_divider}
	];

    socket = new WebSocket('ws://' + websocket_server_ip + ':9000/');
    console.log("websocket server IP:" + websocket_server_ip);

    socket.addEventListener("message", onMessage, false);

	$(document).keydown((e) => {
		// Figure out what the keypress was
		var keyValue = getKeyValue(e);
		// Find the function mapped to the keypress
		var map = pagekeymap.find((e,i,a) => findMap(e, keyValue));
		if(map)
			// Call the function
			map.func(map.arg);
	});

    var img_tile_0 = findVideo("0");
    img_tile_0.focus();

    $('.video_tile').on("play", function(event) {
        send_videoStatus(event);
    });

    vid_toggle_mute(0); //unmute vid 0  
    toggle_all(true); //start playing all videos

    window.setInterval(send_AllVideoStatus, 1000);
}

// ******************************************************************
// FUNCTION:	send_videoStatus()
// DESCRIPTION:	Identifies the current videos and sends out messages
//				with the identification of the current video and the
//				current position within the video
// ******************************************************************
function send_videoStatus() {
    // Find the current videos
    var tiles = $('.vid_tiles:visible').find('.video_tile');

    // For each video found, send the name and current position of each video
    for (var idx = 0; idx < tiles.length; idx++) {
        var video = tiles[idx];
        var videoTile = video.id.replace(VIDEO_BASE_TAG, "");
        console.log("videoCurrentTime: " + video.currentTime + "  Name:" + videoTile);
		var srcitems = video.src.split("/");
		
        var msg = {
            message: videoTile,
            videoPosition: video.currentTime,
			videoName: srcitems[srcitems.length-1].replace(".mp4",""),
            color: Event.seek_time
        };
        send_msg(msg);
    }
}

function send_AllVideoStatus() {
    // Find the current videos
    var tiles = $('.vid_tiles:visible').find('.video_tile');

	var msg = {
		action: Event.BroadcastServerStatus,
		color: Event.BroadcastServerStatus,	// legacy name (lame)
		videos: []
	};

    // For each video found, send the name and current position of each video
    for (var idx = 0; idx < tiles.length; idx++) {
        var video = tiles[idx];
        var videoTile = video.id.replace(VIDEO_BASE_TAG, "");
        console.log("videoCurrentTime: " + video.currentTime + "  Name:" + videoTile);
		var srcitems = video.src.split("/");
		
        var videoInfo = {
            message: videoTile,
            videoPosition: video.currentTime,
			videoName: srcitems[srcitems.length-1].replace(".mp4",""),
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

function send_msg(msg) {
    var strmsg = JSON.stringify(msg);
    console.log("send1:" + strmsg);
    socket.send(strmsg);
}

function onMessage(evt) {
    var msg = JSON.parse(evt.data); //PHP sends Json data

	if(msg === null)
		return;
	
    console.log("tv receive:{0} {1} {2}".format(msg.message, msg.name, msg.color));

    switch (msg.color) {
        case Event.video_events2: monitor_video_message(msg.message, msg.name); break;
        case Event.dragdrop2: monitor_touch_message(msg); break;
        case Event.stitch_split_8k: monitor_video_message(4, msg.name); break;
        case Event.seek_time:
            console.log("recvd: " + msg.name);
            g_current_time = msg.name;
            break;
    }
}

function monitor_touch_message(msg) {
    var video = findVideo(msg);;

    video.pause();
    video.src = "videos/stadium_tv/720/" + msg.name;
    vid_toggle_mute(msg.message);
    video.play();
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
    var tile_name;

    tile_name = "div_tile_img_id_" + x;

    var img_tile = document.getElementById(tile_name);
    img_tile.focus();

    var image = ((x % 2) == 0) ? 'footer_01.jpg' : 'footer_02.jpg';

    description_HTML = '<img id="footer_img" src="./image/' + image + '" alt="description" />'
    document.getElementById("footer").innerHTML = description_HTML;
    document.getElementById("footer").style.display = "block";
}

function process_video_items(x) {
    var menu_element = findVideo(x);
    menu_element.focus();
    g_video_item = x;
}

function monitor_video_message(x, key) {
    var next_video = x;

    g_video_item = x;

    switch (key) {
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
            next_video = ((x == 1) || (x == 3)) ? x - 1 : x;
            break;
        case 38: //'up'
            next_video = ((x < 2)) ? x : x - 2;
            break;
        case 39: //'right'
            next_video = ((x == 0) || (x == 2)) ? x + 1 : x;
            break;
        case 40: //'down'
            next_video = ((x == 0) || (x == 1)) ? x + 2 : x;
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
}

function monitor_video_keydown(x) {
    var next_video = x;

    g_video_item = x;

    remove_detail_pop_up();

    switch (window.event.keyCode) {
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
            next_video = ((x == 1) || (x == 3)) ? x - 1 : x;
            break;
        case 38: //'up'
            next_video = ((x < 2)) ? x : x - 2;
            break;
        case 39: //'right'
            next_video = ((x == 0) || (x == 2)) ? x + 1 : x;
            break;
        case 40: //'down'
            next_video = ((x == 0) || (x == 1)) ? x + 2 : x;
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
    var video_src = video_tile.getAttribute("src");
    console.log("video full screen src orig:" + video_src);
    console.log("video src_full_screen:" + video_src.substring(str_trim));

    var vid_src = video_src.substring(str_trim);
    video.src = "videos/stadium_tv/4K/" + vid_src;
    console.log("full screen video source: " + video.src);
}

function switch_video(x) {
    var vid_name_src = "div_vid_tile_src_id_" + x;

    var video = findVideo(x);
    var video_0 = findVideo("0");

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
        case 37: //'left'
            next_item = (x > 0) ? x - 1 : x;
            break;
        case 38: //'up'
            next_item = 200;
            break;
        case 39: //'right'
            next_item = (x < 4) ? x + 1 : x;
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
            next_tile = (x > 0) ? x - 1 : x;
            break;
        case 38: //'up'
            next_tile = 100; //go to menu items
            break;
        case 39: //'right'
            next_tile = (x < 9) ? x + 1 : x;
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
        case 0: image_name = 'details_0.jpg'; break;
        case 1: image_name = 'details_1.jpg'; break;
        case 2: image_name = 'details_2.jpg'; break;
        case 9: image_name = 'details_9.jpg'; break;
    }

    detail_HTML = '<div class="preview_temp_load"><img id="details_img" src="./image/' + image_name + '" border="0"></div>';
    document.getElementById("preview_div").innerHTML = detail_HTML;
    document.getElementById("preview_div").style.display = "block";
}

function show_full_screen_video(x, fs_mode) {
    var new_video;
    switch (x) {
        case 0: new_video = "wildalaska"; break;
        case 1: new_video = "dexter"; break;
        case 9: new_video = "walkingdead"; break;
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

$(document).ready(() => {
	Event = CommonEvent;
	KeyCode = CommonKeyCode;

    init();
});
