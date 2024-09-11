import { fileExists, readFile, writeFile } from "@lib/api/native/fs";
import { RTNClientInfoManager } from "@lib/api/native/rn-modules";
import { debounce } from "es-toolkit";

import { ModuleFlags, ModulesMapInternal } from "./enums";

const CACHE_VERSION = 55;
const BUNNY_METRO_CACHE_KEY = "__bunny_metro_cache_key__";

type ModulesMap = {
    [flag in number | `_${ModulesMapInternal}`]?: ModuleFlags;
};

let _metroCache = null as unknown as ReturnType<typeof buildInitCache>;

export const getMetroCache = window.__getMetroCache = () => _metroCache;

function buildInitCache() {
    const cache = {
        _v: CACHE_VERSION,
        _buildNumber: RTNClientInfoManager.Build as number,
        _modulesCount: Object.keys(window.modules).length,
        flagsIndex: {} as Record<string, number>,
        findIndex: {} as Record<string, ModulesMap | undefined>,
        polyfillIndex: {} as Record<string, ModulesMap | undefined>
    } as const;

    // Force load all modules so useful modules are pre-cached. Delay by a second
    // because force loading it all will results in an unexpected crash.
    setTimeout(() => {
        for (const id in window.modules) {
            require("./modules").requireModule(id);
        }
    }, 100);

    _metroCache = cache;
    return cache;
}

/** @internal */
export async function initMetroCache() {
    if (!await fileExists(BUNNY_METRO_CACHE_KEY)) return void buildInitCache();
    const rawCache = await readFile(BUNNY_METRO_CACHE_KEY);

    try {
        _metroCache = JSON.parse(rawCache);
        if (_metroCache._v !== CACHE_VERSION) {
            _metroCache = null!;
            throw "cache invalidated; cache version outdated";
        }
        if (_metroCache._buildNumber !== RTNClientInfoManager.Build) {
            _metroCache = null!;
            throw "cache invalidated; version mismatch";
        }
        if (_metroCache._modulesCount !== Object.keys(window.modules).length) {
            _metroCache = null!;
            throw "cache invalidated; modules count mismatch";
        }
    } catch {
        buildInitCache();
    }
}

const saveCache = debounce(() => {
    writeFile(BUNNY_METRO_CACHE_KEY, JSON.stringify(_metroCache));
}, 1000);

function extractExportsFlags(moduleExports: any) {
    if (!moduleExports) return undefined;

    const bit = ModuleFlags.EXISTS;
    return bit;
}

/** @internal */
export function indexExportsFlags(moduleId: number, moduleExports: any) {
    const flags = extractExportsFlags(moduleExports);
    if (flags && flags !== ModuleFlags.EXISTS) {
        _metroCache.flagsIndex[moduleId] = flags;
    }
}

/** @internal */
export function indexBlacklistFlag(id: number) {
    _metroCache.flagsIndex[id] |= ModuleFlags.BLACKLISTED;
}

/** @internal */
export function indexAssetModuleFlag(id: number) {
    _metroCache.flagsIndex[id] |= ModuleFlags.ASSET;
}

/** @internal */
export function getCacherForUniq(uniq: string, allFind: boolean) {
    const indexObject = _metroCache.findIndex[uniq] ??= {};

    return {
        cacheId(moduleId: number, exports: any) {
            indexObject[moduleId] ??= extractExportsFlags(exports);

            saveCache();
        },
        // Finish may not be called by single find
        finish(notFound: boolean) {
            if (allFind) indexObject[`_${ModulesMapInternal.FULL_LOOKUP}`] = 1;
            if (notFound) indexObject[`_${ModulesMapInternal.NOT_FOUND}`] = 1;

            saveCache();
        }
    };
}

/** @internal */
export function getPolyfillModuleCacher(name: string) {
    const indexObject = _metroCache.polyfillIndex[name] ??= {};

    return {
        getModules() {
            return require("@metro/internals/modules").getCachedPolyfillModules(name);
        },
        cacheId(moduleId: number) {
            indexObject[moduleId] = 1;
            saveCache();
        },
        finish() {
            indexObject[`_${ModulesMapInternal.FULL_LOOKUP}`] = 1;
            saveCache();
        }
    };
}
