## Status
WORK IN PROGRESS

## Description
This is POC made for an educative purpose.
The goal is to create a small chatbot that can allow users to ask questions about the content of a Youtube video.

## Remaining work
- Use a real vector store, instead of the memory one.
- Store the video id alongside the embeddings, to be able to filter them properly in the retrieval phase.
- Create the frontend repository
- Create a dedicated endpoint to trigger the data fetching phase.
- Create a server side event mechanism to give the video fetching status.
- Create dedicated endpoints to manage the chat history for a given video.
- Manage user accounts.

## Investigation points
- What memory mechanism should I use to store the chat history?

## Installation

```bash
$ yarn install
```

## Running the app

```bash
# development
$ yarn run start

# watch mode
$ yarn run start:dev
```

