import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Trash2, CheckCheck } from "lucide-react";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { TEST_USER_ID } from "@shared/schema";
import type { Share } from "@shared/schema";

export default function Inbox() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: shares = [], isLoading } = useQuery<Share[]>({
    queryKey: ["/api/users", TEST_USER_ID, "inbox"],
  });

  const markReadMutation = useMutation({
    mutationFn: async (shareId: string) => {
      await apiRequest("PATCH", `/api/shares/${shareId}/read`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", TEST_USER_ID, "inbox"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (shareId: string) => {
      await apiRequest("DELETE", `/api/shares/${shareId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users", TEST_USER_ID, "inbox"] });
    },
  });

  const handleShareClick = (share: Share) => {
    if (!share.readAt) {
      markReadMutation.mutate(share.id);
    }

    // Navigate based on share type
    if (share.dishId && share.shareType === "dish") {
      // Would open dish detail modal - for now navigate to feed
      navigate("/feed");
    } else if (share.restaurantId && share.shareType === "restaurant") {
      navigate(`/restaurants/${share.restaurantId}`);
    } else if (share.sharedUserId && share.shareType === "user_profile") {
      navigate(`/profile/${share.sharedUserId}`);
    }
  };

  const getShareDescription = (share: Share): string => {
    switch (share.shareType) {
      case "dish":
        return "shared a dish with you";
      case "restaurant":
        return "shared a restaurant with you";
      case "user_profile":
        return "shared a profile with you";
      case "dish_instance":
        return "shared a dish photo with you";
      default:
        return "sent you something";
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const unreadCount = shares.filter((s) => !s.readAt).length;

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 p-4 bg-background border-b border-border">
        <h1 className="text-lg font-semibold">
          Inbox {unreadCount > 0 && `(${unreadCount})`}
        </h1>
      </div>

      <div className="flex-1 overflow-auto pb-20">
        {shares.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground">No messages yet</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {shares.map((share) => (
              <Card
                key={share.id}
                className={`cursor-pointer transition-colors hover:bg-muted ${
                  !share.readAt ? "border-primary" : ""
                }`}
                onClick={() => handleShareClick(share)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src="" />
                      <AvatarFallback>
                        {share.senderId.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          User {share.senderId.substring(0, 8)}
                        </p>
                        {!share.readAt && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {getShareDescription(share)}
                      </p>
                      {share.message && (
                        <p className="text-sm mt-2 p-2 bg-muted rounded">
                          {share.message}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(share.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {!share.readAt && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            markReadMutation.mutate(share.id);
                          }}
                        >
                          <CheckCheck className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm("Delete this share?")) {
                            deleteMutation.mutate(share.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
