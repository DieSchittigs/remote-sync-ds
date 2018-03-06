#!/usr/bin/env node

let ConfigurationReader = require('./ConfigurationReader')
let FileListener = require('./FileListener')
let GitWatcher   = require('./GitWatcher')
let Connector    = require('./Connector')

let chokidar = require('chokidar')
let pjs     = require('../package.json')
let program = require('commander')
let _       = require('lodash')
let jsftp   = require('jsftp')
let chalk   = require('chalk')
let path    = require('path')

program
    .version(require('../package.json').version)
    .option('--no-notifications', 'Remove notifications')
    .option('--delete-files', 'Delete remote files on local delete', false)
    .option('-C, --chdir <path>', 'Change the working directory', process.cwd())
    .parse(process.argv)

let reader = new ConfigurationReader(program)
let connector = new Connector(reader)

connector.establishConnection()
    .then(runWatcher)
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })

function runWatcher(ftp) {
    let watchedFiles = reader.filesToWatch()

    let watcher = chokidar.watch(watchedFiles, {
        ignoreInitial: true,
        followSymlinks: false,
        persistent: true
    })
    
    // Watch specified files for changes
    let listener = new FileListener(reader, watcher, ftp)
    watcher.on('all', listener.report.bind(listener))
        .on('ready', () => listener.ready())

    // Enable the git watcher to also add all non-git-ignored files
    let gitWatcher = new GitWatcher()
    gitWatcher.watch(3000, listener.add.bind(listener))
}
