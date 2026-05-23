export interface ModuleState {
  enabled: boolean;
}

export interface ExtensionModule {
  id: string;
  name: string;
  description?: string;
  defaultEnabled: boolean;
  /** URL path prefixes that should be redirected to "/" when this module is enabled. */
  redirectPaths?: string[];
  run?(state: ModuleState): void;
  renderSettings?(container: HTMLElement): void | Promise<void>;
}
