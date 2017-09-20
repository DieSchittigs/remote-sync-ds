#!/usr/bin/env node

const path = require('path');
const chokidar = require('chokidar');
const config = require('./.remote-sync.json');
const minimatch = require('minimatch');
const EasyFtp = require('easy-ftp');
const ftp = new EasyFtp();
let queue = [];
let timeout;

const watcher = chokidar.watch(process.cwd(), {
	ignored: config.ignore,
	ignoreInitial: true,
	followSymlinks: false,
	persistent: true,
	atomic: true
});

ftp.connect({
	type: config.transport,
	port: config.port,
    host: config.hostname,
	user: config.username,
	password: config.password
});

function workQueue(){
	const files = [];
	for(let i = 0; i < queue.length; i++){
		files.push({
			local: queue[i],
			remote: path.resolve(config.target, queue[i])
		});
		console.log(queue[i], ' => ', path.resolve(config.target, queue[i]));
	}
	queue = [];
	ftp.upload(files);
}

function addFile(file){
	const _p = path.relative(process.cwd(), file);
	for(let i = 0; i < config.ignore.length; i++){
		if(minimatch(_p, config.ignore[i], { matchBase: true, dot: true })) return;
	}
	if(queue.indexOf(_p) < 0) queue.push(_p);
	clearTimeout(timeout);
	timeout = setTimeout(workQueue, 1000);
}

watcher
	.on('add', addFile)
	.on('change', addFile)
	.on('unlink', path => console.log(`File ${path} has been removed`));