import { UnifiedPluginModel } from "@core/ui/settings/pages/Plugins/models/UnifiedPluginModel";
import { lazyDestructure } from "@lib/utils/lazy";
import { findByNameLazy, findByProps } from "@metro";
import { FluxUtils } from "@metro/common";
import { Avatar, AvatarPile, Text } from "@metro/common/components";
import { UserStore } from "@metro/common/stores";
import { View } from "react-native";

import { Badges } from "./Badges";

const showUserProfileActionSheet = findByNameLazy("showUserProfileActionSheet");
const { getUser: maybeFetchUser } = lazyDestructure(() => findByProps("getUser", "fetchProfile"));

export function TitleComponent({ plugin }: { plugin: UnifiedPluginModel; }) {
    const users: any[] = FluxUtils.useStateFromStoresArray([UserStore], () => {
        plugin.authors?.forEach(a => a.id && maybeFetchUser(a.id));
        return plugin.authors?.map(a => UserStore.getUser(a.id));
    });

    const { authors } = plugin;
    const authorTextNode = [];

    if (authors) {
        for (const author of authors) {
            authorTextNode.push(<Text
                onPress={() => showUserProfileActionSheet({ userId: author.id })}
                variant="text-md/medium"
            >
                {author.name}
            </Text>);

            authorTextNode.push(", ");
        }

        authorTextNode.pop();
    }

    return <View style={{ gap: 12 }}>
        <View>
            <Text variant="heading-xl/semibold">
                {plugin.name}
            </Text>
            {authors?.length && <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                {users.length && <AvatarPile
                    size="xxsmall"
                    names={plugin.authors?.map(a => a.name)}
                    totalCount={plugin.authors?.length}
                >
                    {users.map(a => <Avatar size="xxsmall" user={a} />)}
                </AvatarPile>}
                <Text variant="text-md/medium">
                    {authorTextNode}
                </Text>
            </View>}
        </View>
        <View>
            <Badges id={plugin.id} />
        </View>
    </View>;
}
