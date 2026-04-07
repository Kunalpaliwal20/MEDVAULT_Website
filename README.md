<p align="center">
  <img src="https://img.icons8.com/fluency/96/heart-with-pulse.png" alt="MedVault Logo" width="80"/>
</p>

<h1 align="center">MedVault – Personal Health Manager</h1>

<p align="center">
  <b>A full-stack web application for managing personal health records, medicine tracking, appointment scheduling, and nearby hospital discovery.</b>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-HTML%20%7C%20CSS%20%7C%20JavaScript-blue?style=flat-square" />
  <img src="https://img.shields.io/badge/Backend-Node.js%20%7C%20Express.js-green?style=flat-square" />
  <img src="https://img.shields.io/badge/Database-MongoDB%20Atlas-brightgreen?style=flat-square" />
  <img src="https://img.shields.io/badge/Hosting-Firebase%20%7C%20Render-orange?style=flat-square" />
  <img src="https://img.shields.io/badge/Email-Resend%20API-purple?style=flat-square" />
</p>

---

## 🌐 Live Demo

| Service | URL |
|---------|-----|
| **Frontend** | [https://medvault-app-3493.web.app](https://medvault-app-3493.web.app) |
| **Backend API** | [https://medvault-backend-onn6.onrender.com](https://medvault-backend-onn6.onrender.com) |
| **GitHub Repo** | [https://github.com/24thakurt-gif/PIH2026_Bros](https://github.com/24thakurt-gif/PIH2026_Bros) |

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Libraries & Dependencies](#-libraries--dependencies)
- [Services Used](#-services-used)
- [API Endpoints](#-api-endpoints)
- [Setup & Installation](#-setup--installation)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)
- [Screenshots](#-screenshots)
- [Team](#-team)

---

## ✨ Features

### 🔐 Authentication & Security
- User registration with **email verification** (OTP-based)
- Secure login with **JWT (JSON Web Token)** authentication
- Password hashing with **bcrypt**
- Protected API routes with middleware-based auth

### 💊 Medicine Management
- Add, edit, and delete medicines with dosage, frequency, and schedule
- **Automatic dose tracking** – take doses and track remaining stock
- **Restock functionality** when medicines run low
- Custom scheduling: Once daily, Twice daily, or Three times daily with specific times
- Side effects and instruction tracking

### ⏰ Smart Reminders & Notifications
- **Real-time browser notifications** when it's time to take medicine
- **Top notification banner** with sound alerts, pulse animation, and queuing system
- **Email notifications via Resend API**:
  - 💊 Medicine reminder emails when doses are due
  - ⚠️ Low stock alert emails when medicines drop below 20%
  - 🩺 Appointment reminder emails sent **1 day before** scheduled checkups
- **Automated daily scheduler** (cron job at 8:00 AM) for checkup and low stock alerts

### 📄 Document Storage
- Upload and store medical documents (prescriptions, reports, lab results, insurance)
- Base64 file encoding for secure storage
- Document categorization and date tracking
- Edit and delete documents
- Download stored documents

### 🩺 Checkup Tracker
- Schedule and track medical checkups (General, Dental, Eye, Cardiology, Dermatology, etc.)
- Set recurring intervals for follow-up appointments
- Doctor name and notes tracking
- Auto-calculated next appointment dates
- Edit and delete checkups

### 🏥 Nearby Hospitals
- **GPS-based location detection** using browser Geolocation API
- Integration with **Overpass API (OpenStreetMap)** to find nearby hospitals
- Interactive map view via **OpenStreetMap/Leaflet.js**
- Hospital details: name, address, distance, phone, website
- Get directions via Google Maps integration

### 🤖 MedBot AI Assistant
- Intelligent health chatbot for quick medicine and checkup additions
- Natural language processing for health queries
- Data persistence – saves entries directly to backend database
- Preview and confirm before adding records

### 📊 Stock Dashboard
- Visual stock level indicators (Good / Low / Critical)
- Progress bars showing remaining doses
- Quick actions: Take Dose, Restock
- Color-coded alerts for stock levels

---

## 🛠 Tech Stack

### Frontend
| Technology | Purpose |
|-----------|---------|
| **HTML5** | Page structure and semantic markup |
| **CSS3** | Styling, animations, responsive design |
| **Vanilla JavaScript** | Application logic, DOM manipulation, SPA routing |
| **Font Awesome 6.5** | Icons throughout the UI |
| **Leaflet.js** | Interactive hospital maps |
| **Web Notifications API** | Browser push notifications |
| **Geolocation API** | User location detection |

### Backend
| Technology | Purpose |
|-----------|---------|
| **Node.js** | Server runtime environment |
| **Express.js 4.21** | RESTful API framework |
| **Mongoose 8.6** | MongoDB ODM (Object Document Mapper) |
| **JWT (jsonwebtoken 9.0)** | Token-based authentication |
| **bcryptjs 2.4** | Password hashing & salting |
| **Multer 1.4** | File upload handling |
| **Resend 4.8** | Transactional email delivery |
| **node-cron 4.2** | Scheduled task automation |
| **CORS 2.8** | Cross-origin resource sharing |
| **dotenv 16.4** | Environment variable management |

### Database
| Technology | Purpose |
|-----------|---------|
| **MongoDB Atlas** | Cloud-hosted NoSQL database |
| **Mongoose Schemas** | Data validation and modeling |

---

## 🏗 Architecture

```
┌─────────────────────┐         ┌─────────────────────┐
│                     │  HTTPS  │                     │
│   Firebase Hosting  │◄───────►│   User's Browser    │
│   (Frontend SPA)    │         │                     │
│                     │         └─────────┬───────────┘
└─────────────────────┘                   │
                                          │ REST API (HTTPS)
                                          ▼
                              ┌─────────────────────┐
                              │                     │
                              │   Render.com        │
                              │   (Express.js API)  │
                              │                     │
                              └─────────┬───────────┘
                                        │
                          ┌─────────────┼─────────────┐
                          ▼             ▼             ▼
                   ┌───────────┐ ┌───────────┐ ┌───────────┐
                   │ MongoDB   │ │ Resend    │ │ node-cron │
                   │ Atlas     │ │ Email API │ │ Scheduler │
                   │ (Database)│ │ (Emails)  │ │ (Daily)   │
                   └───────────┘ └───────────┘ └───────────┘
```

---

## 📁 Project Structure

```
MedVault/
├── README.md
├── render.yaml                    # Render deployment config
├── firebase.json                  # Firebase hosting config
│
├── frontend/                      # Frontend SPA
│   ├── index.html                 # Main HTML (auth, dashboard, modals)
│   ├── app.js                     # Application logic (~2000 lines)
│   ├── api.js                     # API client functions
│   └── style.css                  # All styles (~2800 lines)
│
└── backend/                       # Express.js API Server
    ├── server.js                  # Entry point, middleware, DB connection
    ├── package.json               # Dependencies & scripts
    ├── .env                       # Environment variables (local)
    │
    ├── middleware/
    │   └── auth.js                # JWT authentication middleware
    │
    ├── models/
    │   ├── User.js                # User schema (email, password, verified)
    │   ├── Medicine.js            # Medicine schema (name, dosage, schedule)
    │   ├── Checkup.js             # Checkup schema (type, doctor, interval)
    │   └── Document.js            # Document schema (title, fileData)
    │
    ├── routes/
    │   ├── auth.js                # Register, verify, login routes
    │   ├── medicines.js           # CRUD + dose/restock routes
    │   ├── checkups.js            # CRUD routes
    │   ├── documents.js           # CRUD + file upload routes
    │   └── notifications.js       # Email notification routes
    │
    └── utils/
        ├── mailer.js              # Resend email templates & sender
        └── scheduler.js           # Daily cron jobs (checkup & stock alerts)
```

---

## 📦 Libraries & Dependencies

### Backend (npm packages)

| Package | Version | Purpose |
|---------|---------|---------|
| `express` | ^4.21.0 | Web framework for REST APIs |
| `mongoose` | ^8.6.0 | MongoDB object modeling |
| `jsonwebtoken` | ^9.0.2 | JWT creation and verification |
| `bcryptjs` | ^2.4.3 | Password hashing |
| `multer` | ^1.4.5 | Multipart file upload parsing |
| `resend` | ^4.8.0 | Email delivery via Resend API |
| `node-cron` | ^4.2.1 | Cron-based task scheduling |
| `cors` | ^2.8.5 | Cross-origin request handling |
| `dotenv` | ^16.4.5 | Environment variable loading |

### Frontend (CDN)

| Library | Version | Purpose |
|---------|---------|---------|
| `Font Awesome` | 6.5.1 | Icon library |
| `Leaflet.js` | (via OSM) | Interactive maps |

### APIs Used

| API | Purpose |
|-----|---------|
| **Overpass API** (OpenStreetMap) | Find nearby hospitals by GPS coordinates |
| **OpenStreetMap Tiles** | Map rendering for hospital locations |
| **Resend API** | Transactional email delivery |
| **Web Notifications API** | Browser push notifications |
| **Geolocation API** | User's GPS coordinates |

---

## ☁️ Services Used

| Service | Purpose | Tier |
|---------|---------|------|
| **Firebase Hosting** | Frontend static file hosting & CDN | Free (Spark plan) |
| **Render.com** | Backend Node.js server hosting | Free tier |
| **MongoDB Atlas** | Cloud database (M0 cluster) | Free tier (512 MB) |
| **Resend** | Transactional email service | Free tier (100 emails/day) |
| **GitHub** | Source code repository & CI/CD trigger | Free |
| **OpenStreetMap** | Map tiles & hospital data | Free (open source) |

---

## 🔌 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/verify` | Verify email with OTP |
| POST | `/api/auth/resend-code` | Resend verification code |
| POST | `/api/auth/login` | Login & get JWT token |
| GET | `/api/auth/sync` | Sync all user data |

### Medicines
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/medicines` | Get all medicines |
| POST | `/api/medicines` | Add new medicine |
| PUT | `/api/medicines/:id` | Update medicine |
| DELETE | `/api/medicines/:id` | Delete medicine |
| PATCH | `/api/medicines/:id/dose` | Take a dose |
| PATCH | `/api/medicines/:id/restock` | Restock medicine |

### Checkups
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/checkups` | Get all checkups |
| POST | `/api/checkups` | Add new checkup |
| PUT | `/api/checkups/:id` | Update checkup |
| DELETE | `/api/checkups/:id` | Delete checkup |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents` | Get all documents |
| GET | `/api/documents/:id` | Get single document |
| POST | `/api/documents` | Upload document |
| PUT | `/api/documents/:id` | Update document |
| DELETE | `/api/documents/:id` | Delete document |

### Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/notifications/medicine-reminder` | Send medicine reminder email |
| POST | `/api/notifications/low-stock` | Send low stock alert email |

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health status |

---

## 🚀 Setup & Installation

### Prerequisites
- **Node.js** >= 18.0.0
- **npm** >= 9.0.0
- **MongoDB** (local or Atlas)
- **Git**

### Local Development

```bash
# 1. Clone the repository
git clone https://github.com/24thakurt-gif/PIH2026_Bros.git
cd PIH2026_Bros

# 2. Install backend dependencies
cd backend
npm install

# 3. Create .env file
cp .env.example .env
# Edit .env with your credentials (see Environment Variables section)

# 4. Start the backend server
npm start
# Server runs on http://localhost:5000

# 5. Open frontend
# Open frontend/index.html in browser, or serve with:
cd ../frontend
npx serve .
# Frontend runs on http://localhost:3000
```

---

## 🔐 Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Database
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/medvault

# Authentication
JWT_SECRET=<your-secret-key>

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Server
PORT=5000
NODE_ENV=production
```

### Getting the Keys

| Variable | How to Get |
|----------|-----------|
| `MONGO_URI` | Sign up at [MongoDB Atlas](https://www.mongodb.com/atlas) → Create cluster → Get connection string |
| `JWT_SECRET` | Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` |
| `RESEND_API_KEY` | Sign up at [Resend](https://resend.com) → Dashboard → API Keys → Create |

---

## 🌍 Deployment

### Frontend → Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login & deploy
firebase login
firebase init hosting    # Select frontend/ as public directory
firebase deploy --only hosting
```

### Backend → Render.com

1. Push code to GitHub
2. Create a new **Web Service** on [Render](https://render.com)
3. Connect your GitHub repository
4. Set **Root Directory** to `backend`
5. Set **Build Command** to `npm install`
6. Set **Start Command** to `npm start`
7. Add environment variables in the **Environment** tab
8. Deploy!

### Automatic Deployments
- **Frontend**: Run `firebase deploy --only hosting` after changes
- **Backend**: Pushes to `main` branch on GitHub auto-trigger Render redeploy

---

## 📸 Screenshots

### Login & Registration
> Secure authentication with email verification

### Dashboard
> Overview of medicines, checkups, documents, and stock levels

### Medicine Tracker
> Add, edit, track doses, and manage medicine schedules

### Email Notifications
> Beautiful HTML email templates for reminders and alerts

### Nearby Hospitals
> GPS-based hospital finder with interactive map

### MedBot
> AI-powered health assistant for quick data entry

---

## 👥 Team

**Team Name:** Bros

| Role | Contribution |
|------|-------------|
| Full-Stack Development | Frontend SPA, Backend API, Database Design |
| UI/UX Design | Responsive design, animations, user experience |
| DevOps | Firebase, Render, MongoDB Atlas deployment |
| Feature Development | Reminders, notifications, maps, chatbot |

---

## 📄 License

This project was built for **PIH 2026** (Project Innovation Hackathon).

---

<p align="center">
  Made with ❤️ by <b>Team Bros</b> | PIH 2026
</p>
