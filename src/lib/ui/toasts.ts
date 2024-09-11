import { Strings } from "@core/i18n";
import { findAssetId } from "@lib/api/assets";
import { lazyDestructure } from "@lib/utils/lazy";
import { toasts } from "@metro/common";
import { findByProps } from "@metro/wrappers";

const { uuid4 } = lazyDestructure(() => findByProps("uuid4"));

export function showToast(content: string, icon?: number): void;
export function showToast(props: { content: string, icon?: number, key?: string }): void
export function showToast(contentOrProps: string | { content: string, icon?: number, key?: string }, icon?: number) {
    if (typeof contentOrProps === "string") {
        toasts.open({
            key: `bn-toast-${uuid4()}`,
            content: contentOrProps,
            source: icon,
            icon
        });
    } else {
        contentOrProps.key ??= `bn-toast-${uuid4()}`;
        toasts.open({ ...contentOrProps, source: contentOrProps.icon });
    }
}

showToast.showCopyToClipboard = (content = Strings.COPIED_TO_CLIPBOARD) => {
    showToast({ content, icon: findAssetId("CopyIcon") });
};
