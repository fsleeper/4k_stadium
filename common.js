
var VIDEO_BASE_TAG = "div_vid_tile_id_";
var MENU_BASE_TAG = "menu_item_";

String.prototype.format = function() {
    var formatted = this;
    for( var arg in arguments ) {
        formatted = formatted.replace("{" + arg + "}", arguments[arg]);
    }
    return formatted;
}

function getId(msg) {
	var value = (msg != null && msg.message != null) ? msg.message : msg;
	return value;
}

function getVideoElementId(msg) {
	var value =  VIDEO_BASE_TAG+getId(msg);
	return value;
}

function getMenuElementId(msg) {
	var value =  MENU_BASE_TAG+getId(msg);
	return value;
}

function findMenu(msg){
	var search = "#" + getMenuElementId(msg);
	var value = $(search);
	return (value.length) ? value[0]: null;
}

function findVideo(msg){
	var search = "#" + getVideoElementId(msg);
	var value = $(search);
	return (value.length) ? value[0]: null;
}

function getValue(object, property) {
	if(object === null || property === null)
		return null;
	if(property in object)
		return object[property];
	return null;
}

// send the event if possible so it can determine what the event type is
// or send just the code itself
function getKeyCode(sourceCode){
	var unicode = sourceCode;

	// figure out what type of object was passed
    var evtobj=window.event? event : e; //distinguish between IE's explicit event object (window.event) and Firefox's implicit.

	// OK, so it's POSSIBLY the event, let's see...
	if(evtobj.charCode || evtobj.keyCode)
		// well it was an event so get the code from the event
		unicode=evtobj.charCode? evtobj.charCode : evtobj.keyCode;

	return unicode;
}

// send the event if possible so it can determine what the event type is
// or send just the code itself
function getKeyValue(sourceCode, caseSensitive){
	var code = getKeyCode(sourceCode);

	// try to look up the key now
    var actualkey=String.fromCharCode(code);

	if(actualkey == null)
		return null;

	return caseSensitive ? actualkey : actualkey.toLowerCase();
}

var CommonKeyCode = {
	ChangeToHDMI1: 		'1',
	ChangeToHDMI2: 		'2',
	ChangeToHDMI3: 		'3',
	ChangeToHDMI4: 		'4',
	MuteAudios: 		'5',
	PlayVideos: 		'a',
	ToggleAllPause: 	'a',
	ChangeDivider: 		'b',
	ToggleFullScreen: 	'f',
	GetInformation:		'i',
	ToggleMute:			'm',
	TogglePause:		'p',
	ReloadPage: 		'r',
	SwitchVideo:		's',
	ShowFullScreenVideo:'s',
	Left: 				'%', 	// 37,
	Up: 				'&', 	// 38,
	Right: 				"'", 	// 39,
	Down: 				'(' 	// 40
};

var CommonEvent = {
	BroadcastServerStatus: 	"BroadcastServerStatus",
	video_events2: 			"video_events2",
	video_events: 			'video_events',
	stitch_events: 			'stitch_events',
	dragdrop: 				'dragdrop',
	dragdrop2: 				'dragdrop2',
	stitch_split_8k: 		'stitch_split_8k',
	seek_time: 				'seek_time',
	tile_events: 			'tile_events'
}