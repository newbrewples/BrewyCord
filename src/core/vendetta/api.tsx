import { logger } from "@core/logger";
import { connectToDebugger } from "@core/logger/debugger";
import BunnySettings from "@core/storage/BunnySettings";
import * as alerts from "@core/vendetta/ui/alerts";
import PluginManager from "@lib/addons/plugins/PluginManager";
import ColorManager from "@lib/addons/themes/colors/ColorManager";
import * as assets from "@lib/api/assets";
import * as commands from "@lib/api/commands";
import * as debug from "@lib/api/debug";
import { getVendettaLoaderIdentity, LOADER_IDENTITY } from "@lib/api/native/loader";
import patcher from "@lib/api/patcher";
import { isSemanticColor, resolveSemanticColor } from "@lib/ui/styles";
import * as utils from "@lib/utils";
import { cyrb64Hash } from "@lib/utils/cyrb64";
import * as metro from "@metro";
import * as common from "@metro/common";
import { Forms } from "@metro/common/components";
import * as commonComponents from "@metro/common/components";
import * as components from "@ui/components";
import * as toasts from "@ui/toasts";
import { omit } from "es-toolkit";
import { memoize } from "lodash";
import { createElement, useEffect } from "react";
import { StyleSheet, View } from "react-native";

import * as storage from "./storage";

// cursed code here we come
function createPluginsObject() {
    // Making it mutating-compatible requires too much effort, so the need for it has to be looked into before implementing (ehem CloudSync)
    const makeObject = memoize(
        () => PluginManager.getAllIds()
            .reduce((obj, id) => Object.assign(obj, {
                [PluginManager.traces[id].sourceUrl]: {
                    id: PluginManager.traces[id].sourceUrl,
                    manifest: PluginManager.convertToVd(PluginManager.getManifest(id)),
                    get enabled() { return PluginManager.settings[id].enabled; },
                    get update() { return PluginManager.settings[id].autoUpdate; },
                    get js() { return "()=>{}"; }, // There's no way to get this synchronously anymore (lazy-loaded)
                }
            }), {}),
        () => PluginManager.getAllIds().length
    );

    return {
        plugins: storage.createProxy(new Proxy({}, {
            ...Object.fromEntries(
                Object.getOwnPropertyNames(Reflect)
                    // @ts-expect-error
                    .map(k => [k, (t: unknown, ...a: any[]) => Reflect[k](makeObject(), ...a)])
            ),
        })).proxy,
        fetchPlugin: (source: string) => PluginManager.fetch(source),
        installPlugin: (source: string, enabled = true) => PluginManager.install(source, { enable: enabled }),
        startPlugin: (id: string) => PluginManager.start(id),
        stopPlugin: (id: string, disable = true) => {
            disable ? PluginManager.stop(id) : PluginManager.disable(id);
        },
        removePlugin: (id: string) => PluginManager.uninstall(id, { keepData: false }),
        getSettings: (id: string) => PluginManager.getSettingsComponent(id)
    };
}

function createThemesObject() {
    const makeObject = memoize(
        () => ColorManager.getAllIds()
            .reduce((obj, id) => Object.assign(obj, {
                [ColorManager.infos[id].sourceUrl]: {
                    id: ColorManager.infos[id].sourceUrl,
                    get selected() {
                        return ColorManager.preferences.selected === id;
                    },
                    data: ColorManager.convertToVd(ColorManager.getManifest(id))
                }
            }), {}),
        () => ColorManager.getAllIds().length
    );

    return {
        themes: storage.createProxy(new Proxy({}, {
            ...Object.fromEntries(
                Object.getOwnPropertyNames(Reflect)
                    // @ts-expect-error
                    .map(k => [k, (t: unknown, ...a: any[]) => Reflect[k](makeObject(), ...a)])
            ),
        })).proxy,
        fetchTheme: (id: string, selected?: boolean) => selected ? ColorManager.refresh(id) : ColorManager.fetch(id),
        installTheme: (id: string) => ColorManager.install(id),
        selectTheme: (id: string) => ColorManager.select(id === "default" ? null : id),
        removeTheme: (id: string) => ColorManager.uninstall(id),
        getCurrentTheme: () => {
            const { selected } = ColorManager.preferences;
            const manifest = ColorManager.getCurrentManifest();
            if (selected == null || manifest == null) return null;

            return {
                id: ColorManager.getId(manifest, ColorManager.infos[selected].sourceUrl),
                data: ColorManager.convertToVd(manifest),
                selected: true
            };
        },
        updateThemes: () => ColorManager.updateAll()
    };
}

export const initVendettaObject = (): any => {
    // pitfall: this assumes the returning module(s) are the same within the same location
    // find(m => m.render?.name === "ActionSheet") - would work fine
    // ["trackThis", "trackThat"].forEach(p => find(m => m[p])) - would not
    const createStackBasedFilter = (fn: any) => {
        return (filter: (m: any) => boolean) => {
            return fn(metro.factories.createSimpleFilter(filter, cyrb64Hash(new Error().stack!)));
        };
    };

    const api = window.vendetta = {
        patcher: {
            before: patcher.before,
            after: patcher.after,
            instead: patcher.instead
        },
        metro: {
            modules: window.modules,
            find: createStackBasedFilter(metro.findExports),
            findAll: createStackBasedFilter(metro.findAllExports),
            findByProps: (...props: any[]) => {
                // TODO: remove this hack to fix Decor
                if (props.length === 1 && props[0] === "KeyboardAwareScrollView") {
                    props.push("listenToKeyboardEvents");
                }

                const ret = metro.findByProps(...props);
                if (ret == null) {
                    if (props.includes("ActionSheetTitleHeader")) {
                        const module = metro.findByProps("ActionSheetRow");

                        // returning a fake object probably wouldn't cause an issue,
                        // since the original object are full of getters anyway
                        return {
                            ...module,
                            ActionSheetTitleHeader: module.BottomSheetTitleHeader,
                            ActionSheetContentContainer: ({ children }: any) => {
                                useEffect(() => logger.warn("Discord has removed 'ActionSheetContentContainer', please move into something else. This has been temporarily replaced with View"), []);
                                return createElement(View, null, children);
                            }
                        };
                    }
                }

                return ret;
            },
            findByPropsAll: (...props: any) => metro.findByPropsAll(...props),
            findByName: (name: string, defaultExp?: boolean | undefined) => {
                // TODO: remove this hack to fix Decor
                if (name === "create" && typeof defaultExp === "undefined") {
                    return metro.findByName("create", false).default;
                }

                return metro.findByName(name, defaultExp ?? true);
            },
            findByNameAll: (name: string, defaultExp: boolean = true) => metro.findByNameAll(name, defaultExp),
            findByDisplayName: (displayName: string, defaultExp: boolean = true) => metro.findByDisplayName(displayName, defaultExp),
            findByDisplayNameAll: (displayName: string, defaultExp: boolean = true) => metro.findByDisplayNameAll(displayName, defaultExp),
            findByTypeName: (typeName: string, defaultExp: boolean = true) => metro.findByTypeName(typeName, defaultExp),
            findByTypeNameAll: (typeName: string, defaultExp: boolean = true) => metro.findByTypeNameAll(typeName, defaultExp),
            findByStoreName: (name: string) => metro.findByStoreName(name),
            common: {
                constants: common.constants,
                channels: common.channels,
                i18n: common.i18n,
                url: common.url,
                toasts: common.toasts,
                stylesheet: {
                    createThemedStyleSheet: function createThemedStyleSheet(sheet: any) {
                        for (const key in sheet) {
                            // @ts-ignore
                            sheet[key] = new Proxy(StyleSheet.flatten(sheet[key]), {
                                get(target, prop, receiver) {
                                    const res = Reflect.get(target, prop, receiver);
                                    return isSemanticColor(res) ? resolveSemanticColor(res) : res;
                                }
                            });
                        }

                        return sheet;
                    }
                },
                clipboard: common.clipboard,
                assets: common.assets,
                invites: common.invites,
                commands: common.commands,
                navigation: common.navigation,
                navigationStack: common.navigationStack,
                NavigationNative: common.NavigationNative,
                Flux: common.Flux,
                FluxDispatcher: common.FluxDispatcher,
                React: common.React,
                ReactNative: common.ReactNative,
                moment: require("moment"),
                chroma: require("chroma-js"),
                lodash: require("lodash"),
                util: require("util")
            }
        },
        constants: {
            DISCORD_SERVER: "https://discord.gg/n9QQ4XhhJP",
            GITHUB: "https://github.com/vendetta-mod",
            PROXY_PREFIX: "https://vd-plugins.github.io/proxy",
            HTTP_REGEX: /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&/=]*)$/,
            HTTP_REGEX_MULTI: /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_+.~#?&//=]*)/g,
            DISCORD_SERVER_ID: "1015931589865246730",
            PLUGINS_CHANNEL_ID: "1091880384561684561",
            THEMES_CHANNEL_ID: "1091880434939482202",
        },
        utils: {
            findInReactTree: (tree: { [key: string]: any; }, filter: any) => utils.findInReactTree(tree, filter),
            findInTree: (tree: any, filter: any, options: any) => utils.findInTree(tree, filter, options),
            safeFetch: (input: RequestInfo | URL, options?: RequestInit | undefined, timeout?: number | undefined) => utils.safeFetch(input, options, timeout),
            unfreeze: (obj: object) => Object.isFrozen(obj) ? ({ ...obj }) : obj,
            without: (object: any, ...keys: any) => omit(object, keys)
        },
        debug: {
            connectToDebugger: (url: string) => connectToDebugger(url),
            getDebugInfo: () => debug.getDebugInfo()
        },
        ui: {
            components: {
                Forms,
                General: common.ReactNative,
                Alert: commonComponents.LegacyAlert,
                Button: commonComponents.CompatButton,
                HelpMessage: (...props: any[]) => <commonComponents.HelpMessage {...props} />,
                SafeAreaView: (...props: any[]) => <commonComponents.SafeAreaView {...props} />,
                Summary: components.Summary,
                ErrorBoundary: components.ErrorBoundary,
                Codeblock: components.Codeblock,
                Search: components.Search
            },
            toasts: {
                showToast: (content: string, asset?: number) => toasts.showToast(content, asset)
            },
            alerts: {
                showConfirmationAlert: (options: any) => alerts.showConfirmationAlert(options),
                showCustomAlert: (component: React.ComponentType<any>, props: any) => alerts.showCustomAlert(component, props),
                showInputAlert: (options: any) => alerts.showInputAlert(options)
            },
            assets: {
                all: new Proxy<any>({}, {
                    get(cache, p) {
                        if (typeof p !== "string") return undefined;
                        if (cache[p]) return cache[p];

                        for (const asset of assets.iterateAssets()) {
                            if (asset.name) return cache[p] = asset;
                        }
                    },
                    ownKeys(cache) {
                        const keys = new Set<string>();

                        for (const asset of assets.iterateAssets()) {
                            cache[asset.name] = asset;
                            keys.add(asset.name);
                        }

                        return [...keys];
                    },
                }),
                find: (filter: (a: any) => boolean) => assets.findAsset(filter),
                getAssetByName: (name: string) => assets.findAsset(name),
                getAssetByID: (id: number) => assets.findAsset(id),
                getAssetIDByName: (name: string) => assets.findAssetId(name)
            },
            semanticColors: common.tokens.colors,
            rawColors: common.tokens.unsafe_rawColors
        },
        plugins: createPluginsObject(),
        themes: createThemesObject(),
        commands: {
            registerCommand: commands.registerCommand
        },
        storage: {
            createProxy: (target: any) => storage.createProxy(target),
            useProxy: (_storage: any) => storage.useProxy(_storage),
            createStorage: (backend: any) => storage.createStorage(backend),
            wrapSync: (store: any) => storage.wrapSync(store),
            awaitSyncWrapper: (store: any) => storage.awaitStorage(store),
            createMMKVBackend: (store: string) => storage.createMMKVBackend(store),
            createFileBackend: (file: string) => {
                // Redirect path to vendetta_theme.json
                if (LOADER_IDENTITY.type === "bunny" && file === "vendetta_theme.json") {
                    file = "pyoncord/current-theme.json";
                }

                return storage.createFileBackend(file);
            }
        },
        settings: {
            get debuggerUrl() { return BunnySettings.developer.debuggerUrl; },
            get developerSettings() { return BunnySettings.developer.enabled; },
            get enableDiscordDeveloperSettings() { return BunnySettings.general.patchIsStaff; },
            get safeMode() { return { enabled: BunnySettings.isSafeMode() }; },
            get enableEvalCommand() { return BunnySettings.developer.evalCommandEnabled; }
        },
        loader: {
            identity: getVendettaLoaderIdentity() ?? void 0,
            config: BunnySettings.loader,
        },
        logger: {
            log: (...message: any) => console.log(...message),
            info: (...message: any) => console.info(...message),
            warn: (...message: any) => console.warn(...message),
            error: (...message: any) => console.error(...message),
            time: (...message: any) => console.time(...message),
            trace: (...message: any) => console.trace(...message),
            verbose: (...message: any) => console.log(...message)
        },
        version: debug.getDebugInfo().vendetta.version,
        unload: () => {
            delete window.vendetta;
        },
    };

    return () => api.unload();
};
