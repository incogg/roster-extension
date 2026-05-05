# Roster Extension

A Chrome extension for [Star Casino's ESS roster portal](https://vr.star.com.au/syd/) that shows available shifts to pick up directly on the roster page.

## Features

- **Desktop:** adds a "Check Shifts" button to the roster's bottom nav bar. Available shifts appear as banners on each future calendar day.
- **Mobile:** adds a "Check Shifts" button to the week navigation bar. Available shifts appear as pills inline on each day row.
- Caches shift results per date and resets when "Check Shifts" is clicked again.
- Persists across SPA navigation and week/month changes.

## Installation

### Desktop

Download the latest zip from the [Releases](../../releases/latest) page.

#### Chrome

1. Unzip the folder somewhere permanent.
2. Go to `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and select the unzipped folder.

#### Firefox

1. Go to `about:config`, search for `xpinstall.signatures.required` and set it to `false`.
2. Go to `about:addons`, click the gear icon and select **Install Add-on From File**.
3. Select the zip file (do not unzip).

### Mobile (iOS)

1. Install the [Orion Browser](https://kagi.com/orion/) from the App Store.
2. Tap the **···** button in the bottom corner.
3. Tap **Extensions**, then tap **+**.
4. Tap **Install From File** and select the zip file.
