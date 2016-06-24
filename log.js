var el = false;

var initLog = function(element) {
	el = element
};

var log = function(message, level) {
	if(el) {
		el.innerHTML += '<div class="'+(level||'LOG')+'">'+message+'</div>';
	} else {
		switch(level) {
			case 'DEBUG':
				console.debug(message);
				break;
			case 'ERROR':
				console.error(message);
				break;
			default:
				console.log(message);
				break;
		}
	}
};



module.exports.initLog = initLog;
module.exports.log = log;