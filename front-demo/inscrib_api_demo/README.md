# LangGraph Report Generation Frontend Demo

A Next.js 15 frontend application demonstrating the integration with the LangGraph-based Report Generation System API.

## Overview

This frontend application provides a user interface for:
- User authentication via JWT tokens
- File upload for medical transcriptions
- Real-time report generation with progress indicators
- Interactive report viewing and editing
- Template-based report customization

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **React**: React 19
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **TypeScript**: Full type safety

## Features

### Authentication Flow
- Simple ID-based authentication
- JWT token management with localStorage
- Automatic token validation and refresh

### File Upload
- Support for multiple file formats (TXT, DOCX, PDF)
- Drag-and-drop interface
- Upload progress tracking
- File validation

### Report Generation
- Real-time generation status
- Loading animations with status messages
- Error handling and user feedback
- Template selection

### Report Display
- Dynamic template rendering
- Section-based report structure
- Edit and regenerate capabilities
- Professional medical report formatting

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn
- Backend API running (see main README)
- Valid API endpoint configured

### Installation

1. **Navigate to frontend directory**
   ```bash
   cd front-demo/inscrib_api_demo
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure environment variables**
   ```bash
   # Create .env.local file
   NEXT_PUBLIC_API_URL=http://localhost:3000/api
   NEXT_SERVER_API_URL=http://localhost:3000/api
   ```

4. **Run development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open in browser**
   ```
   http://localhost:3001
   ```

## Project Structure

```
inscrib_api_demo/
├── app/
│   ├── components/          # React components
│   │   └── TemplateRenderer.tsx
│   ├── main/                # Main application page
│   │   └── page.tsx
│   ├── type/                # TypeScript type definitions
│   │   └── template.ts
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Landing/auth page
├── public/                  # Static assets
│   └── 01.json             # Report template
├── next.config.ts          # Next.js configuration
├── tailwind.config.ts      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

## Key Components

### TemplateRenderer
Renders medical reports based on JSON template schemas with support for:
- Nested sections and subsections
- Dynamic content rendering
- Custom formatting per section type
- Edit and regenerate functionality

### Main Page
Primary application interface featuring:
- File upload interface
- Report generation workflow
- Status indicators
- Error handling UI

## API Integration

The frontend communicates with the backend API through:

1. **Authentication**
   ```typescript
   POST /api/auth/token?id={userId}
   ```

2. **File Upload**
   ```typescript
   POST /api/report-generation/upload
   Headers: Authorization: Bearer {token}
   Body: FormData with file
   ```

3. **Report Generation**
   ```typescript
   GET /api/report-generation/generate?UploadFile={path}&TemplatePath={url}
   Headers: Authorization: Bearer {token}
   ```

4. **Report Regeneration**
   ```typescript
   POST /api/report-generation/reGernatePart
   Headers: Authorization: Bearer {token}
   Body: { oldSection: string, prompts: string }
   ```

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Public API URL (browser) | `http://localhost:3000/api` |
| `NEXT_SERVER_API_URL` | Server-side API URL (SSR) | `http://app:3000/api` |
| `PORT` | Frontend server port | `3001` |

## Development

### Running in Development Mode

```bash
npm run dev
```

The application will be available at `http://localhost:3001` with hot-reload enabled.

### Building for Production

```bash
npm run build
npm start
```

### Docker Deployment

The frontend is containerized and can be deployed using Docker Compose (see main README).

## Customization

### Report Templates

Report templates are defined in JSON format and located in the `public/` directory. The template structure follows a schema that defines:
- Section names and descriptions
- Field types and validation
- Display formatting
- Prompt templates for generation

Example template structure:
```json
{
  "Clinician": {
    "description": "The clinician who wrote the report"
  },
  "Client": {
    "description": "The client information"
  },
  "Reason": {
    "description": "Reasons for consultation"
  }
}
```

## Troubleshooting

### CORS Issues
Ensure the backend CORS configuration includes your frontend URL.

### Authentication Errors
- Verify JWT token is stored in localStorage
- Check token expiration
- Ensure backend authentication endpoint is accessible

### File Upload Failures
- Check file size limits (default: 10MB)
- Verify file format is supported
- Ensure backend upload endpoint is running

## Contributing

See the main [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

## License

MIT License - see main repository LICENSE file.
