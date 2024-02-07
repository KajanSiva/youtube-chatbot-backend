import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { YoutubeLoader } from 'langchain/document_loaders/web/youtube';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { MemoryVectorStore } from 'langchain/vectorstores/memory';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { createHistoryAwareRetriever } from 'langchain/chains/history_aware_retriever';

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

    const retriever = vectorStore.asRetriever();

    const historyAwarePrompt = ChatPromptTemplate.fromMessages([
      new MessagesPlaceholder('chat_history'),
      ['user', '{input}'],
      [
        'user',
        'Given the above conversation, generate a search query to look up in order to get information relevant to the conversation',
      ],
    ]);

    const historyAwareRetrieverChain = await createHistoryAwareRetriever({
      llm: chatModel,
      retriever,
      rephrasePrompt: historyAwarePrompt,
    });

    const historyAwareRetrievalPrompt = ChatPromptTemplate.fromMessages([
      [
        'system',
        "Answer the user's questions based on the below context:\n\n{context}",
      ],
      new MessagesPlaceholder('chat_history'),
      ['user', '{input}'],
    ]);

    const historyAwareCombineDocsChain = await createStuffDocumentsChain({
      llm: chatModel,
      prompt: historyAwareRetrievalPrompt,
    });

    const conversationalRetrievalChain = await createRetrievalChain({
      retriever: historyAwareRetrieverChain,
      combineDocsChain: historyAwareCombineDocsChain,
    });

    const question = 'Donne-moi plus de détails sur le premier point.';

    const result = await conversationalRetrievalChain.invoke({
      chat_history: [
        new HumanMessage('Résume-moi les points les plus importants.'),
        new AIMessage(`Les points les plus importants sont les suivants:
        1. Les gens sont intéressés par les transformations personnelles et par les histoires qui montrent comment ces transformations ont eu lieu.
        2. On peut appliquer la structure narrative du monomythe, identifiée par Joseph Campbell, pour raconter une meilleure histoire.
        3. Le storytelling et la narration sont importants pour captiver l'audience et transmettre un message efficacement.
        4. Filmer les moments les plus difficiles et utiliser un bon montage sont des techniques pour créer une histoire engageante.
        5. Le storytelling peut être appliqué dans la vie quotidienne et dans la création de contenu sur les réseaux sociaux.
        6. Résumer les défis après coup n'est pas aussi intéressant que de montrer l'avancée du personnage et les difficultés qu'il rencontre.
        7. Il est important de raconter une histoire plutôt que de simplement expliquer des leçons apprises.`),
      ],
      input: question,
    });

    console.log(result.answer);

    return 'Hello World!';
  }
}
