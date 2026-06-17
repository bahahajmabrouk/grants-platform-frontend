# ⚡ Quick Start - UserDropdown

## 5 Minutes Setup

### 1. Import dans votre Navbar

```typescript
import UserDropdown from '@/components/ui/UserDropdown';
```

### 2. Récupérer l'utilisateur

```typescript
const [user, setUser] = useState<User | null>(null);

useEffect(() => {
  const userData = localStorage.getItem('user');
  if (userData) setUser(JSON.parse(userData));
}, []);
```

### 3. Ajouter au JSX

```typescript
{user && <UserDropdown user={user} />}
```

### ✅ C'est tout! Le composant est prêt à l'emploi

---

## 🎯 Fichiers Créés

```
components/
├── ui/
│   ├── UserDropdown.tsx                 ← Composant principal
│   ├── UserDropdownSkeleton.tsx         ← Loading state
│   ├── UserDropdownVariations.tsx       ← Variations
│   └── ExampleNavbarWithUserDropdown.tsx ← Exemple

hooks/
└── useUserDropdown.ts                   ← Custom hook

lib/
├── dropdown-utils.ts                    ← Fonctions helper
└── dropdown-config.ts                   ← Configuration

types/
└── dropdown.ts                          ← Types TypeScript

__tests__/
└── UserDropdown.test.ts                 ← Tests

Documentation/
├── GUIDE_USER_DROPDOWN.md               ← Guide complet
└── INSTALLATION_USER_DROPDOWN.md        ← Installation détaillée
```

---

## 🚀 Usage Immédiat

### Option 1: Simple (Recommandé)

```tsx
<UserDropdown user={currentUser} />
```

### Option 2: Avec Hook

```tsx
const { user, isOpen, toggleDropdown } = useUserDropdown();

<UserDropdown user={user} />
```

### Option 3: Skeleton Loading

```tsx
<UserDropdown 
  user={user} 
  isLoading={isLoading}
/>
```

---

## 🔧 Configuration Rapide

### Changer les routes (dropdown-config.ts)

```typescript
export const ROUTES = {
  profile: '/my-profile',
  pitches: '/my-pitches',
  // ...
};
```

### Changer les couleurs (UserDropdown.tsx)

```typescript
// Chercher: emerald-400 → bleu-400 (ou autre)
// Chercher: gray-800 → votre-couleur
```

### Ajouter l'API (UserDropdown.tsx ligne ~120)

```typescript
const fetchUserStats = async () => {
  const response = await fetch('/api/user/stats', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  setUserStats(data);
};
```

---

## ✨ Features Incluses

✅ 4 sections principales
✅ Dark mode toggle
✅ Notifications toggle
✅ Statistiques utilisateur
✅ Liens rapides vers pages
✅ Logout sécurisé
✅ Responsive design
✅ Animations smooth
✅ Click-outside to close
✅ Escape key to close
✅ Loading skeleton
✅ TypeScript support

---

## 🐛 Troubleshooting Rapide

| Problème | Solution |
|----------|----------|
| Pas d'ouverture | Vérifier z-50 et useRef |
| localStorage vide | Ajouter 'use client' |
| Toggles ne fonctionnent pas | Vérifier localStorage dans DevTools |
| Stats ne s'affichent pas | Vérifier la console et l'API |

---

## 📱 Responsive

- ✅ Desktop: Affichage complet
- ✅ Mobile: Adapté (< 640px)
- ✅ Tablette: Optimal

Testez avec: `Ctrl+Shift+M` (Chrome DevTools)

---

## 🎨 Thème

**Fond**: `#1F2937` (dark)
**Accent**: `#10B981` (emerald)
**Danger**: `#EF4444` (red)

---

## 📖 Docs Complète

Voir `GUIDE_USER_DROPDOWN.md` pour tous les détails

---

## 🎉 C'est Prêt!

Enjoy! 🚀
