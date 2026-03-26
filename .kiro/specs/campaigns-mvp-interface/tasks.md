# Implementation Plan: Campaigns MVP Interface

## Overview

This implementation plan breaks down the Campaigns MVP Interface feature into discrete coding tasks organized by the 6 implementation phases outlined in the design document. The feature provides a comprehensive web-based UI for managing marketing campaigns in ReachDem, including campaign creation, content composition (SMS and Email), audience selection, launching/scheduling, and statistics viewing.

The implementation uses Next.js 16 (App Router) with React 19, TypeScript, Tailwind CSS, shadcn/ui components, and integrates with existing ReachDem infrastructure including Campaign Service API, Tracked Link Service, and Prisma database models.

## Tasks

### Phase 1: Core Infrastructure

- [x] 1. Set up routing structure and base page components
  - Create directory structure: `app/(authenticated)/campaigns/`
  - Create base page files: `page.tsx`, `new/page.tsx`, `[id]/page.tsx`, `[id]/edit/page.tsx`
  - Set up authenticated layout wrapper for campaigns routes
  - Add navigation links to campaigns section in main dashboard
  - _Requirements: 1.1, 2.1, 9.2, 11.1_

- [x] 2. Create campaign listing page with table
  - [x] 2.1 Implement CampaignsTable component with columns (Name, Channel, Status, Updated at, Actions)
    - Create `components/campaigns/campaigns-table.tsx`
    - Implement table using shadcn/ui Table component
    - Add column definitions with proper TypeScript types
    - Implement row actions dropdown (Edit, View, Delete)
    - _Requirements: 1.5, 1.6_
  - [x] 2.2 Implement campaign listing page component
    - Create `/campaigns/page.tsx` with page title and description
    - Integrate CampaignsTable component
    - Add "Create campaign" button with navigation
    - Implement loading skeleton states
    - Implement empty state when no campaigns exist
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.9, 1.10_
  - [x] 2.3 Integrate with Campaign Service API for listing
    - Create server action `listCampaigns` in `app/actions/campaigns.ts`
    - Call GET /api/v1/campaigns endpoint with workspace context
    - Handle API errors and display error messages
    - _Requirements: 1.6, 1.11_

- [ ]\* 2.4 Write property test for workspace data isolation
  - **Property 1: Workspace Data Isolation**
  - **Validates: Requirements 1.6, 3.2, 3.3, 11.2**

- [ ] 3. Implement search and pagination for campaign listing
  - [x] 3.1 Add search input field with client-side filtering
    - Implement search input component above table
    - Add debounced search filtering by campaign name (case-insensitive)
    - _Requirements: 1.7_
  - [ ]\* 3.2 Write property test for campaign search filtering
    - **Property 2: Campaign Search Filtering**
    - **Validates: Requirements 1.7**
  - [x] 3.3 Implement pagination controls
    - Add pagination component below table (50 items per page)
    - Implement page navigation (previous, next, page numbers)
    - _Requirements: 1.8_
  - [ ]\* 3.4 Write property test for pagination consistency
    - **Property 3: Pagination Consistency**
    - **Validates: Requirements 1.8, 11.12**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

### Phase 2: Campaign Creation

- [x] 5. Build CampaignForm component structure
  - [x] 5.1 Create CampaignForm component with form sections
    - Create `components/campaigns/campaign-form.tsx`
    - Set up React Hook Form with Zod validation schema
    - Define form sections: General Details, Channel & Content, Target Audience, Actions
    - Implement form state management and unsaved changes tracking
    - _Requirements: 2.2, 12.1_
  - [x] 5.2 Implement general details section
    - Add name input field (required, max 100 chars)
    - Add description textarea (optional, max 500 chars)
    - Add channel selector (SMS or Email radio buttons)
    - Implement inline validation for required fields
    - _Requirements: 2.3, 2.4, 2.5, 2.6_
  - [ ]\* 5.3 Write property test for required field validation
    - **Property 4: Required Field Validation**
    - **Validates: Requirements 2.3, 2.5, 2.6, 2.7**

- [ ] 6. Implement AudienceSelector component
  - [-] 6.1 Create AudienceSelector component
    - Create `components/campaigns/audience-selector.tsx`
    - Implement multi-select interface for groups and segments
    - Display selected items with remove functionality
    - Add loading states for groups/segments data
    - _Requirements: 3.1, 3.2, 3.3, 3.6, 3.7, 3.8_
  - [ ] 6.2 Integrate audience selection with form
    - Load groups and segments from API
    - Connect AudienceSelector to form state
    - Handle selection changes and updates
    - _Requirements: 3.4, 3.5_
  - [ ]\* 6.3 Write property test for audience multi-selection
    - **Property 5: Audience Multi-Selection**
    - **Validates: Requirements 3.4, 3.5, 3.6, 3.7**

- [x] 7. Create basic SMS and Email composers
  - [x] 7.1 Create basic SMSComposer component
    - Create `components/campaigns/sms-composer.tsx`
    - Implement textarea for message input
    - Add basic character counter display
    - _Requirements: 4.1, 4.2_
  - [x] 7.2 Create basic EmailComposer component
    - Create `components/campaigns/email-composer.tsx`
    - Add subject input field
    - Implement basic TipTap editor for body
    - _Requirements: 5.1, 5.2_

- [ ] 8. Implement form validation and submission
  - [x] 8.1 Add form validation logic
    - Create Zod schema for campaign form validation
    - Implement client-side validation with error display
    - Prevent submission with validation errors
    - _Requirements: 2.6, 2.7_
  - [ ] 8.2 Implement campaign creation server action
    - Create `createCampaign` server action in `app/actions/campaigns.ts`
    - Call POST /api/v1/campaigns endpoint
    - Handle success and error responses
    - _Requirements: 2.8, 2.9_
  - [ ] 8.3 Implement audience setting server action
    - Create `setAudience` server action
    - Call POST /api/v1/campaigns/:id/audience endpoint
    - Handle audience association after campaign creation
    - _Requirements: 3.1_
  - [ ] 8.4 Wire form submission to server actions
    - Connect form submit handler to createCampaign action
    - Display success toast and navigate to campaign details
    - Display error toast on failure
    - _Requirements: 2.8, 2.9_

- [ ] 9. Create campaign creation page
  - [ ] 9.1 Implement /campaigns/new page
    - Create `app/(authenticated)/campaigns/new/page.tsx`
    - Load groups and segments data
    - Render CampaignForm in create mode
    - Add page title and breadcrumbs
    - _Requirements: 2.1, 2.2_

- [ ] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

### Phase 3: Content Composers

- [ ] 11. Enhance SMSComposer with character counting and validation
  - [x] 11.1 Implement accurate character counting
    - Add real-time character counter with current/max display
    - Calculate character count accurately for SMS encoding
    - _Requirements: 4.4_
  - [ ]\* 11.2 Write property test for SMS character count accuracy
    - **Property 6: SMS Character Count Accuracy**
    - **Validates: Requirements 4.4**
  - [x] 11.3 Implement 160 character limit validation
    - Display warning when message exceeds 160 characters
    - Prevent form submission when limit exceeded
    - Add visual indicator (red border, warning icon)
    - _Requirements: 4.5, 4.6_
  - [ ]\* 11.4 Write property test for SMS length validation
    - **Property 7: SMS Length Validation**
    - **Validates: Requirements 4.5, 4.6**
  - [x] 11.5 Add contact variable insertion UI
    - Create variable picker dropdown
    - Insert variables at cursor position
    - Display available variables (firstName, lastName, email, phone)
    - _Requirements: 4.3_

- [ ] 12. Implement URL detection and shortening for SMS
  - [x] 12.1 Add URL detection logic
    - Implement regex-based URL detection in message text
    - Highlight detected URLs in the composer
    - _Requirements: 4.7_
  - [ ] 12.2 Integrate with Tracked Link Service
    - Create `createTrackedLink` server action
    - Call POST /api/v1/links endpoint with campaign context
    - Handle tracked link creation and error cases
    - _Requirements: 4.8, 4.9, 4.10_
  - [ ] 12.3 Implement automatic URL replacement
    - Replace detected URLs with shortened versions
    - Update message text with shortened URLs
    - Maintain cursor position after replacement
    - _Requirements: 4.9_
  - [ ]\* 12.4 Write property test for URL detection and shortening
    - **Property 8: URL Detection and Shortening**
    - **Validates: Requirements 4.7, 4.8, 4.9**
  - [ ]\* 12.5 Write property test for tracked link campaign association
    - **Property 9: Tracked Link Campaign Association**
    - **Validates: Requirements 4.10**

- [ ] 13. Build EmailComposer with TipTap integration
  - [x] 13.1 Enhance EmailComposer with full TipTap editor
    - Configure TipTap with rich text extensions (bold, italic, lists, links)
    - Add toolbar with formatting controls
    - Implement subject field with validation (max 200 chars)
    - _Requirements: 5.2_
  - [x] 13.2 Implement email mode selector
    - Add mode selector UI (Rich text, HTML, React Email)
    - Create mode switching logic
    - _Requirements: 5.3, 5.4_
  - [x] 13.3 Implement HTML editing mode
    - Add code editor for HTML mode (Monaco or CodeMirror)
    - Implement syntax highlighting
    - _Requirements: 5.4_
  - [x] 13.4 Implement React Email editing mode
    - Add code editor for React Email templates
    - Implement template validation
    - _Requirements: 5.4_

- [ ] 14. Implement email content parsing and formatting
  - [ ] 14.1 Create email content parser
    - Create `lib/email-parser.ts`
    - Implement parsing from Rich text to internal representation
    - Implement parsing from HTML to internal representation
    - Implement parsing from React Email to internal representation
    - Handle parsing errors with descriptive messages
    - _Requirements: 6.1, 6.2, 6.3, 6.4_
  - [ ]\* 14.2 Write property test for email content parsing
    - **Property 12: Email Content Parsing**
    - **Validates: Requirements 6.1, 6.2, 6.3**
  - [ ] 14.3 Create email content formatter
    - Create `lib/email-formatter.ts`
    - Implement formatting from internal representation to Rich text
    - Implement formatting from internal representation to HTML
    - Implement formatting from internal representation to React Email
    - _Requirements: 6.5, 6.6, 6.7_
  - [ ]\* 14.4 Write property test for email content formatting
    - **Property 13: Email Content Formatting**
    - **Validates: Requirements 6.5, 6.6, 6.7**
  - [ ]\* 14.5 Write property test for email content mode preservation
    - **Property 10: Email Content Mode Preservation**
    - **Validates: Requirements 5.7, 6.8**

- [ ] 15. Implement mode switching and preview
  - [ ] 15.1 Implement content preservation during mode switching
    - Convert content when switching modes
    - Preserve content equivalence across modes
    - Handle conversion errors gracefully
    - _Requirements: 5.7_
  - [x] 15.2 Implement email preview functionality
    - Add preview button to EmailComposer
    - Create preview modal/panel
    - Render email content in preview mode
    - Support preview for all editing modes
    - _Requirements: 5.5, 5.6_
  - [ ] 15.3 Implement content format submission
    - Format content appropriately for selected mode before submission
    - Validate content format before API call
    - _Requirements: 5.8_
  - [ ]\* 15.4 Write property test for email content format submission
    - **Property 11: Email Content Format Submission**
    - **Validates: Requirements 5.8**

- [ ] 16. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

### Phase 4: Campaign Management

- [ ] 17. Implement campaign editing
  - [ ] 17.1 Create campaign edit page
    - Create `app/(authenticated)/campaigns/[id]/edit/page.tsx`
    - Load campaign data from API
    - Pre-fill CampaignForm with existing data
    - Add page title and breadcrumbs
    - _Requirements: 9.2, 9.3, 9.4_
  - [ ]\* 17.2 Write property test for form pre-fill accuracy
    - **Property 18: Form Pre-fill Accuracy**
    - **Validates: Requirements 9.4**
  - [ ] 17.3 Implement campaign update server action
    - Create `updateCampaign` server action
    - Call PATCH /api/v1/campaigns/:id endpoint
    - Handle success and error responses
    - _Requirements: 9.11, 9.12_
  - [ ] 17.4 Implement edit restrictions based on status
    - Check campaign status before allowing edits
    - Display read-only view for non-draft campaigns
    - Show appropriate actions based on status
    - _Requirements: 9.5, 9.6, 9.7, 9.9, 9.10_
  - [ ]\* 17.5 Write property test for draft-only edit actions
    - **Property 16: Draft-Only Edit Actions**
    - **Validates: Requirements 9.1, 9.9**
  - [ ]\* 17.6 Write property test for read-only non-draft display
    - **Property 19: Read-Only Non-Draft Display**
    - **Validates: Requirements 9.10**

- [ ] 18. Implement launch and schedule functionality
  - [ ] 18.1 Add launch now button and logic
    - Add "Launch now" button to campaign form
    - Validate all required fields before launch
    - Create `launchCampaign` server action
    - Call POST /api/v1/campaigns/:id/launch endpoint
    - Display success toast and navigate to details page
    - Handle errors with error toast
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_
  - [ ]\* 18.2 Write property test for launch validation
    - **Property 14: Launch Validation**
    - **Validates: Requirements 7.2**
  - [ ] 18.3 Implement scheduling component
    - Create `components/campaigns/schedule-dialog.tsx`
    - Add date picker and time picker
    - Implement datetime validation (must be future)
    - _Requirements: 8.2, 8.3, 8.4, 8.5, 8.6_
  - [ ] 18.4 Add schedule button and logic
    - Add "Schedule" button to campaign form
    - Open scheduling dialog on click
    - Create `scheduleCampaign` server action
    - Call POST /api/v1/campaigns/:id/schedule endpoint
    - Display success toast and navigate to details page
    - Handle errors with error toast
    - _Requirements: 8.1, 8.7, 8.8, 8.9, 8.10_
  - [ ]\* 18.5 Write property test for schedule future date validation
    - **Property 15: Schedule Future Date Validation**
    - **Validates: Requirements 8.5, 8.6**

- [ ] 19. Implement campaign deletion
  - [ ] 19.1 Add delete button and confirmation dialog
    - Add "Delete" button to campaign form (draft only)
    - Create confirmation dialog component
    - Require explicit user confirmation
    - _Requirements: 10.1, 10.2, 10.3_
  - [ ] 19.2 Implement campaign deletion server action
    - Create `deleteCampaign` server action
    - Call DELETE /api/v1/campaigns/:id endpoint
    - Display success toast and navigate to listing page
    - Handle errors with error toast
    - _Requirements: 10.4, 10.5, 10.6, 10.7_
  - [ ]\* 19.3 Write property test for draft-only delete actions
    - **Property 17: Draft-Only Delete Actions**
    - **Validates: Requirements 10.1**

- [ ] 20. Implement unsaved changes warning
  - [ ] 20.1 Add unsaved changes tracking
    - Track form modifications in component state
    - Set unsaved state on any field change
    - Clear unsaved state on successful save
    - _Requirements: 12.1, 12.4_
  - [ ]\* 20.2 Write property test for unsaved changes tracking
    - **Property 21: Unsaved Changes Tracking**
    - **Validates: Requirements 12.1, 12.4**
  - [ ] 20.3 Implement navigation blocking
    - Add beforeunload event listener for browser navigation
    - Add Next.js router event listener for internal navigation
    - Display confirmation dialog before navigation
    - Allow navigation only after explicit confirmation
    - _Requirements: 12.2, 12.3_
  - [ ]\* 20.4 Write property test for navigation blocking with unsaved changes
    - **Property 22: Navigation Blocking with Unsaved Changes**
    - **Validates: Requirements 12.2**

- [ ] 21. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

### Phase 5: Campaign Details & Stats

- [ ] 22. Create campaign details page layout
  - [ ] 22.1 Implement campaign details page structure
    - Create `app/(authenticated)/campaigns/[id]/page.tsx`
    - Load campaign data from API
    - Create header section with campaign info
    - Add loading skeleton states
    - Handle error states
    - _Requirements: 11.1, 11.2, 11.13, 11.16_
  - [ ] 22.2 Implement campaign header section
    - Display campaign name, channel badge, status badge
    - Show updated timestamp
    - Display content summary
    - Display audience summary
    - Add action buttons (Edit for draft, Delete for draft)
    - _Requirements: 11.3, 11.4, 11.5_

- [ ] 23. Implement statistics cards
  - [ ] 23.1 Create CampaignStats component
    - Create `components/campaigns/campaign-stats.tsx`
    - Design stats cards layout (Audience size, Sent, Failed, Clicks, Unique clicks)
    - Implement loading states for stats
    - Handle unavailable stats with clear message
    - _Requirements: 11.6, 11.15_
  - [ ] 23.2 Integrate with Campaign Stats API
    - Create `getCampaignStats` server action
    - Call GET /api/v1/campaigns/:id/stats endpoint
    - Display stats in cards
    - Handle API errors
    - _Requirements: 11.7_
  - [ ] 23.3 Add stats refresh functionality
    - Implement manual refresh button
    - Add auto-refresh interval (30 seconds) for running campaigns
    - Display last updated timestamp
    - _Requirements: Phase 5 item 4_

- [ ] 24. Build message targets table
  - [ ] 24.1 Create MessageTargetsTable component
    - Create `components/campaigns/message-targets-table.tsx`
    - Implement table with columns: contact/destination, status, message ID, sent at
    - Add status badge styling
    - Implement message ID truncation with copy button
    - _Requirements: 11.9, 11.10_
  - [ ] 24.2 Integrate with message targets API
    - Create `getMessageTargets` server action
    - Call GET /api/v1/campaigns/:id/targets endpoint with pagination
    - Display targets in table
    - Handle empty state when no targets exist
    - _Requirements: 11.9, 11.14_
  - [ ] 24.3 Implement search functionality for message targets
    - Add search input above table
    - Implement server-side search by contact/destination
    - Update table on search input change (debounced)
    - _Requirements: 11.11_
  - [ ]\* 24.4 Write property test for message targets search
    - **Property 20: Message Targets Search**
    - **Validates: Requirements 11.11**
  - [ ] 24.5 Implement pagination for message targets
    - Add pagination controls below table
    - Implement server-side pagination (50 items per page)
    - Handle page navigation
    - _Requirements: 11.12_

- [ ] 25. Integrate campaign details page sections
  - [ ] 25.1 Create Overview section
    - Combine stats cards, global status, and general information
    - Add section layout and styling
    - _Requirements: 11.8_
  - [ ] 25.2 Create Messages/Targets section
    - Add section header with title
    - Integrate MessageTargetsTable component
    - Add section layout and styling
    - _Requirements: 11.9_

- [ ] 26. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

### Phase 6: Polish & Optimization

- [ ] 27. Implement responsive design
  - [ ] 27.1 Add responsive breakpoints for desktop
    - Test and adjust layouts for 1024px and above
    - Ensure proper spacing and component sizing
    - _Requirements: 13.1_
  - [ ] 27.2 Add responsive breakpoints for tablet
    - Test and adjust layouts for 768px to 1023px
    - Adapt table layouts for medium screens
    - _Requirements: 13.2_
  - [ ] 27.3 Add responsive breakpoints for mobile
    - Test and adjust layouts for below 768px
    - Implement mobile-friendly table patterns (cards or horizontal scroll)
    - Ensure form inputs are appropriately sized
    - _Requirements: 13.3, 13.4_
  - [ ] 27.4 Ensure touch target sizes for mobile
    - Verify all interactive elements are at least 44x44px
    - Adjust button and link sizes as needed
    - Test on actual mobile devices
    - _Requirements: 13.6_
  - [ ]\* 27.5 Write property test for touch target minimum size
    - **Property 23: Touch Target Minimum Size**
    - **Validates: Requirements 13.6**
  - [ ] 27.6 Verify readability and usability across screen sizes
    - Test typography scaling
    - Verify color contrast ratios
    - Ensure no horizontal scrolling on mobile
    - _Requirements: 13.5_

- [ ] 28. Implement comprehensive loading states
  - [ ] 28.1 Add skeleton loaders for content
    - Create skeleton components for campaign listing
    - Create skeleton components for campaign details
    - Create skeleton components for stats cards
    - Create skeleton components for tables
    - _Requirements: 15.2_
  - [ ] 28.2 Add spinner indicators for actions
    - Add spinners to form submit buttons
    - Add spinners to action buttons (launch, schedule, delete)
    - Disable buttons during processing
    - _Requirements: 15.3, 15.4_
  - [ ]\* 28.3 Write property test for loading indicator display
    - **Property 24: Loading Indicator Display**
    - **Validates: Requirements 15.1, 15.2, 15.3**
  - [ ]\* 28.4 Write property test for interactive element disabling during processing
    - **Property 25: Interactive Element Disabling During Processing**
    - **Validates: Requirements 15.4**
  - [ ] 28.5 Ensure loading state timing
    - Verify loading indicators display for minimum 300ms
    - Verify loading indicators remove within 100ms of completion
    - _Requirements: 15.5, 15.6_

- [ ] 29. Add empty states
  - [ ] 29.1 Create empty state components
    - Create EmptyState component with icon, title, description, action
    - Style consistently with dashboard design system
  - [ ] 29.2 Add empty states to all data displays
    - Add empty state to campaign listing (no campaigns)
    - Add empty state to message targets table (no targets)
    - Add empty state to audience selector (no groups/segments)
    - _Requirements: 1.10, 11.14_

- [ ] 30. Implement visual consistency with dashboard
  - [ ] 30.1 Verify design system consistency
    - Use consistent colors from dashboard theme
    - Use consistent typography (font families, sizes, weights)
    - Use consistent spacing scale
    - _Requirements: 14.1, 14.2_
  - [ ] 30.2 Verify component style consistency
    - Use consistent button styles and variants
    - Use consistent form input styles
    - Use consistent toast notification styles
    - Use consistent loading and empty state patterns
    - _Requirements: 14.3, 14.4, 14.5, 14.6_

- [ ] 31. Optimize performance
  - [ ] 31.1 Add React memoization
    - Memoize expensive components with React.memo
    - Memoize expensive calculations with useMemo
    - Memoize callbacks with useCallback
  - [ ] 31.2 Implement lazy loading
    - Lazy load EmailComposer (heavy TipTap dependency)
    - Lazy load code editors (Monaco/CodeMirror)
    - Lazy load preview components
  - [ ] 31.3 Optimize bundle size
    - Analyze bundle with Next.js analyzer
    - Code-split large dependencies
    - Remove unused dependencies

- [ ] 32. Add accessibility improvements
  - [ ] 32.1 Add ARIA labels and roles
    - Add aria-label to all icon buttons
    - Add aria-describedby for form field errors
    - Add role attributes to custom components
  - [ ] 32.2 Implement keyboard navigation
    - Ensure all interactive elements are keyboard accessible
    - Add keyboard shortcuts for common actions
    - Implement focus management for modals and dialogs
  - [ ] 32.3 Test with screen readers
    - Test with NVDA or JAWS on Windows
    - Test with VoiceOver on macOS
    - Fix any accessibility issues found

- [ ] 33. Implement comprehensive error handling
  - [ ] 33.1 Add error boundaries
    - Create error boundary component
    - Wrap page components with error boundaries
    - Display user-friendly error messages
  - [ ] 33.2 Implement error logging
    - Log errors to monitoring service (Sentry or similar)
    - Include context (user ID, workspace ID, action)
    - Sanitize sensitive data before logging
  - [ ] 33.3 Add error recovery mechanisms
    - Implement retry logic for network errors
    - Add manual retry buttons for failed operations
    - Implement optimistic updates with rollback

- [ ] 34. Final checkpoint - Ensure all tests pass
  - Run full test suite (unit tests, property tests, integration tests)
  - Verify all 25 correctness properties pass
  - Fix any failing tests
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at the end of each phase
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All implementation should follow Next.js 16 App Router patterns with React 19
- Use TypeScript for type safety throughout the implementation
- Leverage shadcn/ui components for consistent UI
- Follow the existing ReachDem dashboard design system
