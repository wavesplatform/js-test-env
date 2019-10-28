const fs = require('fs');

const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

packageJson.main = 'index.js'
packageJson.types = 'index.d.ts'
packageJson.scripts = {}

fs.writeFileSync('./dist/package.json', JSON.stringify(packageJson, null, 2));
