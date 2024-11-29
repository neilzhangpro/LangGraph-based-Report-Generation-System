import { Injectable } from '@nestjs/common';
import { AgentStateChannels } from '../components/shared-interfaces';
import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';
import { JSONLoader } from 'langchain/document_loaders/fs/json';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { googleLLMService } from '../components/google';
import { VectorService } from '../../vector/vector.service';
import * as fs from 'fs/promises';

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
    const { UploadFile,userId,TemplatePath } = state;
    console.log('--------------------userId-------------------------------------');
    console.log(userId);
    let error;
    const loader = this.filetypeCheck(UploadFile);
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
              source: userId,
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
    //加载模板数据
    if(TemplatePath){
      let templateData = await fs.readFile(TemplatePath, 'utf-8');
      try {
        state.TemplatePath =templateData;
        } catch (err) {
        console.error('Error parsing template data:', err);
        throw new Error('Invalid format in template data');
        }
      }
    return {
      ...state,
      Status: 'chunked',
      Chunks: processedTexts,
      Report: {},
      Error: error,
      MetaData: {
        ...state.MetaData,
      },
    };
  };
}