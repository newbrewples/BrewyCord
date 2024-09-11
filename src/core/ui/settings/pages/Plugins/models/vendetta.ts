import PluginManager from "@lib/addons/plugins/PluginManager";
import { BunnyPluginManifest } from "@lib/addons/plugins/types";

import { UnifiedPluginModel } from "./UnifiedPluginModel";

export default function unifyVdPlugin(manifest: BunnyPluginManifest): UnifiedPluginModel {
    return {
        id: manifest.id,
        name: manifest.display.name,
        description: manifest.display.description,
        authors: manifest.display.authors,
        icon: manifest.extras?.vendetta?.icon,

        isEnabled: () => PluginManager.settings[manifest.id].enabled,
        isInstalled: () => Boolean(PluginManager.settings[manifest.id]),
        usePluginState() {
            PluginManager.usePlugin(manifest.id);
        },
        toggle(start: boolean) {
            return start
                ? PluginManager.enable(manifest.id)
                : PluginManager.disable(manifest.id);
        },
        resolveSheetComponent() {
            return import("../sheets/PluginInfoActionSheet");
        },
        getPluginSettingsComponent() {
            return PluginManager.getSettingsComponent(manifest.id);
        },
    };
}
