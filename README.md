# Attendly - Student Attendance & Payment Tracker

A mobile-first, offline-capable student attendance and payment tracking application built with SvelteKit 2 and Capacitor.

## 🎯 Features

- **📊 Daily Attendance Tracking** - Mark students as Present, Absent, Late, or Off Day
- **💰 Payment Recording** - Log student payments with date tracking
- **👥 Student Management** - Add, edit, and delete student profiles
- **📈 History Views** - Track attendance and payment history per student
- **💾 Data Backup/Restore** - Export and import all data as JSON
- **📱 Offline-First** - Works completely offline with local SQLite storage
- **🎨 Modern UI** - Clean design with shadcn-svelte components and Tailwind CSS v4

## 🛠️ Tech Stack

- **Framework:** SvelteKit 2 with Svelte 5 (Runes mode)
- **Styling:** Tailwind CSS v4
- **UI Components:** shadcn-svelte (neutral theme)
- **Icons:** Lucide Icons
- **Database:** SQLite (via Capacitor SQLite for Android, sql.js for web)
- **Mobile:** Capacitor (Android packaging)
- **Adapter:** adapter-static (full prerendering)

## 📦 Installation

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Type checking
pnpm check

# Build for production
pnpm build
```

## 📱 Building for Android

```bash
# 1. Build the web assets
pnpm build

# 2. Sync with Capacitor
npx cap sync android

# 3. Copy assets to Android
npx cap copy android

# 4. Open in Android Studio
npx cap open android

# 5. Build APK/AAB from Android Studio
```

## 🗂️ Project Structure

```
src/
├── lib/
│   ├── components/ui/      # shadcn-svelte components
│   ├── db/
│   │   ├── client.ts       # Database client & API
│   │   └── schema.ts       # SQLite schema
│   └── utils.ts            # Utility functions
├── routes/
│   ├── +layout.svelte      # Root layout with bottom nav
│   ├── +page.svelte        # Today (attendance/payment tracking)
│   ├── students/
│   │   ├── +page.svelte    # Student list
│   │   └── [id]/
│   │       └── +page.svelte # Student profile
│   └── settings/
│       └── +page.svelte    # Settings & backup/restore
└── app.css                 # Global styles & theme
```

## 🎨 Design System

### Color Palette
- **Primary:** `#4a90e2` (Blue)
- **Accent:** `#50e3c2` (Teal)
- **Status Colors:**
  - Present/Paid: `#7ed321` (Green)
  - Absent/Due: `#d0021b` (Red)
  - Late: `#f5a623` (Orange)
  - Unmarked: `#e0e0e0` (Gray)

## 📝 Database Schema

### Students Table
- `id` - Primary key
- `name` - Student name
- `created_at` - Creation timestamp

### Attendance Table
- `id` - Primary key
- `student_id` - Foreign key to students
- `date` - Date (YYYY-MM-DD)
- `status` - present | absent | late | offday
- Unique constraint on (student_id, date)

### Payments Table
- `id` - Primary key
- `student_id` - Foreign key to students
- `date` - Date (YYYY-MM-DD)
- `amount` - Payment amount
- `note` - Payment note
- `created_at` - Creation timestamp

## 🔧 Configuration

### Capacitor Config (`capacitor.config.ts`)
- App ID: `com.fahad.attendly`
- Web Dir: `build`
- Android Scheme: `https`
- SQLite encryption: Disabled (can be enabled)

### Tailwind v4
- Configuration in `src/app.css` via CSS variables
- No `tailwind.config.js` needed
- Custom theme with design-specified colors

## 📄 License

Private project by Spit-fires

## 🚀 Deployment

This app is designed for:
- **Android**: APK/AAB via Capacitor
- **Web**: Can be deployed to any static hosting (Vercel, Netlify, etc.)

### Production Checklist
- ✅ TypeScript: No errors
- ✅ Build: Successful
- ✅ Mobile: Viewport and notch support
- ✅ Database: SQLite with proper schema
- ✅ Offline: Fully functional without internet
- ✅ Backup: Export/import functionality
