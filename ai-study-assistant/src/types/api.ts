export type User = {
  id: number;
  username: string;
  email: string;
};

export type RegisterPayload = {
  username: string;
  email: string;
  password: string;
};

export type LoginPayload = {
  email: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: "bearer";
  user: User;
};

export type ApiErrorBody =
  | string
  | {
      error?: string;
      error_type?: string;
      detail?: string;
    }
  | {
      detail?: Array<{
        msg: string;
        loc?: Array<string | number>;
      }>;
    };

export type DashboardLatestUpload = {
  id: number;
  title: string;
  upload_date: string;
};

export type DashboardResponse = {
  total_documents: number;
  total_chats: number;
  total_summaries: number;
  latest_uploads: DashboardLatestUpload[];
};

export type DocumentListItem = {
  id: number;
  title: string;
  upload_date: string;
  file_size: number;
  extracted_text_length: number;
  summary_exists: boolean;
};

export type DocumentDetail = {
  id: number;
  title: string;
  file_path: string;
  upload_date: string;
  summary: string | null;
  text_length: number;
  number_of_chunks: number | null;
};

export type UploadDocumentResponse = {
  message: string;
  document_id: number;
};

export type SummaryResponse = {
  message: string;
  document_id: number;
  summary: string;
};

export type ChatResponse = {
  answer: string;
  source_pages: number[];
  citations: string[];
  retrieved_chunks: Array<{
    page_number: number;
    chunk_preview: string;
    distance: number;
  }>;
};

export type ChatHistoryItem = {
  id: number;
  document_id: number;
  question: string;
  answer: string;
  created_at: string;
};
