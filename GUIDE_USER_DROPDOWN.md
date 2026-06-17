# 📖 Guide d'Intégration - UserDropdown

## 📋 Fichiers Créés

### 1. **UserDropdown.tsx**
Le composant principal du dropdown utilisateur avec toutes les fonctionnalités.

**Location:** `components/ui/UserDropdown.tsx`

**Props:**
```typescript
interface UserDropdownProps {
  user?: User;           // Objet utilisateur du type User
  onLogout?: () => void; // Callback optionnel au logout
  isLoading?: boolean;   // Affiche le skeleton pendant le chargement
}
```

### 2. **UserDropdownSkeleton.tsx**
Composant de chargement avec animations de pulsation.

**Location:** `components/ui/UserDropdownSkeleton.tsx`

### 3. **ExampleNavbarWithUserDropdown.tsx**
Exemple de Navbar intégrant le UserDropdown.

**Location:** `components/ui/ExampleNavbarWithUserDropdown.tsx`

---

## 🚀 Utilisation Rapide

### Import du composant
```typescript
import UserDropdown from '@/components/ui/UserDropdown';
import { User } from '@/types/auth';
```

### Usage simple
```tsx
<UserDropdown 
  user={currentUser}
  onLogout={() => console.log('Déconnecté')}
/>
```

---

## 🎨 Structure & Sections

### Section 1: Infos Utilisateur
- Avatar circulaire avec dégradé émeraude
- Nom complet
- Email
- Entreprise avec badge "Vérifié"

### Section 2: Mini Statistiques
- Nombre de Pitchs
- Nombre de Grants trouvés
- Score moyen
- Cards avec fond gris

### Section 3: Liens Rapides
- Mon Profil → `/profile`
- Mes Pitchs → `/pitches`
- Activité → `/activity`
- Paramètres → `/settings`

### Section 4: Compte & Actions
- Changer mot de passe → `/settings/password`
- Toggle Notifications (localStorage: `notificationsEnabled`)
- Toggle Mode Sombre (localStorage: `darkMode`)

### Section 5: Déconnexion
- Bouton "Se Déconnecter" en rouge
- Nettoie localStorage
- Redirection vers `/login`

---

## ⚙️ Configuration

### Couleurs (Dark Mode)
```
Fond principal:     #1F2937 (gray-800)
Fond secondaire:    #111827 (gray-900)
Texte principal:    #F3F4F6 (gray-100)
Texte secondaire:   #9CA3AF (gray-400)
Accent:             #10B981 (emerald-500)
Danger:             #EF4444 (red-500)
Bordures:           #374151 (gray-700)
```

### localStorage Keys
```
'darkMode'              → 'true' | 'false'
'notificationsEnabled'  → 'true' | 'false'
'access_token'          → token JWT
'user'                  → User JSON
```

---

## 🔌 Intégration avec Navbar Existante

### Dans votre Navbar/Header actuelle:

```tsx
import UserDropdown from '@/components/ui/UserDropdown';

export default function YourNavbar() {
  const [user, setUser] = useState<User | null>(null);

  return (
    <nav>
      {/* ... autres éléments ... */}
      
      {user && (
        <UserDropdown user={user} />
      )}
    </nav>
  );
}
```

---

## 🎯 Fonctionnalités Implémentées

✅ **Interactions**
- Clic sur le bouton pour ouvrir/fermer
- Clic en dehors pour fermer
- Navigation entre pages

✅ **État**
- localStorage pour dark mode
- localStorage pour notifications
- Logout avec nettoyage localStorage

✅ **Animations**
- Fade-in smooth
- Slide-in du haut
- Transitions hover
- Rotation du chevron

✅ **Responsive**
- Mobile: 320px+
- Affichage du nom uniquement sur desktop (hidden sm)
- Largeur fixe: 320px (w-80)

✅ **Accessibilité**
- aria-expanded sur le bouton
- aria-haspopup="true"
- role="switch" sur les toggles
- aria-checked sur les toggles

---

## 🔄 API Integration (Stats)

### À faire: Remplacer les mock data

**Fichier:** `components/ui/UserDropdown.tsx` ligne ~120

**Actuel:**
```typescript
const fetchUserStats = async () => {
  // Mock data
  setUserStats({
    pitches: 3,
    grants: 12,
    avgScore: 7.2,
  });
};
```

**À remplacer par:**
```typescript
const fetchUserStats = async () => {
  try {
    const response = await fetch('/api/user/stats', {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`
      }
    });
    const data = await response.json();
    setUserStats(data);
  } catch (error) {
    console.error('Erreur stats:', error);
  }
};
```

---

## 🛣️ Routes Supposées

Le dropdown suppose ces routes existent:

- `/profile` - Profil utilisateur
- `/pitches` - Mes pitchs
- `/activity` - Activité
- `/settings` - Paramètres généraux
- `/settings/password` - Changer mot de passe
- `/login` - Page de login

**À adapter selon votre structure!**

---

## 🐛 Troubleshooting

### Le dropdown ne s'ouvre pas
```
Vérifier: onClick trigger sur le bouton
Vérifier: z-50 pour le z-index
Vérifier: useRef et dropdownRef correctement assignée
```

### Les toggles ne fonctionnent pas
```
Vérifier: localStorage accessible (pas en Incognito)
Vérifier: handleDarkModeToggle et handleNotificationsToggle appelées
```

### Les stats ne s'affichent pas
```
Vérifier: Mock data dans UserStats (ligne ~120)
Vérifier: API endpoint existe et retourne les données
```

### Logout ne redirige pas
```
Vérifier: useRouter() du next/navigation
Vérifier: Router push vers /login fonctionne
```

---

## 📱 Responsivité

### Desktop (md+)
- Affichage du prénom
- Dropdown largeur 320px
- Positionnement right-0

### Mobile (< md)
- Prénom caché
- Dropdown adapté au viewport
- Avatar toujours visible

---

## 🎨 Customisation

### Changer les couleurs

**Accent (actuellement émeraude):**
```tsx
// Chercher: text-emerald-400, bg-emerald-500, etc.
// Remplacer par: text-blue-400, bg-blue-500, etc.
```

### Changer les icônes

**Utiliser d'autres Lucide Icons:**
```tsx
import { IconName } from 'lucide-react';

// Remplacer les icônes existantes
<IconName size={16} />
```

### Ajouter des sections supplémentaires

```tsx
{/* SECTION 6: EXEMPLE */}
<div className="border-t border-gray-700" />
<div className="px-4 py-3">
  {/* Votre contenu */}
</div>
```

---

## 📚 Resources

- **Lucide Icons:** https://lucide.dev/
- **Tailwind CSS:** https://tailwindcss.com/
- **Next.js:** https://nextjs.org/
- **TypeScript:** https://www.typescriptlang.org/

---

## ✨ Bonus Features à Ajouter

- [ ] Profil picture upload dynamique
- [ ] Indicateur de statut online/offline
- [ ] Recent activity in dropdown
- [ ] Dark mode theme toggle avec effet
- [ ] Notifications unread count badge
- [ ] Theme color customization
- [ ] Timezone selector

---

## 📞 Support

Pour toute question ou amélioration, consultez les commentaires dans les fichiers TypeScript.
