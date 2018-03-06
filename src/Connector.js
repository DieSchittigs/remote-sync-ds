let Promise = require('bluebird')
let chalk = require('chalk')
let FTP = require('easy-ftp')

module.exports = class {
    constructor (config) {
        this.reader = config
    }

    establishConnection() {
        return new Promise((resolve, reject) => {
            let transport = this.reader.config('transport', 'ftp')

            if (transport !== 'ftp' && transport !== 'sftp') {
                reject(chalk.red(`${transport} is not a supported transport mode. Supported are 'ftp' and 'sftp'.`))
            }

            let config = {
                type: transport,
                host: this.reader.config('hostname'),
                port: this.reader.config('port', transport == 'ftp' ? 21 : 22),
                username: this.reader.config('username'),
                password: this.reader.config('password')
            }

            try {
                let connection = new FTP()
                connection.connect(config)

                console.log(chalk.green(`Connection with ${chalk.inverse('%s:%i')} (%s) established.`), config.host, config.port, config.type)
                resolve(connection)
            } catch (e) {
                reject(chalk.red(`Could not connect to host ${chalk.inverse(config.host + ':' + config.port)} with transport mode ${config.type}.`))
            }
        })
    }
}
