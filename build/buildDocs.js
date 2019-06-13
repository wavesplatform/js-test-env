const fs = require('fs');
const {execSync} = require('child_process');


const interfacesPath = './node_modules/@waves/waves-transactions/dist/transactions.d.ts';
const mainPath = 'src/index.ts';
const typedocPath = './node_modules/typedoc/bin/typedoc';

// check module comment injected into transactions.d.ts
const interfacesContent = fs.readFileSync(interfacesPath, "utf8");

const modulePrefix = '/**\n' +
    ' * @module Interfaces\n' +
    ' */\n'

if (!interfacesContent.startsWith(modulePrefix)) {
    const firstImportIndex = interfacesContent.indexOf('import');
    fs.writeFileSync(interfacesPath, modulePrefix, "utf-8")
    fs.appendFileSync(interfacesPath, interfacesContent.slice(firstImportIndex), "utf-8")
}

execSync(`${typedocPath} --listFiles ${mainPath} ${interfacesPath}`)
console.log('Docs built successfully')


