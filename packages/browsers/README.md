# Browser Extensions

Browser extensions for Have I Been Drained? that allow you to quickly check Solana wallet addresses for security threats directly from your browser.

## Available Extensions

### Chrome/Chromium-based Browsers

✅ **Available Now** - Chrome, Edge, Brave, Opera

The Chrome extension provides instant wallet security checking with a clean, accessible interface.

- [Installation Guide](./chromium/README.md)
- [Chrome Web Store](#) *(Coming Soon)*

### Firefox

🚧 **Coming Soon** - Firefox extension is in development

## Features

All browser extensions provide:

- ✅ **Quick Address Checking** - Check any Solana wallet address instantly
- 🎨 **Clean UI** - Modern, accessible interface
- 🌙 **Dark Mode Support** - Respects system preferences
- ⚡ **Fast & Lightweight** - Minimal permissions, no background scripts
- ♿ **Accessible** - Full keyboard navigation and screen reader support
- ⚙️ **Configurable** - Set custom API endpoint for local development

## Installation

### Chrome/Chromium Extension

See the [Chromium Extension README](./chromium/README.md) for detailed installation instructions.

**Quick Start:**

1. Navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the `packages/browsers/chromium` directory

For more details, see the [full installation guide](./chromium/README.md).

### Firefox Extension

Firefox extension is currently in development. Check back soon!

## Usage

1. Click the extension icon in your browser toolbar
2. Enter a Solana wallet address (or use the paste button)
3. Click "Check Address"
4. View the security analysis results

## Configuration

### Custom API Endpoint

For local development or custom deployments:

1. Click the settings icon (⚙️) in the extension
2. Enter your API endpoint (e.g., `http://localhost:3001`)
3. Click "Save"

**Default endpoint:** `https://api.haveibeendrained.org`

## Security

- No background scripts or persistent connections
- Minimal permissions (only storage and API host access)
- API calls only when user initiates
- No data collection or tracking
- Settings stored locally in browser storage

## Browser Compatibility

### Chrome Extension

- ✅ Chrome 88+
- ✅ Edge 88+
- ✅ Brave (Chromium-based)
- ✅ Opera (Chromium-based)

### Firefox Extension

- 🚧 Coming Soon

## Development

### Project Structure

```
browsers/
├── chromium/          # Chrome/Chromium extension
│   ├── manifest.json  # Extension manifest (v3)
│   ├── popup.html     # Main popup interface
│   ├── popup.css      # Styles
│   ├── popup.js       # Core functionality
│   ├── icons/         # Extension icons
│   └── README.md      # Detailed documentation
└── README.md          # This file
```

### Contributing

To contribute to browser extensions:

1. Read the [Contributing Guide](../../CONTRIBUTING.md)
2. Check the specific extension's README for development setup
3. Follow Chrome/Firefox extension best practices
4. Test thoroughly before submitting PRs

## Support

- [Documentation](https://docs.haveibeendrained.org)
- [Browser Extensions Guide](https://docs.haveibeendrained.org/user-guide/browser-extensions)
- [GitHub Issues](https://github.com/digitaldrreamer/haveibeendrained/issues)
- Email: support@haveibeendrained.org

## License

MIT License - see [LICENSE](../../LICENSE) for details.

