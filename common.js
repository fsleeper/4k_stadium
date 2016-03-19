
var VIDEO_BASE_TAG = "div_vid_tile_id_";

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
/*
var KeyCode = {
	'1': 49,
	'2': 50,
	'3': 51,
	'4': 52,
	'5': 53,
	'6': 54,
	'7': 55,
	'8': 56,
	'9': 57,
	a: 65,
	b: 66,
	c: 67,
	d: 68,
	e: 69,
	f: 70,
	g: 71,
	h: 72,
	i: 73,
	j: 74,
	k: 75,
	l: 76,
	m: 77,
	n: 78,
	o: 79,
	p: 80,
	q: 81,
	r: 82,
	s: 83,
	t: 84,
	u: 85,
	v: 86,
	w: 87,
	x: 88,
	y: 89,
	z: 90,
	left: 37,
	up: 38,
	right: 39,
	down: 40
};
*/

var Event = {
	video_events2: "video_events2",
	video_events: 'video_events',
	stitch_events: 'stitch_events',
	dragdrop: 'dragdrop',
	dragdrop2: 'dragdrop2',
	stitch_split_8k: 'stitch_split_8k',
	seek_time: 'seek_time',
	tile_events: 'tile_events'
}