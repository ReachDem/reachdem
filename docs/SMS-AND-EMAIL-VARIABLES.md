# SMS and Email Variable Support

## Overview

Both SMS and Email composers now support dynamic variable insertion for personalization.

## Features Implemented

### SMS Composer (`SmsComposerNew`)

- **Variable Insertion**: Button with popover to insert common variables
- **Auto-detection**: Automatically detects variables in format `{{contact.name}}`
- **URL Shortening**: Automatically detects and shortens URLs with animation
- **Phone Preview**: Real-time preview in iPhone mockup showing rendered message
- **Character Counter**: Shows character count and SMS segments
- **Sender ID**: Configurable sender ID (max 11 characters)

### Email Composer

- **Variable Insertion**: Button appears in visual mode next to mode selector
- **Editor Integration**: Variables inserted directly into TipTap editor at cursor position
- **Seamless Experience**: Works with existing font selector and preview features

## Available Variables

Both composers support these common variables:

| Variable                | Description             | Example Output   |
| ----------------------- | ----------------------- | ---------------- |
| `{{contact.firstName}}` | Contact's first name    | John             |
| `{{contact.lastName}}`  | Contact's last name     | Doe              |
| `{{contact.name}}`      | Contact's full name     | John Doe         |
| `{{contact.email}}`     | Contact's email address | john@example.com |
| `{{contact.phone}}`     | Contact's phone number  | +1234567890      |
| `{{contact.company}}`   | Contact's company name  | Acme Inc         |

## Usage

### In SMS Composer

1. Click "Insert Variable" button
2. Select variable from popover
3. Variable is inserted at cursor position
4. Preview shows rendered example in phone mockup

### In Email Composer

1. Switch to "Rich Text" mode
2. Click "Insert Variable" button (appears next to mode selector)
3. Select variable from popover
4. Variable is inserted at cursor position in editor

## Technical Details

### SMS Preview Rendering

- URLs are replaced with shortened versions
- Variables are replaced with example values
- Preview updates in real-time as you type

### Email Variable Insertion

- Uses TipTap editor's `insertContent()` method
- Maintains cursor position after insertion
- Works seamlessly with existing editor features

## Integration

The new SMS composer has been integrated into the campaign creation page:

- Import changed from `SmsComposer` to `SmsComposerNew`
- All existing functionality preserved
- Enhanced with variable and URL detection

## Files Modified

- `apps/web/components/campaigns/sms-composer-new.tsx` - New SMS composer
- `apps/web/components/campaigns/email-composer.tsx` - Added variable support
- `apps/web/app/(authenticated)/campaigns/new/[type]/page.tsx` - Integrated new SMS composer
- `apps/web/components/campaigns/email-preview-iframe.tsx` - Fixed deprecated `doc.write()`

## Build Status

✅ Build completed successfully
✅ No TypeScript errors
✅ All diagnostics passing
