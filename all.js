var parse = require('./parser').parse;
var formatTime = require('./parser').formatTime;
var fs = require('fs');
var Promise = require('promise');
var _ = require('lodash');

var getNDPath = function() {
	var paths = {
		mac: [
			'/Users/alexis/Library/Application Support/Steam/steamapps/common/Crypt of the NecroDancer/replays',
			'/Applications/Crypt of the Necrodancer.app/Contents/Resources/game/replays'
		]
	};
	//TODO
	return paths.mac[0];
};


var dataAnalysis = function(runs) {
	console.log('Number of runs:', runs.length);
	var totalTime = runs.reduce(function(previous, current) {
		return parseInt(current.time || 0, 10) + previous;
	}, 0);
	console.log('Total time:', formatTime(totalTime));

	var finishedUnseeded = _.filter(runs, function(run) {
		return run.type == '6' && run.char1 == '0' && run.endZone == '4-5';
	});


	console.log('Number of finished unseeded Cadence runs:', finishedUnseeded.length);
	var times = finishedUnseeded.map(function(run) {
		return run.formatedTime;
	});
	// _.sortBy(times, 'formatedTime');
	console.log('Times:\n', _.sortBy(finishedUnseeded, 'formatedTime'));

};

var path = getNDPath();

fs.readdir(path, function(err, files) {
	Promise.all(files.map(function(file) {
		return parse(path+'/'+file);
	})).done(function(runs) {
		// console.log(runs);

		dataAnalysis(runs);

	}, function(runs) {
		console.log(runs);
	});
});
