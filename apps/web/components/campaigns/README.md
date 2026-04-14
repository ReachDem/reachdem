# Campaigns Components

This directory contains components for the Campaigns MVP Interface.

## CampaignTypeSelector

A component for selecting the campaign type (Email or SMS) during campaign creation.

### Usage

```tsx
import { CampaignTypeSelector } from "@/components/campaigns/campaign-type-selector";

export default function NewCampaignPage() {
  const [selectedType, setSelectedType] = useState<"email" | "sms" | null>(
    null
  );

  return (
    <CampaignTypeSelector value={selectedType} onChange={setSelectedType} />
  );
}
```

### Props

- `value`: Currently selected campaign type ("email" | "sms" | null)
- `onChange`: Callback function when a type is selected
- `disabled?`: Optional boolean to disable the selector

### Features

- Large, clickable cards for Email and SMS options
- Visual radio button indicators
- Descriptive text for each option
- Hover effects and transitions
- Responsive design (stacks on mobile, side-by-side on desktop)
- Accessibility support with proper button roles

### Requirements Satisfied

- Requirement 2.5: Require the user to select a Channel (SMS or E-mail)

## EmailComposer

A powerful email composition component based on maily.to with support for Visual, HTML, and React Email modes.

### Usage

```tsx
import {
  EmailComposer,
  type EmailContent,
} from "@/components/campaigns/email-composer";

export default function CampaignForm() {
  const [emailContent, setEmailContent] = useState<EmailContent>({
    subject: "",
    body: "",
    mode: "visual",
  });

  return <EmailComposer value={emailContent} onChange={setEmailContent} />;
}
```

### Props

- `value`: EmailContent object with subject, body, bodyJson (for visual mode), and mode
- `onChange`: Callback function when content changes
- `disabled?`: Optional boolean to disable the composer

### Features

- **Visual Mode**: Rich WYSIWYG editor powered by maily.to and TipTap
  - Full formatting toolbar (bold, italic, underline, headings, lists, links, images)
  - Drag and drop support
  - Mobile-responsive email templates
  - Real-time preview
- **HTML Mode**: Code editor for custom HTML emails
  - Syntax highlighting
  - Character counter
  - Direct HTML editing
- **React Mode**: React Email template editor
  - Support for React Email components
  - Server-side rendering preview
  - TypeScript support

- **Common Features**:
  - Subject line with 200 character limit
  - Mode switching (Visual/HTML/React)
  - Live preview toggle
  - Responsive design
  - Loading states

### Requirements Satisfied

- Requirement 5.1: Display Email Composer when Email channel is selected
- Requirement 5.2: Use TipTap Editor as default editing mode
- Requirement 5.3: Provide mode selector to switch between Rich text, HTML, and React Email
- Requirement 5.4: Allow editing in selected mode
- Requirement 5.5: Provide preview button
- Requirement 5.6: Display rendered email content in preview

### Dependencies

- `@maily-to/core`: Core email editor
- `@tiptap/react`: TipTap React integration
- `@react-email/components`: React Email components
- `@react-email/render`: React Email rendering

## SmsComposer

A specialized SMS message composer with character counting, URL detection, and variable insertion.

### Usage

```tsx
import {
  SmsComposer,
  type SmsContent,
} from "@/components/campaigns/sms-composer";

export default function CampaignForm() {
  const [smsContent, setSmsContent] = useState<SmsContent>({
    text: "",
  });

  return <SmsComposer value={smsContent} onChange={setSmsContent} />;
}
```

### Props

- `value`: SmsContent object with text
- `onChange`: Callback function when content changes
- `disabled?`: Optional boolean to disable the composer

### Features

- **Character Counting**: Real-time character count with 160 character limit
  - Visual warning when limit is exceeded
  - Shows remaining characters
  - Calculates SMS segments (160 chars per segment)
- **URL Detection**: Automatically detects URLs in message
  - Displays detected URLs
  - Shows info about automatic URL shortening
  - Supports multiple URLs
- **Variable Insertion**: Insert contact variables
  - {{firstName}}, {{lastName}}, {{email}}, {{phone}}
  - Popover with available variables
  - Inserts at cursor position
- **Live Preview**: Mobile-style SMS preview
  - Shows message as it would appear on a phone
  - Updates in real-time
  - Empty state handling

### Requirements Satisfied

- Requirement 4.1: Display SMS Composer when SMS channel is selected
- Requirement 4.2: Provide text input field for message content
- Requirement 4.3: Provide UI controls to insert contact variables
- Requirement 4.4: Display character counter with 160 character limit
- Requirement 4.5: Display warning when message exceeds 160 characters
- Requirement 4.6: Prevent submission when message exceeds limit
- Requirement 4.7: Automatically detect URLs in message text

## CampaignsTable

A table component for displaying campaigns with columns for Name, Channel, Status, Updated at, and Actions.

### Usage

```tsx
import { CampaignsTable } from "@/components/campaigns/campaigns-table";
import { getCampaigns } from "@/actions/campaigns";

export default async function CampaignsPage() {
  const campaigns = await getCampaigns();

  return (
    <div>
      <h1>Campaigns</h1>
      <CampaignsTable
        campaigns={campaigns}
        onEdit={(campaign) => console.log("Edit", campaign)}
        onView={(campaign) => console.log("View", campaign)}
        onDelete={(campaign) => console.log("Delete", campaign)}
      />
    </div>
  );
}
```

### Props

- `campaigns`: Array of Campaign objects to display
- `onEdit?`: Optional callback when Edit action is clicked
- `onView?`: Optional callback when View action is clicked
- `onDelete?`: Optional callback when Delete action is clicked

### Features

- Displays campaigns in a table format with proper TypeScript types
- Shows status badges with color coding (Draft, Running, Partial, Completed, Failed)
- Shows channel badges (Email, SMS)
- Formats dates using date-fns
- Provides row actions dropdown (Edit, View, Delete)
- Delete action only shown for draft campaigns
- Empty state when no campaigns exist
- Hover effect on action buttons
- Links to campaign details and edit pages

### Requirements Satisfied

- Requirement 1.5: Display table with columns (Name, Channel, Status, Updated at, Actions)
- Requirement 1.6: Load and display campaigns belonging to the current Workspace
