// Clicking the toolbar icon (or Alt+Shift+R) injects rebuild.js.
// Injecting again while running toggles it off.

async function rebuild(tab) {
  if (!tab || tab.id == null) return;
  const target = { tabId: tab.id };

  try {
    // Check if already running — if so, tell it to stop.
    const [probe] = await chrome.scripting.executeScript({
      target,
      func: () => !!(window.__pageRebuilder && window.__pageRebuilder.running),
    });

    if (probe.result) {
      await chrome.scripting.executeScript({
        target,
        func: () => window.__pageRebuilder && window.__pageRebuilder.stop(),
      });
      return;
    }

    await chrome.scripting.executeScript({ target, files: ["rebuild.js"] });
  } catch (_) {
    await chrome.action.setBadgeBackgroundColor({ tabId: tab.id, color: "#F24822" });
    await chrome.action.setBadgeText({ tabId: tab.id, text: "×" });
    setTimeout(() => chrome.action.setBadgeText({ tabId: tab.id, text: "" }), 2000);
  }
}

chrome.action.onClicked.addListener(rebuild);
