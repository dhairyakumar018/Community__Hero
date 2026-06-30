# 📝 Project Description & Submission Document

> **Instructions for the Participant:** Copy the content below and paste it directly into your submission Google Doc. Ensure the document's link sharing settings are set to **"Anyone with the link can view"** before submitting on the BlockseBlock platform!

---

# 🌟 Vibe2Ship Hackathon Submission: Community Hero

### 👤 Participant Details
* **App Name:** Community Hero - Hyperlocal Problem Solver
* **Deployed Application Link:** https://ais-pre-ynbt6v2hzdly6hjsxy4zrl-460007719860.asia-southeast1.run.app
* **GitHub Repository Link:** [Paste your exported GitHub Repository Link here]

---

## 1. 🎯 Problem Statement Selected
**Problem Statement 2 - Community Hero (Hyperlocal Problem Solver)**

* **The Challenge:** Communities face ongoing public infrastructure degradation (e.g., potholes, illegal garbage piles, broken streetlights) that goes unreported due to fragmented communication channels, lack of tracking visibility, and absence of civic accountability.
* **Our Mission:** Build a unified, mobile-first hyperlocal platform that converts passive residents into active "Neighborhood Heroes" through simplified multi-channel reporting, gamified civic points, and a restricted command dashboard for municipal ward officers to accelerate problem-solving.

---

## 2. 💡 Solution Overview
**Community Hero** is a high-fidelity, dual-interface, mobile-optimized platform that bridges the communication gap between citizens and local authorities. 

* **Citizen Experience:** Citizens can log in securely via OTP, view active issues on an interactive real-time map, log new issues instantly using natural language or photos, upvote nearby duplicate reports to prevent database clutter, track active issues in a clean timeline, chat with an automated WhatsApp civic assistant, and earn rewards (points, levels, and badges) to highlight their local impact.
* **Municipal Experience:** Administrative municipal officers, ward coordinators, and department heads are automatically directed to a specialized Command Center dashboard. This interface restricts views based on their assigned wards or departments, lists active work tickets with SLA indicators, enables direct reassignments, maps analytics, and features an **Intelligent Route Optimizer** to plan the fastest physical route for field crews to resolve issues.

---

## 3. ✨ Key Features & Implementations

### A. Seamless Multi-Channel Reporting
* **Photo-based Form Reporter:** Simplifies data entry by allowing users to upload photos of potholes, garbage, or streetlights. Behind the scenes, the system extracts classifications and assigns responsibility.
* **WhatsApp Conversational Bot:** A fully simulated, interactive chat assistant interface mimicking real-time WhatsApp interactions to report local civic issues through simple conversation.
* **Deduplication Safeguard:** When submitting, the platform queries nearby issues. If a similar issue is already logged close by, the user is encouraged to upvote it rather than duplicate it, avoiding municipal resource waste.

### B. Interactive Real-Time Map (Leaflet & OpenStreetMap)
* Displays live pinned locations of reported civic issues with category-distinct, high-contrast, color-coded map markers.
* Implements a detailed custom-styling basemap layer switcher (supporting Dark mode, Streets, Satellite, Terrain, and Hybrid layers) as requested.
* Includes one-click automatic user geolocation with reactive permission checks.

### C. Gamified Civic Participation Engine
* **Reward Loops:** Reports award $+10$ points, upvotes/verifications award $+5$ points, and cleanup completions award $+20$ points.
* **Progression Systems:** Tracks citizen levels ($1 - 10$) and awards custom badges (*Neighborhood Hero*, *Super Reporter*, *SLA Enforcer*).
* **Live Leaderboards:** Highlights top active citizens, driving positive neighborhood competition.

### D. Municipal Authority Control Center
* **Restricted Division Dashboards:** Automatic role detection dynamically shows department-specific (e.g. Sanitation, Roads) or ward-specific tickets.
* **Field Routing Optimizer:** Ward officers can select multiple active issues on the map, and the platform will generate the optimal physical path to minimize travel time for cleanup crews.
* **SLA Resolution Tracks:** Tickets transition between logged, in progress, resolved, and verified statuses with compliance trackers.

---

## 4. 💻 Technologies Used

* **Frontend Architecture:** React (v18), TypeScript, Vite (bundling), Framer Motion (dynamic viewport transitions), Tailwind CSS (responsive layouts).
* **Mapping Framework:** Leaflet & React-Leaflet, OpenStreetMap Tile Servers.
* **Icons & UI Details:** Lucide React icons, custom glassmorphic panels, off-white/deep-charcoal contrast themes.
* **Data Layer:** Client-side mock state engine synchronized with persistent IndexedDB layer for full offline support.

---

## 5. ☁️ Google Technologies Utilized

* **Google Cloud Run / AI Studio Hosting:** Deployed on standard Google Cloud container architectures for high-speed routing, cold-start mitigation, and reliable preview delivery.
* **Google Gemini API (Server-Side SDK Integration):** Integrated using `@google/genai` server-side interfaces to process images, perform automatic classification routing, extract severity scores, and drive the natural language conversational logic of the WhatsApp civic reporting assistant.
