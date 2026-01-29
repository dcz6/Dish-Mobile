import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Bookmark } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { TEST_USER_ID } from "@shared/schema";
import { useState } from "react";

interface BookmarkButtonProps {
  type: "dish" | "restaurant";
  itemId: string;
  initialBookmarked?: boolean;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg" | "icon";
  showLabel?: boolean;
}

export function BookmarkButton({
  type,
  itemId,
  initialBookmarked = false,
  variant = "ghost",
  size = "icon",
  showLabel = false,
}: BookmarkButtonProps) {
  const queryClient = useQueryClient();
  const [optimisticBookmarked, setOptimisticBookmarked] = useState(initialBookmarked);

  const endpoint = type === "dish" ? "dishes" : "restaurants";

  const { data: bookmarkStatus } = useQuery({
    queryKey: ["/api/users", TEST_USER_ID, "bookmarks", endpoint, itemId, "status"],
    select: (data: any) => data.isBookmarked,
    initialData: { isBookmarked: initialBookmarked },
  });

  const bookmarkMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/users/${TEST_USER_ID}/bookmarks/${endpoint}`, {
        [`${type}Id`]: itemId,
      });
    },
    onMutate: () => {
      setOptimisticBookmarked(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", TEST_USER_ID, "bookmarks"] });
    },
    onError: () => {
      setOptimisticBookmarked(false);
    },
  });

  const unbookmarkMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/users/${TEST_USER_ID}/bookmarks/${endpoint}/${itemId}`);
    },
    onMutate: () => {
      setOptimisticBookmarked(false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", TEST_USER_ID, "bookmarks"] });
    },
    onError: () => {
      setOptimisticBookmarked(true);
    },
  });

  const handleToggleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (optimisticBookmarked) {
      unbookmarkMutation.mutate();
    } else {
      bookmarkMutation.mutate();
    }
  };

  const isBookmarked = optimisticBookmarked;
  const isPending = bookmarkMutation.isPending || unbookmarkMutation.isPending;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggleBookmark}
      disabled={isPending}
      className={showLabel ? "gap-2" : ""}
    >
      <Bookmark
        className={`w-5 h-5 transition-all ${
          isBookmarked ? "fill-primary" : ""
        }`}
      />
      {showLabel && (isBookmarked ? "Saved" : "Save")}
    </Button>
  );
}
