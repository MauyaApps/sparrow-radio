import { gql } from "@apollo/client";

export const STREAMS = gql`
  query Streams($contentType: ContentType, $category: Category, $sort: StreamSort, $page: Int) {
    streams(contentType: $contentType, category: $category, sort: $sort, page: $page, pageSize: 12) {
      total page pageSize
      items { id name kind contentType category conversationTopic description listeners rating }
    }
  }`;
export const STREAM = gql`
  query Stream($id: ID!) {
    stream(id: $id) { id name kind contentType category conversationTopic description sourceUrl listeners rating createdAt }
  }`;
export const CREATE_STREAM = gql`
  mutation CreateStream($input: CreateStreamInput!) {
    createStream(input: $input) { stream { id } warnings }
  }`;
