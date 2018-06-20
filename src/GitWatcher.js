const chalk = require('chalk')
const exec = require('child_process').exec
const _    = require('lodash')

module.exports = class {
    watch(timeout, reporting) {
        setTimeout(() => {
            Promise.all([this.callConsole('git ls-files -o --exclude-standard'), this.callConsole('git ls-files')])
                .then(allFiles => {
                    let files = allFiles.join('\n').split('\n')
                    
                    reporting(_.compact(files))
                    this.watch(timeout, reporting)
                }).catch(reasons => {
                    if (!this.hasOutputReason) {
                        console.log(chalk.red.underline('Error in git watcher:'))
                        for (let reason of reasons) {
                            if (reason.message) console.error(chalk.red(`- ${reason.message}`))
                        }
                    }

                    this.hasOutputReason = true
                })
        }, timeout)
    }

    callConsole(command) {
        return new Promise((resolve, reject) => {
            exec(command, {maxBuffer: 1024 * 1024}, (err, stdout, stderr) => {
                if (err || stderr) reject([err, stderr])
                return resolve(stdout)
            })
        })
    }
}
