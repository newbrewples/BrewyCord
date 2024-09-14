import { formatString, Strings } from "@core/i18n";
import PluginReporter from "@core/reporter/PluginReporter";
import { UnifiedPluginModel } from "@core/ui/settings/pages/Plugins/models/UnifiedPluginModel";
import { showConfirmationAlert } from "@core/vendetta/ui/alerts";
import PluginManager from "@lib/addons/plugins/PluginManager";
import { BunnyPluginManifest, OptionDefinition } from "@lib/addons/plugins/types";
import { findAssetId } from "@lib/api/assets";
import { purgeStorage } from "@lib/api/storage";
import { Codeblock } from "@lib/ui/components";
import { lazyDestructure } from "@lib/utils/lazy";
import { findByProps } from "@metro";
import { clipboard } from "@metro/common";
import { ActionSheet, Button, Card, Stack, TableCheckboxRow, TableRadioGroup, TableRadioRow, TableRow, TableRowGroup, TableSwitch, TableSwitchRow, Text, TextArea, TextInput } from "@metro/common/components";
import { hideSheet } from "@ui/sheets";
import { showToast } from "@ui/toasts";
import { useReducer, useState } from "react";
import { View } from "react-native";

import { TitleComponent } from "./TitleComponent";
import { PluginInfoActionSheetProps } from "./types";

const { ScrollView } = lazyDestructure(() => findByProps("NativeViewGestureHandler"));

const TEMP_OPT: BunnyPluginManifest["options"] & {} = {
    duh: {
        type: "string",
        label: "Duh.",
        description: "Do the actual duh that duhing the duh.",
        icon: "CopyIcon",
        placeholder: "nhh"
    },
    dah: {
        type: "boolean",
        label: "Dah.",
        description: "The beauty of the dah-wn",
        icon: "DownloadIcon"
    },
    deh: {
        type: "select",
        label: "Deh.",
        description: "Do that lah, deh!",
        options: [
            {
                label: "kldsjkldf",
                description: "kldjklfd, skdjfl, sjkdlf!",
                value: 9
            },
            {
                label: "kldnjhjkhsjkldf",
                description: "dlkjf, sdkfsd, kjfasif~",
                value: 99
            }
        ]
    },
    dih: {
        type: "radio",
        label: "Dih",
        description: "Wutchu dih dih ting?",
        options: [
            {
                label: "Duhdshf",
                description: "Djfdkfifoe kdfof dsi d & dkkjlsdaf!",
                value: 0
            },
            {
                label: "KJfjk",
                description: "JKjkjfdljklfdkjlfd kjlfd jkldffjkl d.",
                value: 1
            }
        ]
    }
};

function OptionDefRow({ opt }: { opt: OptionDefinition }) {
    const [current, setCurrent] = useState<string | undefined>();

    switch (opt.type) {
        case "string":
            const Input = opt.textArea === true ? TextArea : TextInput;
            const isValid = () => opt.regexValidation ? current?.match(opt.regexValidation) : true;

            return <TableRow
                label={<Input
                    size="sm" // TextInput specific, but it's fine
                    label={opt.label}
                    placeholder={opt.placeholder}
                    value={current}
                    onChange={(v: string) => setCurrent(v)}
                    state={isValid() ? "error" : undefined}
                    errorMessage={isValid() ? undefined : "Invalid input"}
                />}
                subLabel={opt.description}
                icon={getIcon(opt.icon)}
            />;
        case "boolean":
            return <TableSwitchRow
                label={opt.label}
                subLabel={opt.description}
                icon={getIcon(opt.icon)}
                value={current === "true"}
                onValueChange={() => {
                    // Absolute horror
                    setCurrent(v => String(String(v) !== "true"));
                }}
            />;
        case "select":
            return <Card start={false} end={false} variant="secondary">
                <TableRowGroup title={opt.label}>
                    {opt.options.map(def => {
                        return <TableCheckboxRow
                            label={def.label}
                            subLabel={def.description}
                            icon={getIcon(def.icon)}
                            checked={def.value === current}
                            onPress={() => {}}
                        />;
                    })}
                </TableRowGroup>
                <Text style={{ marginTop: 8 }} color="text-secondary" variant="text-sm/normal">
                    {opt.description}
                </Text>
            </Card>;
        case "radio":
            return <Card start={false} end={false} variant="secondary">
                <TableRadioGroup title={opt.label} value={String(opt.options[0].value)} onChange={() => {}}>
                    {opt.options.map(def => {
                        return <TableRadioRow
                            label={def.label}
                            subLabel={def.description}
                            icon={getIcon(def.icon)}
                            value={String(def.value)}
                        />;
                    })}
                </TableRadioGroup>
                <Text style={{ marginTop: 8 }} color="text-secondary" variant="text-sm/normal">
                    {opt.description}
                </Text>
            </Card>;
        case "slider":
    }
}

function getIcon(icon: OptionDefinition["icon"]) {
    if (!icon) return;

    return <TableRow.Icon
        source={typeof icon === "string" ? findAssetId(icon) : icon}
    />;
}

function OptionSection({ plugin, navigation }: { plugin: UnifiedPluginModel, navigation: any }) {
    const manifest = PluginManager.getManifest(plugin.id);
    const SettingsComponent = plugin.getPluginSettingsComponent();

    return <TableRowGroup title="Configurations">
        {Object.entries(manifest.options ?? {} /* ?? TEMP_OPT */).map(([name, def]) => {
            return <OptionDefRow opt={def} />;
        })}
        <TableRow
            arrow={true}
            label="More..."
            icon={<TableRow.Icon source={findAssetId("WrenchIcon")} />}
            disabled={!SettingsComponent}
            onPress={() => {
                hideSheet("PluginInfoActionSheet");
                navigation.push("BUNNY_CUSTOM_PAGE", {
                    title: plugin.name,
                    render: SettingsComponent,
                });
            }}
        />
    </TableRowGroup>;
}


export default function PluginInfoActionSheet({ plugin, navigation }: PluginInfoActionSheetProps) {
    plugin.usePluginState();

    const pluginSettings = PluginManager.settings[plugin.id];

    return <ActionSheet>
        <ScrollView style={{ paddingVertical: 8 }} contentContainerStyle={{ gap: 18 }}>
            <View style={{ flexDirection: "row", alignItems: "center", paddingTop: 24 }}>
                <TitleComponent plugin={plugin} />
                <Toggle plugin={plugin} />
            </View>
            {PluginReporter.errors[plugin.id] && <Card style={{ gap: 8 }}>
                <Text color="text-danger" variant="eyebrow">Error</Text>
                <Text variant="heading-md/normal">An error occured while starting the plugin.</Text>
                <Codeblock selectable={true}>{String(PluginReporter.getError(plugin.id))}</Codeblock>
                {/* <Button style={{ marginTop: 4 }} text="See more" onPress={() => {}} /> */}
            </Card>}
            <OptionSection plugin={plugin} navigation={navigation} />
            <TableRowGroup title="Actions">
                <Stack>
                    <ScrollView
                        horizontal={true}
                        contentContainerStyle={{ gap: 4 }}
                    >
                        <Button
                            size="md"
                            variant="secondary"
                            text={Strings.REFETCH}
                            icon={findAssetId("RetryIcon")}
                            onPress={async () => {
                                const isEnabled = pluginSettings.enabled;
                                if (isEnabled) PluginManager.stop(plugin.id);

                                try {
                                    await PluginManager.refetch(plugin.id);
                                    showToast(Strings.PLUGIN_REFETCH_SUCCESSFUL, findAssetId("toast_image_saved"));
                                } catch {
                                    showToast(Strings.PLUGIN_REFETCH_FAILED, findAssetId("Small"));
                                }

                                if (isEnabled) await PluginManager.start(plugin.id);
                            }}
                        />
                        <Button
                            size="md"
                            variant="secondary"
                            text={Strings.COPY_URL}
                            icon={findAssetId("LinkIcon")}
                            onPress={() => {
                                clipboard.setString(PluginManager.traces[plugin.id].sourceUrl);
                                showToast.showCopyToClipboard();
                            }}
                        />
                        <Button
                            size="md"
                            variant="secondary"
                            text={pluginSettings.autoUpdate ? Strings.DISABLE_UPDATES : Strings.ENABLE_UPDATES}
                            icon={findAssetId("DownloadIcon")}
                            onPress={() => {
                                pluginSettings.autoUpdate = !pluginSettings.autoUpdate;
                                showToast(formatString("TOASTS_PLUGIN_UPDATE", {
                                    update: pluginSettings.autoUpdate,
                                    name: plugin.name
                                }), findAssetId("toast_image_saved"));
                            }}
                        />
                        <Button
                            size="md"
                            variant="destructive"
                            text={Strings.CLEAR_DATA}
                            icon={findAssetId("CopyIcon")}
                            onPress={() => showConfirmationAlert({
                                title: Strings.HOLD_UP,
                                content: formatString("ARE_YOU_SURE_TO_CLEAR_DATA", { name: plugin.name }),
                                confirmText: Strings.CLEAR,
                                cancelText: Strings.CANCEL,
                                confirmColor: "red",
                                onConfirm: async () => {
                                    if (pluginSettings.enabled) PluginManager.stop(plugin.id);

                                    try {
                                        await PluginManager.fetch(plugin.id);
                                        showToast(Strings.PLUGIN_REFETCH_SUCCESSFUL, findAssetId("toast_image_saved"));
                                    } catch {
                                        showToast(Strings.PLUGIN_REFETCH_FAILED, findAssetId("Small"));
                                    }

                                    let message: any[];
                                    try {
                                        purgeStorage(`plugins/storage/${PluginManager.sanitizeId(plugin.id)}.json`);
                                        message = ["CLEAR_DATA_SUCCESSFUL", "trash"];
                                    } catch {
                                        message = ["CLEAR_DATA_FAILED", "Small"];
                                    }

                                    showToast(
                                        formatString(message[0], { name: plugin.name }),
                                        findAssetId(message[1])
                                    );

                                    if (pluginSettings.enabled) await PluginManager.start(plugin.id);
                                    hideSheet("PluginInfoActionSheet");
                                }
                            })}
                        />
                        <Button
                            size="md"
                            variant="destructive"
                            text={Strings.DELETE}
                            icon={findAssetId("TrashIcon")}
                            onPress={() => showConfirmationAlert({
                                title: Strings.HOLD_UP,
                                content: formatString("ARE_YOU_SURE_TO_DELETE_PLUGIN", { name: plugin.name }),
                                confirmText: Strings.DELETE,
                                cancelText: Strings.CANCEL,
                                confirmColor: "red",
                                onConfirm: async () => {
                                    try {
                                        await PluginManager.uninstall(plugin.id);
                                    } catch (e) {
                                        showToast(String(e), findAssetId("Small"));
                                    }
                                    hideSheet("PluginInfoActionSheet");
                                }
                            })}
                        />
                    </ScrollView>
                </Stack>
            </TableRowGroup>
        </ScrollView>
    </ActionSheet>;
}

function Toggle({ plugin }: { plugin: UnifiedPluginModel }) {
    const forceUpdate = useReducer(n => ~n, 0)[1]; // React bug hack
    plugin.usePluginState();

    return <View style={{ marginLeft: "auto" }}>
        <TableSwitch
            value={plugin.isEnabled()}
            onValueChange={async (v: boolean) => {
                await plugin.toggle(v);
                forceUpdate();
            }}
        />
    </View>;
}

