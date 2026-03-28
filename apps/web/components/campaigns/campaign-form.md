# CampaignForm Component

## Overview

The `CampaignForm` component is a comprehensive form for creating and editing marketing campaigns. It integrates specialized composer components (EmailComposer, SMSComposer) and the CampaignTypeSelector to provide a complete campaign creation experience.

## Features Implemented

### 1. Form Structure with Four Sections

- **General Details**: Campaign name and description
- **Channel & Content**: Channel selection and content composition
- **Target Audience**: Groups and segments selection (placeholder for task 6.1)
- **Actions**: Submit, cancel, and navigation controls

### 2. React Hook Form Integration

- Uses `react-hook-form` for form state management
- Zod validation schema for type-safe validation
- Field-level error handling and display
- Form submission with loading states

### 3. Unsaved Changes Tracking

- Tracks form modifications using `isDirty` from react-hook-form
- Warns users before leaving page with unsaved changes
- Uses browser's `beforeunload` event for navigation protection
- Requirement 12.1 implemented

### 4. Channel-Specific Composers

- **SMS Composer**: Integrated for SMS campaigns
  - Character counting
  - 160 character limit validation
  - URL detection and shortening (to be enhanced in Phase 3)

- **Email Composer**: Integrated for email campaigns
  - Subject and body fields
  - Multiple editing modes (Rich text, HTML, React Email)
  - Preview functionality
  - Mode switching with content preservation

### 5. Mode Support

- **Create Mode**: For new campaigns
- **Edit Mode**: For existing campaigns with pre-filled data
- Status-based restrictions (draft vs. launched campaigns)

### 6. Props Interface

```typescript
interface CampaignFormProps {
  initialData?: Campaign | null; // Pre-fill data for edit mode
  groups: { id: string; name: string }[];
  segments: { id: string; name: string }[];
  mode: "create" | "edit";
  initialChannel?: "email" | "sms"; // Pre-select channel
}
```

## Integration Points

### With Existing Components

- `CampaignTypeSelector`: Channel selection UI
- `SMSComposer`: SMS message composition
- `EmailComposer`: Email message composition with multiple modes

### With Pages

- Used in `/campaigns/new/[type]/page.tsx` for campaign creation
- Will be used in `/campaigns/[id]/edit/page.tsx` for campaign editing (Phase 4)

### With Server Actions (TODO)

The form is prepared to integrate with server actions:

- `createCampaign`: Create new campaign
- `updateCampaign`: Update existing campaign
- `setAudience`: Set campaign audience

## Validation Schema

```typescript
const formSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  channel: z.enum(["sms", "email"]),
  smsContent: z.string().optional(),
  emailContent: z
    .object({
      subject: z.string(),
      body: z.string(),
      mode: z.enum(["rich", "html", "react-email"]),
    })
    .optional(),
  audienceGroups: z.array(z.string()),
  audienceSegments: z.array(z.string()),
});
```

## Requirements Validated

- **Requirement 2.2**: Campaign creation form with sections ✓
- **Requirement 12.1**: Unsaved changes tracking ✓
- **Requirement 2.3**: Campaign name required ✓
- **Requirement 2.4**: Optional description ✓
- **Requirement 2.5**: Channel selection required ✓
- **Requirement 2.6**: Inline validation errors ✓

## Next Steps

1. **Task 5.2**: Implement general details section validation
2. **Task 6.1**: Implement AudienceSelector component
3. **Task 8.1-8.4**: Implement form submission with server actions
4. **Phase 3**: Enhance composers with advanced features
5. **Phase 4**: Add launch, schedule, and delete functionality

## Testing

Unit tests are provided in `campaign-form.test.tsx` covering:

- Form rendering with all sections
- Validation error display
- Channel pre-selection
- Edit mode with pre-filled data
- Unsaved changes tracking

## Usage Example

```tsx
import { CampaignForm } from "@/components/campaigns/campaign-form";

// Create mode
<CampaignForm
  mode="create"
  groups={groups}
  segments={segments}
  initialChannel="email"
/>

// Edit mode
<CampaignForm
  mode="edit"
  initialData={campaign}
  groups={groups}
  segments={segments}
/>
```
