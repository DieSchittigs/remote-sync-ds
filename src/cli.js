#!/usr/bin/env node

let ConfigurationReader = require('./ConfigurationReader');
let FileListener = require('./FileListener');

let chokidar = require('chokidar');
let pjs     = require('../package.json');
let program = require('commander');
let _       = require('lodash');
let jsftp   = require('jsftp');
let chalk   = require('chalk');
let path    = require('path');

program
    .version(require('../package.json').version)
    .option('--no-notifications', 'Remove notifications')
    .option('-C, --chdir <path>', 'Change the working directory', process.cwd())
    .parse(process.argv);

let reader = new ConfigurationReader(program);
let config = reader.getFTPconfiguration();

try {
    let ftp = new jsftp(config);
    console.log(chalk.green(`FTP connection with ${chalk.inverse("%s:%i")} established.`), config.host, config.port);

    ftp.auth(config.user, config.pass, err => {
        if (err) {
            console.log(chalk.red(`Could not authenticate: ${chalk.inverse("%s")}`), err.message);
            process.exit(1);
        }

        runWatcher();
    });
} catch (e) {
    console.error(chalk.red(`Could not connect to FTP host ${chalk.inverse("%s:%i")}.`), config.host, config.port);
}

function runWatcher() {
    let filesToWatch = reader.filesToWatch();
    let listener = new FileListener(reader);

    let watcher = chokidar.watch(filesToWatch, {
        ignoreInitial: true,
        followSymlinks: false,
        persistent: true
    })
    
    watcher.on('all', listener.report.bind(listener))
        .on('ready', () => listener.ready());
}