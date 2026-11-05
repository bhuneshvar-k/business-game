# Domain Model: Cashless Business Game Companion

## Core Domain Concepts

- **Room**: An active game session identified by a unique 4-character room code (e.g. `GAME`). Holds the bank, active players, rule configurations, and current version timestamp.
- **Bank**: The game's central financial authority with unlimited reserves. Can issue salaries ("Pass GO"), collect penalties/taxes, and finance player loans.
- **Player**: A participant in the game session (2 to 4 per room). Has a name, a selected avatar token, an assigned theme color, and a digital balance.
- **Balance**: The liquid money amount held by a player (starts at $25,000 USD by default).
- **Transaction**: An immutable record of funds transferred between two entities (Player → Bank, Bank → Player, or Player → Player). Contains `id`, `timestamp`, `fromId`, `toId`, `amount`, `type` (SALARY, TAX, RENT, TRADE, LOAN, CUSTOM), and `note`.
- **Undo**: The atomic reversal of a previous transaction, adjusting balances back to their prior state and marking the original transaction as reversed.
- **Version**: A monotonically increasing integer or timestamp incremented on every transaction or undo, used for zero-cost HTTP 304 conditional cache validation on player mobile screens.
- **Banker**: The player or host operating the primary device with full ledger authorization (numpad, transfer controls, and undo permissions).
- **Player Card**: The personal mobile view displaying an individual player's current balance, transaction stream, and the table leaderboard.
