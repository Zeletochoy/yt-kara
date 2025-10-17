## ADDED Requirements

### Requirement: Volume Control UI
The system SHALL provide volume control sliders on both the host view and client remote views.

#### Scenario: Volume slider on host view
- **WHEN** the host view is displayed
- **THEN** a volume slider SHALL be visible in the playback controls
- **AND** the slider SHALL show the current volume level (0-100%)

#### Scenario: Volume slider on client remote
- **WHEN** a client opens the remote tab
- **THEN** a volume slider SHALL be visible in the remote controls
- **AND** the slider SHALL match the current system volume

### Requirement: Volume Adjustment
The system SHALL allow users to adjust playback volume in real-time from 0% to 100%.

#### Scenario: Adjust volume from host
- **WHEN** the user moves the volume slider on the host view
- **THEN** the video playback volume SHALL change immediately
- **AND** the new volume level SHALL be applied to the HTML5 video element

#### Scenario: Adjust volume from client remote
- **WHEN** the user moves the volume slider on a client remote
- **THEN** the volume change SHALL be sent via WebSocket to the server
- **AND** the host video playback volume SHALL update immediately
- **AND** all connected clients' sliders SHALL update to reflect the new volume

#### Scenario: Volume bounds enforcement
- **WHEN** a user attempts to set volume below 0% or above 100%
- **THEN** the system SHALL clamp the value to the valid range [0-100]

### Requirement: Volume State Synchronization
The system SHALL synchronize volume state across all connected clients in real-time.

#### Scenario: Multi-client volume sync
- **WHEN** any client or host changes the volume
- **THEN** all other connected clients SHALL receive a volume update event
- **AND** all volume sliders SHALL move to reflect the new volume level

#### Scenario: New client connection
- **WHEN** a new client connects to the server
- **THEN** the client SHALL receive the current volume level in the initial state update
- **AND** the client's volume slider SHALL display the correct position

### Requirement: Volume Persistence
The system SHALL persist the host's volume preference across page refreshes.

#### Scenario: Save volume preference
- **WHEN** the volume is changed on the host view
- **THEN** the new volume level SHALL be saved to localStorage

#### Scenario: Restore volume on page load
- **WHEN** the host view loads
- **THEN** the system SHALL retrieve the saved volume from localStorage
- **AND** apply it to the video element
- **AND** if no saved volume exists, SHALL default to 100%

### Requirement: Volume Control Accessibility
Volume controls SHALL be touch-friendly and visually accessible on mobile devices.

#### Scenario: Mobile touch interaction
- **WHEN** a user interacts with the volume slider on a mobile device
- **THEN** the slider SHALL be large enough for comfortable touch interaction (minimum 44x44px touch target)
- **AND** SHALL provide immediate visual feedback when dragged

#### Scenario: Visual feedback
- **WHEN** the volume slider is moved
- **THEN** the slider handle SHALL follow the user's input smoothly
- **AND** the volume percentage MAY be displayed numerically
