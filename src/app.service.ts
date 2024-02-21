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

  async videoConversation(videoId: string, message: string): Promise<string> {
    const openAIApiKey = this.configService.get<string>('OPENAI_API_KEY');
    const pineconeIndexName = this.configService.get<string>('PINECONE_INDEX');

    if (!pineconeIndexName) {
      throw new Error('Pinecone index name is not set');
    }

    const pinecone = new Pinecone();
    const pineconeIndex = pinecone.Index(pineconeIndexName);

    const vectorStore = await PineconeStore.fromExistingIndex(
      new OpenAIEmbeddings(),
      { pineconeIndex },
    );

    const { historyAwareRetrieverChain, chatModel } = await prepareRetriever(
      openAIApiKey,
      vectorStore,
      videoId,
    );

    const result = await prompt(historyAwareRetrieverChain, chatModel, message);

    console.log(result.answer);

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

async function prepareRetriever(
  openAIApiKey: string | undefined,
  vectorStore: PineconeStore,
  videoId: string,
) {
  const chatModel = new ChatOpenAI({ openAIApiKey });

  const retriever = vectorStore.asRetriever(3, { source: videoId });

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
  return { historyAwareRetrieverChain, chatModel };
}

async function prompt(
  historyAwareRetrieverChain: Runnable<
    {
      input: string;
      chat_history: string | BaseMessage[];
    },
    DocumentInterface<Record<string, any>>[],
    RunnableConfig
  >,
  chatModel: ChatOpenAI<ChatOpenAICallOptions>,
  message: string,
) {
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

  const result = await conversationalRetrievalChain.invoke({
    chat_history: [],
    input: message,
  });
  return result;
}
