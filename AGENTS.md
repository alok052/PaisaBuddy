# PaisaBuddy Pro — Institutional Fintech Engineering & Design Standards

## 🎯 Core Product Mission
PaisaBuddy is an elite, high-conviction personal finance and wealth intelligence mobile application built for Indian capitalists, investors, and high-net-worth individuals (HNIs). It rivals the visual and functional quality of Apple Design Award winners, CRED, Revolut Ultra, and Bloomberg Terminal.

---

## 💎 Zero-Cheapness Visual Quality Protocol

1. **Luxury Midnight Palette:**
   - Background: OLED Midnight Velvet (`#070A12`, `#080C14`)
   - Primary Glass Cards: `#0D1527`, `#101726` with subtle gradients
   - Borders: Ultra-fine glass strokes (`rgba(255, 255, 255, 0.08)`, `rgba(16, 185, 129, 0.35)`)
   - Accent Emerald: `#10B981`, `#34D399` (Signifies Wealth & Growth)
   - Accent Gold: `#F59E0B`, `#FBBF24` (Signifies VIP & High Conviction)
   - Accent Blue: `#3B82F6` (Institutional Authority)
   - Danger/Alert: `#EF4444` (Strict Stop-loss / Bearish)

2. **Typography & Hierarchy:**
   - Brand Headers: Bold `900` weight with subtle `letterSpacing: 0.8`
   - Numeric Data: High-contrast white (`#FFFFFF`) with bold tabular styling
   - Subtitles & Labels: Clear readable slate (`#94A3B8`, `#CBD5E1`), never faded invisible grays
   - Currency Formatting: Always standard Indian numbering (`₹1,25,000`, `₹1.5 Lakh`, `₹4.2 Cr`)

3. **Tactile Micro-Interactions:**
   - Every single button, chip, tab, and card MUST provide feedback (`activeOpacity={0.75}`)
   - Light Haptic (`Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)`) on tabs, filter chips, and toggles
   - Medium Haptic (`Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)`) on primary CTA buttons, drawer triggers, and modal launches
   - Success Notification (`Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)`) on successful actions (e.g. order simulated, PDF exported)

4. **Component Quality Standards:**
   - NEVER use hand-drawn raw rectangles for icons. Always use crisp vector iconography (`@expo/vector-icons/Ionicons`).
   - Symmetrical padding and border radii (`borderRadius: 14`, `16`, `20`, `28`).
   - Bottom navigation bar must sit strictly above system navigation buttons on Android using `useSafeAreaInsets()`.
   - Modals must use modern curved sheets (top radius `28px`) with dark blurred backdrops, never flat blocking rectangles.

5. **Data Authenticity & Depth:**
   - No "Lorem Ipsum", no dummy filler text, no mock data that looks fake.
   - All portfolios, funds, IPOs, and tools must represent real Indian market dynamics and regulatory post-Budget 2024 compliance.
