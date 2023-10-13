/*
 * Copyright (c) 2023 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import packageJson from '../src/utils/packageJson';
import {
    Dependency,
    isIncrementalVersion,
    isSemanticVersion,
    isStringVersion,
    SubDependency,
} from './sandboxTypes';

export const describeVersion = (version?: SubDependency | string) => {
    if (typeof version === 'string') {
        return version;
    }

    if (isSemanticVersion(version)) {
        return `${version.version.major}.${version.version.minor}.${version.version.patch}`;
    }

    if (isIncrementalVersion(version) || isStringVersion(version)) {
        return String(version.version);
    }

    return 'Unknown';
};

type KnownModule = 'nrfdl' | 'jprog' | 'JlinkARM';

const findTopLevel = (module: KnownModule, dependencies: Dependency[]) =>
    dependencies.find(dependency => dependency.name === module);

const findInDependencies = (
    module: KnownModule,
    dependencies: Dependency[]
) => {
    if (dependencies.length > 0) {
        return resolveModuleVersion(
            module,
            dependencies.flatMap(dependency => [
                ...(dependency.dependencies ?? []),
                ...(dependency.plugins?.flatMap(
                    plugin => plugin.dependencies
                ) ?? []),
            ])
        );
    }
};

export const resolveModuleVersion = (
    module: KnownModule,
    versions: Dependency[] = []
): Dependency | SubDependency | undefined =>
    findTopLevel(module, versions) ?? findInDependencies(module, versions);

export const versionToInstall = (
    module: string,
    version: string | undefined
) => {
    if (version != null) {
        return version;
    }

    const env = { ...process.env };
    let overrideVersion: string | undefined;
    if (
        process.env.NODE_ENV !== 'production' ||
        (process.env.NODE_ENV === 'production' &&
            !!process.env.NRF_OVERRIDE_NRFUTIL_SETTINGS)
    ) {
        overrideVersion =
            env[`NRF_OVERRIDE_VERSION_${module.toLocaleUpperCase()}`] ??
            undefined;
    }

    const moduleVersions = overrideVersion
        ? [overrideVersion]
        : packageJson().nrfConnectForDesktop?.nrfutil?.[module];

    if (!version && (!moduleVersions || moduleVersions.length === 0)) {
        throw new Error(`No version specified for nrfutil-${module}`);
    }

    return moduleVersions?.[0] as string;
};
