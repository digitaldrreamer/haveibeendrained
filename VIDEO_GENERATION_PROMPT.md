# AI Video Generation Prompt for Demo Video

## Video Specifications
- **Duration:** 3 minutes (180 seconds) exactly
- **Aspect Ratio:** 16:9 (1920x1080)
- **Style:** Professional tech demo, modern UI, dark theme
- **Pacing:** Fast-paced but clear, engaging

---

## Complete Video Prompt

### SCENE 1: The Problem (0:00-0:30) - 30 seconds

**Visual:** Split screen showing:
- Left: Animated chart/graph showing "$300M stolen" with rising numbers
- Right: News headlines scrolling about Solana wallet hacks
- Background: Dark, ominous red/orange gradient

**Text Overlay:**
- "In 2024, Solana wallet drainers stole"
- "$300 MILLION"
- "from 324,000+ users"

**Narration Script:**
"In 2024, Solana wallet drainers stole 300 million dollars from over 324,000 users. Current security solutions are centralized, slow, and incomplete. We need a better way."

**Transition:** Fade to white, then reveal website

---

### SCENE 2: Landing Page Reveal (0:30-0:45) - 15 seconds

**Visual:** 
- Smooth zoom into browser window showing "Have I Been Drained?" homepage
- Modern dark UI with purple/blue gradient
- Hero section with wallet input field visible
- Subtle animations: floating particles, gradient shifts

**Text Overlay:**
- "Have I Been Drained?"
- "First Decentralized Wallet Security Checker"

**Narration Script:**
"Introducing Have I Been Drained - the first decentralized, community-powered wallet security checker on Solana."

**Transition:** Smooth pan to wallet input

---

### SCENE 3: Wallet Analysis Demo (0:45-1:30) - 45 seconds

**Visual Sequence:**

**0:45-1:00:** 
- Close-up of wallet input field
- Typing animation: "4hc5GD9JjV9UG4Nw2sxZj8smdVfD5P1nfrGmdNfT396U"
- Click "Check" button
- Loading spinner appears

**1:00-1:15:**
- Screen shows "Analyzing..." with progress indicators
- Quick montage of:
  - Transaction data scrolling
  - Pattern detection icons (SetAuthority, Approve, Known Drainer)
  - Risk calculation animation

**1:15-1:30:**
- Results card appears with smooth slide-in animation
- Show:
  - Risk meter: "SAFE" with green color (or "AT_RISK" with yellow/red)
  - Risk score: "0%" (or higher if testing with risky wallet)
  - Detections list (if any)
  - Recommendations section

**Text Overlay (timed):**
- "Real-time Analysis"
- "Scanning Transactions..."
- "Risk Score: 0% - SAFE" (or actual result)

**Narration Script:**
"Simply enter a wallet address and get instant security analysis. Our engine detects SetAuthority attacks, unlimited token approvals, and checks against our on-chain drainer registry. You'll see your risk score, detected threats, and actionable recovery recommendations."

**Transition:** Zoom out, show full results page

---

### SCENE 4: On-Chain Registry Demo (1:30-2:15) - 45 seconds

**Visual Sequence:**

**1:30-1:45:**
- Split screen:
  - Left: Terminal/command line
  - Right: Solana Explorer
- Show terminal command:
  ```bash
  curl -X POST http://localhost:3001/api/report \
    -d '{"drainerAddress": "...", "amountStolen": 1.5}'
  ```
- Command executes, shows success response

**1:45-2:00:**
- Switch to Solana Explorer showing:
  - Transaction signature
  - Program: "drainer_registry"
  - PDA account created
  - Transaction details
- Highlight the on-chain data

**2:00-2:15:**
- Show architecture diagram:
  - "User Reports Drainer" → "Anchor Program" → "PDA Account Created"
  - "Community-Powered" → "Immutable Registry"
- Animated flow diagram

**Text Overlay:**
- "On-Chain Registry"
- "Decentralized & Immutable"
- "Community-Powered"

**Narration Script:**
"This is the innovation - the first decentralized drainer registry on Solana. Anyone can report a drainer to our on-chain Anchor program. Reports are stored in PDA accounts, making them immutable and verifiable. This creates network effects - the more reports, the better protection for everyone."

**Transition:** Fade to Solana Actions demo

---

### SCENE 5: Solana Actions (Blinks) Demo (2:15-2:45) - 30 seconds

**Visual Sequence:**

**2:15-2:30:**
- Show Twitter/X interface
- User types: "Check my wallet: [address]"
- Show Solana Action card appearing
- "Check Wallet Security" button visible
- Click animation

**2:30-2:45:**
- Show wallet analysis results in Twitter preview
- Quick flash of Discord interface with same action
- "Works everywhere" text overlay

**Text Overlay:**
- "Solana Actions (Blinks)"
- "Check wallets from Twitter & Discord"
- "One-click security analysis"

**Narration Script:**
"With Solana Actions, you can check wallet security directly from Twitter or Discord. Just share a wallet address, and anyone can analyze it with one click. This makes security accessible to everyone."

**Transition:** Fade to impact section

---

### SCENE 6: Impact & Call to Action (2:45-3:00) - 15 seconds

**Visual:**
- Montage of:
  - GitHub logo with repo URL
  - "Open Source" badge
  - "MIT License" text
  - Website URL: "haveibeendrained.org"
  - Program ID on Solana Explorer
- All elements fade in sequentially
- Final frame: Clean logo + tagline

**Text Overlay (final frame):**
- "Have I Been Drained?"
- "Protect Yourself & Others"
- "github.com/digitaldrreamer/haveibeendrained"
- "Built for Solana Student Hackathon 2025"

**Narration Script:**
"Protect yourself and others. Check out our open-source project on GitHub. Built in 12 days for the Solana Student Hackathon. Thank you!"

**End:** Fade to black with logo

---

## Detailed Prompt for AI Video Generator

### Full Prompt (Copy this for AI tool):

```
Create a 3-minute (180 seconds) professional tech demo video in 16:9 aspect ratio with the following scenes:

SCENE 1 (0:00-0:30): Problem Introduction
- Dark background with red/orange gradient
- Animated statistics: "$300M stolen from 324,000+ users" with rising numbers
- News headlines scrolling about Solana hacks
- Text overlay: "Current solutions are centralized, slow, incomplete"
- Style: Dramatic, attention-grabbing

SCENE 2 (0:30-0:45): Product Reveal
- Modern dark-themed website interface
- "Have I Been Drained?" homepage with purple/blue gradients
- Smooth camera zoom into browser window
- Floating particles and subtle animations
- Text: "First Decentralized Wallet Security Checker"

SCENE 3 (0:45-1:30): Live Demo
- Wallet input field with typing animation
- Address: "4hc5GD9JjV9UG4Nw2sxZj8smdVfD5P1nfrGmdNfT396U"
- Click "Check" button
- Loading animation with transaction scanning visuals
- Results card slides in showing:
  * Risk meter (circular progress, color-coded)
  * Risk score percentage
  * Detections list
  * Recommendations
- Smooth UI transitions, modern design

SCENE 4 (1:30-2:15): Technical Innovation
- Split screen: Terminal on left, Solana Explorer on right
- Terminal shows API command executing
- Solana Explorer shows on-chain transaction
- Architecture diagram animation:
  * User → Anchor Program → PDA Account
  * "Community-Powered" → "Immutable Registry"
- Highlight on-chain data and program ID

SCENE 5 (2:15-2:45): Solana Actions
- Twitter/X interface with Solana Action card
- "Check Wallet Security" button visible
- Click animation and results preview
- Quick flash of Discord interface
- Text: "Works everywhere - Twitter, Discord, and more"

SCENE 6 (2:45-3:00): Call to Action
- Montage of:
  * GitHub logo with URL
  * "Open Source" and "MIT License" badges
  * Website URL
  * Solana Explorer with program
- Final frame: Clean logo + "Protect Yourself & Others"
- Text: "Built for Solana Student Hackathon 2025"

STYLE REQUIREMENTS:
- Modern, professional tech aesthetic
- Dark theme with purple/blue/green accents
- Smooth animations and transitions
- Clean typography (sans-serif, modern)
- Consistent color scheme throughout
- High contrast for readability
- Subtle particle effects and gradients

TECHNICAL REQUIREMENTS:
- 1920x1080 resolution
- 30fps minimum
- Smooth transitions between scenes
- Clear, readable text overlays
- Professional voiceover-ready (can add separately)
```

---

## Alternative: Scene-by-Scene Prompts

If the AI tool requires separate prompts per scene:

### Scene 1 Prompt:
```
Create a dramatic 30-second intro scene: Dark background with red/orange gradient, animated statistics showing "$300M stolen from 324,000+ users" with rising numbers, news headlines scrolling about Solana wallet hacks, text overlay "Current solutions are centralized, slow, incomplete". Style: Professional, attention-grabbing, tech-focused.
```

### Scene 2 Prompt:
```
Create a 15-second product reveal: Modern dark-themed website interface showing "Have I Been Drained?" homepage with purple/blue gradients, smooth camera zoom into browser window, floating particles and subtle animations, text "First Decentralized Wallet Security Checker". Style: Clean, modern, professional.
```

### Scene 3 Prompt:
```
Create a 45-second live demo: Wallet input field with typing animation showing Solana address, click "Check" button, loading animation with transaction scanning visuals, results card slides in showing risk meter (circular progress color-coded), risk score percentage, detections list, and recommendations. Smooth UI transitions, modern dark design with purple accents.
```

### Scene 4 Prompt:
```
Create a 45-second technical demo: Split screen with terminal on left showing API command execution, Solana Explorer on right showing on-chain transaction, architecture diagram animation showing "User → Anchor Program → PDA Account" and "Community-Powered → Immutable Registry", highlight on-chain data. Professional tech aesthetic.
```

### Scene 5 Prompt:
```
Create a 30-second Solana Actions demo: Twitter/X interface with Solana Action card visible, "Check Wallet Security" button, click animation and results preview, quick flash of Discord interface, text "Works everywhere - Twitter, Discord, and more". Modern social media UI design.
```

### Scene 6 Prompt:
```
Create a 15-second call to action: Montage of GitHub logo with URL, "Open Source" and "MIT License" badges, website URL, Solana Explorer with program, final frame with clean logo and "Protect Yourself & Others" text, "Built for Solana Student Hackathon 2025". Professional, inspiring finish.
```

---

## Voiceover Script (Separate)

If you need to add voiceover separately:

```
[0:00-0:30]
In 2024, Solana wallet drainers stole 300 million dollars from over 324,000 users. Current security solutions are centralized, slow, and incomplete. We need a better way.

[0:30-0:45]
Introducing Have I Been Drained - the first decentralized, community-powered wallet security checker on Solana.

[0:45-1:30]
Simply enter a wallet address and get instant security analysis. Our engine detects SetAuthority attacks, unlimited token approvals, and checks against our on-chain drainer registry. You'll see your risk score, detected threats, and actionable recovery recommendations.

[1:30-2:15]
This is the innovation - the first decentralized drainer registry on Solana. Anyone can report a drainer to our on-chain Anchor program. Reports are stored in PDA accounts, making them immutable and verifiable. This creates network effects - the more reports, the better protection for everyone.

[2:15-2:45]
With Solana Actions, you can check wallet security directly from Twitter or Discord. Just share a wallet address, and anyone can analyze it with one click. This makes security accessible to everyone.

[2:45-3:00]
Protect yourself and others. Check out our open-source project on GitHub. Built in 12 days for the Solana Student Hackathon. Thank you!
```

---

## Tips for AI Video Generation

1. **Use Runway Gen-3 or Pika 1.5** - Best for tech demos
2. **Generate scenes separately** - More control over each scene
3. **Use consistent style prompts** - Maintain visual coherence
4. **Add transitions in post** - Use video editor for smooth transitions
5. **Layer text overlays** - Add in video editor for better control
6. **Record voiceover separately** - Use text-to-speech or record yourself
7. **Sync audio with visuals** - Match timing in video editor

---

## Quick Copy-Paste Prompt (Single)

```
Create a 3-minute professional tech demo video (1920x1080, 30fps) with 6 scenes:

1. (0:00-0:30) Dark dramatic intro: "$300M stolen from 324K users" with animated statistics, red/orange gradient background, scrolling news headlines about Solana hacks.

2. (0:30-0:45) Product reveal: Modern dark website "Have I Been Drained?" with purple/blue gradients, smooth zoom, floating particles, text "First Decentralized Wallet Security Checker".

3. (0:45-1:30) Live demo: Wallet input with typing animation, click "Check", loading with transaction visuals, results card slides in showing risk meter (circular, color-coded), risk score, detections, recommendations. Modern dark UI.

4. (1:30-2:15) Technical: Split screen terminal + Solana Explorer, API command execution, on-chain transaction visible, architecture diagram "User → Anchor Program → PDA", text "Community-Powered Immutable Registry".

5. (2:15-2:45) Solana Actions: Twitter interface with action card, "Check Wallet Security" button, click animation, results preview, Discord flash, text "Works everywhere".

6. (2:45-3:00) CTA: Montage GitHub logo, "Open Source MIT License", website URL, Solana Explorer, final frame "Protect Yourself & Others - Built for Solana Student Hackathon 2025".

Style: Professional tech aesthetic, dark theme, purple/blue/green accents, smooth animations, clean typography, high contrast, subtle particles. Consistent modern design throughout.
```

---

**Save this prompt and use it with your preferred AI video generation tool!**

