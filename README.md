# Remote Scripting Development

This package provides a CLI tool for remote TypeScript/JavaScript project development and deployment.

## Features
The project provides the following features:

- TypeScript/JavaScript compilation supports:
  - Multiple project roots
  - Optional restrictions
  - Type checking
- Modules/imports support, external libraries from npm
- Automatic deployment to development/production server

## Prerequisites
The project requires the following prerequisites:

- Node.js/npm

## Installation
To install the project:

1. Run this command: npm install @quadient/remote-scripting-development --save-dev
2. Run @quadient/remote-scripting-development init as npm task
3. Modify an .ENV file in the project's root.

### ENV File Example

    RSD_API_ENDPOINT=https://myServer:30600/api/scripts/upload
    RSD_API_TOKEN=7NVYAj2hQd6cTt9BX8ceB3ee8AsAQp
    RSD_ENVIRONMENT=dev

## Tasks
The project provides the following tasks:

- `init` - Creates default configuration.
- `build` - Builds JavaScript bundles.
- `deploy` - Deploys the bundles to a server.