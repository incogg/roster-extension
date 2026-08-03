# Roster Extension

A Chrome extension for [Star Casino's ESS roster portal](https://vr.star.com.au/syd/default.aspx) that shows available shifts to pick up directly on the roster page.

> [!IMPORTANT]
> **After installing the extension, bookmark the [roster site](https://vr.star.com.au/syd/default.aspx).** The login can occasionally get interrupted, leaving the page stuck and refusing to load. Refreshing won't help. If you see the error **"Sorry, but we're having trouble signing you in."**, just open your bookmark to load the [roster](https://vr.star.com.au/syd/default.aspx) fresh.

## Features

- **Desktop:** adds a "Check Shifts" button to the roster's bottom nav bar. Available shifts appear as banners on each future calendar day.
- **Mobile:** adds a "Check Shifts" button to the week navigation bar. Available shifts appear as pills inline on each day row.
- Caches shift results per date and resets when "Check Shifts" is clicked again.
- Persists across SPA navigation and week/month changes.

## Installation

Pick your device below and follow the steps.

<p align="center">
  <a href="#ios"><img src="https://img.shields.io/badge/📱%20iOS-000000?style=for-the-badge&logoColor=white" alt="iOS"></a>
  &nbsp;
  <a href="#android"><img src="https://img.shields.io/badge/🤖%20Android-3DDC84?style=for-the-badge&logoColor=white" alt="Android"></a>
  &nbsp;
  <a href="#desktop"><img src="https://img.shields.io/badge/💻%20Desktop-2563EB?style=for-the-badge&logoColor=white" alt="Desktop"></a>
</p>

<details open>
<summary><h3 id="ios">📱 iOS (iPhone / iPad)</h3></summary>

1. Download the latest zip from the [Releases](../../releases/latest) page.
2. Install the [Orion Browser](https://kagi.com/orion/) from the App Store.
3. Tap the **···** button in the bottom corner.
4. Tap **Extensions**, then tap **+**.
5. Tap **Install From File** and select the zip file.

</details>

---

<details open>
<summary><h3 id="android">🤖 Android</h3></summary>

1. Download the latest zip from the [Releases](../../releases/latest) page.
2. Install the [Quetta Browser](https://play.google.com/store/apps/details?id=net.quetta.browser&hl=en_AU) from the Play Store.
3. Open `chrome://extensions`.
4. Toggle **Developer mode** on.
5. Tap **Load unpacked** and select the zip file.
6. Confirm the permissions prompt.

</details>

---

<details open>
<summary><h3 id="desktop">💻 Desktop (Windows / Mac / Linux)</h3></summary>

Choose your browser:

#### Chrome / Edge

1. Download the latest zip from the [Releases](../../releases/latest) page.
2. Unzip the folder somewhere permanent.
3. Go to `chrome://extensions` and enable **Developer mode**.
4. Click **Load unpacked** and select the unzipped folder.

#### Firefox

> **Note:** This method only works on Firefox Developer Edition/Nightly, or third-party Firefox forks such as [Zen Browser](https://zen-browser.app/). Standard release Firefox enforces extension signing and will not allow sideloading.

1. Download the latest zip from the [Releases](../../releases/latest) page.
2. Go to `about:config`, search for `xpinstall.signatures.required` and set it to `false`.
3. Go to `about:addons`, click the gear icon and select **Install Add-on From File**.
4. Select the zip file (do not unzip).

</details>
