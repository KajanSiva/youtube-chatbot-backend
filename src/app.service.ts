/* eslint-disable @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { YoutubeLoader } from 'langchain/document_loaders/web/youtube';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import {
  ChatOpenAI,
  ChatOpenAICallOptions,
  OpenAIEmbeddings,
} from '@langchain/openai';
import { createStuffDocumentsChain } from 'langchain/chains/combine_documents';
import { createRetrievalChain } from 'langchain/chains/retrieval';
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from '@langchain/core/prompts';
import { AIMessage, BaseMessage, HumanMessage } from '@langchain/core/messages';
import { createHistoryAwareRetriever } from 'langchain/chains/history_aware_retriever';
import { Runnable, RunnableConfig } from '@langchain/core/runnables';
import { Document, DocumentInterface } from '@langchain/core/documents';
import { Index, Pinecone, RecordMetadata } from '@pinecone-database/pinecone';
import { PineconeStore } from '@langchain/pinecone';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  async getHello(): Promise<string> {
    // const openAIApiKey = this.configService.get<string>('OPENAI_API_KEY');
    // const pineconeIndexName = this.configService.get<string>('PINECONE_INDEX');

    // if (!pineconeIndexName) {
    //   throw new Error('Pinecone index name is not set');
    // }

    // const pinecone = new Pinecone();
    // const pineconeIndex = pinecone.Index(pineconeIndexName);

    // const vectorStore = await PineconeStore.fromExistingIndex(
    //   new OpenAIEmbeddings(),
    //   { pineconeIndex },
    // );

    // const { historyAwareRetrieverChain, chatModel } = await prepareRetriever(
    //   openAIApiKey,
    //   vectorStore,
    // );

    // const result = await prompt(historyAwareRetrieverChain, chatModel);

    // console.log(result.answer);

    return 'Hello World!';
  }

  async processYoutubeVideo(videoUrl: string): Promise<boolean> {
    const openAIApiKey = this.configService.get<string>('OPENAI_API_KEY');
    const pineconeIndexName = this.configService.get<string>('PINECONE_INDEX');

    if (!pineconeIndexName) {
      throw new Error('Pinecone index name is not set');
    }

    const pinecone = new Pinecone();
    const pineconeIndex = pinecone.Index(pineconeIndexName);

    const docs = await extractDataFromVideo(videoUrl);

    await createEmbeddings(openAIApiKey, docs, pineconeIndex);

    return true;
  }
}

async function extractDataFromVideo(videoUrl: string) {
  const loader = YoutubeLoader.createFromUrl(videoUrl, {
    language: 'fr',
    addVideoInfo: true,
  });

  const rawDocs = await loader.load();
  const docs = rawDocs.map((doc) => ({
    pageContent: doc.pageContent,
    metadata: { source: doc.metadata.source },
  }));

  const splitter = new RecursiveCharacterTextSplitter();
  const splittedDocs = await splitter.splitDocuments(docs);

  return splittedDocs;
}

async function createEmbeddings(
  openAIApiKey: string | undefined,
  docs: Document<Record<string, any>>[],
  pineconeIndex: Index<RecordMetadata>,
) {
  const embeddings = new OpenAIEmbeddings({ openAIApiKey });

  const vectorStore = await PineconeStore.fromDocuments(docs, embeddings, {
    pineconeIndex,
    maxConcurrency: 5,
  });

  return vectorStore;
}

// async function prepareRetriever(
//   openAIApiKey: string | undefined,
//   vectorStore: PineconeStore,
// ) {
//   const chatModel = new ChatOpenAI({ openAIApiKey });

//   const retriever = vectorStore.asRetriever();

//   const historyAwarePrompt = ChatPromptTemplate.fromMessages([
//     new MessagesPlaceholder('chat_history'),
//     ['user', '{input}'],
//     [
//       'user',
//       'Given the above conversation, generate a search query to look up in order to get information relevant to the conversation',
//     ],
//   ]);

//   const historyAwareRetrieverChain = await createHistoryAwareRetriever({
//     llm: chatModel,
//     retriever, // TODO: check why the Pinecone retriever is not working
//     rephrasePrompt: historyAwarePrompt,
//   });
//   return { historyAwareRetrieverChain, chatModel };
// }

// async function prompt(
//   historyAwareRetrieverChain: Runnable<
//     {
//       input: string;
//       chat_history: string | BaseMessage[];
//     },
//     DocumentInterface<Record<string, any>>[],
//     RunnableConfig
//   >,
//   chatModel: ChatOpenAI<ChatOpenAICallOptions>,
// ) {
//   const historyAwareRetrievalPrompt = ChatPromptTemplate.fromMessages([
//     [
//       'system',
//       "Answer the user's questions based on the below context:\n\n{context}",
//     ],
//     new MessagesPlaceholder('chat_history'),
//     ['user', '{input}'],
//   ]);

//   const historyAwareCombineDocsChain = await createStuffDocumentsChain({
//     llm: chatModel,
//     prompt: historyAwareRetrievalPrompt,
//   });

//   const conversationalRetrievalChain = await createRetrievalChain({
//     retriever: historyAwareRetrieverChain,
//     combineDocsChain: historyAwareCombineDocsChain,
//   });

//   const question = 'Donne-moi plus de détails sur le premier point.';

//   const result = await conversationalRetrievalChain.invoke({
//     chat_history: [
//       new HumanMessage('Résume-moi les points les plus importants.'),
//       new AIMessage(`Les points les plus importants sont les suivants:
//         1. Les gens sont intéressés par les transformations personnelles et par les histoires qui montrent comment ces transformations ont eu lieu.
//         2. On peut appliquer la structure narrative du monomythe, identifiée par Joseph Campbell, pour raconter une meilleure histoire.
//         3. Le storytelling et la narration sont importants pour captiver l'audience et transmettre un message efficacement.
//         4. Filmer les moments les plus difficiles et utiliser un bon montage sont des techniques pour créer une histoire engageante.
//         5. Le storytelling peut être appliqué dans la vie quotidienne et dans la création de contenu sur les réseaux sociaux.
//         6. Résumer les défis après coup n'est pas aussi intéressant que de montrer l'avancée du personnage et les difficultés qu'il rencontre.
//         7. Il est important de raconter une histoire plutôt que de simplement expliquer des leçons apprises.`),
//     ],
//     input: question,
//   });
//   return result;
// }
