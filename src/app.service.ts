import { Injectable } from '@nestjs/common';
import { YoutubeLoader } from 'langchain/document_loaders/web/youtube';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';

@Injectable()
export class AppService {
  async getHello(): Promise<string> {
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

    return 'Hello World!';
  }
}
