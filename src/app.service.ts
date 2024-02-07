import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { YoutubeLoader } from 'langchain/document_loaders/web/youtube';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  async getHello(): Promise<string> {
    const openAIApiKey = this.configService.get<string>('OPENAI_API_KEY');
    console.log('openAIApiKey: ', openAIApiKey);

    const videoUrl = 'https://www.youtube.com/watch?v=Kxe8VxdtrGw&t=712s';
    const loader = YoutubeLoader.createFromUrl(videoUrl, {
      language: 'fr',
      addVideoInfo: true,
    });

    const docs = await loader.load();

    const splitter = new RecursiveCharacterTextSplitter();
    const splittedDocs = await splitter.splitDocuments(docs);

    console.log(docs[0].pageContent.length);
    console.log(splittedDocs.length);
    console.log(splittedDocs[0].pageContent.length);

    const embeddings = new OpenAIEmbeddings({ openAIApiKey });

    const vectorStore = await MemoryVectorStore.fromDocuments(
      splittedDocs,
      embeddings,
    );

    return 'Hello World!';
  }
}
