import { toggleSafeMode } from "@core/debug/safeMode";
import BunnySettings from "@core/storage/BunnySettings";
import { hasStack, isComponentStack } from "@core/ui/reporter/utils/isStack";
import { getDebugInfo } from "@lib/api/debug";
import { RTNBundleUpdaterManager } from "@lib/api/native/rn-modules";
import { Codeblock, ErrorBoundary } from "@lib/ui/components";
import { createStyles } from "@lib/ui/styles";
import { tokens } from "@metro/common";
import { Button, Card, SafeAreaView, Text } from "@metro/common/components";
import { ScrollView, View } from "react-native";

import ErrorComponentStackCard from "./ErrorComponentStackCard";
import ErrorStackCard from "./ErrorStackCard";

const useStyles = createStyles({
    container: {
        flex: 1,
        backgroundColor: tokens.colors.BACKGROUND_PRIMARY,
        paddingHorizontal: 16,
        height: "100%",
        padding: 8,
        gap: 12
    }
});


export default function ErrorBoundaryScreen(props: {
    error: Error;
    rerender: () => void;
}) {
    const styles = useStyles();
    const debugInfo = getDebugInfo();

    return <ErrorBoundary>
        <SafeAreaView style={styles.container}>
            <View style={{ gap: 4 }}>
                <Text variant="display-lg">Uh oh.</Text>
                <Text variant="text-md/normal">A crash occured while rendering a component. This could be caused by a plugin, Bunny or Discord itself.</Text>
                <Text variant="text-sm/normal" color="text-muted">{debugInfo.os.name}; {debugInfo.discord.build} ({debugInfo.discord.version}); {debugInfo.bunny.version}</Text>
            </View>
            <ScrollView fadingEdgeLength={64} contentContainerStyle={{ gap: 12 }}>
                <Codeblock selectable={true}>{props.error.message}</Codeblock>
                {hasStack(props.error) && <ErrorStackCard error={props.error} />}
                {isComponentStack(props.error) ? <ErrorComponentStackCard componentStack={props.error.componentStack} /> : null}
            </ScrollView>
            <Card style={{ gap: 6 }}>
                <Button text="Reload Discord" onPress={() => RTNBundleUpdaterManager.reload()} />
                {!BunnySettings.isSafeMode() && <Button text="Reload in Safe Mode" onPress={() => toggleSafeMode()} />}
                <Button variant ="destructive" text="Retry Render" onPress={() => props.rerender()} />
            </Card>
        </SafeAreaView>
    </ErrorBoundary>;
}
