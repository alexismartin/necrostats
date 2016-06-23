var fs = require('fs');
var path = require('path');
var bigInt = require('big-integer');
var moment = require('moment');

var Promise = require('bluebird');

var args = process.argv.slice(2);


var calculateSeed = function(z11seed) {
	//TODO fix for zone mode?
	var period = bigInt(4294967296);
	var seed = bigInt(z11seed, 10).minus(6);
	while(bigInt(0).greater(seed)) {
		seed = seed.add(period);
	}
	seed = seed.times(492935547).mod(period);
	if(seed.greaterOrEquals(2147483648)) {
		seed =  seed.minus(period);
	}
	return seed.value;
};

var formatTime = function(ms) {
	var formatedTime = '',
		mDate = moment(ms);
	mDate.utc();
	var	hours = mDate.hour(),
		minutes = mDate.minute(),
		seconds = mDate.second(),
		mseconds = mDate.millisecond();
	if(hours > 0) {
		formatedTime += (hours<10?'0':'') + hours;
	}
	if(minutes > 0 || formatedTime) {
		formatedTime += (formatedTime?':':'') + (minutes<10?'0':'') + minutes;
	}
	if(seconds > 0 || formatedTime) {
		formatedTime += (formatedTime?':':'') + (seconds<10?'0':'') + seconds;
	}
	if(mseconds > 0 || formatedTime) {
		formatedTime += (formatedTime?'.':'') + (mseconds<100?'0':'') + mseconds;
	}

	return formatedTime;
};

var getZoneForChar = function(songs, char1, type, infos) {
	var numType = parseInt(type, 10);
	switch(char1) {
		case '0': //cadence
		case '1': //melody
		case '2': //aria
		case '3': //dorian
		case '4': //eli
		case '5': //monk
		case '7': //coda
		case '8': //bolt
		case '9': //bard
			var zone = numType < 5 ? numType : Math.floor((songs-1)/4) + 1,
				floor = ((songs-1) % 4) + 1;
			if(char1 === '2' && numType >= 5) zone = 5 - zone;
			if(zone > 4) {
				if(zone > 5 || floor > 2) {
					infos.bugged = 'NB_SONGS';
					infos.buggedData = 'Number of songs is '+songs+' which makes invalid zone '+zone+'-'+floor+'.'; 
				}
				zone = 4;
				floor = 5;
			} else if(zone < 1) { // For aria
				infos.bugged = 'NB_SONGS';
				infos.buggedData = 'Number of songs is '+songs+' which makes invalid zone '+zone+'-'+floor+'.'; 
				zone = 1;
				floor = 4;
			}
			return zone + '-' + floor;
		case '6': //dove
			return (numType < 5 ? numType : (Math.floor((songs-1)/3) + 1)) + '-' +(((songs-1) % 3) + 1);
	} 
};

var parseReplayFile = function(filename) {
	var infos = {},
		name = path.basename(filename, '.dat'),
		splitName = name.split('_');
	infos.version = splitName[0];
	infos.filename = name+'.dat';
	infos.date = new Date(
		parseInt(splitName[3], 10),
		parseInt(splitName[4], 10) - 1,
		parseInt(splitName[5], 10),
		parseInt(splitName[6], 10),
		parseInt(splitName[7], 10),
		parseInt(splitName[8], 10)
	);
	infos.type = splitName[9];

	return new Promise(function(resolve, reject) {
		if(false && infos.version != '75') resolve(infos);
		else {
			fs.readFile(filename, 'utf8', function(err, data) {
				if (err) {
					reject(err);
				} else {
					var splitedData = data.split('\\n');
					if(splitedData[8]) {
						infos.time = parseInt(splitedData[8], 10);
						infos.formatedTime = formatTime(infos.time);
					}
					if(splitedData[10]) infos.seed = calculateSeed(splitedData[10]);
					if(splitedData[11]) infos.players = parseInt(splitedData[11], 10);
					if(splitedData[17]) infos.char1 = splitedData[15].substr(0,1);
					if(infos.players > 1 && splitedData[17]) {
						infos.char2 = splitedData[17].substr(0,1);
					}
					if(splitedData[9]) {
						infos.songs = parseInt(splitedData[9], 10);
						infos.endZone = getZoneForChar(parseInt(splitedData[9], 10), infos.char1, infos.type, infos);
					}
					resolve(infos);
				}
			});
		}
	});
	

};

if(args[0]) parseReplayFile(args[0]).then(function(data){console.log(data);});

module.exports.parse = parseReplayFile;
module.exports.formatTime = formatTime;