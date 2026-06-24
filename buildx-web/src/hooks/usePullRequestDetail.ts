import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  fetchMergePreview,
  fetchPullRequestByNumber,
  fetchPullRequestReviews,
  type MergePreview,
  type PullRequest,
  type PullRequestReview,
} from "../api/pullRequests";

export function usePullRequestDetail(projectPath: string) {
  const { request } = useParams<{ request: string }>();
  const navigate = useNavigate();
  const [pr, setPr] = useState<PullRequest | null>(null);
  const [reviews, setReviews] = useState<PullRequestReview[]>([]);
  const [mergePreview, setMergePreview] = useState<MergePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!request) {
      return;
    }
    const number = Number(request);
    if (!Number.isFinite(number)) {
      setError("Invalid pull request number");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const loaded = await fetchPullRequestByNumber(projectPath, number);
      if (!loaded) {
        navigate(`/${projectPath}/~pulls/${request}/invalid`, { replace: true });
        return;
      }
      setPr(loaded);
      const [reviewList, preview] = await Promise.all([
        fetchPullRequestReviews(loaded.id),
        loaded.status === "OPEN" ? fetchMergePreview(loaded.id) : Promise.resolve(null),
      ]);
      setReviews(reviewList);
      setMergePreview(preview);
    } catch (err) {
      setError((err as { message?: string }).message ?? "Failed to load pull request");
    } finally {
      setLoading(false);
    }
  }, [navigate, projectPath, request]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    request: request ?? "",
    pr,
    reviews,
    mergePreview,
    loading,
    error,
    reload: load,
    setError,
  };
}
