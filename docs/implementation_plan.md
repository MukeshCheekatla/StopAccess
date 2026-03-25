# FocusGate: Phase 2 Implementation Plan

Our primary goal is to transform the core blocking engine into a robust, "bulletproof" production tool. This plan focuses only on essential features that directly improve reliability and user control, strictly avoiding unnecessary over-engineering.

---

## 1. Core Engine Stability (Current Priority)

### **Android Rule Enforcement**
*   **Goal**: Ensure blocking is consistent even when the app is in the background.
*   **Action Items**:
    *   Verify the `InstalledAppsModule.kt` is correctly reporting all target app packages.
    *   Test the `ruleEngine.ts` interval under Android doze mode to prevent battery-optimization "kills".
    *   Implement a persistent notification in Android to keep the blocking service alive during Focus Mode.

### **Denylist Sync Optimization**
*   **Goal**: Faster, more reliable NextDNS updates.
*   **Action Items**:
    *   Optimize the "Fetch-then-Merge" logic to batch multiple app updates into a single network call.
    *   Improve error handling in `nextdns.ts`: specifically for "Rate Limited" (429) or "Forbidden" (403) responses.
    *   Add a local cache of the remote denylist to reduce unnecessary network traffic.

---

## 2. Critical UI/UX Refinement

### **App Selection Experience**
*   **Goal**: Make it seamless for users to decide what they want to block.
*   **Action Items**:
    *   **Custom Labels**: Allow users to manually assign the primary blocking domain when they add a new app.
    *   **Search and Filter**: Add a simple search bar to the "Add Apps" screen for faster navigation.
    *   **Selection Persistence**: Ensure the UI correctly reflects the sync state (e.g., a "Syncing..." loader while NextDNS is updating).

### **Diagnostic Visibility**
*   **Goal**: Transparency for the user.
*   **Action Items**:
    *   Expand the **System Logs** to include "Network Health" status (pinging NextDNS or checking DNS protection state).
    *   Implement a "Test Simple Block" button: A one-tap test to see if `test-blocked.com` is correctly intercepted.

---

## 3. Maintenance & Polish

### **Code Quality & Technical Debt**
*   **Action Items**:
    *   **Lint Standardization**: Run a project-wide `npx eslint . --fix` to ensure consistent formatting across all newly created services.
    *   **Test Suite Expansion**: Add integration tests for the `ruleEngine` + `nextdns` mock interaction to prevent regressions during future updates.
    *   **Documentation Updates**: Maintain a `README.md` for developers explaining the manual domain-mapping architecture.

### **Final Readiness Check**
*   **Action Item**: Full end-to-end "Focus Session" test:
    1.  Add a custom app.
    2.  Start Focus session.
    3.  Verify Log: `NextDNS Sync Successful`.
    4.  Verify App: Try to access the domain in a browser.
    5.  End session and verify domain removal.

---

> **Core Principle**: If it doesn't help the user block a distracting app, we don't build it. Keep it lean, Keep it fast.
