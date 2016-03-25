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
var newVid = null;

var tv_set = {};
tv_set.tv_4k_1 = SonyTV('http://192.168.1.28/sony/IRCC');

var tileGroup0 =[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; 		  //watch now
var tileGroup1 =[10, 11, 12, 13, 14, 15, 16, 17, 18, 19]; //sports 
var tileGroup2 =[20, 21, 22, 23, 24, 25, 26, 27, 28, 29]; //stats
var tileGroup3 =[30, 31, 32, 33, 34, 35, 36, 37, 38, 39]; //stadium
var tileGroup4 =[40, 41, 42, 43, 44, 45, 46, 47, 48, 49]; //4K
var tileGroup5 =[50, 51, 52, 53, 54, 55, 56, 57, 58, 59]; //Games

$(document).ready(() => {
    main();
    init();
});

function init() {
    attachToSocket();
    mapPageKeyPresses();
    attachToControls();

	var menuItem0 = $("#menu_item_0").css("fontWeight", "900").css("color", "white");
	setFocus($("#div_tile_img_id_0"));

	vid_toggle_mute(0); //unmute vid 0  
	toggle_all(true); //start playing all videos

	for (var idx = 0; idx <= 9; idx++) {
		var div_tile_obj = $("#div_tile_img_id_" + idx);
		g_tiles_left_pos[idx] = parseInt(div_tile_obj.css("left"), 10);
	}

	$('html, body').on('touchstart touchmove', function(e) {
		//prevent native touch activity like scrolling
		e.preventDefault();
	});

	$("#menu_item_0, #menu_item_1, #menu_item_2, #menu_item_3, #menu_item_4, #menu_item_5").bind('touchstart mousedown', function(e) {
		process_menu_items($(this));
	});

	$("#vol_0,#vol_1, #vol_2, #vol_3").bind('touchstart mousedown', function(e) {
		e.stopPropagation();
		var vol_id = Number(this.id.replace("vol_",""));
		var vol_msg = {
			message: vol_id,
			name: KeyCode.ToggleMute,
			action: Event.video_events2
		};
		vid_toggle_mute(vol_id);
		send_msg(vol_msg);
	});

	$("#vid0_tile, #vid1_tile, #vid2_tile, #vid3_tile, #vid_area_tile").bind('touchstart mousedown', function(e) {
		var ps4_tile_present = false;
		var msgId = Number(this.id.replace("div_vid_tile_id_",""));

		switch (msgId) {
			case 0: ps4_tile_present = g_ps4_tile0 == true; break;
			case 1: ps4_tile_present = g_ps4_tile1 == true; break;
			case 2: ps4_tile_present = g_ps4_tile2 == true; break;
			case 3: ps4_tile_present = g_ps4_tile3 == true; break;
		}

		if (ps4_tile_present == true) {
			tv_set.tv_4k_1.sendCmd("HDMI2");
			g_ps4_tv_input = true;
			console.log("set HDMI2 ");
		}

		if (g_ps4_tv_input != true) {
			var msg = {
				message: msgId,
				name: KeyCode.StitchVideo,
				action: Event.stitch_split_8k
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

		vid_toggle_mute(msgId);

		if (g_video_full_screen_mode == false) {
			$("#vid_area_tile").css("display", "block");
			g_video_full_screen_mode = true;
		} else {
			$("#vid_area_tile").css("display", "none");
			g_video_full_screen_mode = false;
		}
	});

	var timeTouch;
	var dragStart = false;
	$(".div_tile").bind({
		touchstart: function(e) {
			console.log('touchstart');
			timeTouch = new Date();
		},

		touchend: function(e) {
			console.log('touchend');
			var time_diff = new Date() - timeTouch;
			if (time_diff < 200) {
				if (dragStart == false) { //tile tap detected, set tile video to full screen
					console.log('tap');
				} else {
					console.log('tap, drag start');
				}
			} else {
				console.log('swipe');
			}
		}
	});

	var gVal = 0;

	$(".div_tile").draggable({
		helper: "clone",
		revert: "invalid",
		zIndex: 1000,
		appendTo: "body",
		opacity: 0.5,
		start: function(event, ui) {
			console.log('draggable start');
			dragStart = true;
			// uh this seems weak....  Should just pull the name from the end marker
			newVid = ((+(this.id.substring(16))) + (+g_tile_group * 10)) + '.mp4';
			console.log(newVid);
			g_xpos = ui.position.left;
			g_ypos = ui.position.top;
		},
		stop: function(event, ui) {
			console.log('draggable end');
			dragStart = false;
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
			gVal = 0;
		},
		drag: function(event, ui) {
			var x_move = ui.position.left - g_xpos;
			var y_move = ui.position.top - g_ypos;

			gVal++;
			if (gVal >= 0 && (y_move > (-60))) {
				process_tile_move(x_move);
				gVal = 0;
				g_process_tile_move = true;
			} else {
				g_process_tile_move = false;
			}
		}
	});

    attachDroppable("0");
    attachDroppable("1");
    attachDroppable("2");
    attachDroppable("3");
}

function mapPageKeyPresses() {
    var pagekeymap;	// Initialized with the list of keypresses that occur across the page 
    // in general and associates with their handler

    pagekeymap = [
		{ key: KeyCode.ToggleFullScreen, func: toggleFullScreen },
		{ key: KeyCode.ReloadPage, func: () => { location.reload(); } },
		{ key: KeyCode.PlayVideos, func: playVideos },
		{ key: KeyCode.ChangeToHDMI1, func: test_tv_http_control, arg: "HDMI1" },
		{ key: KeyCode.ChangeToHDMI2, func: test_tv_http_control, arg: "HDMI2" },
		{ key: KeyCode.ChangeToHDMI3, func: test_tv_http_control, arg: "HDMI3" },
		{ key: KeyCode.ChangeToHDMI4, func: test_tv_http_control, arg: "HDMI4" },
		{ key: KeyCode.MuteAudios, func: muteAudios }
    ];

    mapKeyPresses($(document), pagekeymap);
}

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
		'		z-index:1000;">' +
		'</div>'
	);
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
		case Event.BroadcastServerStatus:
			for(var idx in msg.videos){
				var item = msg.videos[idx];
				var video = findVideo(item);
				if(video) { // Did we find a video?
					
					// Get the old and new name
					var	newVideo = "{1}videos/stadium_tablet/270/{0}.mp4".format(item.videoName, getSiteRoot());
					var src = getVideoSource(video);
					
					// if the names are different we need to change the video
					if(src !== newVideo) {
						console.log("New Video: " + item.videoName + "  Curr Video: " + src);
						video.src = newVideo;
					}

					// If the paused states are different we need to get these in synchronized
					if(video.paused != item.isPaused)
						if(item.isPaused)
							video.pause();
						else
							video.play();
						
					var ct = video.currentTime;
					var diff = Math.abs(ct-item.videoPosition);
					if(diff >= .5)
						video.currentTime = item.videoPosition;
				}
			}
			break;
	}
}

function playVideos() {
	for (var idx = 0; idx < 4; idx++) {
		var video = findVideo(idx);
		video.play();
	}
}

function muteAudios(){
	for (var idx = 0; idx < 4; idx++) {
		var vid = findVideo(idx);
		vid.muted = true; //mute video 
	}
}

function attachToSocket() {
    console.log("websocket server IP:" + websocket_server_ip);
    socket = new WebSocket('ws://' + websocket_server_ip + ':9000/');
    socket.addEventListener("message", onMessage, false);
}

function attachDroppable(id) {
    var controlName = "#vid" + id + "_tile";
    var divtileId = "#div_vid_tile_id_" + id;

	$(controlName).droppable({
	    drop: function(event, ui) {
			var tileId = (+(ui.draggable.attr("id").substring(16))) +(+g_tile_group * 10);
			g_ps4_tile0 = false;

            if (tileId == 53) {
				g_ps4_tile0 = true;
				console.log("vid0_tile: ps4 tile present");
			}

			$(this).css("opacity", "1");
			$(divtileId).attr("src", "videos/stadium_tablet/270/" +newVid);
			$(divtileId).get(0).play();

			var msg = {
	            message: id, //vid_tile
			    name : newVid, //new video source
			    action : Event.dragdrop2
			};
            send_msg(msg);
			vid_toggle_mute(0);
		},
		over : function(event, ui) {
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

function show_description(x) {
    var tileName = "#div_tile_img_id_" + x;
	var control = $(tileName);
	setFocus(control);
}

function process_video_items(control) {
	setFocus(control);
}

// I need to determine if the USER caused this so we can ignore it otherwise
function changedPosition(v){
	var video = v[0];
	var videoTile = video.id.replace(VIDEO_BASE_TAG, "");
	var srcitems = video.src.split("/");
	
	var msg = {
		videoTile: videoTile,
		videoPosition: video.currentTime,
		videoName: srcitems[srcitems.length-1].replace(".mp4",""),
		isPaused: video.paused,
		action: Event.VideoPositionChange
	};
	
	send_msg(msg);
}

function monitor_video_keydown(control) {
	var x = control.attr("data-panelNumber");

	var next_video = x;

	var msg = {
		message: x,
		name: window.event.keyCode,
		action: Event.video_events2
	};
	send_msg(msg);

	switch (getKeyValue()) {
		case KeyCode.ToggleAllPause:  	toggle_all(true); break;
		case KeyCode.ToggleMute: 		vid_toggle_mute(x); break;
		case KeyCode.TogglePause: 		play_pause(x); break;
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
			next_video = ((x == 0) || (x == 1)) ? x + 2 : 100; //go to menu items
			break;
	}
	if (next_video != 100) {
		var control = findVideo(next_video);
		setFocus(control);
	} else {
		var item_id = "menu_item_" + g_menu_item;
		var control = document.getElementById(item_id);
		setFocus(control);
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

function monitor_menu_keydown(control) {
	var x = Number(control.attr("data-panelNumber"));
	var next_item = x;

	switch (getKeyValue()) {
		case KeyCode.Left:
			next_item = (x > 0) ? x - 1 : x;
			break;
		case KeyCode.Up: 
			next_item = 200;
			break;
		case KeyCode.Right: 
			next_item = (x < 5) ? x + 1 : x;
			break;
		case KeyCode.Down: 
			next_item = 100; //move down to image tiles
			break;
	}

	if (next_item == 100) { //move down to image tiles
		var tile_name = "div_tile_img_id_0";
		var control = document.getElementById(tile_name);
		setFocus(control);
	} else if (next_item == 200) { //move up to video tiles
		var control = findVideo(g_video_item);
		setFocus(control);
	} else {
		var item_id = "menu_item_" + next_item;
		var menu_item = document.getElementById(item_id);
		process_menu_items($(menu_item));
	}

	g_menu_item = x;
}

function process_menu_items(control) {
	setFocus(control);
	
	var menu_item = Number(control.attr("data-panelNumber"));
	change_menu_item_highlight(menu_item);
	update_tiles(menu_item);
}

function update_tiles(menuItem) {
	
	var tileGroup = null;

	switch (menuItem) {
		case 0:
			tileGroup = tileGroup0; //watch now
			g_tile_group = 0;
			break;
		case 1:
			tileGroup = tileGroup1; //sports
			g_tile_group = 1;
			break;
		case 2:
			tileGroup = tileGroup2; //stats
			g_tile_group = 2;
			break;
		case 3:
			tileGroup = tileGroup3; //stadium
			g_tile_group = 3;
			break;
		case 4:
			tileGroup = tileGroup4; //4K
			g_tile_group = 4;
			break;
		case 5:
			tileGroup = tileGroup5; //Games
			g_tile_group = 5;
			break;
	}

    if (!tileGroup)
        return ;

    // All this is doing is changing aroung the URLS for the current videos in the little tiles
	for (var idx = 0; idx < tileGroup.length; idx++) {
		var r = tileGroup[idx];
		var tileName = "div_tile_img_id_" + idx;
		var imgTile = document.getElementById(tileName);
		var imgName = "./image/" + r + ".jpg";
		imgTile.style.backgroundImage = "url(" + imgName + ")";
	}
}

function change_menu_item_highlight(x) {
	$('.menuitem').css("font-weight", "600").css("color", "#B7B7B7");
	$("#menu_item_" + x).css("font-weight", "900").css("color", "white");
}

function getMenuElementId(msg) {
	var value =  MENU_BASE_TAG+getId(msg);
	return value;
}

function findMenu(msg){
	if(isJqueryItem(msg))
		return msg;
	var search = "#" + getMenuElementId(msg);
	var value = $(search);
	return (value.length) ? $(value[0]): null;
}

function monitor_tile_key_down(x) {
	var nextTile = x;

	switch (getKeyValue()) {
		case KeyCode.Left:
			nextTile = (x > 0) ? x - 1 : x;
			break;
		case KeyCode.Up:
			nextTile = 100; //go to menu items
			break;
		case KeyCode.Right:
			nextTile = (x < 9) ? x + 1: x;
		    break;
		case KeyCode.Down:
			nextTile = x;
			break;
	}

	if (nextTile !== 100) {
		var control = $("#div_tile_img_id_" + nextTile);
		setFocus(control);
	} else {
		var control = $("#menu_item_" + g_menu_item);
		setFocus(control);
	}
	
	g_tile_item = x;
}
