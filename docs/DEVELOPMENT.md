# Development Guide

This guide provides detailed instructions for setting up and developing the LangGraph-based Report Generation System project.

## Prerequisites

- Node.js 18+ and npm/yarn
- Docker and Docker Compose (for containerized development)
- Git
- A code editor (VS Code recommended)

## Initial Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/langgraph-report-generation.git
cd langgraph-report-generation
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# LLM Configuration
ALL_IN_ONE_KEY=your_google_gemini_api_key
PROXY_URL=

# Authentication
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=1y

# Vector Database
CHROMA_SERVER_HOST=localhost
CHROMA_SERVER_PORT=8000

# External APIs
TAVILY_KEY=your_tavily_api_key

# Application
NODE_ENV=development
FRONTEND_URL=http://localhost:3001
```

### 4. Start Services

#### Option A: Docker Compose (Recommended)

```bash
docker-compose up -d
```

This starts:
- Backend API (port 3000)
- Frontend (port 3001)
- ChromaDB (port 8000)

#### Option B: Local Development

**Start ChromaDB:**
```bash
docker run -d -p 8000:8000 chromadb/chroma
```

**Start Backend:**
```bash
npm run start:dev
```

**Start Frontend:**
```bash
cd front-demo/inscrib_api_demo
npm run dev
```

## Development Workflow

### Project Structure

```
langgraph-report-generation/
├── apps/
│   └── inscrib_agent/          # Backend NestJS app
│       └── src/
│           ├── auth/           # Authentication module
│           ├── report-generation/  # Report generation module
│           ├── vector/         # Vector database service
│           └── common/         # Shared utilities
├── front-demo/
│   └── inscrib_api_demo/       # Frontend Next.js app
├── docs/                       # Documentation
└── test/                       # Test utilities
```

### Running Tests

```bash
# Unit tests
npm test

# With coverage
npm run test:cov

# Watch mode
npm run test:watch

# E2E tests
npm run test:e2e
```

### Code Quality

```bash
# Linting
npm run lint

# Formatting
npm run format

# Type checking
npx tsc --noEmit
```

## Adding New Features

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Implement Your Feature

- Follow the existing code structure
- Add JSDoc comments for public methods
- Write unit tests
- Update documentation

### 3. Test Your Changes

```bash
npm test
npm run lint
```

### 4. Commit Your Changes

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat: add new feature description"
```

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

## Debugging

### Backend Debugging

VS Code launch configuration:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug NestJS",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["run", "start:debug"],
  "console": "integratedTerminal"
}
```

### Frontend Debugging

Use React DevTools and browser DevTools for frontend debugging.

### Database Debugging

Access ChromaDB admin interface at `http://localhost:8000`

## Common Issues

### ChromaDB Connection Errors

- Ensure ChromaDB is running: `docker ps`
- Check connection settings in `.env`
- Verify network connectivity

### LLM API Errors

- Verify API keys in `.env`
- Check API quota/limits
- Review proxy settings if using proxy

### Port Conflicts

- Change ports in `docker-compose.yml` or `.env`
- Kill processes using ports: `lsof -ti:3000 | xargs kill`

## Performance Optimization

### Backend

- Use connection pooling for database
- Implement caching for frequent queries
- Optimize vector search queries

### Frontend

- Use Next.js image optimization
- Implement code splitting
- Optimize bundle size

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment instructions.

## Resources

- [NestJS Documentation](https://docs.nestjs.com/)
- [Next.js Documentation](https://nextjs.org/docs)
- [LangChain Documentation](https://js.langchain.com/)
- [ChromaDB Documentation](https://docs.trychroma.com/)

