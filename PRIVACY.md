# BlockTube — Privacy Policy

## Last updated: 2026-05-23

BlockTube is a Chrome extension that helps you hide YouTube Shorts, the
Playables shelf, and videos from channels you choose to block. This document
explains what the extension does and does not do with your data.

## TL;DR

- BlockTube does **not** run any server, analytics, telemetry, or tracking.
- The only data BlockTube touches is your own settings, stored in your Google
  account via Chrome's built-in sync.
- The only outbound request BlockTube makes is a one-time call to Google's
  official user-info endpoint, to retrieve the email address shown in the popup.

## What BlockTube stores

BlockTube saves the following in `chrome.storage.sync`:

- Which modules you have enabled (Shorts Blocker, Playables Blocker, Channel
  Blocker).
- The list of channel names or regex patterns you have chosen to block.

Authentication state (whether you are signed in, and your email address) is
stored in `chrome.storage.local`.

`chrome.storage.sync` is part of Chrome itself. When you are signed into Chrome
with Google sync enabled, Chrome replicates this data across your devices via
your Google account. BlockTube does not control, observe, or transmit this
replication — it is handled entirely by Google.

## What BlockTube does **not** do

BlockTube does **not**:

- Send your data to any server controlled by the developer.
- Use analytics, telemetry, crash reporting, or any third-party SDK.
- Read, log, or transmit your browsing history.
- Read or transmit the contents of pages you visit.
- Read or transmit your YouTube watch history, comments, subscriptions, or
  account data.
- Sell or share data with third parties.

## Authentication

To use BlockTube you sign in with your Google account. Sign-in uses Chrome's
built-in `chrome.identity` API and the standard OAuth flow operated by Google.

After sign-in, BlockTube makes a single HTTPS request to Google's official
endpoint `https://www.googleapis.com/oauth2/v3/userinfo` to retrieve your email
address. This is shown in the popup so you know which account is active. The
email address is stored locally in `chrome.storage.local`. It is never sent
anywhere else.

BlockTube only requests the OAuth scopes `openid` and `email`. It does **not**
request access to your YouTube account, Gmail, Drive, or any other Google
service.

## Permissions

| Permission | Why it is needed |
| --- | --- |
| `storage` | Persist your settings and blocked-channel list |
| `identity` | Google sign-in via `chrome.identity.getAuthToken` |
| `host_permissions: *://*.youtube.com/*` | Run the content scripts that hide blocked content on YouTube |

The extension does not request any other host or API permissions.

## Children

BlockTube is not directed at children. It does not knowingly collect data from
anyone, regardless of age, beyond what is described above.

## Changes

If this policy changes, the updated version will appear in this file and in the
extension's Chrome Web Store listing. The "Last updated" date at the top reflects
the most recent change.

## Contact

For questions about this policy, open an issue at
<https://github.com/kludw/block-tube/issues> or email the publisher contact
listed on the Chrome Web Store listing.
