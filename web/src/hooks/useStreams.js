import { useQuery } from "@apollo/client";
import { STREAMS } from "../graphql";

export function useStreams({ contentType, category, sort, page }) {
  const { data, loading, error } = useQuery(STREAMS, {
    variables: { contentType: contentType || null, category: category || null, sort, page },
    fetchPolicy: "cache-and-network",
  });
  return { page: data?.streams, loading, error };
}
