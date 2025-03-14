# SkillsFile App

A React Native application built with Expo that allows users to record and view skills and qualifications. The app uses SQLite for local storage and follows best practices for React Native development.

## Features

- Record skills and qualifications with unique identifiers
- View latest qualifications on the main screen
- Access full history of qualifications in a table view
- Pull-to-refresh functionality
- Persistent storage using SQLite
- TypeScript support
- Modern UI with React Native components

## Tech Stack

- React Native with Expo
- TypeScript
- SQLite (Expo SQLite)
- Expo Router
- React Navigation
- Jest & React Testing Library

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm or yarn
- Expo CLI
- Expo Go app on your device

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd SkillsFileApp
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Start the development server:
```bash
npx expo start
```

4. Run on your device:
- Scan the QR code with Expo Go (iOS)
- Scan the QR code with Expo Go (Android)
- Press 'w' to open in web browser

## Project Structure

```
SkillsFileApp/
├── app/                 # Main application code
│   └── (tabs)/         # Tab navigation screens
├── components/         # Reusable components
├── constants/          # App constants and configuration
├── docs/              # Documentation
│   ├── CODE_STYLE.md  # Code style guidelines
│   ├── DATABASE.md    # Database guidelines
│   ├── COMPONENT_ARCHITECTURE.md  # Component architecture
│   ├── STATE_MANAGEMENT.md  # State management guidelines
│   └── TESTING.md     # Testing guidelines
├── hooks/             # Custom React hooks
├── types/             # TypeScript type definitions
└── utils/             # Utility functions
```

## Development Guidelines

### Code Style
- Follow TypeScript best practices
- Use functional components with hooks
- Implement proper error handling
- Write clean, maintainable code

See [Code Style Guide](docs/CODE_STYLE.md) for detailed guidelines.

### Database
- Use SQLite for local storage
- Implement proper schema versioning
- Handle database operations safely
- Follow database best practices

See [Database Guidelines](docs/DATABASE.md) for detailed guidelines.

### Component Architecture
- Follow component composition patterns
- Implement proper prop typing
- Use consistent styling
- Follow React Native best practices

See [Component Architecture](docs/COMPONENT_ARCHITECTURE.md) for detailed guidelines.

### State Management
- Use appropriate state management patterns
- Implement proper data flow
- Handle side effects correctly
- Follow state management best practices

See [State Management](docs/STATE_MANAGEMENT.md) for detailed guidelines.

### Testing
- Write unit tests for components
- Implement integration tests
- Use proper testing patterns
- Follow testing best practices

See [Testing Guidelines](docs/TESTING.md) for detailed guidelines.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Expo team for the excellent framework
- React Native community for resources and support
- Contributors and maintainers of all dependencies
