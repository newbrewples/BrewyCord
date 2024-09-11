import { Author } from "@lib/addons/types";


export interface UnifiedPluginModel {
    id: string;
    name: string;
    description?: string;
    authors?: Array<Author>;
    icon?: string;

    isEnabled(): boolean;
    usePluginState(): void;
    isInstalled(): boolean;
    toggle(start: boolean): void | Promise<void>;
    resolveSheetComponent(): Promise<{ default: React.ComponentType<any>; }>;
    getPluginSettingsComponent(): React.ComponentType<any> | null | undefined;
}
