import type { ExtensionModule } from "./types";
import { shortsModule } from "./shorts/shorts.module";
import { channelsModule } from "./channels/channels.module";

export const modules: ExtensionModule[] = [shortsModule, channelsModule];
