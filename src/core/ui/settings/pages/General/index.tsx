import { toggleSafeMode } from "@core/debug/safeMode";
import { Strings } from "@core/i18n";
import BunnySettings from "@core/storage/BunnySettings";
import { PyoncordIcon } from "@core/ui/settings";
import About from "@core/ui/settings/pages/General/About";
import { findAssetId } from "@lib/api/assets";
import { getDebugInfo } from "@lib/api/debug";
import { RTNBundleUpdaterManager } from "@lib/api/native/rn-modules";
import { DISCORD_SERVER, GITHUB } from "@lib/constants";
import { openAlert } from "@lib/ui/alerts";
import { NavigationNative, url } from "@metro/common";
import { AlertActionButton, AlertActions, AlertModal, Stack, TableRow, TableRowGroup, TableSwitchRow } from "@metro/common/components";
import { NativeModules, ScrollView } from "react-native";

export default function General() {
    BunnySettings.useSettings();

    const debugInfo = getDebugInfo();
    const navigation = NavigationNative.useNavigation();

    return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 38 }}>
            <Stack style={{ paddingVertical: 24, paddingHorizontal: 12 }} spacing={24}>
                <TableRowGroup title={Strings.INFO}>
                    <TableRow
                        label={Strings.BUNNY}
                        icon={<TableRow.Icon source={{ uri: PyoncordIcon }} />}
                        trailing={<TableRow.TrailingText text={debugInfo.bunny.version} />}
                    />
                    <TableRow
                        label={"Discord"}
                        icon={<TableRow.Icon source={findAssetId("Discord")!} />}
                        trailing={<TableRow.TrailingText text={`${debugInfo.discord.version} (${debugInfo.discord.build})`} />}
                    />
                    <TableRow
                        arrow
                        label={Strings.ABOUT}
                        icon={<TableRow.Icon source={findAssetId("CircleInformationIcon-primary")!} />}
                        onPress={() => navigation.push("BUNNY_CUSTOM_PAGE", {
                            title: Strings.ABOUT,
                            render: () => <About />,
                        })}
                    />
                </TableRowGroup>
                <TableRowGroup title={Strings.LINKS}>
                    <TableRow
                        arrow={true}
                        label={Strings.DISCORD_SERVER}
                        icon={<TableRow.Icon source={findAssetId("Discord")!} />}
                        onPress={() => url.openDeeplink(DISCORD_SERVER)}
                    />
                    <TableRow
                        arrow={true}
                        label={Strings.GITHUB}
                        icon={<TableRow.Icon source={findAssetId("img_account_sync_github_white")!} />}
                        onPress={() => url.openURL(GITHUB)}
                    />
                </TableRowGroup>
                <TableRowGroup title={Strings.ACTIONS}>
                    <TableRow
                        label={Strings.RELOAD_DISCORD}
                        icon={<TableRow.Icon source={findAssetId("RetryIcon")!} />}
                        onPress={() => NativeModules.BundleUpdaterManager.reload()}
                    />
                    <TableSwitchRow
                        label={"Safe Mode"}
                        subLabel={"Load Bunny without loading add-ons"}
                        icon={<TableRow.Icon source={findAssetId("ShieldIcon")!} />}
                        value={BunnySettings.isSafeMode()}
                        onValueChange={(to: boolean) => {
                            toggleSafeMode({ to, reload: false });
                            openAlert(
                                "bunny-reload-safe-mode",
                                <AlertModal
                                    title="Reload now?"
                                    content={!to ? "All add-ons will load normally." : "All add-ons will be temporarily disabled upon reload."}
                                    actions={<AlertActions>
                                        <AlertActionButton
                                            text="Reload Now"
                                            variant="destructive"
                                            onPress={() => RTNBundleUpdaterManager.reload()}
                                        />
                                        <AlertActionButton text="Later" variant="secondary" />
                                    </AlertActions>}
                                />
                            );
                        }}
                    />
                    <TableSwitchRow
                        label={Strings.DEVELOPER_SETTINGS}
                        icon={<TableRow.Icon source={findAssetId("WrenchIcon")!} />}
                        value={BunnySettings.developer.enabled}
                        onValueChange={(v: boolean) => {
                            BunnySettings.developer.enabled = v;
                        }}
                    />
                </TableRowGroup>
                <TableRowGroup title={Strings.MISCELLANEOUS}>
                    <TableSwitchRow
                        label={Strings.SETTINGS_ACTIVATE_DISCORD_EXPERIMENTS}
                        subLabel={Strings.SETTINGS_ACTIVATE_DISCORD_EXPERIMENTS_DESC}
                        icon={<TableRow.Icon source={findAssetId("WrenchIcon")!} />}
                        value={BunnySettings.general.patchIsStaff}
                        onValueChange={(v: boolean) => {
                            BunnySettings.general.patchIsStaff = v;
                        }}
                    />
                </TableRowGroup>
            </Stack>
        </ScrollView>
    );
}
