<div align="center">
  <img src="extension/assets/icon-128.png" width="128" height="128" alt="StopAccess">
  <h1>StopAccess</h1>
  <p>A precision site blocking and focus management engine.<br/><b>Privacy focused • NextDNS Integration • Cross-platform</b></p>

  <p>
    <img src="https://img.shields.io/badge/License-MIT-orange.svg?style=flat-square" alt="License">
    <img src="https://img.shields.io/badge/Status-Active-brightgreen.svg?style=flat-square" alt="Status">
  </p>
</div>

## About
StopAccess is a high-performance site blocking extension designed to eliminate distractions. It combines ironclad browser rules (DNR) with local active tracking and secure NextDNS synchronization for uncompromising productivity.

## Features
- **Instant Blocking**: Leverages Declarative Net Request for zero-latency site restriction.
- **High-Fidelity Focus**: Professional countdown meter with unified dashboard & popup controls.
- **Direct Cloud Sync**: Seamlessly synchronize your NextDNS denylists and security profiles.
- **Guardian Lock**: Real-time typing challenges and PIN lockdowns to prevent impulsive bypasses.
- **Local First**: All evaluation happens on-device. No history is ever stored or transmitted.

## Installation

### Browser Extension
Download the latest version from the official stores:

<a href="https://chromewebstore.google.com/detail/dajibamebijnlohkeddaignbneobpjag">
  <img src="https://www.google.com/s2/favicons?domain=chrome.google.com&sz=128" width="40" height="40" alt="Chrome Web Store" title="Chrome Web Store">
</a>
&nbsp;&nbsp;&nbsp;
<a href="https://microsoftedge.microsoft.com/addons/detail/stopaccess-website-ap/ecgocgconlggmehhgfmcbhjghmkokcfi">
  <img src="https://www.google.com/s2/favicons?domain=microsoftedge.microsoft.com&sz=128" width="40" height="40" alt="Edge Add-ons" title="Edge Add-ons">
</a>

## Development
```bash
git clone https://github.com/MukeshCheekatla/StopAccess.git
cd StopAccess
npm install
npm run watch -w extension
```

### Structure
- `extension/`: Core browser extension (React + Tailwind).
- `packages/`: Shared domain logic, state, and sync modules.

## Legal & Privacy
StopAccess functions strictly locally. We do not host, store, or distribute your browsing data. All rule evaluations happen on-device. For more information, visit our [Privacy Policy](extension/PRIVACY.md).

## Built With
<p align="left">
  <img src="https://www.google.com/s2/favicons?domain=react.dev&sz=128" width="24" height="24" alt="React">
  <img src="https://www.google.com/s2/favicons?domain=typescriptlang.org&sz=128" width="24" height="24" alt="TypeScript">
  <img src="https://www.google.com/s2/favicons?domain=tailwindcss.com&sz=128" width="24" height="24" alt="Tailwind CSS">
</p>
