## ADDED Requirements

### Requirement: Reaction Buttons
The system SHALL provide reaction buttons on the client remote view for sending reactions to the host.

#### Scenario: Reaction buttons on client remote
- **WHEN** a client opens the remote tab
- **THEN** reaction buttons SHALL be visible (👏 Applause, ❤️ Heart, 🔥 Fire, 😂 Laugh, 🎉 Party)
- **AND** buttons SHALL be large enough for comfortable touch interaction (minimum 60x60px)

#### Scenario: Send reaction from client
- **WHEN** the user taps a reaction button on their phone
- **THEN** the reaction SHALL be sent to the server via WebSocket
- **AND** the button SHALL provide immediate visual feedback (e.g., pulse or scale animation)

### Requirement: Reaction Display on Host
The system SHALL display reactions as animated emojis on the host screen.

#### Scenario: Reaction appears on host
- **WHEN** a client sends a reaction
- **THEN** the corresponding emoji SHALL appear on the host screen
- **AND** the emoji SHALL be displayed at a random horizontal position
- **AND** the emoji SHALL animate upward and fade out over 2-3 seconds

#### Scenario: Multiple simultaneous reactions
- **WHEN** multiple clients send reactions at the same time
- **THEN** all reactions SHALL be displayed on the host screen
- **AND** each reaction SHALL appear at a different random position

#### Scenario: Reaction animation cleanup
- **WHEN** a reaction animation completes
- **THEN** the reaction element SHALL be removed from the DOM
- **AND** no memory leak SHALL occur from accumulated reactions

### Requirement: Reaction Throttling
The system SHALL throttle reaction sending to prevent spam.

#### Scenario: Client-side throttling
- **WHEN** a client sends a reaction
- **THEN** the client SHALL be unable to send another reaction for 1 second
- **AND** reaction buttons SHALL be visually disabled during the cooldown period

#### Scenario: Server-side throttling
- **WHEN** the server receives a reaction from a client
- **THEN** the server SHALL enforce a 1-second cooldown per client
- **AND** reactions sent during the cooldown SHALL be ignored

#### Scenario: Rapid button taps
- **WHEN** a user rapidly taps a reaction button multiple times
- **THEN** only 1 reaction per second SHALL be sent to the server
- **AND** the user SHALL receive visual feedback about the cooldown

### Requirement: Reaction Visibility Context
The system SHALL only display reactions during video playback, not during search or queue management.

#### Scenario: Reactions during playback
- **WHEN** a video is playing
- **AND** a client sends a reaction
- **THEN** the reaction SHALL be displayed on the host screen

#### Scenario: Reactions during search
- **WHEN** the host is in the search interface
- **AND** a client sends a reaction
- **THEN** the reaction SHALL NOT be displayed on the host screen
- **OR** SHALL be queued and displayed when playback resumes

#### Scenario: Reactions during queue view
- **WHEN** the host is viewing the queue
- **AND** a client sends a reaction
- **THEN** the reaction SHALL NOT be displayed on the host screen
- **OR** SHALL be queued and displayed when playback resumes

### Requirement: Reaction Types
The system SHALL support multiple reaction types with distinct emojis.

#### Scenario: Applause reaction
- **WHEN** the user sends an applause reaction
- **THEN** the 👏 emoji SHALL be displayed on the host screen

#### Scenario: Heart reaction
- **WHEN** the user sends a heart reaction
- **THEN** the ❤️ emoji SHALL be displayed on the host screen

#### Scenario: Fire reaction
- **WHEN** the user sends a fire reaction
- **THEN** the 🔥 emoji SHALL be displayed on the host screen

#### Scenario: Laugh reaction
- **WHEN** the user sends a laugh reaction
- **THEN** the 😂 emoji SHALL be displayed on the host screen

#### Scenario: Party reaction
- **WHEN** the user sends a party reaction
- **THEN** the 🎉 emoji SHALL be displayed on the host screen

### Requirement: Reaction Visual Feedback
The system SHALL provide immediate visual feedback to the user sending a reaction.

#### Scenario: Button feedback on tap
- **WHEN** the user taps a reaction button
- **THEN** the button SHALL provide immediate visual feedback (e.g., pulse, scale, or highlight)
- **AND** the feedback SHALL complete within 300ms

#### Scenario: Cooldown visual indicator
- **WHEN** a reaction is sent and the cooldown period begins
- **THEN** the reaction buttons SHALL appear disabled or grayed out
- **AND** the buttons SHALL re-enable after the cooldown expires

### Requirement: Reaction Performance
The system SHALL ensure reactions do not negatively impact video playback performance.

#### Scenario: No frame drops during reactions
- **WHEN** multiple reactions are displayed during video playback
- **THEN** the video SHALL continue playing smoothly without frame drops
- **AND** reaction animations SHALL use GPU-accelerated CSS properties (transform, opacity)

#### Scenario: Efficient DOM management
- **WHEN** 50+ reactions have been displayed
- **THEN** completed reaction elements SHALL be removed from the DOM
- **AND** memory usage SHALL not grow unbounded
