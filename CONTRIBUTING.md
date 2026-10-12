# Contributing to AURA

Thank you for your interest in contributing to **AURA — Meaning-First Adaptive Broadcasting for Low-Bandwidth Networks** (developed for the BroadSurge26 IEEE hackathon).

## Code of Conduct

Please treat all contributors, reviewers, and users with respect, constructive feedback, and professional collaboration.

## Getting Started

1. **Fork the Repository** on GitHub.
2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/AURA-Adaptive-Broadcasting.git
   cd AURA-Adaptive-Broadcasting
   ```
3. **Install Dependencies**:
   ```bash
   npm install
   ```
4. **Create a Feature Branch**:
   ```bash
   git checkout -b feature/my-enhancement
   ```
5. **Start the Local Development Server**:
   ```bash
   npm run dev
   ```

## Development Guidelines

- **TypeScript**: Strictly typed interfaces and functional React components.
- **Styling**: Tailwind CSS with dark slate / cyan theme palette. Follow the Zero-Pill and anti-slop guidelines.
- **Scheduling Logic**: Any modifications to the priority algorithm in `src/services/scheduler.ts` must maintain reproducible deterministic metrics and honor deadline constraints.
- **Multimodal Video Processing**: Changes to frame extraction or `/api/prepare-video-content` must provide robust fallbacks when offline or when no Gemini API key is configured.

## Submitting Pull Requests

1. Verify type checking passes:
   ```bash
   npm run lint
   ```
2. Verify production build succeeds:
   ```bash
   npm run build
   ```
3. Commit with concise, descriptive commit messages.
4. Push to your branch and open a Pull Request against `main`.
