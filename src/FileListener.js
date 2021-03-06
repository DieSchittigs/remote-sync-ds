const minimatch = require('minimatch')
const Promise   = require('bluebird')
const notifier  = require('node-notifier')
const moment    = require('moment')
const chalk     = require('chalk')
const path      = require('path')
const _         = require('lodash')

function log(...messages)
{
    console.log(
        chalk.dim(moment().format('HH:mm:ss')) + ' ' + messages.join(' ')
    )
}

Promise.series = (promises) => {
    return Promise.reduce(promises, (values, promise) => {
        return promise().then(result => {
            values.push(result)
            return values
        })
    }, [])
}

module.exports = class {
    constructor(config, watcher, ftp) {
        this.config  = config
        this.watcher = watcher
        this.ftp     = ftp

        this.watchedFiles = config.filesToWatch()
        this.ignore = config.filesToIgnore()

        this.queue    = []
        this.unlinked = []
        this.timeout  = null
    }

    notify(message) {
        if (!this.config.config('notifications', true))
            return
    
        notifier.notify({
            title: 'Remote Sync DS',
            message: message,
            icon: path.join(__dirname, '..', 'icon.png'),
            sound: false,
            wait: false
        })
    }

    report(event, file) {
        if (!_.includes(['add', 'unlink', 'change'], event))
            return

        // Ignore delete events unless otherwise specified
        if (event == 'unlink' && !this.config.config('delete')) {
            log(chalk.yellow('Ignoring deletion of'), file)
            return
        }

        // Add to queue
        let _p = path.relative(process.cwd(), file)
        let ignored = _.find(this.ignore, glob => {
            return minimatch(file, glob.replace(/^\//, ''))
        })

        if (ignored) {
            log(chalk.yellow('Ignoring change of'), file)
            return
        }

        if (!_.includes(this.queue, _p)) {
            if (event == 'unlink')
                this.unlinked.push(_p)

            this.queue.push(_p)
        }

        clearTimeout(this.timeout)
        this.timeout = setTimeout(this.workQueue.bind(this), 400)
    }

    ready() {
        _.each(this.watchedFiles, file => {
            log(chalk.blue('Watching'), file)
        })
    }

    add(files, git = true) {
        let difference = _.difference(files, this.watchedFiles)
        _.merge(this.watchedFiles, files)

        this.watcher.add(difference)
        _.each(difference, file => {
            log(chalk.blue('Watching'), file, git ? chalk.dim.italic('(discovered via git)') : '')
        })
    }

    workQueue() {
        let promises = this.queue.map(this.upload.bind(this))
        Promise.series(promises)
            .then(total => {
                this.notify(total.length + ' files successfully uploaded.')

                // Remove files from queue and unlinked arrays
                _.remove(this.queue, e => { return _.includes(total, e) })
                _.remove(this.unlinked, e => { return _.includes(total, e) })
            })
    }

    upload(file) {
        let ftp = this.ftp
        let remote = path.resolve(this.config.config('target'), file)

        // Set up appropriate function for upload/delete action
        let upload = _.includes(this.unlinked, file) 
            ? ['Deleting', 'rm', remote]
            : ['Uploading', 'upload', file, remote]

        return () => {
            return new Promise((resolve, reject) => {
                let [text, method, first, second] = upload
                log(chalk.blue(text), file)

                this.ftp[method](first, second, err => {
                    if (err) return reject(err)
                    return resolve(file)
                })
            })
        }
    }
}
