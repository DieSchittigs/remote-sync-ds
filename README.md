# Remote Sync DS

Standalone script, mimicking the function of the Atom package [remote-sync](https://atom.io/packages/remote-sync).

## Installation

### Global

To install Remote Sync DS for global usage, install it by entering

`sudo npm -g install remote-sync-ds`

### Project-based

Add Remote Sync DS to any project where you're using "remote-sync" (look for a file called `.remote-sync.json`)
and install Remote Sync DS by entering

`yarn add -D remote-sync-ds`

Add to your package.json in the `scripts` section

	"scripts": {
		…
    	"sync": "remote-sync-ds",
    	…
	}

## Usage

When in your project directory (again, any folder with a `.remote-sync.json`)
enter `remote-sync-ds` (global) or `yarn sync` (project-based). Every file changed will be uploaded to the server defined in `.remote-sync`.
