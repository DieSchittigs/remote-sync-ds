#!/usr/bin/env node

const ConfigurationReader = require('./ConfigurationReader')
const FileListener = require('./FileListener')
const GitWatcher   = require('./GitWatcher')
const Connector    = require('./Connector')

const chokidar = require('chokidar')
const pjs     = require('../package.json')
const program = require('commander')
const _       = require('lodash')
const jsftp   = require('jsftp')
const chalk   = require('chalk')
const path    = require('path')

program
    .version(pjs.version)
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

console.log('\n', chalk.bgMagenta(' Welcome to Remote Sync DS v' + pjs.version + ' '), '\n');