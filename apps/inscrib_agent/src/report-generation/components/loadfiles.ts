import { Injectable } from '@nestjs/common';
import { AgentStateChannels } from '../components/shared-interfaces';
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { JSONLoader } from 'langchain/document_loaders/fs/json';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { ConfigService } from '@nestjs/config';
import { googleLLMService } from '../components/google';
import { VectorService } from '../../vector/vector.service';
import { v4 as uuidv4 } from 'uuid';

//load conversation files
// load and split the files
// load the files and split them into chunks
// summary the text and extract servral key words in the end
// send the data to the next step
@Injectable()
export class LoadfilesService {
  constructor(
    private readonly googleLLMService: googleLLMService,
    private readonly vectorService: VectorService,
    private readonly configService: ConfigService,
  ) {}

  //filetype check
  filetypeCheck(file) {
    if (file.endsWith('.docx')) {
      return new DocxLoader(file);
    } else if (file.endsWith('.pdf')) {
      return new PDFLoader(file);
    } else if (file.endsWith('.json')) {
      return new JSONLoader(file);
    } else if (file.endsWith('.txt')) {
      return new TextLoader(file);
    } else {
      return 'Unsupported file type';
    }
  }

  loadfiles = async (state: AgentStateChannels) => {
    const { DocsPath,userId } = state;
    let error;
    const loader = this.filetypeCheck(DocsPath);
    if (typeof loader === 'string') {
      throw new Error(loader);
    }
    const chunks = await loader.load();
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 2000,
      chunkOverlap: 100,
    });
    const texts = await splitter.splitDocuments(chunks);

    const processedTexts = await Promise.all(
      texts.map(async (textChunk) => {
        try {
          const text = textChunk.pageContent;
          const summaryText = await this.googleLLMService.summaryText(text);
            return {
            ...textChunk,
            metadata: {
              ...textChunk.metadata,
              summary: summaryText,
              userId: `${userId}-${uuidv4()}`,
            },
            };
        } catch (err) {
          console.error(err);
          return textChunk; // 返回原始块，不带总结
        }
      }),
    );
    //写入到向量数据库供以后搜索
    await this.vectorService.storeInChromaDBDirectly(processedTexts);
    return {
      ...state,
      Status: 'chunked',
      Chunks: processedTexts,
      Report: {},
      Error: error,
      MetaData: {
        ...state.MetaData,
        processingSteps: [...state.MetaData.processingSteps, 'document_loaded'],
      },
    };
  };
}