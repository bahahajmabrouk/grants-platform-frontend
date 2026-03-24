# 🎨 Grants Platform — Frontend

> Interface utilisateur de la plateforme autonome de soumission de grants pour startups early-stage.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3-cyan?logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-purple)


---

## 📌 Description

Interface web moderne permettant aux fondateurs de startups d'uploader leur pitch deck, visualiser les données extraites par l'IA, consulter les grants trouvés automatiquement et suivre les soumissions en temps réel.

---

## 🏗️ Structure

```
frontend/
├── app/
│   ├── layout.tsx           # Layout racine
│   ├── page.tsx             # Page d'accueil
│   ├── upload/
│   │   └── page.tsx         # Upload + extraction pitch deck ✅
│   ├── grants/
│   │   └── page.tsx         # Recherche et sélection grants (Mois 3)
│   ├── submissions/
│   │   └── page.tsx         # Suivi soumissions temps réel (Mois 4)
│   └── dashboard/
│       └── page.tsx         # Vue d'ensemble (Mois 5)
├── components/
│   ├── ui/                  # Composants réutilisables
│   └── shared/              # Navbar, Sidebar, StatusBadge
├── lib/
│   ├── api.ts               # Client Axios — appels backend
│   └── websocket.ts         # WebSocket — statut temps réel
├── types/
│   ├── pitch.ts             # Types TypeScript pitch deck
│   ├── grant.ts             # Types TypeScript grant
│   └── submission.ts        # Types TypeScript soumission
└── hooks/
    ├── useAgent.ts          # Hook état AI Agent
    └── useWebSocket.ts      # Hook WebSocket
```

---

## ⚡ Stack Technique

| Composant | Technologie |
|-----------|-------------|
| Framework | Next.js 14 App Router |
| Language | TypeScript 5 |
| Styling | TailwindCSS 3 |
| HTTP Client | Axios |
| File Upload | react-dropzone |
| Notifications | Sonner |
| Icons | Lucide React |
| WebSocket | Native WebSocket API |

---

## 🚀 Démarrage rapide

### Prérequis
- Node.js 18+
- Backend lancé sur http://localhost:8000

### Installation

```bash
# 1. Cloner le repo
git clone https://github.com/bahahajmabrouk/grants-platform-frontend.git
cd grants-platform-frontend

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env.local
# Vérifier que NEXT_PUBLIC_API_URL=http://localhost:8000

# 4. Lancer le serveur de développement
npm run dev
```

### Accès
| URL | Description |
|-----|-------------|
| http://localhost:3000 | Page d'accueil |
| http://localhost:3000/upload | Upload pitch deck |
| http://localhost:3000/grants | Recherche grants |
| http://localhost:3000/submissions | Suivi soumissions |

---

## 🖥️ Pages & Fonctionnalités

### `/upload` — Upload Pitch Deck ✅
- Drag & drop PDF/PPTX
- Extraction automatique via LLM (Groq)
- Affichage structuré : industrie, stade, problème, solution, marché, mots-clés
- Polling automatique du statut

### `/grants` — Recherche de Grants (Mois 3)
- Liste des grants trouvés par l'agent
- Filtres par industrie, pays, deadline
- Score de pertinence par grant
- Sélection des grants cibles

### `/submissions` — Soumissions (Mois 4)
- Statut en temps réel via WebSocket
- Capture d'écran du Browser Agent
- Historique des soumissions
- Rapport final

### `/dashboard` — Dashboard (Mois 5)
- Statistiques globales
- Vue d'ensemble de toutes les candidatures


---

## 🔑 Variables d'environnement

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

---

## 🔗 Repo Backend

Ce frontend communique avec le backend FastAPI :
[![Backend](https://img.shields.io/badge/Backend-FastAPI-green?logo=fastapi)](https://github.com/bahahajmabrouk/grants-platform-backend)

---

## 🎓 Contexte Académique

Ce projet est développé dans le cadre d'un **PFE (Projet de Fin d'Études) 2025**.

**Sujet** : Conception et développement d'une plateforme autonome de soumission de grants pour startups early-stage basée sur des AI Agents.

---

## 👤 Auteur

**Baha HajMabrouk**
[![GitHub](https://img.shields.io/badge/GitHub-bahahajmabrouk-black?logo=github)](https://github.com/bahahajmabrouk)
