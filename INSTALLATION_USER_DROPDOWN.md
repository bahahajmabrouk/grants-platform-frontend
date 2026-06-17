# 🚀 Installation & Mise en Place - UserDropdown

## ✅ Checklist Installation

- [x] Fichier principal: `components/ui/UserDropdown.tsx`
- [x] Loading state: `components/ui/UserDropdownSkeleton.tsx`
- [x] Hooks personnalisés: `hooks/useUserDropdown.ts`
- [x] Utilitaires: `lib/dropdown-utils.ts`
- [x] Configuration: `lib/dropdown-config.ts`
- [x] Types: `types/dropdown.ts`
- [x] Exemple Navbar: `components/ui/ExampleNavbarWithUserDropdown.tsx`
- [x] Variations: `components/ui/UserDropdownVariations.tsx`
- [x] Tests: `__tests__/UserDropdown.test.ts`
- [x] Guide: `GUIDE_USER_DROPDOWN.md`

## 📦 Dépendances Requises

Vérifiez que vous avez ces packages dans `package.json`:

```json
{
  "dependencies": {
    "next": "^16.1.6",
    "react": "^18",
    "react-dom": "^18",
    "lucide-react": "^0.394.0",
    "tailwindcss": "^3.4.1",
    "typescript": "^5",
    "axios": "^1.14.0"
  }
}
```

**Tous les packages requis sont déjà installés! ✅**

---

## 🔧 Configuration Tailwind

Vérifiez que votre `tailwind.config.ts` inclut les animations:

```typescript
module.exports = {
  theme: {
    extend: {
      animation: {
        'in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
```

(Les animations `slide-in-from-top-2` et `fade-in` sont déjà dans Tailwind 3.4+)

---

## 🔌 Étape 1: Intégration Simple

### Dans votre Navbar/Header existante:

```typescript
// app/layout.tsx ou le layout de votre choix

import UserDropdown from '@/components/ui/UserDropdown';
import { User } from '@/types/auth';

export default function Layout() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Récupérer l'utilisateur depuis localStorage
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  return (
    <header className="bg-gray-900 border-b border-gray-700">
      <nav className="flex items-center justify-between p-4">
        <h1>Ma Plateforme</h1>
        {user && <UserDropdown user={user} />}
      </nav>
    </header>
  );
}
```

---

## 🔌 Étape 2: Intégration Avancée (Recommandée)

### Utiliser le hook personnalisé:

```typescript
'use client';

import { useUserDropdown } from '@/hooks/useUserDropdown';
import UserDropdown from '@/components/ui/UserDropdown';

export default function Navbar() {
  const { user, isLoading, closeDropdown } = useUserDropdown();

  return (
    <nav className="bg-gray-900 border-b border-gray-700">
      <div className="flex items-center justify-between p-4">
        <h1>Ma Plateforme</h1>
        
        {user && (
          <UserDropdown 
            user={user} 
            isLoading={isLoading}
            onLogout={() => {
              console.log('Déconnecté');
              closeDropdown();
            }}
          />
        )}
      </div>
    </nav>
  );
}
```

---

## 🔌 Étape 3: Intégration avec Provider (Si nécessaire)

### Créer un Provider pour le contexte utilisateur:

```typescript
// lib/UserContext.tsx

'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/types/auth';

const UserContext = createContext<User | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Erreur parsing user:', error);
      }
    }
  }, []);

  return (
    <UserContext.Provider value={user}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser doit être utilisé avec UserProvider');
  }
  return context;
}
```

### Utiliser dans app/layout.tsx:

```typescript
import { UserProvider } from '@/lib/UserContext';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <UserProvider>
          {children}
        </UserProvider>
      </body>
    </html>
  );
}
```

---

## 🎨 Étape 4: Adapter les Routes

Dans le fichier `lib/dropdown-config.ts`, mettez à jour les routes selon votre structure:

```typescript
export const ROUTES = {
  profile: '/profile',           // À adapter
  pitches: '/pitches',           // À adapter
  activity: '/activity',         // À adapter
  settings: '/settings',         // À adapter
  settingsPassword: '/settings/password',
  login: '/login',
  logout: '/logout',
} as const;
```

**Exemple pour votre app:**
```typescript
export const ROUTES = {
  profile: '/app/profile',
  pitches: '/app/pitches',
  activity: '/app/activity',
  settings: '/app/settings',
  settingsPassword: '/app/settings/password',
  login: '/(auth)/login',
  logout: '/logout',
} as const;
```

---

## 📡 Étape 5: Connecter l'API (Optional)

### Remplacer les mock data par des appels API réels:

**Dans `components/ui/UserDropdown.tsx` ligne ~120:**

```typescript
// Avant (Mock data):
const fetchUserStats = async () => {
  await new Promise((resolve) => setTimeout(resolve, 500));
  // Mock data statique
};

// Après (API réel):
const fetchUserStats = async () => {
  try {
    const token = localStorage.getItem('access_token');
    const response = await fetch('/api/user/stats', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) throw new Error('Erreur API');
    
    const data = await response.json();
    setUserStats(data);
  } catch (error) {
    console.error('Erreur stats:', error);
  }
};
```

**API endpoint attendu:**
```
GET /api/user/stats
Headers: Authorization: Bearer <token>

Response:
{
  "pitches": 3,
  "grants": 12,
  "avgScore": 7.2
}
```

---

## 🧪 Étape 6: Tester le Composant

### Test simple dans le navigateur:

```typescript
// app/test/page.tsx

'use client';

import UserDropdown from '@/components/ui/UserDropdown';
import { User } from '@/types/auth';

const mockUser: User = {
  id: 1,
  email: 'baha.hadjmabrouk2002@gmail.com',
  first_name: 'Baha',
  last_name: 'Mabrouk',
  company_name: 'ExypnoTech',
  is_active: true,
  created_at: new Date().toISOString(),
};

export default function TestPage() {
  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <h1 className="text-white text-2xl mb-8">Test UserDropdown</h1>
      
      <UserDropdown user={mockUser} />
    </div>
  );
}
```

Accédez à `http://localhost:3000/test` pour voir le composant en action.

---

## 🐛 Dépannage

### Le dropdown ne s'ouvre pas
```
1. Vérifier la console pour les erreurs
2. Vérifier que ref est correctement assignée
3. Vérifier que z-index (z-50) n'est pas bloqué
```

### localStorage ne fonctionne pas
```
1. Vérifier que vous êtes en 'use client'
2. Vérifier en mode incognito (localStorage peut être désactivé)
3. Vérifier que localStorage.getItem() retourne quelquechose
```

### Les stats ne s'affichent pas
```
1. Vérifier la console pour les erreurs
2. Vérifier que le mock data est bien en place
3. Vérifier l'endpoint API /api/user/stats
```

### Les toggles ne fonctionnent pas
```
1. Vérifier que handleDarkModeToggle et handleNotificationsToggle sont appelées
2. Vérifier que les fonctions setDarkMode et setNotificationsEnabled existent
3. Vérifier localStorage dans DevTools (F12 > Application > Local Storage)
```

---

## 📱 Tests sur Mobile

Le composant est responsive:

- **Desktop**: Affichage complet avec prénom
- **Tablet**: Dropdown adapté
- **Mobile** (< 640px): Prénom caché, icon seulement

Testez avec:
```
Chrome DevTools > Ctrl+Shift+M
```

---

## 🎨 Personnalisation

### Changer les couleurs:

**1. Accent (Émeraude → Bleu):**
```bash
# Chercher et remplacer:
emerald-400 → blue-400
emerald-500 → blue-500
emerald-600 → blue-600
```

**2. Changer le background:**
```bash
# Chercher et remplacer:
gray-800 → slate-800
gray-700 → slate-700
```

### Ajouter des icônes personnalisées:

```typescript
import { CustomIcon } from 'lucide-react';

<CustomIcon size={16} className="text-emerald-400" />
```

[Liste complète des icônes Lucide](https://lucide.dev)

---

## 📚 Ressources

- **Next.js Documentation**: https://nextjs.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Lucide Icons**: https://lucide.dev/
- **React Hooks**: https://react.dev/reference/react/hooks

---

## ✨ Prochaines Étapes

1. ✅ Intégrer dans votre Navbar
2. ✅ Adapter les routes selon votre app
3. ✅ Connecter l'API si nécessaire
4. ✅ Tester sur mobile
5. ✅ Personnaliser les couleurs
6. ✅ Ajouter les notifications (optionnel)

---

## 📞 Support

Si vous rencontrez des problèmes:

1. Consultez le `GUIDE_USER_DROPDOWN.md`
2. Vérifiez les commentaires dans `UserDropdown.tsx`
3. Testez avec la page de test `/test`
4. Vérifiez la console du navigateur (F12)

---

## 🎉 Succès!

Vous avez maintenant un dropdown utilisateur professionnel et complet!

Bon développement! 🚀
