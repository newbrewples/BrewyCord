import { defineCorePlugin } from "..";
import patchForumPost from "./forumPost";
import patchUrl from "./url";

let patches = [] as (() => unknown)[];

export default defineCorePlugin({
    manifest: {
        id: "bunny.quickinstall",
        display: {
            name: "QuickInstall",
            description: "Quickly install Vendetta plugins and themes",
            authors: [{ name: "pyoncord" }]
        },
        main: "__N/A__",
        hash: "__N/A__"
    },
    start() {
        patches = [patchForumPost(), patchUrl()];
    },
    stop() {
        patches.forEach(p => p());
    }
});
