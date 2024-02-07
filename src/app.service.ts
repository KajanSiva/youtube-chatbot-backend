import { Injectable } from '@nestjs/common';
import { YoutubeLoader } from 'langchain/document_loaders/web/youtube';

@Injectable()
export class AppService {
  async getHello(): Promise<string> {
    const videoUrl = 'https://www.youtube.com/watch?v=Kxe8VxdtrGw&t=712s';
    const loader = YoutubeLoader.createFromUrl(videoUrl, {
      language: 'fr',
      addVideoInfo: true,
    });

    const docs = await loader.load();

    console.log(docs);

    return 'Hello World!';
  }
}
