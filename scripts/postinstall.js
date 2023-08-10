#!/usr/bin/env node

/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

const { execSync } = require('child_process');
const { existsSync } = require('fs');
const { resolve } = require('path');
const { build } = require('./esbuild-renderer');

if (!existsSync(`scripts/nordic-publish.js`)) {
    const command = `npx esbuild scripts/nordic-publish.ts --bundle --outfile=scripts/nordic-publish.js --platform=node --log-level=warning --minify`;
    execSync(command, { encoding: 'utf-8' });
}

if (!existsSync(`dist/bootstrap.css`)) {
    build({
        logLevel: 'warning',
        entryPoints: ['./src/bootstrap.scss'],
        outfile: 'dist/bootstrap.css',
        sourcemap: false,
    });
}

if (!existsSync(`typings/generated/src/index.d.ts`)) {
    const root = resolve(__dirname, '..');
    process.chdir(root);

    execSync('npm run generate-types', { encoding: 'utf-8' });
}
