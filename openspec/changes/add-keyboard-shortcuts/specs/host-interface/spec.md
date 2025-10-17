## ADDED Requirements

### Requirement: Keyboard Shortcut Support
The system SHALL provide keyboard shortcuts for common host actions on the host view.

#### Scenario: Space key toggles play/pause
- **WHEN** the user presses the Space key on the host view
- **THEN** the video playback SHALL toggle between play and pause states

#### Scenario: N key skips to next song
- **WHEN** the user presses the N key on the host view
- **THEN** the current song SHALL end and playback SHALL advance to the next song in the queue

#### Scenario: Escape key closes modals
- **WHEN** the user presses the Escape key while a modal (e.g., search) is open
- **THEN** the modal SHALL close

### Requirement: Volume Keyboard Control
The system SHALL allow volume adjustment via keyboard shortcuts.

#### Scenario: Up arrow increases volume
- **WHEN** the user presses the Up arrow key
- **THEN** the volume SHALL increase by a reasonable increment (e.g., 5%)
- **AND** the volume slider SHALL update to reflect the new level

#### Scenario: Down arrow decreases volume
- **WHEN** the user presses the Down arrow key
- **THEN** the volume SHALL decrease by a reasonable increment (e.g., 5%)
- **AND** the volume slider SHALL update to reflect the new level

### Requirement: Pitch Keyboard Control
The system SHALL allow pitch adjustment via keyboard shortcuts.

#### Scenario: Right arrow increases pitch
- **WHEN** the user presses the Right arrow key
- **THEN** the pitch SHALL increase by 1 semitone
- **AND** the pitch display SHALL update to reflect the new offset

#### Scenario: Left arrow decreases pitch
- **WHEN** the user presses the Left arrow key
- **THEN** the pitch SHALL decrease by 1 semitone
- **AND** the pitch display SHALL update to reflect the new offset

### Requirement: Quick Add from Search Results
The system SHALL allow quick-adding songs from search results using number keys 1-9.

#### Scenario: Number key adds corresponding search result
- **WHEN** the search modal is open with results displayed
- **AND** the user presses a number key (1-9)
- **THEN** the song at that position in the search results SHALL be added to the queue
- **AND** visual feedback SHALL indicate the song was added

#### Scenario: Number key outside result range
- **WHEN** the user presses a number key that exceeds the number of search results
- **THEN** the system SHALL ignore the keypress and take no action

### Requirement: Input Field Exclusion
Keyboard shortcuts SHALL NOT trigger when the user is typing in an input field.

#### Scenario: Typing in search input
- **WHEN** the search input field has focus
- **AND** the user presses Space
- **THEN** a space character SHALL be inserted into the input
- **AND** the play/pause action SHALL NOT be triggered

#### Scenario: Typing in any text input
- **WHEN** any text input field has focus
- **AND** the user presses any shortcut key
- **THEN** the default typing behavior SHALL occur
- **AND** the shortcut action SHALL NOT be triggered

### Requirement: Client View Exclusion
Keyboard shortcuts SHALL NOT be available on the client view.

#### Scenario: Shortcuts disabled on client view
- **WHEN** the user is on the client view
- **AND** presses any shortcut key
- **THEN** no karaoke action SHALL be triggered
- **AND** only default browser behavior SHALL occur

### Requirement: Keyboard Shortcut Help
The system SHALL provide a help overlay listing available keyboard shortcuts.

#### Scenario: Display shortcut help overlay
- **WHEN** the user presses the "?" key or clicks a help icon
- **THEN** an overlay SHALL display showing all available keyboard shortcuts
- **AND** the overlay SHALL include a close button

#### Scenario: Close help overlay
- **WHEN** the help overlay is open
- **AND** the user presses Escape or clicks the close button
- **THEN** the overlay SHALL close
