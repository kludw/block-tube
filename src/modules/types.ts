export interface ModuleState {
  enabled: boolean;
}

export interface ExtensionModule {
  id: string;
  name: string;
  description?: string;
  defaultEnabled: boolean;
  run?(state: ModuleState): void;
  renderSettings?(container: HTMLElement): void | Promise<void>;
}
