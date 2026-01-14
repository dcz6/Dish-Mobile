# Design Guidelines: Food & Receipt Tracking App

## Design Approach

**Hybrid Approach**: Material Design principles for mobile-first utility, with Instagram-inspired photo grid aesthetics for the dish gallery.

**Rationale**: This is a utility-focused productivity tool requiring efficient camera capture flows and data management, combined with visual photo browsing that benefits from social media grid patterns.

**Key Design Principles**:
- Mobile-first, thumb-zone optimized
- Camera-ready speed (minimal friction)
- Clear visual hierarchy for data entry and review
- Satisfying photo browsing experience

---

## Typography System

**Primary Font**: Inter or Roboto (via Google Fonts CDN)

**Type Scale**:
- Hero/Page Titles: 2xl to 3xl, font-weight-700
- Section Headers: xl, font-weight-600
- Body/List Items: base, font-weight-400
- Labels/Metadata: sm, font-weight-500
- Captions: xs, font-weight-400

**Mobile-Specific**: Increase base font size to `text-base` (16px) for readability on small screens.

---

## Layout System

**Spacing Primitives**: Tailwind units of **2, 4, 6, 8, 12, 16** (e.g., p-4, m-8, gap-6)

**Container Strategy**:
- Mobile: Full-width with px-4 padding
- Tablet+: max-w-2xl centered for forms/lists
- Photo Grid: max-w-6xl for optimal gallery viewing

**Vertical Rhythm**: py-6 for sections on mobile, py-8 on desktop

---

## Component Library

### Navigation
**Bottom Tab Bar** (mobile-first):
- Fixed position at bottom
- 4 tabs: Capture, Dishes, Receipts, Stats
- Icons from Heroicons (camera, photo, document-text, chart-bar)
- Active state: filled icon + accent indicator
- Height: h-16, safe-area-inset-bottom for iOS

### Camera/Capture Screen
**Full-Screen Camera View**:
- Camera viewfinder fills entire viewport
- Mode toggle (Dish/Receipt) as segmented control at top, backdrop-blur background
- Capture button: Large circular button (w-16 h-16) centered at bottom
- Minimal chrome to maximize viewfinder

**Post-Capture Review**:
- Image preview at 2/3 viewport height
- Action buttons below: "Retake" | "Save & Continue"
- For receipts: immediate transition to parsing/review screen

### Photo Grid (My Dishes)
**Instagram-Style Grid**:
- Grid: `grid-cols-3` (mobile), `grid-cols-4` (tablet+)
- Aspect ratio: `aspect-square` for uniformity
- Gap: gap-1 (tight grid, more photos visible)
- Rating badge: Absolute positioned top-right corner, rounded-full, px-2 py-1
  - Elite: Star icon
  - Would order again: Thumbs up
  - Should try once: Circle
  - Not for me: Minus

**Filter/Sort Bar**:
- Sticky header below nav, py-3
- Toggle group: "Recent" | "By Rating"
- Right-aligned filter icon for future expansion

### Receipt Review/Edit Screen
**Editable Form Layout**:
- Restaurant name: Large editable text input (text-xl)
- Date/time, total: Read-only styled as text-base
- Line items: List with gap-3
  - Each item: Two-column layout (name | price)
  - Inputs: Clear touch targets (h-12 minimum)
  - Inline edit icons
- Bottom action bar: "Cancel" | "Save Receipt" (primary button)

### Linking Interface
**Photo-to-Dish Matcher**:
- Split view on mobile (scrollable sections)
- Top half: Dish instances from receipt (vertical list, gap-4)
  - Card style: p-4, rounded-lg, border
  - Dish name, price, "Link Photo" button
- Bottom half: Unlinked photos (horizontal scroll, gap-2)
  - Thumbnail grid: w-24 h-24, rounded-md
- Active link state: Highlight both photo and dish item
- Confirmation: Immediate visual feedback with checkmark

### Detail Views
**Dish Detail Modal**:
- Large photo header (16:9 aspect ratio)
- Info section: Restaurant name, date, price (stacked, gap-2)
- Rating selector: 4-button group, full-width
  - Button height: h-12, rounded-lg
  - Active state: filled background
- Positioned for easy thumb access on mobile

**Receipt Detail**:
- Header: Restaurant, date, total
- Line items: Cards with gap-3
  - Linked photo thumbnail (if exists): w-16 h-16, rounded
  - Dish name, price, rating in same row
  - Tap to expand to dish detail

### Stats/Visualization
**Dashboard Cards**:
- Grid: `grid-cols-2` (mobile), `grid-cols-4` (desktop)
- Card style: p-6, rounded-xl, gap-4
- Metric value: text-3xl, font-bold
- Label: text-sm below value
- Simple bar charts: Horizontal bars using div with width percentages
  - Bar height: h-8, rounded-full
  - Label + count on same line

### Forms & Inputs
**Text Inputs**:
- Height: h-12 (minimum touch target)
- Padding: px-4
- Border: rounded-lg
- Focus state: ring-2 offset

**Buttons**:
- Primary: h-12, px-6, rounded-lg, font-semibold
- Secondary: Same size, different treatment
- Icon buttons: w-10 h-10, rounded-full

---

## Responsive Breakpoints

- Mobile: Default (320px+)
- Tablet: md: (768px+) - Increase grid columns, side-by-side layouts
- Desktop: lg: (1024px+) - Max containers, multi-column stats

---

## Images

**No hero images needed** - This is a utility app, not a marketing site.

**User-Generated Content**:
- Dish photos: Primary visual content throughout
- Receipt photos: Stored but displayed as thumbnails or in review flow
- All images: object-cover for consistent aspect ratios

---

## Animation Guidelines

**Minimal animations**:
- Camera shutter: Brief flash effect on capture (150ms)
- Navigation transitions: Simple fade (200ms)
- Modal slides: Slide up from bottom on mobile (300ms)
- No scroll-driven or decorative animations

---

## Accessibility

- All interactive elements: Minimum 44x44px touch targets
- Form labels: Always visible, not just placeholders
- Icon buttons: Include aria-labels
- Rating buttons: Clear active/selected states
- High contrast maintained throughout