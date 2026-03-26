# Skeleton Loading States

## Overview

All spinners have been replaced with skeleton loaders throughout the application for a better user experience. Skeletons provide visual feedback that matches the shape and layout of the content being loaded.

## Components Created

### 1. Base Skeleton Component

**File**: `apps/web/components/ui/skeleton.tsx`

Simple, reusable skeleton component with pulse animation:

```tsx
<Skeleton className="h-10 w-full" />
```

### 2. Campaign Form Skeleton

**File**: `apps/web/components/campaigns/campaign-form-skeleton.tsx`

Full-page skeleton for campaign creation/edit pages that mimics:

- Header with title and description inputs
- Audience selector section
- Composer section with mode toggles
- Action buttons
- Feature cards grid

Used in:

- `/campaigns/new/[type]` - Campaign creation
- `/campaigns/[id]/edit` - Campaign editing

### 3. Email Editor Skeleton

**File**: `apps/web/components/campaigns/email-editor-skeleton.tsx`

Skeleton for the TipTap email editor that shows:

- Toolbar with icon placeholders
- Content area with simulated text blocks
- Image placeholder
- Button placeholder

Used in:

- `EmailComposer` component while editor loads

### 4. Table Skeleton

**File**: `apps/web/app/(authenticated)/campaigns/page.tsx`

Already existed - shows skeleton for campaigns table:

- Search bar
- Table header
- 5 rows of skeleton data

## Changes Made

### Campaign Pages

#### Creation Page (`/campaigns/new/[type]`)

- ❌ Removed: `Loader2` spinner while loading campaign type
- ✅ Added: `CampaignFormSkeleton` component
- ❌ Removed: Spinners in "Launch" and "Schedule" buttons
- ✅ Added: Text-only loading states ("LAUNCHING...", "SCHEDULING...")

#### Edit Page (`/campaigns/[id]/edit`)

- ❌ Removed: `Loader2` spinner while loading campaign data
- ✅ Added: `CampaignFormSkeleton` component
- ❌ Removed: Spinners in "Launch" and "Schedule" buttons
- ✅ Added: Text-only loading states ("LAUNCHING...", "SCHEDULING...")

### Email Composer

**File**: `apps/web/components/campaigns/email-composer.tsx`

- ❌ Removed: `Loader2` spinner while editor loads
- ✅ Added: `EmailEditorSkeleton` component
- ❌ Removed: `Loader2` from Suspense fallback
- ✅ Added: `EmailEditorSkeleton` in Suspense fallback

### Segments Components

#### Segment Form Wrapper

**File**: `apps/web/components/segments/segment-form-wrapper.tsx`

- ❌ Removed: `IconLoader2` in "Save Segment" button
- ✅ Added: Text-only state ("Saving...")
- ❌ Removed: `IconLoader2` in "Preview" button
- ✅ Added: Text-only state ("Loading...")

#### Preview Panel

**File**: `apps/web/components/segments/preview-panel.tsx`

- ❌ Removed: `IconLoader2` spinner in header
- ✅ Added: Text-only state ("Loading...")

#### Segments Client

**File**: `apps/web/components/segments-client.tsx`

- ❌ Removed: `IconLoader2` in delete confirmation
- ✅ Added: Text-only state ("Deleting...")

## Design Principles

### 1. Match Content Shape

Skeletons should closely match the layout and dimensions of the actual content:

```tsx
// Good - matches actual input height
<Skeleton className="h-10 w-full" />

// Bad - generic size
<Skeleton className="h-20 w-20" />
```

### 2. Use Appropriate Widths

Vary skeleton widths to look more natural:

```tsx
<Skeleton className="h-8 w-3/4" />  // Title
<Skeleton className="h-4 w-full" /> // Full line
<Skeleton className="h-4 w-5/6" /> // Partial line
```

### 3. Group Related Elements

Keep skeleton structure similar to actual layout:

```tsx
<div className="space-y-4">
  <Skeleton className="h-5 w-32" /> // Label
  <Skeleton className="h-10 w-full" /> // Input
</div>
```

### 4. Button Loading States

For buttons, prefer text-only loading states over spinners:

```tsx
// Good
{
  isLoading ? "Saving..." : "Save";
}

// Avoid
{
  isLoading && <Loader2 className="animate-spin" />;
}
Save;
```

## Benefits

### User Experience

- **Visual Continuity**: Skeletons show where content will appear
- **Perceived Performance**: Feels faster than spinners
- **Reduced Anxiety**: Users know what to expect
- **Professional Look**: Modern, polished interface

### Technical

- **Consistent Patterns**: Reusable skeleton components
- **Easy Maintenance**: Clear structure for each loading state
- **Better Accessibility**: Screen readers can announce loading states
- **Reduced Motion**: No spinning animations (better for motion sensitivity)

## Usage Guidelines

### When to Use Skeletons

- Initial page load
- Data fetching
- Component lazy loading
- Large content areas

### When to Use Text States

- Button actions (save, delete, launch)
- Small inline operations
- Quick state changes

### When to Use Neither

- Instant operations (< 100ms)
- Background updates
- Optimistic UI updates

## Examples

### Full Page Skeleton

```tsx
if (isLoading) {
  return <CampaignFormSkeleton />;
}
```

### Component Skeleton

```tsx
{
  isEditorLoading && <EmailEditorSkeleton />;
}
<Suspense fallback={<EmailEditorSkeleton />}>
  <Editor />
</Suspense>;
```

### Button Loading State

```tsx
<Button disabled={isLoading}>{isLoading ? "Saving..." : "Save"}</Button>
```

### Inline Loading

```tsx
{
  isLoading ? (
    <div className="text-muted-foreground text-xs">Loading...</div>
  ) : (
    <div className="badge">{count} items</div>
  );
}
```

## Build Status

✅ All spinners replaced with skeletons
✅ No TypeScript errors
✅ Build passing
✅ Consistent loading patterns across app
