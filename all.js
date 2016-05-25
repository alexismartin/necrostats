var parse = require('./parser').parse;
var formatTime = require('./parser').formatTime;
var fs = require('fs');
var Promise = require('bluebird');
var _ = require('lodash');
var os = require('os');

var getNDPath = function() {
	var homedir = os.homedir(),
		ostype = os.type();
	var paths = {
		'Darwin': [
			homedir + '/Library/Application Support/Steam/steamapps/common/Crypt of the NecroDancer/replays',
			'/Applications/Crypt of the Necrodancer.app/Contents/Resources/game/replays'
		],
		'Linux': [
			//TODO steam
			homedir + '/GOG Games/Crypt of the NecroDancer/game/replays'
		],
		'Windows_NT': [
			//TODO steam
			//TODO gog
		]
	};

	//TODO get from config file

	if(paths[ostype]) {
		for(var i = 0, len = paths[ostype].length; i < len; i++) {
			var path = paths[ostype][i],
				pathStats = fs.statSync(path);
			if(pathStats && pathStats.isDirectory()) {
				return path;
			} 
		}
	}

	//TODO ask user before throwing error?
	throw new Error('Replay path not found');

};

var filterReplayFiles = function(files) {
	return _.filter(files, function(file) {
		return /\.dat$/.test(file);
	});
};


var dataAnalysis = function(runs) {
	console.log('Number of runs:', runs.length);
	var totalTime = runs.reduce(function(previous, current) {
		return parseInt(current.time || 0, 10) + previous;
	}, 0);
	console.log('Total time:', formatTime(totalTime));

	var finishedUnseeded = _.filter(runs, function(run) {
		return run.type == '6' && run.char1 == '0' && run.endZone == '4-5' && !run.bugged;
	});


	console.log('Number of finished unseeded Cadence runs:', finishedUnseeded.length);
	var times = finishedUnseeded.map(function(run) {
		return run.formatedTime;
	});
	// _.sortBy(times, 'formatedTime');
	console.log('Times:\n', _.sortBy(finishedUnseeded, 'time').slice(0,10));

};

var init = function() {
	var path = getNDPath();

	fs.readdir(path, function(err, files) {
		if(err) throw err;

		files = filterReplayFiles(files);

		Promise.map(files, function(file) {
			return parse(path+'/'+file);
		}, {concurrency: 1000}).done(function(runs) {
			// console.log(runs);

			dataAnalysis(runs);

		}, function(runs) {
			// console.log(runs);
		});
	});
};

try{
	init();
} catch(e) {
	console.error(e);
}