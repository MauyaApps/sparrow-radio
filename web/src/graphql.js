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
    stream(id: $id) { id name kind contentType category conversationTopic description sourceUrl listeners rating ownerId status createdAt }
  }`;
export const CREATE_STREAM = gql`
  mutation CreateStream($input: CreateStreamInput!) {
    createStream(input: $input) { stream { id } warnings }
  }`;

export const UPDATE_STREAM = gql`
  mutation UpdateStream($id: ID!, $sourceUrl: String, $description: String) {
    updateStream(id: $id, sourceUrl: $sourceUrl, description: $description) { id status listeners }
  }`;

export const DELETE_STREAM = gql`
  mutation DeleteStream($id: ID!) { deleteStream(id: $id) }`;

export const SET_STREAM_STATUS = gql`
  mutation SetStreamStatus($id: ID!, $status: StreamStatus!) {
    setStreamStatus(id: $id, status: $status) { id status listeners }
  }`;

export const RATE_STREAM = gql`
  mutation RateStream($id: ID!, $value: Int!) {
    rateStream(id: $id, value: $value) { id rating }
  }`;

export const JOIN_STREAM = gql`
  mutation JoinStream($id: ID!, $clientId: String!) { joinStream(id: $id, clientId: $clientId) { id listeners } }`;

export const HEARTBEAT_STREAM = gql`
  mutation HeartbeatStream($id: ID!, $clientId: String!) { heartbeatStream(id: $id, clientId: $clientId) { id listeners } }`;

export const LEAVE_STREAM = gql`
  mutation LeaveStream($id: ID!, $clientId: String!) { leaveStream(id: $id, clientId: $clientId) { id listeners } }`;

export const CHAT_MESSAGES = gql`
  query ChatMessages($streamId: ID!) {
    chatMessages(streamId: $streamId) { id streamId userId body createdAt }
  }`;

export const SEND_CHAT_MESSAGE = gql`
  mutation SendChatMessage($streamId: ID!, $body: String!) {
    sendChatMessage(streamId: $streamId, body: $body) { id body createdAt userId }
  }`;

export const DELETE_CHAT_MESSAGE = gql`
  mutation DeleteChatMessage($id: ID!) { deleteChatMessage(id: $id) }`;

export const REPORT_STREAM = gql`
  mutation ReportStream($streamId: ID!, $reason: String!) {
    reportStream(streamId: $streamId, reason: $reason)
  }`;
