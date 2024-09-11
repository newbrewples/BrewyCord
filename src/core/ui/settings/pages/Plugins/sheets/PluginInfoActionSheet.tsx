import { formatString, Strings } from "@core/i18n";
import PluginReporter from "@core/reporter/PluginReporter";
import { UnifiedPluginModel } from "@core/ui/settings/pages/Plugins/models/UnifiedPluginModel";
import { showConfirmationAlert } from "@core/vendetta/ui/alerts";
import PluginManager from "@lib/addons/plugins/PluginManager";
import { findAssetId } from "@lib/api/assets";
import { purgeStorage } from "@lib/api/storage";
import { Codeblock } from "@lib/ui/components";
import { lazyDestructure } from "@lib/utils/lazy";
import { findByProps } from "@metro";
import { clipboard } from "@metro/common";
import { ActionSheet, Button, Card, Stack, TableRow, TableRowGroup, TableSwitch, Text } from "@metro/common/components";
import { hideSheet } from "@ui/sheets";
import { showToast } from "@ui/toasts";
import { useReducer } from "react";
import { View } from "react-native";

import { TitleComponent } from "./TitleComponent";
import { PluginInfoActionSheetProps } from "./types";

const { ScrollView } = lazyDestructure(() => findByProps("NativeViewGestureHandler"));

export default function PluginInfoActionSheet({ plugin, navigation }: PluginInfoActionSheetProps) {
    plugin.usePluginState();

    const pluginSettings = PluginManager.settings[plugin.id];
    const SettingsComponent = plugin.getPluginSettingsComponent();

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
            <TableRowGroup title="Configurations">
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
            </TableRowGroup>
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

