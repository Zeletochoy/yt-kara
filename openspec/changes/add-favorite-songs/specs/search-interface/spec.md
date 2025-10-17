## ADDED Requirements

### Requirement: Favorite Song Management
The system SHALL allow users to mark songs as favorites and manage a favorites list.

#### Scenario: Add song to favorites from search results
- **WHEN** the user clicks the favorite button on a search result
- **THEN** the song SHALL be added to the favorites list in localStorage
- **AND** the favorite icon SHALL change to indicate the song is favorited
- **AND** the song metadata (video ID, title, artist, thumbnail) SHALL be stored

#### Scenario: Remove song from favorites
- **WHEN** the user clicks the favorite button on a favorited song
- **THEN** the song SHALL be removed from the favorites list
- **AND** the favorite icon SHALL change to indicate the song is not favorited

#### Scenario: Add song to favorites from queue
- **WHEN** the user clicks the favorite button on a queue item
- **THEN** the song SHALL be added to the favorites list
- **AND** the favorite icon SHALL update accordingly

### Requirement: Favorites Persistence
The system SHALL persist favorites across sessions using localStorage and handle URL changes gracefully.

#### Scenario: Favorites persist after page reload
- **WHEN** the user adds songs to favorites and refreshes the page
- **THEN** all favorited songs SHALL still appear in the favorites list
- **AND** favorite icons SHALL show correct state for all previously favorited songs

#### Scenario: URL change resilience
- **WHEN** a YouTube URL format changes but the video ID remains the same
- **THEN** the favorite SHALL still be recognized and displayed
- **AND** the favorite icon SHALL show correct state based on video ID, not URL

#### Scenario: Video ID-based storage
- **WHEN** a song is added to favorites
- **THEN** only the video ID SHALL be used as the unique identifier
- **AND** the full URL SHALL NOT be stored as the primary key

### Requirement: Favorites Display
The system SHALL provide a dedicated favorites section showing all favorited songs.

#### Scenario: View favorites list on host
- **WHEN** the user opens the favorites tab/section on the host view
- **THEN** all favorited songs SHALL be displayed
- **AND** each song SHALL show its thumbnail, title, and artist
- **AND** each song SHALL have a quick-add button

#### Scenario: View favorites list on client
- **WHEN** the user opens the favorites section on a client device
- **THEN** all favorited songs SHALL be displayed
- **AND** each song SHALL have a quick-add button

#### Scenario: Empty favorites state
- **WHEN** the favorites list is empty
- **THEN** a helpful message SHALL be displayed (e.g., "No favorites yet. Click the heart icon on any song to add it!")

### Requirement: Quick Add from Favorites
The system SHALL allow users to quickly add favorited songs to the queue.

#### Scenario: Quick-add from favorites on host
- **WHEN** the user clicks the add button on a favorite in the favorites list
- **THEN** the song SHALL be added to the queue
- **AND** visual feedback SHALL indicate the song was added

#### Scenario: Quick-add from favorites on client
- **WHEN** the user clicks the add button on a favorite in the client favorites list
- **THEN** the song SHALL be sent to the server via WebSocket
- **AND** the song SHALL be added to the host's queue

### Requirement: Favorites State Synchronization
The system SHALL synchronize favorite state across search results and favorites list.

#### Scenario: Favorite icon reflects current state
- **WHEN** the user views search results
- **THEN** songs that are already favorited SHALL show a filled favorite icon
- **AND** songs that are not favorited SHALL show an empty favorite icon

#### Scenario: Adding favorite updates search results
- **WHEN** the user adds a song to favorites from search results
- **AND** the same song appears again in new search results
- **THEN** the song SHALL show a filled favorite icon

#### Scenario: Removing favorite updates all views
- **WHEN** the user removes a song from favorites
- **THEN** the song SHALL be removed from the favorites list
- **AND** the favorite icon in search results SHALL update to empty state

### Requirement: Favorites Metadata Storage
The system SHALL store sufficient metadata to display favorites without re-fetching.

#### Scenario: Store video metadata with favorite
- **WHEN** a song is added to favorites
- **THEN** the system SHALL store video ID, title, artist (if available), and thumbnail URL
- **AND** the timestamp of when it was favorited SHALL be stored

#### Scenario: Display favorites without search
- **WHEN** the favorites list is displayed
- **THEN** all metadata SHALL be retrieved from localStorage
- **AND** no additional API calls SHALL be required to display the favorites

### Requirement: Duplicate Prevention
The system SHALL prevent duplicate favorites.

#### Scenario: Attempt to add existing favorite
- **WHEN** the user tries to add a song that is already in favorites
- **THEN** the system SHALL not create a duplicate entry
- **AND** the system SHALL treat it as a no-op or toggle to remove
