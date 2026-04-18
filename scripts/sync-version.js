// sync-version.js
// Reads the version npm just wrote to package.json and mirrors it into manifest.json.
// Runs automatically as part of "npm version <patch|minor|major>".

const fs   = require('fs');
const path = require('path');

const root        = path.join(__dirname, '..');
const packagePath  = path.join(root, 'package.json');
const manifestPath = path.join(root, 'manifest.json');

const newVersion = JSON.parse(fs.readFileSync(packagePath, 'utf8')).version;

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.version = newVersion;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf8');

console.log(`manifest.json version synced to ${newVersion}`);
