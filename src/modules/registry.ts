import type { ExtensionModule } from "@/modules/types";
import { shortsModule } from "@/modules/shorts/shorts.module";
import { channelsModule } from "@/modules/channels/channels.module";

export const modules: ExtensionModule[] = [shortsModule, channelsModule];
