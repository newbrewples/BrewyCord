import PluginReporter from "@core/reporter/PluginReporter";
import usePluginStatusColor from "@core/ui/settings/pages/Plugins/usePluginStatusColor";
import { PluginManager } from "@lib/addons/plugins";
import { Text } from "@metro/common/components";
import { View } from "react-native";

import { useStyles } from "./useStyles";

export function Badges(props: { id: string; }) {
    PluginReporter.useReporter();

    const styles = useStyles();
    const stageColor = usePluginStatusColor(props.id);

    const stage = PluginReporter.stages[props.id];
    const isProxied = PluginManager.isProxied(props.id);

    return <View style={{ gap: 8, flexDirection: "row" }}>
        {[
            { text: stage, bg: stageColor },
            isProxied && { text: "proxied" }
        ].filter(x => x && typeof x === "object").map(badge => (
            <Text
                variant="eyebrow"
                color={badge.bg ? "white" : "text-normal"}
                style={[styles.badge, badge.bg ? { backgroundColor: badge.bg } : null]}
            >
                {badge.text}
            </Text>
        ))}
    </View>;
}
