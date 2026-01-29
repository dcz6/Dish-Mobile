import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { UserPlus, UserCheck } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { TEST_USER_ID } from "@shared/schema";
import { useState } from "react";

interface FollowButtonProps {
  userId: string;
  initialFollowing?: boolean;
  variant?: "default" | "outline" | "ghost";
  size?: "sm" | "default" | "lg";
  showIcon?: boolean;
}

export function FollowButton({
  userId,
  initialFollowing = false,
  variant = "default",
  size = "default",
  showIcon = true,
}: FollowButtonProps) {
  const queryClient = useQueryClient();
  const [optimisticFollowing, setOptimisticFollowing] = useState(initialFollowing);

  // Don't show button for self
  if (userId === TEST_USER_ID) return null;

  const { data: followStatus } = useQuery({
    queryKey: ["/api/users", TEST_USER_ID, "is-following", userId],
    select: (data: any) => data.isFollowing,
    initialData: { isFollowing: initialFollowing },
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/users/${TEST_USER_ID}/follow`, {
        followingId: userId,
      });
    },
    onMutate: () => {
      setOptimisticFollowing(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", TEST_USER_ID, "is-following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", TEST_USER_ID, "following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "followers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "follow-stats"] });
    },
    onError: () => {
      setOptimisticFollowing(false);
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/users/${TEST_USER_ID}/follow/${userId}`);
    },
    onMutate: () => {
      setOptimisticFollowing(false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", TEST_USER_ID, "is-following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", TEST_USER_ID, "following"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "followers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users", userId, "follow-stats"] });
    },
    onError: () => {
      setOptimisticFollowing(true);
    },
  });

  const handleToggleFollow = () => {
    if (optimisticFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  const isFollowing = optimisticFollowing;
  const isPending = followMutation.isPending || unfollowMutation.isPending;

  return (
    <Button
      variant={isFollowing ? "outline" : variant}
      size={size}
      onClick={handleToggleFollow}
      disabled={isPending}
      className="gap-2"
    >
      {showIcon && (isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />)}
      {isFollowing ? "Following" : "Follow"}
    </Button>
  );
}
