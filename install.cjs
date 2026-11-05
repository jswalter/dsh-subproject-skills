#!/usr/bin/env node
'use strict';
const installer = require('./scripts/plugin-installer.cjs');
module.exports = installer;
if (require.main === module) installer.main('skills').catch(error => { console.error(error.message); process.exitCode = 1; });
