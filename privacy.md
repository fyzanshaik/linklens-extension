# LinkLens Privacy Policy

**Last Updated:** [Date]

Thank you for using LinkLens, a Chrome extension designed to let you preview links without leaving your current page. Your privacy is important to us, and this policy is intended to be simple and transparent about how the extension handles data.

## Data Handling

LinkLens is built with a "privacy-first" philosophy. It **does not collect, store, or transmit any personal data or browsing history** to any external servers. All processing is done locally on your computer.

Here is a specific breakdown of the data the extension interacts with:

1.  **Clicked URLs:** When you `Ctrl+Click` (or `Cmd+Click`) a link, LinkLens accesses the URL of that link. This is essential for its core functionality, which is to open that URL in a preview window. This URL is used only to create the preview and is never stored or sent anywhere.

2.  **Network Request Modification:** To allow websites to be displayed in the preview `iframe`, LinkLens uses the `declarativeNetRequest` API to remove certain security headers (like `X-Frame-Options`) from the response. This modification is narrowly targeted and only applies to requests loaded inside the LinkLens preview frame. It does not affect your normal browsing.

## Permissions Justification

LinkLens requests the following permissions to operate:

*   **`declarativeNetRequest`**: Required to modify website security headers so they can be previewed.
*   **`<all_urls>`**: Required for two reasons:
    1.  To allow the content script to listen for your `Ctrl+Click` on any webpage you visit.
    2.  To allow the `declarativeNetRequest` API to modify headers from any website you might want to preview.

## Compliance with Chrome Web Store Policies

The use of information received from Google APIs will adhere to the [Chrome Web Store User Data Policy](https://developer.chrome.com/docs/webstore/user_data), including the Limited Use requirements. LinkLens is designed to be fully compliant with all Chrome Web Store privacy and security policies.

## Contact Us

If you have any questions about this privacy policy, please open an issue on our [GitHub repository](https://github.com/fyzanshaik/linklens-extension). 