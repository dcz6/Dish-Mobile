import { Button } from "@/components/ui/button";
import { Star, ThumbsUp, Circle, Minus } from "lucide-react";
import type { Rating } from "@shared/schema";

const ratings: { value: Rating; label: string; icon: typeof Star; color: string }[] = [
  { value: "Elite", label: "Elite", icon: Star, color: "text-amber-500" },
  { value: "Would order again", label: "Order again", icon: ThumbsUp, color: "text-green-500" },
  { value: "Should try once", label: "Try once", icon: Circle, color: "text-blue-500" },
  { value: "Not for me", label: "Not for me", icon: Minus, color: "text-muted-foreground" },
];

interface RatingButtonsProps {
  value?: string | null;
  onChange: (rating: Rating) => void;
  compact?: boolean;
}

export function RatingButtons({ value, onChange, compact = false }: RatingButtonsProps) {
  return (
    <div className={`grid ${compact ? "grid-cols-4 gap-1" : "grid-cols-2 gap-2"}`}>
      {ratings.map((rating) => {
        const Icon = rating.icon;
        const isSelected = value === rating.value;
        
        return (
          <Button
            key={rating.value}
            variant={isSelected ? "default" : "outline"}
            size={compact ? "sm" : "default"}
            onClick={() => onChange(rating.value)}
            data-testid={`rating-${rating.value.toLowerCase().replace(/\s+/g, "-")}`}
            className={`flex items-center gap-2 ${
              isSelected ? "" : "hover-elevate"
            } ${compact ? "text-xs" : ""}`}
          >
            <Icon className={`w-4 h-4 ${isSelected ? "" : rating.color}`} />
            {!compact && <span>{rating.label}</span>}
          </Button>
        );
      })}
    </div>
  );
}

export function RatingBadge({ rating }: { rating?: string | null }) {
  if (!rating) return null;
  
  const ratingInfo = ratings.find((r) => r.value === rating);
  if (!ratingInfo) return null;
  
  const Icon = ratingInfo.icon;
  
  return (
    <div
      className={`absolute top-1 right-1 p-1.5 rounded-full bg-background/90 backdrop-blur-sm ${ratingInfo.color}`}
      title={rating}
    >
      <Icon className="w-3.5 h-3.5" />
    </div>
  );
}
