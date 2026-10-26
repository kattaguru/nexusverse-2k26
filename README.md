# NexusVerse 2K26

> **National Level Technical Symposium**  
> Organized by **IEEE Student Branch (IEEE-SB NBKRIST)**  
> **N.B.K.R. Institute of Science & Technology**, Vidyanagar, Tirupati District, AP  
> 📅 **Date:** 29 October 2026 | 📍 **Inauguration:** Seminar Hall, NBKRIST

---

## 🚀 Overview

**NexusVerse 2K26** is the official full-stack web application for the National Level Technical Symposium. The platform offers seamless student registration, team roster management, dynamic UPI & Razorpay payments, real-time ticket pass generation with cryptographically verifiable QR codes, and a comprehensive administrative command center.

---

## 🎯 Technical Events

Each technical event is priced at **₹200 per head** (₹150 for IEEE Members):

1. **FLAGHUNT** — *Cybersecurity – Capture the Flag (CTF)*
   - 2 participants per team. Web exploitation, cryptography, reverse engineering, and puzzle solving.
2. **INNOVRUSH** — *Project / Prototype Presentation*
   - 1 to 4 participants per team. Software solutions, hardware prototypes, and IoT innovations.
3. **CODENANO** — *Speed Coding & Algorithmic Duel*
   - Individual participation (1 participant). Blind coding, debug sprint, and time-complexity optimization.
4. **TECHQUEST** — *Technical Quiz & Rapid-Fire Trivia*
   - Exactly 2 participants per team. CS fundamentals, OS, networks, AI, and emerging technologies.
5. **DESIGNOVA** — *UI/UX & Creative Canvas Challenge*
   - 1 to 2 participants per team. Figma/Canva design sprints, wireframing, and design thinking.

---

## ⏰ Symposium Timeline

| Time Slot | Phase / Event | Venue / Details |
| :--- | :--- | :--- |
| **09:00 AM – 09:40 AM** | 🎙️ Inauguration Ceremony | Seminar Hall, NBKRIST |
| **09:40 AM – 10:00 AM** | 📍 Event Allocation & Lab Briefing | Respective Labs & Halls |
| **10:00 AM – 12:00 PM** | 💻 Technical Events Showdown | Computing Labs 1–4 & Design Studio |
| **12:00 PM – 01:30 PM** | 🍽️ Lunch & Networking Break | Main Dining Arena |
| **01:30 PM – 03:30 PM** | ⚡ Spot Events & Interactive Challenges | Open Tech Arena |
| **03:30 PM – 04:00 PM** | 🏆 Prize Distribution & Valedictory | Seminar Hall, NBKRIST |

---

## 💳 Payment Gateway & Razorpay UPI

- **Razorpay UPI & Dynamic QR**: Instant UPI intent checkout for Google Pay, PhonePe, Paytm, and BHIM.
- **Dedicated Handle**: Integrated with official handle [`https://razorpay.me/@veluriprasanth`](https://razorpay.me/@veluriprasanth).
- **Cards & Net Banking**: Multi-instrument checkout supported via Razorpay Checkout SDK.
- **Electronic Ticket Pass**: Instant QR-coded digital pass generated with roll number lookup.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS, Lucide Icons, Canvas Confetti
- **Backend**: Node.js, Express, TypeScript, REST API
- **Database**: Local JSON storage with dual-sync to Supabase Cloud PostgreSQL
- **Payments**: Razorpay Standard Checkout SDK & Razorpay.me UPI handle
- **Email Service**: Nodemailer with SMTP ticket pass delivery

---

## 💻 Getting Started Locally

### Prerequisites
- Node.js (v18+)
- npm or bun

### 1. Clone the repository
```bash
git clone https://github.com/kattaguru/nexusverse-2k26.git
cd nexusverse-2k26
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup environment variables
Copy the template configuration:
```bash
cp .env.example .env
```
Update `.env` with your Supabase, Razorpay, and SMTP credentials if needed.

### 4. Run the development server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔐 Administrative Access

Access the executive administrative portal at `/nexusadmin`:
- **URL**: `http://localhost:3000/nexusadmin` (Production: `nbkristieee.in/nexusadmin`)
- Manage registrations, export CSV/Excel, toggle portal status, and configure payment credentials.

---

## 📱 Native Android Mobile App (Capacitor)

The repository includes a production-ready **Capacitor Android Native App** configured for organizers, desk volunteers, and participants.

### Mobile Features:
- 📷 **Native Camera QR Scanner**: Rapid hardware-accelerated QR badge scanning with physical phone haptic vibration feedback.
- 🗂️ **5 Desk Station Mode**: 1-tap check-in across Reception & Kit, Technical Event, Food & Lunch Meal Tokens, Spot Pass, and Certificates.
- 📱 **Mobile Bottom Navigation Dock**: Instant 1-tap switching between Registration, Ticket Passes, Participant Space, and Admin Scanner.
- 🔙 **Android Hardware Back Button**: Intelligently dismisses open modals (Scanner, Lookup, Payment, Participant Space) without closing the app.
- 🎨 **Immersive Dark Status Bar**: Seamlessly integrates with the cyberpunk `#0a0a0d` symposium theme.

### Build & Run the Android App:

1. **Build and Sync Web Assets into Android:**
   ```bash
   npm run cap:sync
   ```

2. **Open in Android Studio:**
   ```bash
   npm run cap:open
   ```
   *(Or open the `android` folder directly in Android Studio)*

3. **Build the Debug APK directly via Gradle:**
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
   The compiled APK will be generated at:
   `android/app/build/outputs/apk/debug/app-debug.apk`

---

## 📜 License & Organizers

Organized by the **IEEE Student Branch (IEEE-SB)**  
N.B.K.R. Institute of Science & Technology, Vidyanagar, AP.  
© 2026 NexusVerse. All Rights Reserved.
