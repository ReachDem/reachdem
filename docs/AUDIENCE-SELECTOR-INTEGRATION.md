# Intégration du Sélecteur d'Audience

## Vue d'ensemble

Le sélecteur d'audience a été remplacé par un nouveau composant avec deux dropdowns côte à côte (Segments et Groupes) où on ne peut sélectionner qu'un seul à la fois.

## Composants Créés

### 1. `AudienceTargetSelector` Component

**Fichier**: `apps/web/components/campaigns/audience-target-selector.tsx`

Composant avec deux boutons dropdown dans un button group:

- **Segments**: Dropdown pour sélectionner un segment
- **Groups**: Dropdown pour sélectionner un groupe
- Sélection exclusive: quand on sélectionne un segment, le groupe est désélectionné et vice versa
- État de chargement visuel avec spinner
- Logs de debug dans la console pour faciliter le débogage

### 2. Hooks React Query

#### `useSegments`

**Fichier**: `apps/web/lib/hooks/use-segments.ts`

Hook pour récupérer la liste des segments depuis l'API `/api/v1/segments`:

```typescript
const { data, isLoading, error } = useSegments();
// data.data contient le tableau de segments
```

#### `useGroups`

**Fichier**: `apps/web/lib/hooks/use-groups.ts`

Hook pour récupérer la liste des groupes depuis l'API `/api/v1/groups`:

```typescript
const { data, isLoading, error } = useGroups();
// data.data contient le tableau de groupes
```

## Intégration dans la Page

**Fichier**: `apps/web/app/(authenticated)/campaigns/new/[type]/page.tsx`

### État Ajouté

```typescript
const [selectedSegmentId, setSelectedSegmentId] = useState<string>("");
const [selectedGroupId, setSelectedGroupId] = useState<string>("");
```

### Hooks Utilisés

```typescript
const {
  data: segmentsData,
  isLoading: isLoadingSegments,
  error: segmentsError,
} = useSegments();
const {
  data: groupsData,
  isLoading: isLoadingGroups,
  error: groupsError,
} = useGroups();
```

### Gestion des Erreurs

```typescript
useEffect(() => {
  if (segmentsError) {
    toast.error("Failed to load segments");
    console.error("Segments error:", segmentsError);
  }
}, [segmentsError]);

useEffect(() => {
  if (groupsError) {
    toast.error("Failed to load groups");
    console.error("Groups error:", groupsError);
  }
}, [groupsError]);
```

### Utilisation du Composant

```typescript
<AudienceTargetSelector
  segments={segments}
  groups={groups}
  selectedSegmentId={selectedSegmentId}
  selectedGroupId={selectedGroupId}
  onSegmentChange={setSelectedSegmentId}
  onGroupChange={setSelectedGroupId}
  disabled={isLoading || isLoadingSegments || isLoadingGroups}
/>
```

## APIs Utilisées

### GET `/api/v1/segments`

Récupère la liste des segments de l'organisation.

**Réponse**:

```json
{
  "data": [
    {
      "id": "seg-123",
      "name": "Active Users",
      "description": "...",
      "definition": {...},
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "nextCursor": "..."
}
```

### GET `/api/v1/groups`

Récupère la liste des groupes de l'organisation.

**Réponse**:

```json
{
  "data": [
    {
      "id": "grp-123",
      "name": "Marketing Team",
      "description": "...",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "nextCursor": "..."
}
```

## Outils de Debug

### Logs Console

Le composant `AudienceTargetSelector` log automatiquement:

- Les segments chargés
- Les groupes chargés
- L'ID du segment sélectionné
- L'ID du groupe sélectionné
- Les actions de sélection

Cherchez dans la console les messages préfixés par `[AudienceTargetSelector]`.

### Vérification des Erreurs

1. Ouvrir la console du navigateur
2. Vérifier les erreurs réseau dans l'onglet Network
3. Vérifier les logs de debug du composant
4. Vérifier les toasts d'erreur affichés à l'utilisateur

### Tests Manuels

1. Ouvrir la page de création de campagne
2. Vérifier que les dropdowns se chargent
3. Sélectionner un segment → le groupe doit être désélectionné
4. Sélectionner un groupe → le segment doit être désélectionné
5. Vérifier que le bouton actif est mis en surbrillance

## Comportement

### Sélection Exclusive

- Quand un segment est sélectionné, `selectedSegmentId` contient l'ID et `selectedGroupId` est vide
- Quand un groupe est sélectionné, `selectedGroupId` contient l'ID et `selectedSegmentId` est vide
- On ne peut jamais avoir les deux sélectionnés en même temps

### État de Chargement

- Pendant le chargement initial, un spinner est affiché
- Les dropdowns sont désactivés pendant le chargement
- Si les APIs échouent, un toast d'erreur est affiché

### État Vide

- Si aucun segment n'est disponible, le dropdown affiche "No segments available"
- Si aucun groupe n'est disponible, le dropdown affiche "No groups available"

## Prochaines Étapes

1. Intégrer les IDs sélectionnés dans la logique de création de campagne
2. Ajouter la validation pour s'assurer qu'une audience est sélectionnée avant de lancer
3. Afficher le nombre de contacts dans chaque segment/groupe
4. Ajouter un aperçu des contacts sélectionnés
