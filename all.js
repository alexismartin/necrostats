var parse = require('./parser').parse;
var formatTime = require('./parser').formatTime;
var fs = require('fs');
var Promise = require('bluebird');
var _ = require('lodash');
var os = require('os');
var db = require('./db');
var chokidar = require('chokidar');
var initLog = require('./log').initLog;
var log = require('./log').log;

var getNDPath = function() {
	var homedir = os.homedir(),
		ostype = os.type();
	var paths = {
		'Darwin': [
			homedir + '/Library/Application Support/Steam/steamapps/common/Crypt of the NecroDancer/replays',
			'/Applications/Crypt of the Necrodancer.app/Contents/Resources/game/replays'
		],
		'Linux': [
			homedir + '/.local/share/steam/steamapps/common/Crypt of the NecroDancer/replays',
			homedir + '/.local/share/Steam/steamapps/common/Crypt of the NecroDancer/replays',
			homedir + '/.local/share/steam/SteamApps/common/Crypt of the NecroDancer/replays',
			homedir + '/.local/share/Steam/SteamApps/common/Crypt of the NecroDancer/replays',
			homedir + '/GOG Games/Crypt of the NecroDancer/game/replays'
		],
		'Windows_NT': [
			process.env['ProgramFiles'] + "\\Steam\\SteamApps\\common\\Crypt of the NecroDancer\\replays",			
			process.env['ProgramFiles(x86)'] + "\\Steam\\SteamApps\\common\\Crypt of the NecroDancer\\replays"
			//TODO gog
		]
	};

	//TODO get from config file

	if(paths[ostype]) {
		for(var i = 0, len = paths[ostype].length; i < len; i++) {
			try {				
				var path = paths[ostype][i],
					pathStats = fs.statSync(path);
				if(pathStats && pathStats.isDirectory()) {
					return path;
				} 
			} catch(e) {

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
	log('Starting init');

	return new Promise(function(resolve, reject) {
		db.initDB().then(function() {
			log('DB initialized');
			fs.readdir(path, function(err, files) {
				if(err) throw err;

				files = filterReplayFiles(files);
				
				db.getAllFiles().then(function(importedFiles) {
					importedFiles = importedFiles.map(function(f) {
						return f.file;
					});
					files = _.filter(files, function(f) {
						return importedFiles.indexOf(f) === -1;
					});

					if(files.length) {
						Promise.map(files, function(file) {
							return parse(path+'/'+file);
						}, {concurrency: 1000}).done(function(runs) {
							db.insertRuns(runs).then(function(nbInsert) {
								log(nbInsert+' new runs inserted.');
								resolve(nbInsert+' new runs inserted.');
							}, function(err) {
								throw new Error('DB error: '+err);
							});
						}, function(runs) {
							// console.log(runs);
						});						
					} else {
						log('No new runs inserted.');
						resolve('No new runs inserted.');
					}
				}, function(err) {
					throw new Error('DB error: '+err);
				});
			});
		}, function(err) {
			log('DB error: '+err);
			throw new Error('DB error: '+err);
		});
	});
};

var watchNewReplays = function() {
	var path = getNDPath();
	log('Init watching of new replay files')
	chokidar.watch(path, {ignoreInitial: true}).on('add', (file) => {
		parse(file).then(function(run) {
			db.insertRun(run).then(insertedRun => {log('Inserted new run:'+ insertedRun);});
		});
	});
};

var startReplay = function(logs) {
	initLog(logs);
	log('Starting replay watcher');
	try{
		init().then(watchNewReplays);
	} catch(e) {
		log(e, 'ERROR');
	}
};

module.exports.startReplay = startReplay;