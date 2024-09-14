import { logger } from "@core/logger";
import { BunnyManifest } from "@lib/addons/types";
import { createStorage } from "@lib/api/storage";

export interface PluginSettingsStorage {
    [pluginId: string]: {
        enabled: boolean;
        autoUpdate: boolean;
    };
}

export interface PluginTracesStorage {
    [pluginId: string]: {
        sourceUrl: string;
        installTime: string | null;
        isVendetta?: boolean;
    }
}

export interface BunnyPluginManifest extends BunnyManifest {
    main: string;
    hash: string;
    options?: Record<string, OptionDefinition>;
}

export type OptionDefinition = StringOptionDefinition | BooleanOptionDefinition | SelectOptionDefinition | RadioOptionDefinition | SliderOptionDefinition | SelectOptionDefinition;

type OptionType = "string" | "boolean" | "select" | "radio" | "slider";

interface OptionDefinitionBase {
    type: OptionType;
    label: string;
    description?: string;
    icon?: string | { uri: string };
}

interface StringOptionDefinition extends OptionDefinitionBase {
    type: "string";
    placeholder?: string;
    defaults?: string;
    textArea?: boolean;
    regexValidation?: string;
}

interface BooleanOptionDefinition extends OptionDefinitionBase {
    type: "boolean";
    defaults?: boolean;
}

interface SelectOptionDefinition extends OptionDefinitionBase {
    type: "select";
    options: SelectRadioOptionRow[];
}

interface RadioOptionDefinition extends OptionDefinitionBase {
    type: "radio";
    options: SelectRadioOptionRow[];
}

interface SliderOptionDefinition extends OptionDefinitionBase {
    type: "slider";
    points: number[];
    default?: number;
}

interface SelectRadioOptionRow {
    label: string;
    description?: string;
    icon?: string | { uri: string };
    value: string | number | boolean;
    default?: boolean;
}


export interface PluginInstance {
    start?(): void | Promise<void>;
    stop?(): void | Promise<void>;
    SettingsComponent?(): JSX.Element;
}

export interface PluginInstanceInternal extends PluginInstance {
    readonly manifest: BunnyPluginManifest;
}

export interface BunnyPluginProperty {
    readonly logger: typeof logger;
    readonly manifest: BunnyPluginManifest;
    createStorage<T extends object>(): ReturnType<typeof createStorage<T>>;
}

export type BunnyPluginObject = typeof window.bunny & {
    plugin: BunnyPluginProperty;
};
