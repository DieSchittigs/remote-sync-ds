let exec = require('child_process').exec
let _    = require('lodash')

module.exports = class {
    watch(timeout, reporting) {
        setTimeout(() => {
            Promise.all([this.callConsole('git ls-files -o --exclude-standard'), this.callConsole('git ls-files')])
                .then(allFiles => {
                    let files = allFiles.join('\n').split('\n')
                    
                    reporting(_.compact(files))
                    this.watch(timeout, reporting)
                }).catch(reason => {
                    // Silently discard.  
                })
        }, timeout)
    }

    callConsole(command) {
        return new Promise((resolve, reject) => {
            exec(command, (err, stdout, stderr) => {
                if (err || stderr) reject([err, stderr])
                return resolve(stdout)
            })
        })
    }
}
