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
try {
    config = require(path.resolve(process.cwd(), '.remote-sync.json'));
} catch (e) {
    console.log('No ".remote-sync" found!');
    process.exit(1);
}

let ignore = [];
if (config.ignore) ignore = ignore.concat(config.ignore);

if (config.watch) {
    _.forEach(config.watch, (pattern) => {
        if (pattern.substr(0, 1) == '/') config.watch.push(pattern.substr(1));
    });
}

let queue = [];
let timeout;

const ftp = new EasyFtp();

let watcher;

try {
    ftp.connect({
        type: config.transport || 'ftp',
        port: config.port || 21,
        host: config.hostname,
        user: config.username,
        password: config.password
    });
} catch (e) {
    log(chalk.error(e));
}

function _setupWatcher(filesToWatch = null) {
    if (watcher) watcher.close();
    if (!filesToWatch) filesToWatch = process.cwd();
    else if (config.watch) {
        filesToWatch = filesToWatch.concat(config.watch);
    }
    watcher = chokidar.watch(filesToWatch, {
        ignoreInitial: true,
        followSymlinks: false,
        persistent: true
    });
    watcher
        .on('add', addFile)
        .on('change', addFile);
    // TODO: Delete remote file?
    //.on('unlink', path => console.log(`File ${path} has been removed`));
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
            notifier.notify({
                title: 'Remote Sync DS',
                message: 'Ready, watching ' + filesFromGit.length + ' files',
                sound: false,
                wait: false
            });
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
        notifier.notify({
            title: 'Remote Sync DS',
            message: 'Uploaded ' + files.length + ' files',
            sound: false,
            wait: false
        });
    } catch (e) {
        console.log(chalk.error(e));
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
    if (!isValid && config.watch) {
        _.forEach(config.watch, (pattern) => {
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