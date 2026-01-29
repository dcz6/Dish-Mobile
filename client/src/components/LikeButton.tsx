import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { TEST_USER_ID } from "@shared/schema";
import { useState } from "react";

interface LikeButtonProps {
  photoId: string;
  initialLiked?: boolean;
  initialCount?: number;
  showCount?: boolean;
  size?: "sm" | "default" | "lg" | "icon";
}

export function LikeButton({
  photoId,
  initialLiked = false,
  initialCount = 0,
  showCount = true,
  size = "default",
}: LikeButtonProps) {
  const queryClient = useQueryClient();
  const [optimisticLiked, setOptimisticLiked] = useState(initialLiked);
  const [optimisticCount, setOptimisticCount] = useState(initialCount);

  const { data: likeStatus } = useQuery({
    queryKey: ["/api/photos", photoId, "liked-by", TEST_USER_ID],
    select: (data: any) => data.isLiked,
    initialData: { isLiked: initialLiked },
  });

  const { data: likeCount } = useQuery({
    queryKey: ["/api/photos", photoId, "likes", "count"],
    select: (data: any) => data.count,
    initialData: { count: initialCount },
  });

  const likeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/photos/${photoId}/like`, { userId: TEST_USER_ID });
    },
    onMutate: async () => {
      // Optimistic update
      setOptimisticLiked(true);
      setOptimisticCount((prev) => prev + 1);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photos", photoId, "liked-by"] });
      queryClient.invalidateQueries({ queryKey: ["/api/photos", photoId, "likes", "count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dish-photos"] });
    },
    onError: () => {
      // Revert optimistic update
      setOptimisticLiked(false);
      setOptimisticCount((prev) => Math.max(0, prev - 1));
    },
  });

  const unlikeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/photos/${photoId}/like/${TEST_USER_ID}`);
    },
    onMutate: async () => {
      // Optimistic update
      setOptimisticLiked(false);
      setOptimisticCount((prev) => Math.max(0, prev - 1));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/photos", photoId, "liked-by"] });
      queryClient.invalidateQueries({ queryKey: ["/api/photos", photoId, "likes", "count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dish-photos"] });
    },
    onError: () => {
      // Revert optimistic update
      setOptimisticLiked(true);
      setOptimisticCount((prev) => prev + 1);
    },
  });

  const handleToggleLike = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent onClick

    if (optimisticLiked) {
      unlikeMutation.mutate();
    } else {
      likeMutation.mutate();
    }
  };

  const isLiked = optimisticLiked;
  const count = optimisticCount;

  return (
    <Button
      variant="ghost"
      size={size}
      onClick={handleToggleLike}
      className={`gap-2 ${isLiked ? "text-red-500" : ""}`}
      disabled={likeMutation.isPending || unlikeMutation.isPending}
    >
      <Heart
        className={`w-5 h-5 transition-all ${
          isLiked ? "fill-red-500" : ""
        }`}
      />
      {showCount && <span className="text-sm">{count}</span>}
    </Button>
  );
}
