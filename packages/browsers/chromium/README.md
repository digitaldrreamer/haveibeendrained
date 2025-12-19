# Have I Been Drained? - Chrome Extension

A simple Chrome extension to check Solana wallet addresses for security threats and known drainers.

## Features

- ✅ **Simple Address Checking** - Enter any Solana wallet address and get instant security analysis
- 🎨 **Clean UI** - Modern, accessible interface following Chrome extension best practices
- 🌙 **Dark Mode Support** - Respects system preferences
- ⚡ **Fast & Lightweight** - Minimal permissions, no background scripts
- ♿ **Accessible** - Full keyboard navigation and screen reader support
- ⚙️ **Configurable** - Set custom API endpoint for local development

## Installation

### Method 1: From Chrome Web Store (Recommended)

🚧 **Coming Soon** - The extension will be available on the Chrome Web Store soon.

### Method 2: From Source (Development)

Follow these steps to install the extension from source:

#### Step 1: Get the Extension Files

1. Clone the repository:
   ```bash
   git clone https://github.com/digitaldrreamer/haveibeendrained.git
   cd haveibeendrained/packages/browsers/chromium
   ```

   Or if you already have the repository:
   ```bash
   cd packages/browsers/chromium
   ```

#### Step 2: Open Chrome Extensions Page

1. Open Google Chrome (or any Chromium-based browser)
2. Navigate to the extensions page using one of these methods:
   - Type `chrome://extensions/` in the address bar
   - Or go to Menu (⋮) → Extensions → Manage extensions

#### Step 3: Enable Developer Mode

1. Look for the "Developer mode" toggle in the top-right corner
2. Toggle it **ON** (it should turn blue/highlighted)

#### Step 4: Load the Extension

1. Click the **"Load unpacked"** button (appears after enabling Developer mode)
2. Navigate to and select the `chromium` directory:
   ```
   packages/browsers/chromium
   ```
3. Click **"Select Folder"** (or "Open" on Mac/Linux)

#### Step 5: Verify Installation

1. The extension should now appear in your extensions list
2. You should see "Have I Been Drained?" with version 1.0.0
3. The extension icon should appear in your browser toolbar

#### Troubleshooting

**Extension not appearing?**
- Make sure you selected the `chromium` folder (not the parent `browsers` folder)
- Check that `manifest.json` exists in the selected folder
- Try refreshing the extensions page

**Errors in console?**
- Open the extension details and check "Errors" section
- Ensure all files (popup.html, popup.js, popup.css) are present
- Check that icons are in the `icons/` folder

**Can't find "Load unpacked"?**
- Make sure Developer mode is enabled (toggle should be ON)
- Try refreshing the extensions page

### Usage

1. Click the extension icon in your Chrome toolbar
2. Enter a Solana wallet address (or click the paste button)
3. Click "Check Address"
4. View the security analysis results

## Configuration

### Custom API Endpoint

For local development or custom deployments:

1. Click the settings icon (⚙️) in the extension
2. Enter your API endpoint (e.g., `http://localhost:3001`)
3. Click "Save"

**Default endpoint:** `https://api.haveibeendrained.org`

## API Integration

This extension uses the Have I Been Drained public API:

**Endpoint:** `GET /api/v1/check`

**Parameters:**
- `address` (required) - Solana wallet address

**Response:**
```json
{
  "overallRisk": 75,
  "severity": "HIGH",
  "detections": [...],
  "recommendations": [...]
}
```

See [API Documentation](../../api/README.md) for details.

## Development

### File Structure

```
chromium/
├── manifest.json       # Extension manifest (v3)
├── popup.html         # Main popup interface
├── popup.css          # Styles with design system
├── popup.js           # Core functionality
├── icons/             # Extension icons (16, 32, 48, 128)
└── README.md          # This file
```

### Design Principles

Following Chrome extension UX best practices:

- **Simplicity First** - Single focused task (address checking)
- **Minimal Permissions** - Only `storage` and API host permissions
- **Keyboard Accessible** - Full keyboard navigation support
- **Visual Feedback** - Loading states, error handling, success animations
- **Dark Mode** - Respects `prefers-color-scheme`
- **Reduced Motion** - Respects `prefers-reduced-motion`

### Testing

1. Load the extension in developer mode
2. Test various wallet addresses
3. Verify error handling with invalid addresses
4. Test settings persistence
5. Check keyboard navigation (Tab, Enter, Escape)
6. Verify dark mode switching

## Icons

The extension currently uses placeholder SVG icons. For production, replace with actual PNG icons:

```
icons/
├── icon16.png   # 16x16 toolbar icon
├── icon32.png   # 32x32 toolbar icon
├── icon48.png   # 48x48 extension management
└── icon128.png  # 128x128 Chrome Web Store
```

## Permissions

- **storage** - Save user settings (API endpoint preference)
- **host_permissions** - Access to API endpoints for wallet checks

## Browser Compatibility

- ✅ Chrome 88+
- ✅ Edge 88+
- ✅ Brave (Chromium-based)
- ✅ Opera (Chromium-based)

## Security

- No background scripts or persistent connections
- Minimal permissions
- API calls only when user initiates
- No data collection or tracking
- Settings stored locally in Chrome sync storage

## Future Enhancements

Potential features (keeping it simple):

- [ ] Recent checks history
- [ ] Quick copy address button
- [ ] Export report as PDF
- [ ] Browser action badge with risk indicator
- [ ] Context menu integration for selected text

## License

MIT License - see [LICENSE](../../../LICENSE) for details.

## Support

- [Documentation](https://docs.haveibeendrained.org)
- [GitHub Issues](https://github.com/digitaldrreamer/haveibeendrained/issues)
- Email: support@haveibeendrained.org
