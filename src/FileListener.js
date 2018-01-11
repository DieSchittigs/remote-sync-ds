let notifier = require('node-notifier');
let moment = require('moment');
let chalk  = require('chalk');
let path   = require('path');
let _ = require('lodash');

function log(...messages)
{
    console.log(
        chalk.dim(moment().format("HH:mm:ss")) + " " + messages.join(" ")
    );
}

module.exports = class {
    constructor(config, watcher) {
        this.config  = config;
        this.watcher = watcher;

        this.watchedFiles = config.filesToWatch();

        this.queue = [];
        this.unlinked = [];
        this.timeout = null;
    }

    notify(message) {
        if (!this.config.config('notifications'))
            return;
    
        notifier.notify({
            title: 'Remote Sync DS',
            message: message,
            icon: path.join(__dirname, '..', 'icon.png'),
            sound: false,
            wait: false
        });
    }

    report(event, file) {
        if (!_.includes(['add', 'unlink', 'change'], event))
            return;

        // Add to queue
        let _p = path.relative(process.cwd(), file);
        if (_.includes(this.ignore, _p)) {
            log(chalk.blue("Ignoring change of"), file);
            return;
        }

        if (!_.includes(this.queue, _p)) {
            if (event == 'unlink')
                this.unlinked.push(_p);

            this.queue.push(_p);
        }
        
        clearTimeout(this.timeout);
        this.timeout = setTimeout(this.workQueue.bind(this), 400);
    }

    ready() {
        _.each(this.watchedFiles, file => {
            log(chalk.blue("Watching"), file);
        })
    }

    add(files, git = true) {
        let difference = _.difference(files, this.watchedFiles);
        _.merge(this.watchedFiles, files);

        this.watcher.add(difference);
        _.each(difference, file => {
            log(chalk.blue("Watching"), file, git ? chalk.dim.italic("(discovered via git)") : "");
        });
    }

    workQueue() {
        let that = this;
        _.each(this.queue, file => {
            if (_.includes(that.unlinked, file)) {
                log(chalk.blue("Deleting"), file);
                return;
            }

            log(chalk.blue("Uploading"), file);
        });

        that.notify(this.queue.length + " files uploaded.");

        this.queue = [];
    }
}