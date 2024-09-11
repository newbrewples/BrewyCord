import { PluginDisableReason, PluginStage } from "@core/reporter/enums";
import PluginReporter from "@core/reporter/PluginReporter";
import { tokens, useToken } from "@metro/common";

export default function usePluginStatusColor(id: string) {
    PluginReporter.useReporter();

    const dangerBg = useToken(tokens.colors.STATUS_DANGER_BACKGROUND);
    const positiveBg = useToken(tokens.colors.STATUS_POSITIVE_BACKGROUND);
    const offlineBg = useToken(tokens.colors.STATUS_OFFLINE);

    const stage = PluginReporter.stages[id];
    const disableReason = PluginReporter.disableReason[id];

    if (stage === PluginStage.RUNNING) {
        return positiveBg;
    }

    if (disableReason === PluginDisableReason.ERROR) {
        return dangerBg;
    }

    return offlineBg;
}
