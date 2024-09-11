import { createStyles } from "@lib/ui/styles";
import { tokens } from "@metro/common";

export const useStyles = createStyles({
    badge: {
        backgroundColor: tokens.colors.CARD_PRIMARY_BG,
        borderRadius: 8,
        paddingVertical: 4,
        paddingHorizontal: 8,
        textAlignVertical: "center"
    }
});
