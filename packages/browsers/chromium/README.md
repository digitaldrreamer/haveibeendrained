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

### From Source (Development)

1. Clone the repository and navigate to the extension directory:
   ```bash
   cd packages/browsers/chromium
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable "Developer mode" (toggle in top right)

4. Click "Load unpacked" and select this directory

5. The extension should now appear in your extensions list

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
