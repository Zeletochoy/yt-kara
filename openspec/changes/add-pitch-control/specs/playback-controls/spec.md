## ADDED Requirements

### Requirement: Pitch Control UI
The system SHALL provide pitch control buttons on both the host view and client remote views.

#### Scenario: Pitch controls on host view
- **WHEN** the host view is displayed
- **THEN** pitch adjustment buttons (+/-) SHALL be visible in the playback controls
- **AND** a pitch offset display SHALL show the current pitch (e.g., +0, +1, -2)

#### Scenario: Pitch controls on client remote
- **WHEN** a client opens the remote tab
- **THEN** pitch adjustment buttons SHALL be visible in the remote controls
- **AND** the pitch offset display SHALL match the current system pitch

### Requirement: Pitch Adjustment
The system SHALL allow users to adjust playback pitch by ±3 semitones using HTML5 audio APIs.

#### Scenario: Increase pitch from host
- **WHEN** the user clicks the pitch up button on the host view
- **THEN** the pitch SHALL increase by 1 semitone
- **AND** the video playback rate SHALL be adjusted using the formula `playbackRate = Math.pow(2, semitones/12)`
- **AND** `preservesPitch` SHALL be set to false to enable pitch shifting

#### Scenario: Decrease pitch from client remote
- **WHEN** the user clicks the pitch down button on a client remote
- **THEN** the pitch change SHALL be sent via WebSocket to the server
- **AND** the host video playback SHALL adjust down by 1 semitone
- **AND** all connected clients' pitch displays SHALL update to reflect the new pitch

#### Scenario: Pitch bounds enforcement
- **WHEN** a user attempts to set pitch beyond ±3 semitones
- **THEN** the system SHALL prevent the change and keep the pitch at the boundary value
- **AND** the pitch buttons SHALL be disabled when at the limits

### Requirement: Pitch State Synchronization
The system SHALL synchronize pitch state across all connected clients in real-time.

#### Scenario: Multi-client pitch sync
- **WHEN** any client or host changes the pitch
- **THEN** all other connected clients SHALL receive a pitch update event
- **AND** all pitch displays SHALL show the new pitch offset

#### Scenario: New client connection
- **WHEN** a new client connects to the server
- **THEN** the client SHALL receive the current pitch level in the initial state update
- **AND** the client's pitch display SHALL show the correct offset

### Requirement: Pitch Reset on Song Change
The system SHALL reset pitch to 0 semitones when a new song starts playing.

#### Scenario: Song change resets pitch
- **WHEN** a new song begins playback
- **THEN** the pitch SHALL be reset to 0 semitones
- **AND** the playback rate SHALL return to 1.0
- **AND** all client pitch displays SHALL show +0

#### Scenario: Manual song skip with pitch adjusted
- **WHEN** a user skips to the next song while pitch is set to ±3
- **THEN** the new song SHALL start with pitch at 0
- **AND** the pitch controls SHALL return to the neutral state

### Requirement: Pitch Display Format
The system SHALL display pitch offset in semitone notation with sign.

#### Scenario: Zero pitch display
- **WHEN** pitch is at default (0 semitones)
- **THEN** the display SHALL show "+0" or "0"

#### Scenario: Positive pitch display
- **WHEN** pitch is increased by 2 semitones
- **THEN** the display SHALL show "+2"

#### Scenario: Negative pitch display
- **WHEN** pitch is decreased by 1 semitone
- **THEN** the display SHALL show "-1"

### Requirement: Pitch Control Accessibility
Pitch controls SHALL be touch-friendly and visually accessible on mobile devices.

#### Scenario: Mobile touch interaction
- **WHEN** a user interacts with the pitch buttons on a mobile device
- **THEN** the buttons SHALL be large enough for comfortable touch interaction (minimum 44x44px touch target)
- **AND** SHALL provide immediate visual feedback when tapped

#### Scenario: Visual feedback
- **WHEN** a pitch button is pressed
- **THEN** the button SHALL provide visual feedback (e.g., highlight, press state)
- **AND** the pitch offset display SHALL update immediately
