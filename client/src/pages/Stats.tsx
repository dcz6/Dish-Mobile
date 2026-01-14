import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, UtensilsCrossed, Receipt, Store, Star, TrendingUp, ThumbsUp, Circle, Minus } from "lucide-react";

interface StatsData {
  totalDishes: number;
  totalReceipts: number;
  totalRestaurants: number;
  totalSpend: number;
  ratingBreakdown: Record<string, number>;
  dishesPerMonth: Array<{ month: string; count: number }>;
}

const ratingConfig: Record<string, { label: string; icon: typeof Star; color: string; bgColor: string }> = {
  "Elite": { label: "Elite", icon: Star, color: "text-amber-500", bgColor: "bg-amber-500" },
  "Would order again": { label: "Order again", icon: ThumbsUp, color: "text-green-500", bgColor: "bg-green-500" },
  "Should try once": { label: "Try once", icon: Circle, color: "text-blue-500", bgColor: "bg-blue-500" },
  "Not for me": { label: "Not for me", icon: Minus, color: "text-muted-foreground", bgColor: "bg-muted-foreground" },
};

export default function Stats() {
  const { data: stats, isLoading } = useQuery<StatsData>({
    queryKey: ["/api/stats"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-6 text-center">
        <TrendingUp className="w-12 h-12 text-muted-foreground" />
        <p className="text-muted-foreground">No data to display yet</p>
      </div>
    );
  }

  const maxRatingCount = Math.max(...Object.values(stats.ratingBreakdown), 1);
  const maxMonthlyCount = Math.max(...stats.dishesPerMonth.map((d) => d.count), 1);

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 p-4 bg-background border-b border-border">
        <h1 className="text-lg font-semibold">Statistics</h1>
      </div>

      <div className="flex-1 overflow-auto pb-20">
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4 flex flex-col items-center">
                <UtensilsCrossed className="w-6 h-6 text-primary mb-2" />
                <div className="text-3xl font-bold">{stats.totalDishes}</div>
                <div className="text-sm text-muted-foreground">Dishes</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center">
                <Receipt className="w-6 h-6 text-primary mb-2" />
                <div className="text-3xl font-bold">{stats.totalReceipts}</div>
                <div className="text-sm text-muted-foreground">Visits</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center">
                <Store className="w-6 h-6 text-primary mb-2" />
                <div className="text-3xl font-bold">{stats.totalRestaurants}</div>
                <div className="text-sm text-muted-foreground">Restaurants</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex flex-col items-center">
                <TrendingUp className="w-6 h-6 text-primary mb-2" />
                <div className="text-3xl font-bold">${stats.totalSpend.toFixed(0)}</div>
                <div className="text-sm text-muted-foreground">Total Spend</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Ratings Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(ratingConfig).map(([rating, config]) => {
                const count = stats.ratingBreakdown[rating] || 0;
                const Icon = config.icon;
                const percentage = maxRatingCount > 0 ? (count / maxRatingCount) * 100 : 0;

                return (
                  <div key={rating} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${config.color}`} />
                        <span>{config.label}</span>
                      </div>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${config.bgColor} rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {stats.dishesPerMonth.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Dishes Per Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stats.dishesPerMonth.slice(-6).map((item) => (
                    <div key={item.month} className="flex items-center gap-3">
                      <div className="w-16 text-sm text-muted-foreground">
                        {item.month}
                      </div>
                      <div className="flex-1 h-6 bg-muted rounded overflow-hidden">
                        <div
                          className="h-full bg-primary rounded transition-all duration-500"
                          style={{ width: `${(item.count / maxMonthlyCount) * 100}%` }}
                        />
                      </div>
                      <div className="w-8 text-sm font-medium text-right">
                        {item.count}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
