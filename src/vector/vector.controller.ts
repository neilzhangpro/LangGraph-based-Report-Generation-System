import { Controller,Get,Param,Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { Document } from "@langchain/core/documents";

//embedding model
const embeddings = new GoogleGenerativeAIEmbeddings({
    model: "text-embedding-004", // 768 dimensions
    taskType: TaskType.RETRIEVAL_DOCUMENT,
    title: "Document title",
  });


@ApiTags('vector')
@Controller('vector')
export class VectorController {
    constructor(private configService: ConfigService) {}

    @Post('/testAddVector')
    @ApiOperation({ summary: 'just a test for add vector' })
    async test(
        @Param('text') text: string,
        @Param('id') id: string
    ) {
        const vectorStore = new Chroma(embeddings, {
            collectionName: "a-test-collection",
            url: "http://34.136.34.37:8000", // Optional, will default to this value
            collectionMetadata: {
              "hnsw:space": "cosine",
            }, // Optional, can be used to specify the distance method of the embedding space https://docs.trychroma.com/usage-guide#changing-the-distance-function
          });
        let docs:Document = {
            pageContent: text,
            metadata: { source:"test"},
        }
        // Add a vector to the store
        await vectorStore.addDocuments([docs], {"ids":[id]}); // Add a vector to the store
    }

    @Get('/testGetVector')
    @ApiOperation({ summary: 'just a test for get vector' })
    async testGet(
        @Param('id') id: string,
        @Param('text') text: string
    ) {
        const vectorStore = new Chroma(embeddings, {
            collectionName: "a-test-collection",
            url: "http://34.136.34.37:8000", // Optional, will default to this value
            collectionMetadata: {
              "hnsw:space": "cosine",
            }, // Optional, can be used to specify the distance method of the embedding space https://docs.trychroma.com/usage-guide#changing-the-distance-function
          });
        const filter = { source: "test" };
        const similaritySearchResults = await vectorStore.similaritySearch(
            text,
            2,
            filter
          );
        let res = ""
        for (const doc of similaritySearchResults) {
        console.log(`* ${doc.pageContent} [${JSON.stringify(doc.metadata, null)}]`);
        res += `* ${doc.pageContent} [${JSON.stringify(doc.metadata, null)}]`
        }
        return res
    }
          
}
