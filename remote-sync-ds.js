#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const chokidar = require('chokidar');
const minimatch = require('minimatch');
const EasyFtp = require('easy-ftp');
const _ = require('lodash');
const chalk = require('chalk');
const log = console.log;

let config;
try{
	config = require(path.resolve(process.cwd(), '.remote-sync.json'));
} catch (e){
	console.log('No ".remote-sync" found!');
	process.exit(1);
}

const gitignorefile = path.resolve(process.cwd(), '.gitignore');
let gitignore = [];
if(fs.existsSync(gitignorefile)){
    _gitignore = require('gitignore-to-glob')(gitignorefile);
    _.forEach(_gitignore, (pattern)=>{
        if(pattern.substr(0,1) == '!') pattern = pattern.substr(1);
        gitignore.push(pattern);
    });
}
else log('No ".gitignore" found!');

const ignore = []
	.concat(gitignore)
	.concat(config.ignore);

let queue = [];
let timeout;

const ftp = new EasyFtp();

const watcher = chokidar.watch(process.cwd(), {
	ignored: ignore,
	ignoreInitial: true,
	followSymlinks: false,
	persistent: true
});

if(config.watch) watcher.add(config.watch);

try{
	ftp.connect({
		type: config.transport || 'ftp',
		port: config.port  || 21,
	    host: config.hostname,
		user: config.username,
		password: config.password
	});
} catch (e){
    log(chalk.error(e));
}


function workQueue(){
	const files = [];
	_.forEach(queue, (entry)=>{
		const remote = path.resolve(config.target, entry);
		files.push({
			local: entry,
			remote: remote
		});
		log(
			chalk.blue(entry),
			'~>',
			chalk.green(remote)
		);
	});
	queue = [];
	try{
		ftp.upload(files);
	} catch (e){
		console.log(chalk.error(e));
	}
}

function isValidFile(file){
	isValid = true;
	_.forEach(ignore, (pattern)=>{
		if(minimatch(file, pattern, { matchBase: true, dot: true })){
			isValid = false;
			return;
		}
	});
	if(!isValid && config.watch){
		_.forEach(config.watch, (pattern)=>{
			if(minimatch(file, pattern, { matchBase: true, dot: true })){
				isValid = true;
				return;
			}
		});
	}
	return isValid;
}

function addFile(file){
	const _p = path.relative(process.cwd(), file);
	if(!isValidFile(_p)){
		log(chalk.yellow('Ignoring ' + _p));
		return;
	}
	if(queue.indexOf(_p) < 0) queue.push(_p);
	clearTimeout(timeout);
	timeout = setTimeout(workQueue, 1000);
}

watcher
	.on('add', addFile)
	.on('change', addFile);
	// TODO: Delete remote file?
	//.on('unlink', path => console.log(`File ${path} has been removed`));
