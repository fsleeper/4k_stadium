
var VIDEO_BASE_TAG = "div_vid_tile_id_";
var MENU_BASE_TAG = "menu_item_";
var clientId = null;


function getClientId() {
    if(clientId == null)
        clientId = "id" + (new Date()).getTime();
    return clientId;
}

function send_msg(msg) {
    if (msg.clientId == null)
        msg.clientId = getClientId();
    var strmsg = JSON.stringify(msg);

    console.log("Send:", strmsg);

    try {
        socket.send(JSON.stringify(msg));
    } catch (err) {
        console.log("error sending websocket message:" + err.message);
    }
}

String.prototype.format = function() {
    var formatted = this;
    for( var arg in arguments ) {
        formatted = formatted.replace("{" + arg + "}", arguments[arg]);
    }
    return formatted;
}

function getSiteRoot(){
	if(isRunningFromServer)
		return "";
		
    var rootPath = window.location.protocol + "//" + window.location.host + "/";
	
	var path = window.location.pathname;
	
	// ok, now rip off everything from the last / down
	var pos = path.lastIndexOf("/");
	path = path.substring(1, pos);
	rootPath = rootPath + path + "/";

    return rootPath;
}

function getId(msg) {
	var value = null;
	if(msg != null){
		if(msg.videoTile != null)
			value = msg.videoTile;
		else if (msg.message != null)
			value = msg.message;
		else
			value = msg;
	}
	return value;
}

function getVideoElementId(msg) {
	var value =  VIDEO_BASE_TAG+getId(msg);
	return value;
}


function isJqueryItem(control){
	return control.context != null;
}

function jqueryItem(control){
	return isJqueryItem(control)? control : $(control);
	
}
function setFocus(item){
	var jitem = jqueryItem(item);
	var isFocused = jitem.hasClass( "focus" );
	if(!isFocused) {
        $(".focus").removeClass("focus");
	    jitem.addClass("focus");
		jitem.focus();
	}
}

function findVideo(msg){
	if(isJqueryItem(msg))
		return msg[0];
	var search = "#" + getVideoElementId(msg);
	var value = $(search);
	return (value.length) ? value[0]: null;
}

function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

// send the event if possible so it can determine what the event type is
// or send just the code itself
function getKeyCode(sourceCode){
	var unicode = sourceCode;

	// figure out what type of object was passed
    var evtobj=window.event? event : e; //distinguish between IE's explicit event object (window.event) and Firefox's implicit.

	// OK, so it's POSSIBLY the event, let's see...
	if(evtobj.charCode != null || evtobj.keyCode != null)
		// well it was an event so get the code from the event
		unicode=evtobj.charCode? evtobj.charCode : evtobj.keyCode;

	return unicode;
}

// send the event if possible so it can determine what the event type is
// or send just the code itself
function getKeyValue(sourceCode){
	if(sourceCode == null)
		sourceCode = window.event.keyCode;
	
	var code = getKeyCode(sourceCode);
	var actualkey = code;
	
	if(isNumber(code))
	// try to look up the key now
		actualkey=String.fromCharCode(code);

	if(actualkey == null)
		return null;

	return actualkey.toLowerCase();
}

function attachToControls() {
    $('.handlevideo')
		.focus(function () { process_video_items($(this)); })
		.mouseover(function () { process_video_items($(this)); })
		.keydown(function () { monitor_video_keydown($(this)); });
    //videos.on("seeked", function () { changedPosition($(this)); });

    $('.menuitem')
		.focus(function () { process_menu_items($(this)); })
		.mouseover(function () { process_menu_items($(this)); })
		.keydown(function () { monitor_menu_keydown($(this)); });
}

function getVideoSource(video){
	var src =  video.getAttribute("src");
	
	if(src == null)
		src = video.currentSrc;
	
	if(isRunningFromServer){
		var root = getSiteRoot();
		src = src.replace(root, "");
	}
		
	return src;
}

function findMap(map, code) { 
	return map.key === code;
}

function mapKeyPresses(control, keyMap) {
    control.keydown((e) => {
        // Figure out what the keypress was
        var keyValue = getKeyValue(e);
        // Find the function mapped to the keypress
        var map = keyMap.find((e) => findMap(e, keyValue));
        if (map)
            map.func(map.arg); // Call the function
    });
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


var KeyCode = {
	ChangeToHDMI1: 		'1',
	ChangeToHDMI2: 		'2',
	ChangeToHDMI3: 		'3',
	ChangeToHDMI4: 		'4',
	MuteAudios: 		'5',
	PlayVideos: 		'a',
	ToggleAllPause: 	'a',
	ChangeDivider: 		'b',
	ToggleFullScreen: 	'f',
	ToggleMute:			'm',
	TogglePause:		'p',
	ReloadPage: 		'r',
	SwitchVideo:		's',
	StitchVideo:        'w',
	Left: 				'%', 	// 37,
	Up: 				'&', 	// 38,
	Right: 				"'", 	// 39,
	Down: 				'(' 	// 40
};

// These are messages the server sends
var ServerMessage = {
    
}

// These are messages the client sends to the server
var ClientMessage = {
    
}

var Event = {
	BroadcastServerStatus: 	"BroadcastServerStatus",
	VideoPositionChange:	"VideoPositionChange",
	video_events2: 			"video_events2",
	video_events: 			'video_events',
	stitch_events: 			'stitch_events',
	dragdrop: 				'dragdrop',
	dragdrop2: 				'dragdrop2',
	stitch_split_8k: 		'stitch_split_8k',
	seek_time: 				'seek_time',
	tile_events: 			'tile_events'
}