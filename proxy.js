document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const targetUrl = urlParams.get('url');

  if (!targetUrl) {
    showError('No target URL provided.');
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'fetchForGlimpse',
      url: targetUrl
    });

    if (!response.success) {
      throw new Error(response.error);
    }

    const doc = new DOMParser().parseFromString(response.html, 'text/html');

    // To ensure relative paths for images, CSS, etc., work correctly,
    // we set a <base> tag in the document's head.
    const base = document.createElement('base');
    base.href = targetUrl;
    doc.head.prepend(base);

    // Replace the current page's content with the fetched content.
    document.documentElement.replaceWith(doc.documentElement);

  } catch (error) {
    showError(`Failed to fetch or display the preview. Reason: ${error.message}`);
  }
});

function showError(message) {
  const loading = document.querySelector('.glimpse-loading');
  if (loading) {
    loading.remove();
  }
  const errorDiv = document.createElement('div');
  errorDiv.className = 'glimpse-error';
  errorDiv.innerHTML = `
    <h2>Preview Failed</h2>
    <p>${message}</p>
    <p>Please try opening the link in a new tab.</p>
  `;
  document.body.appendChild(errorDiv);
} 