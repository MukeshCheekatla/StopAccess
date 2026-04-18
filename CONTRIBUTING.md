# Contributing to StopAccess

Thank you for your interest in contributing to StopAccess! High-quality contributions are what make the open-source community such an amazing place to learn, inspire, and create.

## Getting Started

1. **Fork the Repository**: Create your own fork of [StopAccess](https://github.com/MukeshCheekatla/StopAccess).
2. **Clone the Project**: Download your fork to your local machine.
3. **Install Dependencies**: Run `npm install` in the root directory.
4. **Create a Branch**: Use a descriptive name like `feat/new-focus-timer` or `fix/tooltip-flicker`.

## Development Workflow

We use a monorepo structure with NPM workspaces:

- `extension/`: The main browser extension.
- `packages/`: Core logic shared across platforms.

To run the extension in development mode:
```bash
npm run watch -w extension
```

## Pull Request Guidelines

- **Technical Quality**: Ensure your code passes linting (`npm run lint`) and type checking (`npm run typecheck`).
- **Atomicity**: Keep PRs focused on a single feature or bug fix.
- **Documentation**: Update the `CHANGELOG.md` (in `packages/core/src`) if your change affects the user experience.

## Code of Conduct

Help us keep StopAccess a welcoming and inclusive community. Please be respectful and constructive in all interactions.

---
<sub>Need help? Feel free to open an issue or start a discussion.</sub>
