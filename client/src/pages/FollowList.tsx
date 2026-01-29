import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, ArrowLeft } from "lucide-react";
import { FollowButton } from "@/components/FollowButton";
import type { UserFollow } from "@shared/schema";

type ListType = "followers" | "following";

export default function FollowList() {
  const { userId, type } = useParams<{ userId: string; type: ListType }>();
  const [, navigate] = useLocation();

  const { data: follows = [], isLoading } = useQuery<UserFollow[]>({
    queryKey: ["/api/users", userId, type],
    enabled: !!userId && !!type,
  });

  const title = type === "followers" ? "Followers" : "Following";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 flex items-center gap-3 p-4 bg-background border-b border-border">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/profile/${userId}`)}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">{title}</h1>
      </div>

      <div className="flex-1 overflow-auto pb-20">
        {follows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">
              {type === "followers" ? "No followers yet" : "Not following anyone yet"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {follows.map((follow) => {
              // Show the other user (follower if type=followers, following if type=following)
              const displayUserId = type === "followers" ? follow.followerId : follow.followingId;

              return (
                <div key={follow.id} className="flex items-center gap-3 p-4">
                  <Avatar
                    className="w-12 h-12 cursor-pointer"
                    onClick={() => navigate(`/profile/${displayUserId}`)}
                  >
                    <AvatarImage src="" />
                    <AvatarFallback>
                      {displayUserId.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => navigate(`/profile/${displayUserId}`)}
                  >
                    <p className="font-medium truncate">User {displayUserId.substring(0, 8)}</p>
                    <p className="text-sm text-muted-foreground truncate">@user{displayUserId.substring(0, 6)}</p>
                  </div>
                  <FollowButton userId={displayUserId} size="sm" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
