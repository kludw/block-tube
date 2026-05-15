import type { ExtensionModule } from "../types";
import { renderChannelSettings } from "./channels.settings";

export const channelsModule: ExtensionModule = {
  id: "channels",
  name: "Channel Blocker",
  description: "Hides videos from channels you block",
  defaultEnabled: true,
  renderSettings(container) {
    return renderChannelSettings(container);
  },
};
