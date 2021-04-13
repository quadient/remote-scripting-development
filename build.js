#!/usr/bin/env node

const fs = require("fs");
const fsExtra = require("fs-extra");
const { FileTreeWalker } = require("file-tree-walker-ts");
const path = require("path");
const http = require("http");
const https = require("https");
const browserify = require("browserify");
const tsify = require("tsify");
const glob = require("glob");
const dotenv = require("dotenv");
const yargs = require("yargs/yargs");
const settings = require("pkg-config")("remote-scripting-development");

dotenv.config();

const isProductionEnvironment = process.env.RSD_ENVIRONMENT && process.env.RSD_ENVIRONMENT === "dev" ? false : true;
const buildDir = path.join(".", "dest");
const backupsDir = path.join(".", "backups");

yargs(process.argv.slice(2))
    .command("init", "Creates default configuration.", init)
    .command("build", "Builds JavaScript bundles.", build)
    .command("deploy", "Deploys the bundles to a server", deploy).argv;

function init() {
    fsExtra.copySync(path.join(__dirname, "defaults"), process.cwd());
}

function build() {
    fsExtra.removeSync(buildDir);

    glob(settings.sourceRootsPattern, (error, files) => {
        if (error) {
            console.log(error);
        } else {
            files.forEach((filePath) => {
                const pathParts = filePath.split("/");
                pathParts.shift();
                pathParts.unshift("dest");
                const fileName = pathParts.pop();
                const destinationPath = path.join(...pathParts);

                compile(filePath, (bundle) => {
                    createFile(destinationPath, fileName.replace(".ts", ".js"), bundle.toString());
                });
            });
        }
    });
}

function compile(filePath, onDone) {
    const absolutePath = path.join(process.cwd(), filePath);

    const b = browserify({
        basedir: process.cwd(),
    });
    b.add(absolutePath);
    b.plugin(tsify, {
        project: "tsconfig.json",
    });
    b.bundle((error, buffer) => {
        if (error) {
            console.error(error);
        } else {
            onDone(buffer);
        }
    });
}

function createFile(directory, filename, content) {
    fsExtra.ensureDir(directory).then(() => {
        fs.writeFile(path.join(directory, filename), content, (error) => {
            if (error) {
                return console.log(error);
            } else {
                console.log(`File ${filename} saved`);
            }
        });
    });
}

async function deploy() {
    const package = await packProject();

    sendPackage(package, (backup) => {
        if (backup.length > 0) {
            backupPackage(backup);
        }
    });
}

async function packProject() {
    const package = {};

    return new FileTreeWalker()
        .onFile((filePath, _filename, _fileExtension, content) => {
            const filePathParts = filePath.split(path.sep);

            filePathParts.shift();
            package[filePathParts.join("/")] = content.toString();
        })
        .walk("dest")
        .then(() => package);
}

function sendPackage(package, onDone) {
    const url = new URL(process.env.RSD_API_ENDPOINT);
    const httpModule = url.protocol ? https : http;
    const updateRequest = httpModule.request(url, createRequestSettings(), (res) => {
        const chunks = [];

        res.on("data", (chunk) => {
            chunks.push(chunk);
        });

        res.on("end", () => {
            const body = Buffer.concat(chunks).toString();
            const parsedBody = JSON.parse(body);

            console.log("Deployed");

            onDone(parsedBody);
        });

        res.on("error", (error) => {
            console.error(error);
        });
    });

    updateRequest.write(JSON.stringify(package));
    updateRequest.end();
}

function backupPackage(package) {
    for (let item in package) {
        const backupPath = path.join(backupsDir, item);
        const backupPathParts = backupPath.split("\\");
        const fileName = backupPathParts.pop();

        createFile(backupPathParts.join("\\"), fileName, package[item]);
    }
}

function createRequestSettings() {
    const apiToken = process.env.RSD_API_TOKEN;

    return {
        method: "POST",
        headers: {
            "Content-Type": "text/plain",
            Authorization: `Bearer perm: ${apiToken}`,
        },
        rejectUnauthorized: isProductionEnvironment, // allows self-signed certificates in development production
    };
}