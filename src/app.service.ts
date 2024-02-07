import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { YoutubeLoader } from 'langchain/document_loaders/web/youtube';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import { ChatPromptTemplate } from '@langchain/core/prompts';

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

    const chatModel = new ChatOpenAI({ openAIApiKey });

    const prompt =
      ChatPromptTemplate.fromTemplate(`Answer the following question based only on the provided context:

    <context>
    {context}
    </context>
    
    Question: {input}`);

    const documentChain = await createStuffDocumentsChain({
      llm: chatModel,
      prompt,
    });

    const retriever = vectorStore.asRetriever();

    const retrievalChain = await createRetrievalChain({
      combineDocsChain: documentChain,
      retriever,
    });

    const question = 'Résume-moi les points les plus importants.';

    const result = await retrievalChain.invoke({ input: question });

    console.log(result.answer);

    return 'Hello World!';
  }
}
