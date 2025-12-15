# System Architecture

This document provides a comprehensive overview of the LangGraph-based Report Generation System architecture, including component interactions, data flows, and design decisions.

## Table of Contents

1. [System Overview](#system-overview)
2. [Component Architecture](#component-architecture)
3. [Agent Workflow](#agent-workflow)
4. [Data Flow](#data-flow)
5. [RAG Pipeline](#rag-pipeline)
6. [Vector Database Schema](#vector-database-schema)
7. [Security Architecture](#security-architecture)
8. [Performance Considerations](#performance-considerations)

## System Overview

LangGraph-based Report Generation System is built as a microservices architecture with clear separation of concerns:

- **Frontend Layer**: Next.js application for user interaction
- **API Layer**: NestJS RESTful API with JWT authentication
- **Business Logic Layer**: Modular services for report generation
- **AI Agent Layer**: LangGraph-based workflow orchestration
- **Data Layer**: ChromaDB vector database for knowledge storage
- **External Services**: Google Gemini LLM and Tavily Search API

## Component Architecture

### High-Level Component Diagram

```mermaid
graph TB
    subgraph Client["Client Layer"]
        Browser[Web Browser]
        NextJS[Next.js Frontend]
    end
    
    subgraph API["API Gateway Layer"]
        NestJS[NestJS Application]
        AuthGuard[JWT Auth Guard]
        Swagger[Swagger Docs]
    end
    
    subgraph Services["Service Layer"]
        AuthSvc[Auth Service]
        ReportSvc[Report Generation Service]
        VectorSvc[Vector Service]
    end
    
    subgraph Agents["Agent Layer"]
        LoadFiles[LoadFiles Service]
        WriterAgent[Writer Agent Service]
        LLMService[Google LLM Service]
    end
    
    subgraph Data["Data Layer"]
        ChromaDB[(ChromaDB)]
        FileStorage[File System]
    end
    
    subgraph External["External Services"]
        Gemini[Google Gemini API]
        Tavily[Tavily Search API]
    end
    
    Browser --> NextJS
    NextJS -->|HTTP + JWT| NestJS
    NestJS --> AuthGuard
    AuthGuard --> AuthSvc
    NestJS --> ReportSvc
    ReportSvc --> LoadFiles
    ReportSvc --> WriterAgent
    LoadFiles --> VectorSvc
    WriterAgent --> LLMService
    WriterAgent --> VectorSvc
    WriterAgent --> Tavily
    LLMService --> Gemini
    VectorSvc --> ChromaDB
    LoadFiles --> FileStorage
```

### Module Dependencies

```mermaid
graph LR
    AppModule[App Module] --> AuthModule[Auth Module]
    AppModule --> ReportModule[Report Module]
    AppModule --> VectorService[Vector Service]
    
    ReportModule --> AgentStates[Agent States]
    ReportModule --> LoadFiles[Load Files]
    ReportModule --> WriterAgent[Writer Agent]
    ReportModule --> LLMService[LLM Service]
    ReportModule --> VectorService
    
    WriterAgent --> LLMService
    WriterAgent --> VectorService
    LoadFiles --> LLMService
    LoadFiles --> VectorService
```

## Agent Workflow

### LangGraph State Machine

The report generation process is orchestrated using LangGraph, which provides a stateful workflow with clear state transitions:

```mermaid
stateDiagram-v2
    [*] --> LoadFiles: Upload File
    
    LoadFiles: Load & Split Documents
    LoadFiles: Generate Summaries
    LoadFiles: Store in Vector DB
    
    LoadFiles --> Analysis: Documents Ready
    
    Analysis: Analyze Transcript
    Analysis: Identify Key Themes
    Analysis: Extract Information
    
    Analysis --> RAGSearch: Analysis Complete
    
    RAGSearch: Multi-Query Search
    RAGSearch: Retrieve Relevant Docs
    RAGSearch: User Filtering
    
    RAGSearch --> OnlineSearch: Context Retrieved
    
    OnlineSearch: Web Research
    OnlineSearch: Supplement Knowledge
    OnlineSearch: Real-Time Info
    
    OnlineSearch --> WriteReport: Research Complete
    
    WriteReport: Generate Report
    WriteReport: Apply Template
    WriteReport: Validate Schema
    
    WriteReport --> [*]: Report Generated
    
    note right of LoadFiles
        Supports: PDF, DOCX, TXT, JSON
        Chunking: 2000 chars, 100 overlap
    end note
    
    note right of RAGSearch
        Multi-query expansion
        Semantic reranking
        User isolation
    end note
```

### State Channels

The workflow uses LangGraph state channels to manage data flow:

```typescript
interface AgentStateChannels {
  UploadFile: string;           // File path
  TemplatePath: string;        // Template JSON
  messages: BaseMessage[];      // LLM conversation history
  Status: string;              // Current workflow status
  Chunks?: Document[];          // Processed document chunks
  Error?: string;               // Error messages
  userId?: string;              // User identifier
  RAGResults?: object;          // RAG search results
  Report?: object;              // Generated report
  Analysis?: string;            // Analysis results
  Research?: string;            // Research results
  MetaData: {                   // Workflow metadata
    startTime: number;
    lastUpdated: number;
  };
}
```

## Data Flow

### Report Generation Flow

```mermaid
sequenceDiagram
    participant User
    participant Frontend
    participant API
    participant Auth
    participant ReportSvc
    participant LoadFiles
    participant VectorDB
    participant WriterAgent
    participant Gemini
    participant Tavily
    
    User->>Frontend: Upload File
    Frontend->>API: POST /upload (JWT)
    API->>Auth: Verify Token
    Auth-->>API: Valid
    API->>ReportSvc: Save File
    ReportSvc-->>Frontend: File Path
    
    Frontend->>API: GET /generate
    API->>ReportSvc: Start Workflow
    ReportSvc->>LoadFiles: Load & Process
    LoadFiles->>VectorDB: Store Chunks
    LoadFiles-->>ReportSvc: Chunks Ready
    
    ReportSvc->>WriterAgent: Analyze
    WriterAgent->>Gemini: Analyze Transcript
    Gemini-->>WriterAgent: Analysis
    
    WriterAgent->>VectorDB: RAG Search
    VectorDB-->>WriterAgent: Relevant Docs
    
    WriterAgent->>Tavily: Online Search
    Tavily-->>WriterAgent: Research Results
    
    WriterAgent->>Gemini: Generate Report
    Gemini-->>WriterAgent: Report JSON
    WriterAgent-->>ReportSvc: Report
    ReportSvc-->>API: Report
    API-->>Frontend: Report
    Frontend-->>User: Display Report
```

### File Processing Flow

```mermaid
flowchart TD
    Start[File Upload] --> Validate{Validate File Type}
    Validate -->|Invalid| Error[Return Error]
    Validate -->|Valid| Save[Save to Temp Storage]
    Save --> Loader{Select Loader}
    Loader -->|PDF| PDFLoader[PDF Loader]
    Loader -->|DOCX| DOCXLoader[DOCX Loader]
    Loader -->|TXT| TextLoader[Text Loader]
    Loader -->|JSON| JSONLoader[JSON Loader]
    
    PDFLoader --> Split[Text Splitter]
    DOCXLoader --> Split
    TextLoader --> Split
    JSONLoader --> Split
    
    Split --> Process[Process Chunks]
    Process --> Summary[Generate Summaries]
    Summary --> Embed[Create Embeddings]
    Embed --> Store[Store in ChromaDB]
    Store --> Complete[Processing Complete]
```

## RAG Pipeline

### Multi-Query Retrieval Process

The system uses LangChain's Multi-Query Retriever to improve retrieval quality:

```mermaid
flowchart LR
    Query[User Query] --> LLM[LLM Query Expansion]
    LLM --> Q1[Query Variant 1]
    LLM --> Q2[Query Variant 2]
    LLM --> Q3[Query Variant 3]
    
    Q1 --> Search1[Vector Search 1]
    Q2 --> Search2[Vector Search 2]
    Q3 --> Search3[Vector Search 3]
    
    Search1 --> Merge[Merge Results]
    Search2 --> Merge
    Search3 --> Merge
    
    Merge --> Rerank[Semantic Reranking]
    Rerank --> Final[Final Results]
```

### RAG Search Implementation

1. **Query Expansion**: LLM generates multiple query variants
2. **Parallel Search**: Execute searches for each variant
3. **Result Merging**: Combine and deduplicate results
4. **Reranking**: Semantic scoring for relevance
5. **Filtering**: User-specific document filtering

## Vector Database Schema

### ChromaDB Collection Structure

```typescript
interface DocumentMetadata {
  filename: string;        // Original filename
  source: string;          // User ID for isolation
  summary?: string;        // LLM-generated summary
  chunkIndex?: number;     // Chunk position in document
  pageNumber?: number;     // Page number (for PDFs)
}

interface Document {
  id: string;              // Unique document ID
  pageContent: string;     // Document text content
  metadata: DocumentMetadata;
  embedding: number[];     // Vector embedding
}
```

### Collection Configuration

- **Distance Metric**: Cosine similarity
- **Index Type**: HNSW (Hierarchical Navigable Small World)
- **Construction EF**: 100 (index building)
- **Search EF**: 10 (query search)

## Security Architecture

### Authentication Flow

```mermaid
sequenceDiagram
    participant Client
    participant API
    participant AuthService
    participant JWT
    
    Client->>API: POST /auth/token?id=userId
    API->>AuthService: Generate Token
    AuthService->>JWT: Sign Payload
    JWT-->>AuthService: Token
    AuthService-->>API: Token
    API-->>Client: { access_token, expires_in }
    
    Client->>API: Request with Bearer Token
    API->>JWT: Verify Token
    JWT-->>API: Valid/Invalid
    API-->>Client: Response
```

### User Isolation

- **Vector Database**: Documents filtered by `source` field (user ID)
- **File Storage**: User-specific temporary file paths
- **Token Validation**: JWT contains user ID for authorization
- **CORS**: Restricted to allowed origins

## Performance Considerations

### Optimization Strategies

1. **Parallel Processing**
   - Document chunks processed in parallel
   - Multiple RAG queries executed concurrently
   - Async/await for non-blocking operations

2. **Caching**
   - LLM responses cached where appropriate
   - Vector search results cached for repeated queries
   - Template parsing cached

3. **Database Optimization**
   - HNSW index for fast similarity search
   - Batch document insertion
   - Connection pooling

4. **Resource Management**
   - Temporary file cleanup
   - Memory-efficient chunk processing
   - Connection retry logic

### Scalability

- **Horizontal Scaling**: Stateless API design allows multiple instances
- **Database Scaling**: ChromaDB supports distributed deployment
- **Load Balancing**: Can be placed behind reverse proxy
- **Async Processing**: Long-running tasks can be moved to queue system

## Error Handling

### Error Propagation

```mermaid
graph TD
    Error[Error Occurs] --> Catch[Catch in Service]
    Catch --> Log[Log Error]
    Log --> Custom{Custom Exception?}
    Custom -->|Yes| CustomEx[Custom Exception]
    Custom -->|No| NestEx[NestJS Exception]
    CustomEx --> Response[Error Response]
    NestEx --> Response
    Response --> Client[Client Receives Error]
```

### Error Types

- **ValidationError**: Invalid input data
- **FileProcessingError**: Document processing failures
- **LLMError**: LLM API failures
- **VectorDBError**: Database connection/query errors
- **AuthenticationError**: JWT validation failures

## Deployment Architecture

### Docker Compose Services

```mermaid
graph TB
    subgraph Docker["Docker Network"]
        App[Backend App<br/>Port 3000]
        Frontend[Frontend App<br/>Port 3001]
        ChromaDB[ChromaDB<br/>Port 8000]
    end
    
    Internet --> Frontend
    Frontend --> App
    App --> ChromaDB
    App --> External[External APIs]
```

### Service Communication

- **Frontend ↔ Backend**: HTTP/REST over Docker network
- **Backend ↔ ChromaDB**: HTTP API calls
- **Backend ↔ External APIs**: HTTPS requests
- **Internal Services**: Direct method calls (same process)

## Future Enhancements

1. **Queue System**: Move long-running tasks to background queue
2. **Caching Layer**: Redis for frequently accessed data
3. **Monitoring**: Application performance monitoring (APM)
4. **Logging**: Centralized logging with ELK stack
5. **Rate Limiting**: API rate limiting per user
6. **Webhooks**: Event-driven architecture for integrations

