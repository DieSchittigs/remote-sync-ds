#!/usr/bin/env node

const exec = require('child_process').exec;
const path = require('path');
const fs = require('fs');
const chokidar = require('chokidar');
const minimatch = require('minimatch');
const EasyFtp = require('easy-ftp');
const _ = require('lodash');
const chalk = require('chalk');
const moment = require('moment');
const notifier = require('node-notifier');
const log = console.log;

let config;
let queue = [];
let watch = [];
let ignore = [];
let timeout;
let watcher;
const ftp = new EasyFtp();

try {
    config = require(path.resolve(process.cwd(), '.remote-sync.json'));
} catch (e) {
    log(chalk.red('No ".remote-sync" found. Bye.'));
    process.exit(1);
}

if (config.ignore){
    ignore = ignore.concat(config.ignore);
}
if (config.watch) {
    _.forEach(config.watch, (pattern) => {
        if (pattern.substr(0, 1) == '/') watch.push(pattern.substr(1));
    });
}
if (config['watch-ds']){
    watch = watch.concat(config['watch-ds']);
}

try {
    ftp.connect({
        type: config.transport || 'ftp',
        port: config.port || 21,
        host: config.hostname,
        user: config.username,
        password: config.password
    });
} catch (e) {
    log(chalk.red(e));
}

function showNotification(message){
    notifier.notify({
        title: 'Remote Sync DS',
        message: message,
        icon: path.join(__dirname, 'icon.png'),
        sound: false,
        wait: false
    });
}

function _setupWatcher(filesToWatch = null) {
    if (watcher) watcher.close();
    if (!filesToWatch) filesToWatch = process.cwd();
    else filesToWatch = filesToWatch.concat(watch);
    watcher = chokidar.watch(filesToWatch, {
        ignoreInitial: true,
        followSymlinks: false,
        persistent: true
    });
    if(config['watch-ds']) watcher.add(config['watch-ds']);
    watcher
        .on('add', addFile)
        .on('change', addFile);
    // TODO: Delete remote file?
    //.on('unlink', path => log(`File ${path} has been removed`));
}

function setupWatcher(initial = false) {
    exec("git ls-files", function(err, stdout, stderr) {
        if (!stderr) {
            const filesFromGit = _.compact(stdout.split('\n'));
            _setupWatcher(filesFromGit);
            if (!initial) return;
            filesFromGit.forEach((file) => {
                log(
                    chalk.white(moment().format('HH:mm:ss')),
                    chalk.green('Watching'),
                    chalk.blue(file)
                );
            });
            watch.forEach((fileOrGlob) => {
                log(
                    chalk.white(moment().format('HH:mm:ss')),
                    chalk.green('Also watching'),
                    chalk.blue(fileOrGlob)
                );
            });
            showNotification('Ready, watching ' + filesFromGit.length + ' files');
        } else {
            _setupWatcher();
            if (!initial) return;
            log(
                chalk.white(moment().format('HH:mm:ss')),
                chalk.green('Watching local directory')
            );
        }
    });
}

function workQueue() {
    const files = [];
    _.forEach(queue, (entry) => {
        const remote = path.resolve(config.target, entry);
        files.push({
            local: entry,
            remote: remote
        });
        log(
            chalk.white(moment().format('HH:mm:ss')),
            chalk.green('Uploading'),
            chalk.blue(entry),
            '~>',
            chalk.green(remote)
        );
    });
    queue = [];
    try {
        ftp.upload(files);
        showNotification('Uploaded ' + files.length + ' files');
    } catch (e) {
        log(chalk.red(e));
    }
    setupWatcher();
}

function isValidFile(file) {
    isValid = true;
    _.forEach(ignore, (pattern) => {
        if (minimatch(file, pattern, { matchBase: true, dot: true })) {
            isValid = false;
            return;
        }
    });
    if (!isValid) {
        _.forEach(watch, (pattern) => {
            if (minimatch(file, pattern, { matchBase: true, dot: true })) {
                isValid = true;
                return;
            }
        });
    }
    return isValid;
}

function addFile(file) {
    const _p = path.relative(process.cwd(), file);
    if (!isValidFile(_p)) {
        log(
            chalk.white(moment().format('HH:mm:ss')),
            chalk.yellow('Ignoring'),
            chalk.blue(_p)
        );
        return;
    }
    if (queue.indexOf(_p) < 0) queue.push(_p);
    clearTimeout(timeout);
    timeout = setTimeout(workQueue, 1000);
}

setupWatcher(true);
