let glimpseTabData = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action, url, originTabId } = message;

  switch (action) {
    case 'getCurrentTabId':
      sendResponse({ tabId: sender.tab?.id });
      break;

    case 'createTab':
      createTab(url, sendResponse);
      return true;

    case 'closeGlimpse':
      closeHiddenTab(originTabId, sendResponse);
      return true;

    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

async function createTab(url, sendResponse) {
  try {
    const tab = await chrome.tabs.create({
      url: url,
      active: true,
    });
    sendResponse({ success: true, tabId: tab.id });
  } catch (error) {
    console.error('Error creating tab:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function expandHiddenTab(originTabId, sendResponse) {
  try {
    const tabData = glimpseTabData.get(originTabId);

    if (!tabData) {
      sendResponse({ success: false, error: 'No hidden tab found' });
      return;
    }

    await chrome.tabs.update(tabData.hiddenTabId, { active: true });
    glimpseTabData.delete(originTabId);
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error expanding tab:', error);
    sendResponse({ success: false, error: message });
  }
}

async function closeHiddenTab(originTabId, sendResponse) {
  try {
    const tabData = glimpseTabData.get(originTabId);

    if (tabData) {
      await chrome.tabs.remove(tabData.hiddenTabId);
      glimpseTabData.delete(originTabId);
    }
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error closing hidden tab:', error);
    sendResponse({ success: false, error: error.message });
  }
}

chrome.tabs.onRemoved.addListener((tabId) => {
  for (const [originTabId, data] of glimpseTabData.entries()) {
    if (data.hiddenTabId === tabId) {
      glimpseTabData.delete(originTabId);
      break;
    }
  }

  if (glimpseTabData.has(tabId)) {
    const data = glimpseTabData.get(tabId);
    chrome.tabs.remove(data.hiddenTabId).catch(() => {});
    glimpseTabData.delete(tabId);
  }
}); 