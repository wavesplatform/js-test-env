const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {rmdir} = require('./utils');


const mainIn = './src/index.d.ts';
const interfacesIn = './node_modules/@waves/waves-transactions/dist/transactions.d.ts';
const mainOut = './build/global.d.ts';
const interfacesOut = './build/transactions.d.ts';
const typedocPkgPath = require.resolve('typedoc/package.json');
const typedocBinRelPath = require(typedocPkgPath).bin.typedoc;
const typedocPath = path.join(path.dirname(typedocPkgPath), typedocBinRelPath);
//
if (!fs.existsSync('build')) {
    fs.mkdirSync('build');
    // rmdir('build')
}

// splice-start
// Prepare main file
const mainContent = fs.readFileSync(mainIn, "utf8").replace(/splice-start.*splice-end/sgm, '').trim().slice(0, -1);
fs.writeFileSync(mainOut, mainContent, "utf-8");

/// Prepare interface file
const modulePrefix = '/**\n' +
    ' * @module Interfaces\n' +
    ' */\n';
const interfacesContent = fs.readFileSync(interfacesIn, "utf8");
const firstExportIndex = interfacesContent.indexOf('export');
fs.mkdirSync(path.dirname(interfacesOut), {recursive: true});
fs.writeFileSync(interfacesOut, modulePrefix, "utf-8");
fs.appendFileSync(interfacesOut, interfacesContent.slice(firstExportIndex), "utf-8")


execFileSync(process.execPath, [
    typedocPath,
    '--tsconfig',
    'tsconfig.build-docs.json',
    '--entryPointStrategy',
    'expand',
    '--entryPoints',
    interfacesOut,
    mainOut
], {stdio: 'inherit'});
console.log('Docs built successfully');


