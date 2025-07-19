// Background service worker for managing hidden tabs
let glimpseTabData = new Map(); // Store tab data by origin tab ID

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action, url, originTabId } = message;
  
  switch (action) {
    case 'getCurrentTabId':
      // Return the sender tab ID
      sendResponse({ tabId: sender.tab?.id });
      break;
      
    case 'createTab':
      createTab(url, sendResponse);
      return true; // Keep message channel open for async response
      
    case 'fetchForGlimpse':
      fetchForGlimpse(url, sendResponse);
      return true; // Keep message channel open for async response
      
    case 'closeGlimpse':
      closeHiddenTab(originTabId, sendResponse);
      return true;
      
    default:
      sendResponse({ success: false, error: 'Unknown action' });
  }
});

async function createTab(url, sendResponse) {
  try {
    // Create a new tab in the background
    const tab = await chrome.tabs.create({
      url: url,
      active: true // Keep it hidden
    });
    
    sendResponse({ success: true, tabId: tab.id });
  } catch (error) {
    console.error('Error creating hidden tab:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function fetchForGlimpse(url, sendResponse) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const html = await response.text();
    sendResponse({ success: true, html: html });

  } catch (error) {
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
    
    // Make the hidden tab active
    await chrome.tabs.update(tabData.hiddenTabId, { active: true });
    
    // Clean up the stored data
    glimpseTabData.delete(originTabId);
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error expanding tab:', error);
    sendResponse({ success: false, error: error.message });
  }
}

async function closeHiddenTab(originTabId, sendResponse) {
  try {
    const tabData = glimpseTabData.get(originTabId);
    
    if (tabData) {
      // Close the hidden tab
      await chrome.tabs.remove(tabData.hiddenTabId);
      
      // Clean up the stored data
      glimpseTabData.delete(originTabId);
    }
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('Error closing hidden tab:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  // Remove any stored data for the closed tab
  for (const [originTabId, data] of glimpseTabData.entries()) {
    if (data.hiddenTabId === tabId) {
      glimpseTabData.delete(originTabId);
      break;
    }
  }
  
  // Also clean up if the origin tab is closed
  if (glimpseTabData.has(tabId)) {
    const data = glimpseTabData.get(tabId);
    chrome.tabs.remove(data.hiddenTabId).catch(() => {
      // Tab might already be closed
    });
    glimpseTabData.delete(tabId);
  }
}); 