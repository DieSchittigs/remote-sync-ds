let path  = require('path');
let os    = require('os');
let chalk = require('chalk');
let _     = require('lodash');

const CONFIG_NAME = '.remote-sync.json';
const CLI_OPTIONS = {
    // { foo: "bar" } will override
    // config.bar with program.foo

    notifications: { default: true, overrides: "notifications" }
};

module.exports = class ConfigurationReader {
    constructor(program) {
        this.program = program;
        process.chdir(path.resolve(program.chdir));

        this._loadConfiguration();
    }

    _loadConfiguration() {
        // First try to load a global configuration ...
        let globalConfig = {};
        try {
            globalConfig = require(path.join(os.homedir(), CONFIG_NAME));
        } catch (e) { }

        // ... then load the local configuration.
        let localConfig = {};
        try {
            localConfig = require(path.join(process.cwd(), CONFIG_NAME));
        } catch (e) {
            console.error(
                chalk.red(
                    "Could not find your local " + 
                    chalk.inverse(CONFIG_NAME) +
                    ". Is your working directory correct?"
                )
            );
            process.exit(1);
        }

        // Finally override any settings we may have added via CLI options
        let program = this.program;
        let cliConfig = {};
        
        _.each(CLI_OPTIONS, (value, key) => {
            // Ignore any options that have not been overridden
            if (program[key] !== value.default)
                cliConfig[value.overrides] = program[key];
        })

        this.loadedConfig = _.merge(localConfig, globalConfig, cliConfig);
    }

    config(name, value = null) {
        if (this.loadedConfig.hasOwnProperty(name)) {
            return this.loadedConfig[name];
        }

        return value;
    }

    getFTPconfiguration() {
        return {
            type: this.config('transport', 'ftp'), // scp is not currently supported
            port: this.config('port', 21),
            host: this.config('hostname'),
            user: this.config('username'),
            pass: this.config('password')
        };
    }

    filesToIgnore() {
        return this.config('ignore');
    }

    filesToWatch() {
        return this.config('watch').map(e => {
            if (e.startsWith('/')) return e.substring(1);
            return e;
        });
    }
};