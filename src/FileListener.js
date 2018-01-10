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
    constructor(config) {
        this.config = config;

        this.watch = config.filesToWatch();

        this.queue = [];
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

        if (!_.includes(this.queue, _p)) this.queue.push(_p);
        clearTimeout(this.timeout);
        this.timeout = setTimeout(this.workQueue.bind(this), 400);
    }

    ready() {
        _.each(this.watch, file => {
            log(chalk.blue("Watching"), file);
        })
    }

    workQueue() {
        let that = this;
        _.each(this.queue, file => {
            log(chalk.blue("Uploading"), file);
            that.notify("Uploaded files.");
        });

        this.queue = [];
    }
}