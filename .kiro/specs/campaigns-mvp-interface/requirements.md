# Requirements Document

## Introduction

Cette spécification définit les exigences pour l'interface MVP des campagnes dans ReachDem. L'interface permet aux utilisateurs de gérer le cycle de vie complet des campagnes marketing : création, édition, composition de contenu (SMS et E-mail), sélection d'audience, lancement ou planification, et consultation des résultats avec statistiques minimales.

L'objectif est de fournir une interface simple, rapide et cohérente avec le dashboard ReachDem existant, en s'appuyant sur les APIs déjà disponibles.

## Glossary

- **Campaign_Interface**: L'interface utilisateur web permettant de gérer les campagnes marketing
- **Campaign**: Une campagne marketing contenant un message, une audience cible et un canal de diffusion
- **Channel**: Le moyen de communication utilisé pour envoyer la campagne (SMS ou E-mail)
- **Audience**: L'ensemble des destinataires ciblés par une campagne, défini via des groupes et segments
- **Group**: Un ensemble statique de contacts défini dans le système
- **Segment**: Un ensemble dynamique de contacts basé sur des critères de filtrage
- **Draft_Campaign**: Une campagne en état brouillon, modifiable avant lancement
- **Launched_Campaign**: Une campagne qui a été lancée et dont l'envoi est en cours ou terminé
- **Scheduled_Campaign**: Une campagne planifiée pour un envoi futur à une date et heure spécifiques
- **SMS_Composer**: Le composant d'interface permettant de composer un message SMS
- **Email_Composer**: Le composant d'interface permettant de composer un e-mail
- **URL_Shortener**: Le service ReachDem qui raccourcit les URLs pour le tracking
- **TipTap_Editor**: L'éditeur de texte riche par défaut pour la composition d'e-mails
- **Campaign_Stats**: Les statistiques d'une campagne (envoyés, échecs, clics, etc.)
- **Message_Target**: Un enregistrement individuel représentant l'envoi d'un message à un destinataire spécifique
- **Workspace**: Le contexte organisationnel dans lequel les campagnes sont créées et gérées

## Requirements

### Requirement 1: Campaign Listing Page

**User Story:** En tant qu'utilisateur, je veux voir la liste de toutes mes campagnes, afin de pouvoir naviguer et gérer mes campagnes existantes.

#### Acceptance Criteria

1. THE Campaign_Interface SHALL display a campaigns listing page at route /campaigns
2. THE Campaign_Interface SHALL display a page title "Campaigns" on the listing page
3. THE Campaign_Interface SHALL display a descriptive text explaining the purpose of campaigns
4. THE Campaign_Interface SHALL display a "Create campaign" button on the listing page
5. THE Campaign_Interface SHALL display a table with columns: Name, Channel, Status, Updated at, Actions
6. THE Campaign_Interface SHALL load and display campaigns belonging to the current Workspace
7. THE Campaign_Interface SHALL provide a search input field to filter campaigns by name
8. THE Campaign_Interface SHALL implement pagination for the campaigns table
9. WHILE campaigns are loading, THE Campaign_Interface SHALL display a loading state
10. WHEN no campaigns exist, THE Campaign_Interface SHALL display an empty state message
11. IF an error occurs during campaign loading, THEN THE Campaign_Interface SHALL display an error message

### Requirement 2: Campaign Creation Flow

**User Story:** En tant qu'utilisateur, je veux créer une nouvelle campagne, afin de pouvoir envoyer des messages à mon audience.

#### Acceptance Criteria

1. WHEN the user clicks "Create campaign", THE Campaign_Interface SHALL navigate to route /campaigns/new
2. THE Campaign_Interface SHALL display a campaign creation form with sections for general information, audience, content composition, and actions
3. THE Campaign_Interface SHALL require the user to provide a campaign name
4. THE Campaign_Interface SHALL allow the user to provide an optional campaign description
5. THE Campaign_Interface SHALL require the user to select a Channel (SMS or E-mail)
6. THE Campaign_Interface SHALL display inline validation errors for required fields
7. WHEN the user submits the form with missing required fields, THE Campaign_Interface SHALL prevent submission and display validation errors
8. WHEN the user successfully creates a campaign, THE Campaign_Interface SHALL display a success toast notification
9. IF campaign creation fails, THEN THE Campaign_Interface SHALL display an error toast notification with details

### Requirement 3: Audience Selection

**User Story:** En tant qu'utilisateur, je veux sélectionner mon audience via des groupes et segments, afin de cibler les bons destinataires pour ma campagne.

#### Acceptance Criteria

1. THE Campaign_Interface SHALL provide a section for audience selection in the campaign form
2. THE Campaign_Interface SHALL load and display available Groups from the current Workspace
3. THE Campaign_Interface SHALL load and display available Segments from the current Workspace
4. THE Campaign_Interface SHALL allow the user to select multiple Groups for the campaign audience
5. THE Campaign_Interface SHALL allow the user to select multiple Segments for the campaign audience
6. THE Campaign_Interface SHALL display the selected Groups and Segments in the audience section
7. THE Campaign_Interface SHALL allow the user to remove selected Groups or Segments
8. WHILE Groups and Segments are loading, THE Campaign_Interface SHALL display a loading state in the audience section

### Requirement 4: SMS Content Composition

**User Story:** En tant qu'utilisateur, je veux composer un message SMS simple avec validation de longueur et raccourcissement automatique des liens, afin d'envoyer des SMS efficaces et trackables.

#### Acceptance Criteria

1. WHEN the user selects SMS as the Channel, THE Campaign_Interface SHALL display the SMS_Composer
2. THE SMS_Composer SHALL provide a text input field for the message content
3. THE SMS_Composer SHALL provide UI controls to insert or select contact variables
4. THE SMS_Composer SHALL display a character counter showing current length against the 160 character limit
5. WHEN the message length exceeds 160 characters, THE SMS_Composer SHALL display a clear warning message
6. THE SMS_Composer SHALL prevent submission when the message exceeds 160 characters
7. THE SMS_Composer SHALL automatically detect URLs present in the message text
8. WHEN a URL is detected in the message, THE SMS_Composer SHALL automatically shorten it using the URL_Shortener service
9. THE SMS_Composer SHALL replace detected URLs with their shortened versions in the message
10. THE SMS_Composer SHALL use shortened URLs to enable click tracking in Campaign_Stats

### Requirement 5: E-mail Content Composition

**User Story:** En tant qu'utilisateur, je veux composer un e-mail avec un éditeur riche et la possibilité de changer de mode d'édition, afin de créer des e-mails professionnels adaptés à mes besoins.

#### Acceptance Criteria

1. WHEN the user selects E-mail as the Channel, THE Campaign_Interface SHALL display the Email_Composer
2. THE Email_Composer SHALL use TipTap_Editor as the default editing mode
3. THE Email_Composer SHALL provide a mode selector to switch between Rich text, HTML, and React Email modes
4. THE Email_Composer SHALL allow the user to edit content in the selected mode
5. THE Email_Composer SHALL provide a preview button to display the rendered email
6. WHEN the user clicks preview, THE Email_Composer SHALL display the rendered email content
7. WHEN the user switches editing modes, THE Email_Composer SHALL preserve content consistency
8. WHEN the user saves or sends the campaign, THE Email_Composer SHALL submit the content in the appropriate format for the selected mode

### Requirement 6: E-mail Content Parser and Pretty Printer

**User Story:** En tant que développeur, je veux parser et formater le contenu e-mail, afin de garantir la cohérence lors des changements de mode d'édition.

#### Acceptance Criteria

1. THE Email_Composer SHALL parse content from Rich text format into an internal representation
2. THE Email_Composer SHALL parse content from HTML format into an internal representation
3. THE Email_Composer SHALL parse content from React Email format into an internal representation
4. WHEN invalid content is provided in any format, THE Email_Composer SHALL return a descriptive error message
5. THE Email_Composer SHALL format internal representation back into Rich text format
6. THE Email_Composer SHALL format internal representation back into HTML format
7. THE Email_Composer SHALL format internal representation back into React Email format
8. FOR ALL valid e-mail content, parsing then formatting then parsing SHALL produce an equivalent representation (round-trip property)

### Requirement 7: Campaign Launch

**User Story:** En tant qu'utilisateur, je veux lancer ma campagne immédiatement, afin d'envoyer mes messages sans délai.

#### Acceptance Criteria

1. THE Campaign_Interface SHALL provide a "Launch now" button in the campaign form
2. WHEN the user clicks "Launch now", THE Campaign_Interface SHALL validate all required fields
3. WHEN validation passes, THE Campaign_Interface SHALL call the campaign launch API
4. WHEN the campaign launches successfully, THE Campaign_Interface SHALL display a success toast notification
5. WHEN the campaign launches successfully, THE Campaign_Interface SHALL navigate to the campaign details page
6. IF the campaign launch fails, THEN THE Campaign_Interface SHALL display an error toast notification with details
7. WHILE the launch request is processing, THE Campaign_Interface SHALL disable the "Launch now" button and display a loading state

### Requirement 8: Campaign Scheduling

**User Story:** En tant qu'utilisateur, je veux planifier l'envoi de ma campagne à une date et heure futures, afin de contrôler le moment d'envoi.

#### Acceptance Criteria

1. THE Campaign_Interface SHALL provide a "Schedule" button in the campaign form
2. WHEN the user clicks "Schedule", THE Campaign_Interface SHALL display a scheduling component
3. THE Campaign_Interface SHALL provide a date picker in the scheduling component
4. THE Campaign_Interface SHALL provide a time picker in the scheduling component
5. THE Campaign_Interface SHALL require the user to select both date and time
6. WHEN the user confirms scheduling, THE Campaign_Interface SHALL validate that the selected datetime is in the future
7. WHEN validation passes, THE Campaign_Interface SHALL call the campaign scheduling API with the selected datetime
8. WHEN scheduling succeeds, THE Campaign_Interface SHALL display a success toast notification
9. WHEN scheduling succeeds, THE Campaign_Interface SHALL navigate to the campaign details page
10. IF scheduling fails, THEN THE Campaign_Interface SHALL display an error toast notification with details

### Requirement 9: Campaign Editing

**User Story:** En tant qu'utilisateur, je veux modifier une campagne en brouillon, afin de corriger ou améliorer ma campagne avant le lancement.

#### Acceptance Criteria

1. THE Campaign_Interface SHALL provide an edit action for Draft_Campaign entries in the campaigns table
2. WHEN the user clicks edit on a Draft_Campaign, THE Campaign_Interface SHALL navigate to route /campaigns/[id]/edit
3. THE Campaign_Interface SHALL load the Draft_Campaign data from the API
4. THE Campaign_Interface SHALL pre-fill the campaign form with existing data
5. THE Campaign_Interface SHALL allow editing of general information for Draft_Campaign
6. THE Campaign_Interface SHALL allow editing of audience for Draft_Campaign
7. THE Campaign_Interface SHALL allow editing of content for Draft_Campaign
8. THE Campaign_Interface SHALL provide "Save", "Launch now", "Schedule", and "Delete" buttons for Draft_Campaign
9. THE Campaign_Interface SHALL restrict editing actions based on campaign status
10. WHEN the campaign status is not draft, THE Campaign_Interface SHALL prevent editing and display a read-only view
11. WHEN the user saves changes, THE Campaign_Interface SHALL call the campaign update API
12. WHEN save succeeds, THE Campaign_Interface SHALL display a success toast notification

### Requirement 10: Campaign Deletion

**User Story:** En tant qu'utilisateur, je veux supprimer une campagne en brouillon, afin de nettoyer les campagnes non utilisées.

#### Acceptance Criteria

1. WHERE a campaign is a Draft_Campaign, THE Campaign_Interface SHALL provide a "Delete" button
2. WHEN the user clicks "Delete", THE Campaign_Interface SHALL display a confirmation dialog
3. THE Campaign_Interface SHALL require explicit user confirmation before deletion
4. WHEN the user confirms deletion, THE Campaign_Interface SHALL call the campaign deletion API
5. WHEN deletion succeeds, THE Campaign_Interface SHALL display a success toast notification
6. WHEN deletion succeeds, THE Campaign_Interface SHALL navigate to the campaigns listing page
7. IF deletion fails, THEN THE Campaign_Interface SHALL display an error toast notification

### Requirement 11: Campaign Details Page

**User Story:** En tant qu'utilisateur, je veux consulter les détails et statistiques d'une campagne, afin de suivre ses performances.

#### Acceptance Criteria

1. THE Campaign_Interface SHALL display a campaign details page at route /campaigns/[id]
2. THE Campaign_Interface SHALL load campaign data for the specified campaign ID from the current Workspace
3. THE Campaign_Interface SHALL display a header section with campaign name, channel, status, and updated timestamp
4. THE Campaign_Interface SHALL display a content summary in the header section
5. THE Campaign_Interface SHALL display an audience summary in the header section
6. THE Campaign_Interface SHALL display statistics cards showing: Audience size, Sent, Failed, Clicks, Unique clicks
7. THE Campaign_Interface SHALL load Campaign_Stats from the GET /campaigns/:id/stats API endpoint
8. THE Campaign_Interface SHALL display an Overview section with stats cards, global status, and general information
9. THE Campaign_Interface SHALL display a Messages/Targets section with a table of Message_Target records
10. THE Campaign_Interface SHALL display columns in the Messages/Targets table: contact or destination, status, message ID
11. THE Campaign_Interface SHALL provide search functionality in the Messages/Targets table
12. THE Campaign_Interface SHALL implement pagination for the Messages/Targets table
13. WHILE campaign data is loading, THE Campaign_Interface SHALL display skeleton loading states
14. WHEN no Message_Target data exists yet, THE Campaign_Interface SHALL display an empty state message
15. WHEN Campaign_Stats are unavailable, THE Campaign_Interface SHALL display a clear message indicating stats are not available
16. IF an error occurs loading campaign data, THEN THE Campaign_Interface SHALL display an error state with details

### Requirement 12: Unsaved Changes Warning

**User Story:** En tant qu'utilisateur, je veux être averti si je quitte une page avec des modifications non sauvegardées, afin d'éviter de perdre mon travail.

#### Acceptance Criteria

1. WHEN the user modifies any field in the campaign form, THE Campaign_Interface SHALL track the unsaved changes state
2. WHEN the user attempts to navigate away with unsaved changes, THE Campaign_Interface SHALL display a confirmation dialog
3. THE Campaign_Interface SHALL require explicit user confirmation before allowing navigation with unsaved changes
4. WHEN the user saves changes successfully, THE Campaign_Interface SHALL clear the unsaved changes state
5. WHEN the user confirms navigation, THE Campaign_Interface SHALL allow navigation and discard unsaved changes

### Requirement 13: Responsive Design

**User Story:** En tant qu'utilisateur, je veux utiliser l'interface sur desktop et mobile, afin d'accéder à mes campagnes depuis n'importe quel appareil.

#### Acceptance Criteria

1. THE Campaign_Interface SHALL render correctly on desktop screen sizes (1024px and above)
2. THE Campaign_Interface SHALL render correctly on tablet screen sizes (768px to 1023px)
3. THE Campaign_Interface SHALL render correctly on mobile screen sizes (below 768px)
4. THE Campaign_Interface SHALL adapt table layouts for mobile screens using responsive patterns
5. THE Campaign_Interface SHALL maintain readability and usability across all screen sizes
6. THE Campaign_Interface SHALL ensure touch targets are appropriately sized for mobile devices (minimum 44x44px)

### Requirement 14: Visual Consistency

**User Story:** En tant qu'utilisateur, je veux une interface cohérente avec le reste du dashboard ReachDem, afin d'avoir une expérience utilisateur unifiée.

#### Acceptance Criteria

1. THE Campaign_Interface SHALL use the same design system as the ReachDem dashboard
2. THE Campaign_Interface SHALL use consistent colors, typography, and spacing with the ReachDem dashboard
3. THE Campaign_Interface SHALL use consistent button styles and interactions with the ReachDem dashboard
4. THE Campaign_Interface SHALL use consistent form input styles with the ReachDem dashboard
5. THE Campaign_Interface SHALL use consistent toast notification styles with the ReachDem dashboard
6. THE Campaign_Interface SHALL use consistent loading and empty state patterns with the ReachDem dashboard

### Requirement 15: Performance and Loading States

**User Story:** En tant qu'utilisateur, je veux des retours visuels clairs pendant les chargements, afin de comprendre l'état de l'application.

#### Acceptance Criteria

1. WHILE any API request is in progress, THE Campaign_Interface SHALL display an appropriate loading indicator
2. THE Campaign_Interface SHALL use skeleton loaders for content that is being fetched
3. THE Campaign_Interface SHALL use spinner indicators for action buttons during processing
4. THE Campaign_Interface SHALL disable interactive elements during processing to prevent duplicate submissions
5. WHEN an API request completes, THE Campaign_Interface SHALL remove loading indicators within 100 milliseconds
6. THE Campaign_Interface SHALL display loading states for a minimum of 300 milliseconds to avoid flickering
