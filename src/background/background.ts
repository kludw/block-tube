import { seedDefaults } from "@/shared/settings";

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    void seedDefaults();
  }
});
