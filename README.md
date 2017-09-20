# Remote Sync DS

Standalone script, mimicking the function of the Atom package "remote-sync".

## Installation

Add to project, where you are using "remote-sync" (where .remote-sync.json is located)

`yarn add remote-sync-ds`

Add to your package.json in `scripts`

	"scripts": {
		…
    	"sync": "remote-sync-ds",
    	…
	}

## Usage

Enter `npm run sync`. Every file changed will be uploaded to the server defined in `.remote-sync`.
