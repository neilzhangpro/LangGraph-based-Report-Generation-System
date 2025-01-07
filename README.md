## Ironmin.ai
This repository contains the backend API of the AI system and a frontend call example:
- apps/inscrib_agent: This is the backend of the AI system
- front-demo/inscrib_api_demo: This is a frontend call example

### User Guide
- Clone the repository
```
git clone https://github.com/neilzhangpro/ironmind-LLM.git
```
- Install Docker and Docker Compose on the server
- Modify docker-compose-google.yml
```
frontend:
  build:
    context: ./front-demo/inscrib_api_demo
    dockerfile: Dockerfile
    args:
    - NEXT_PUBLIC_API_URL=http://localhost:3002  # For browser access use localhost
    - NEXT_SERVER_API_URL=http://app:3000        # For server-side access use container name
  restart: always
  ports:
    - "3001:3001"
  environment:
    - PORT=3001
    - NEXT_PUBLIC_API_URL=http://localhost:3002    # For browser use
    - NEXT_SERVER_API_URL=http://app:3000          # For server use
    - NODE_ENV=production
  networks:
    - app-network
```
Change the URL of NEXT_PUBLIC_API_URL to an accessible domain address
- Start using Docker Compose
```
docker-compose -f docker-compose-google.yml up -d --build
```
## 202501 Optimization
- Fixed LLM call source to gemini
- Added RAG multi-query optimization, which will refer to the user's uploaded professional materials when writing reports
- Added other measures to improve report quality
- Modified the report section modification interface function, so that it can also refer to professional knowledge bases or the internet
- We proudly use the powerful ***Gemini 2.0 Flash*** model!

## System Integration
- Uploaded audio script files must be in .txt, .pdx, or .docx format
- The audio file must explicitly state the patient's name, doctor's title, and consultation time at the beginning, otherwise, the report generation may produce hallucinations.
- The report template file is located at front-demo/inscrib_api_demo/public/01.json (note that the description field is a prompt field, and writing requirements for that part can be added)
- API address: http://localhost:8000/api