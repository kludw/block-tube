import {
  addBlockedChannel,
  getBlockedChannels,
  onBlockedChannelsChanged,
  removeBlockedChannel,
  type BlockedChannel,
} from "@/modules/channels/blocked-channels";

export async function renderChannelSettings(
  container: HTMLElement,
): Promise<void> {
  container.classList.add("channel-settings");
  container.replaceChildren();

  const form = document.createElement("form");
  form.className = "channel-add";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "channel-input";
  input.placeholder = "Channel name";
  input.autocomplete = "off";

  const addBtn = document.createElement("button");
  addBtn.type = "submit";
  addBtn.className = "channel-add-btn";
  addBtn.textContent = "Add";

  form.append(input, addBtn);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const pattern = input.value.trim();
    if (!pattern) return;
    void addBlockedChannel({ pattern });
    input.value = "";
    input.focus();
  });

  const hint = document.createElement("p");
  hint.className = "channel-hint";
  hint.textContent = "Case insensitive channel name";

  const list = document.createElement("ul");
  list.className = "channel-list";

  function renderList(channels: BlockedChannel[]): void {
    list.replaceChildren();

    if (channels.length === 0) {
      const empty = document.createElement("li");
      empty.className = "channel-empty";
      empty.textContent = "No channels blocked yet.";
      list.appendChild(empty);
      return;
    }

    const sorted = [...channels].sort((a, b) => b.addedAt - a.addedAt);
    for (const channel of sorted) {
      const item = document.createElement("li");
      item.className = "channel-item";

      const name = document.createElement("span");
      name.className = "channel-item-name";
      name.textContent = channel.pattern;
      name.title = channel.pattern;

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "channel-remove";
      remove.setAttribute("aria-label", `Unblock ${channel.pattern}`);
      remove.textContent = "×"; // ×
      remove.addEventListener("click", () => {
        void removeBlockedChannel(channel.pattern);
      });

      item.append(name, remove);
      list.appendChild(item);
    }
  }

  container.append(form, hint, list);

  renderList(await getBlockedChannels());
  onBlockedChannelsChanged(renderList);
}
