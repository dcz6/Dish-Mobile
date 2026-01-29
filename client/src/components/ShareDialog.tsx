import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Send } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { TEST_USER_ID } from "@shared/schema";
import type { User, ShareType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface ShareDialogProps {
  open: boolean;
  onClose: () => void;
  shareType: ShareType;
  dishId?: string;
  dishInstanceId?: string;
  restaurantId?: string;
  sharedUserId?: string;
}

export function ShareDialog({
  open,
  onClose,
  shareType,
  dishId,
  dishInstanceId,
  restaurantId,
  sharedUserId,
}: ShareDialogProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState("");

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    enabled: open,
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      const promises = Array.from(selectedUsers).map((recipientId) =>
        apiRequest("POST", "/api/shares", {
          senderId: TEST_USER_ID,
          recipientId,
          shareType,
          dishId,
          dishInstanceId,
          restaurantId,
          sharedUserId,
          message: message || undefined,
        })
      );
      await Promise.all(promises);
    },
    onSuccess: () => {
      toast({
        title: "Shared successfully",
        description: `Sent to ${selectedUsers.size} ${selectedUsers.size === 1 ? "person" : "people"}`,
      });
      onClose();
      setSelectedUsers(new Set());
      setMessage("");
    },
    onError: () => {
      toast({
        title: "Failed to share",
        description: "Please try again",
        variant: "destructive",
      });
    },
  });

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleShare = () => {
    if (selectedUsers.size === 0) {
      toast({
        title: "No recipients selected",
        description: "Please select at least one person to share with",
        variant: "destructive",
      });
      return;
    }
    shareMutation.mutate();
  };

  // Filter out current user
  const otherUsers = users.filter((u) => u.id !== TEST_USER_ID);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Message input */}
          <Textarea
            placeholder="Add a message (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />

          {/* User list */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : otherUsers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No users to share with
              </p>
            ) : (
              otherUsers.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selectedUsers.has(user.id)}
                    onCheckedChange={() => toggleUser(user.id)}
                  />
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={user.avatarUrl || ""} />
                    <AvatarFallback>
                      {user.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {user.displayName || user.username}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      @{user.username}
                    </p>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleShare}
            disabled={shareMutation.isPending || selectedUsers.size === 0}
          >
            {shareMutation.isPending && (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            )}
            <Send className="w-4 h-4 mr-2" />
            Send to {selectedUsers.size}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
