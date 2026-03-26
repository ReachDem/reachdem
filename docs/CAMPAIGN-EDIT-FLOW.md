# Campaign Edit Flow

## Overview

The campaign edit system allows users to modify draft campaigns and retry failed campaigns with pre-filled data.

## Features

### Edit Draft Campaigns

- Only campaigns with status `draft` can be edited
- All fields are pre-filled with saved data:
  - Campaign title and description
  - Email/SMS content with all formatting
  - Selected audience (segment or group)
  - Scheduled date/time (if not in the past)
- Changes are saved via PATCH to `/api/v1/campaigns/{id}`
- Audience is updated via POST to `/api/v1/campaigns/{id}/audience`

### Retry Failed Campaigns

- Campaigns with status `failed` can be "edited"
- All fields are pre-filled with the original campaign data
- **Important**: Launching a failed campaign creates a NEW campaign (not an update)
- Scheduled dates in the past are cleared
- "Save as draft" button is disabled for failed campaigns
- User sees a warning: "This campaign failed. Launching will create a new campaign with the same content."

## User Flow

### Editing a Draft Campaign

1. User clicks "Edit" on a draft campaign
2. System loads campaign data via `/api/v1/campaigns/{id}`
3. System loads audience data via `/api/v1/campaigns/{id}/audience`
4. All fields are pre-filled:
   - Title, description
   - Email subject, body, font settings OR SMS text, sender ID
   - Selected segment or group
   - Scheduled date/time (if exists and not past)
5. User makes changes
6. User can:
   - **Save as Draft**: Updates the existing campaign (PATCH)
   - **Schedule**: Updates campaign with scheduled date, sets audience, campaign stays in draft
   - **Launch**: Updates campaign, sets audience, launches immediately

### Retrying a Failed Campaign

1. User clicks "Edit" on a failed campaign
2. System loads campaign data and pre-fills all fields
3. System shows warning about creating new campaign
4. "Save as draft" button is disabled
5. User can modify any fields
6. User can:
   - **Schedule**: Creates NEW campaign with scheduled date, sets audience
   - **Launch**: Creates NEW campaign, sets audience, launches immediately

## API Calls

### Loading Campaign for Edit

```typescript
GET / api / v1 / campaigns / { id };
// Returns campaign with content, status, etc.

GET / api / v1 / campaigns / { id } / audience;
// Returns audience mappings (segments/groups)
```

### Saving Draft Changes

```typescript
PATCH /api/v1/campaigns/{id}
Body: {
  name: string,
  description: string | null,
  content: EmailContent | SmsContent
}

POST /api/v1/campaigns/{id}/audience
Body: {
  audiences: [{
    sourceType: "segment" | "group",
    sourceId: string
  }]
}
```

### Launching Edited Draft

```typescript
// 1. Update campaign
PATCH / api / v1 / campaigns / { id };

// 2. Set audience
POST / api / v1 / campaigns / { id } / audience;

// 3. Launch
POST / api / v1 / campaigns / { id } / launch;
```

### Retrying Failed Campaign

```typescript
// 1. Create new campaign
POST /api/v1/campaigns
Body: {
  name: string,
  description: string | null,
  channel: "email" | "sms",
  content: EmailContent | SmsContent,
  scheduledAt?: string // ISO date if scheduling
}

// 2. Set audience on new campaign
POST /api/v1/campaigns/{newId}/audience

// 3. Launch new campaign (if not scheduling)
POST /api/v1/campaigns/{newId}/launch
```

## Content Pre-filling

### Email Content

```typescript
{
  subject: campaign.content.subject,
  body: campaign.content.html,
  mode: "visual",
  fontFamily: campaign.content.fontFamily,
  fontWeights: campaign.content.fontWeights
}
```

### SMS Content

```typescript
{
  text: campaign.content.text,
  senderId: campaign.content.senderId
}
```

## Validation Rules

### Draft Campaigns

- Can be edited at any time
- All actions (save, schedule, launch) update the existing campaign
- Scheduled date can be in the future

### Failed Campaigns

- Cannot be saved as draft (button disabled)
- Schedule/Launch creates a new campaign
- Past scheduled dates are cleared
- Original campaign remains with "failed" status

## UI Differences

### Draft Campaign Edit

- Header button: "save as draft" (enabled)
- No warning message
- All actions update existing campaign

### Failed Campaign Edit

- Header button: "save as draft" (disabled, shows "cannot save failed")
- Warning message: "This campaign failed. Launching will create a new campaign with the same content."
- Schedule/Launch creates new campaign

## Error Handling

All operations include:

- Console logging with `[Edit Campaign]` prefix
- Try/catch blocks
- Toast notifications for success/error
- Detailed error messages
- Stack traces in console for debugging

## Files Modified

- `apps/web/app/(authenticated)/campaigns/[id]/edit/page.tsx` - Complete rewrite with edit logic
- Uses same composers as creation page for consistency
- Reuses `AudienceTargetSelector` component
- Shares same validation and API call patterns

## Status Checks

On page load:

```typescript
if (campaign.status !== "draft" && campaign.status !== "failed") {
  toast.error("Only draft and failed campaigns can be edited");
  router.push("/campaigns");
  return;
}
```

## Date Handling

For scheduled dates:

```typescript
if (campaign.scheduledAt) {
  const scheduledDateTime = new Date(campaign.scheduledAt);
  if (!isPast(scheduledDateTime)) {
    // Pre-fill date and time
    setScheduledDate(scheduledDateTime);
    setScheduledTime(format(scheduledDateTime, "HH:mm"));
  }
  // If date is in the past, leave empty
}
```

## Build Status

✅ No TypeScript errors
✅ All diagnostics passing
✅ Consistent with creation flow
