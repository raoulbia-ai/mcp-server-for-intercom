# MCP Intercom - Development Guide

## Build & Development
- Build: `npm run build`
- Start server: `npm run start`
- Dev mode: `npm run dev`
- Watch mode: `npm run build:watch`

## Testing
- Run all tests: `npm test`
- Run single test: `npm test -- -g "test description"`
- Watch tests: `npm run test:watch`

## Code Quality
- Lint: `npm run lint`
- Clean build: `npm run clean`

## Code Style Guidelines
- Use ES module imports with `.js` extension: `import { x } from './module.js'`
- Prefer TypeScript strict mode with explicit types
- Use camelCase for variables/functions, PascalCase for classes/interfaces
- Handle errors with try/catch blocks and proper error propagation
- Validate inputs using Zod schemas
- Use async/await for asynchronous operations
- Follow existing patterns when adding new features
- Use JSDoc comments for public APIs