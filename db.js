var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('necrostats');
var Promise = require('bluebird');

var initDB = function() {
	return new Promise(function(resolve, reject) {
		db.serialize(function() {
			db.run(`CREATE TABLE IF NOT EXISTS run
					(run_id integer,
					file text,
					version integer,
					run_date integer,
					type text,
					time int,
					fromated_time text,
					seed int,
					players int,
					char1 text,
					char2 text,
					end_zone text,
					finished integer,
					killed_by text,
					score integer,
					imported_date integer,
					PRIMARY KEY (run_id) ON CONFLICT ABORT)`, function(err) {
						if(err) {
							reject(err);
						}
					});
			db.run(`CREATE TABLE IF NOT EXISTS tag
					(tag_id integer,
					name text,
					color text,
					PRIMARY KEY (tag_id) ON CONFLICT ABORT)`);
			db.run(`CREATE TABLE IF NOT EXISTS run_tag
					(run_id integer REFERENCES run (run_id),
					tag_id integer REFERENCES tag (tag_id),
					PRIMARY KEY (run_id, tag_id) ON CONFLICT ABORT)`, function(err) {
						if(err) {
							reject(err);
						}
					});
			db.run(`CREATE TABLE IF NOT EXISTS bugged
					(run_id integer REFERENCES run (run_id),
					bugged_reason text,
					bugged_data text,
					PRIMARY KEY (run_id, bugged_reason) ON CONFLICT ABORT)`, function(err) {
						if(err) {
							reject(err);
						} else {
							resolve();
						}
					});
		});
	});
};

var getAllFiles = function() {
	return new Promise(function(resolve, reject) {
		db.all('SELECT file FROM run', function(err, rows) {
			err ? reject(err) : resolve(rows);
		});
	});
};

var insertRuns = function(runs) {
	return new Promise(function(resolve, reject) {
		if(!runs.length) {
			resolve(0);
		} else {			
			var runStatement = `INSERT INTO run 
				(file,
				version,
				run_date,
				type,
				time,
				fromated_time,
				seed,
				players,
				char1,
				char2,
				end_zone,
				imported_date) 
				VALUES `;
			var buggedStatement = db.prepare(`INSERT INTO bugged 
				(run_id,
				bugged_reason,
				bugged_data) 
				VALUES($run_id,
				$bugged_reason,
				$bugged_data)`);


			for (var i = 0, len = runs.length; i < len; i++) {
				var run = runs[i];

				runStatement += "('"+
				run.filename+"',"+
				run.version+","+
				(run.date.getTime()/1000)+",'"+
				run.type+"',"+
				run.time+",'"+
				run.formatedTime+"',"+
				run.seed+","+
				run.players+",'"+
				run.char1+"','"+
				(run.char2||null)+"','"+
				run.endZone+"',"+
				"strftime('%s','now')),";
			}
			db.run(runStatement.slice(0, -1), function(err) {
				if(err) {
					reject(err);
				} else {
					resolve(this.changes);
				}
			});
		}
	});
};

module.exports.initDB = initDB;
module.exports.getAllFiles = getAllFiles;
module.exports.insertRuns = insertRuns;