import type { ExtensionModule } from "@/modules/types";
import { renderChannelSettings } from "@/modules/channels/channels.settings";

export const channelsModule: ExtensionModule = {
  id: "channels",
  name: "Channel Blocker",
  description: "Hides videos from channels you block",
  defaultEnabled: false,
  renderSettings(container) {
    return renderChannelSettings(container);
  },
};
