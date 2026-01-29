import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Search as SearchIcon } from "lucide-react";
import { FollowButton } from "@/components/FollowButton";
import { BookmarkButton } from "@/components/BookmarkButton";
import { useLocation } from "wouter";
import type { User, Dish, Restaurant } from "@shared/schema";
import { useState as useStateWithDelay } from "react";
import { DishDetailModal } from "@/components/DishDetailModal";

export default function Search() {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedDishId, setSelectedDishId] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: users = [], isLoading: loadingUsers } = useQuery<User[]>({
    queryKey: ["/api/search/users", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return [];
      const response = await fetch(`/api/search/users?q=${encodeURIComponent(debouncedQuery)}`);
      if (!response.ok) throw new Error("Failed to search users");
      return response.json();
    },
    enabled: debouncedQuery.length > 0,
  });

  const { data: dishes = [], isLoading: loadingDishes } = useQuery<Dish[]>({
    queryKey: ["/api/search/dishes", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return [];
      const response = await fetch(`/api/search/dishes?q=${encodeURIComponent(debouncedQuery)}`);
      if (!response.ok) throw new Error("Failed to search dishes");
      return response.json();
    },
    enabled: debouncedQuery.length > 0,
  });

  const { data: restaurants = [], isLoading: loadingRestaurants } = useQuery<Restaurant[]>({
    queryKey: ["/api/search/restaurants", debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return [];
      const response = await fetch(`/api/search/restaurants?q=${encodeURIComponent(debouncedQuery)}`);
      if (!response.ok) throw new Error("Failed to search restaurants");
      return response.json();
    },
    enabled: debouncedQuery.length > 0,
  });

  const isSearching = loadingUsers || loadingDishes || loadingRestaurants;

  return (
    <div className="flex flex-col h-full">
      {/* Header with search input */}
      <div className="sticky top-0 z-10 p-4 bg-background border-b border-border space-y-4">
        <h1 className="text-lg font-semibold">Search</h1>
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search users, dishes, or restaurants..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Search results */}
      <div className="flex-1 overflow-auto pb-20">
        {!debouncedQuery ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <SearchIcon className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Search for users, dishes, or restaurants
            </p>
          </div>
        ) : (
          <Tabs defaultValue="all" className="flex flex-col">
            <TabsList className="mx-4 mt-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="users">Users ({users.length})</TabsTrigger>
              <TabsTrigger value="dishes">Dishes ({dishes.length})</TabsTrigger>
              <TabsTrigger value="restaurants">Restaurants ({restaurants.length})</TabsTrigger>
            </TabsList>

            {/* All tab */}
            <TabsContent value="all" className="mt-4">
              <div className="space-y-6 px-4">
                {/* Users section */}
                {users.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">Users</h3>
                    <div className="divide-y divide-border">
                      {users.slice(0, 3).map((user) => (
                        <div key={user.id} className="flex items-center gap-3 py-3">
                          <Avatar
                            className="w-12 h-12 cursor-pointer"
                            onClick={() => navigate(`/profile/${user.id}`)}
                          >
                            <AvatarImage src={user.avatarUrl || ""} />
                            <AvatarFallback>
                              {user.username.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className="flex-1 min-w-0 cursor-pointer"
                            onClick={() => navigate(`/profile/${user.id}`)}
                          >
                            <p className="font-medium truncate">
                              {user.displayName || user.username}
                            </p>
                            <p className="text-sm text-muted-foreground truncate">
                              @{user.username}
                            </p>
                          </div>
                          <FollowButton userId={user.id} size="sm" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Dishes section */}
                {dishes.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">Dishes</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {dishes.slice(0, 6).map((dish) => (
                        <button
                          key={dish.id}
                          onClick={() => setSelectedDishId(dish.id)}
                          className="relative aspect-square overflow-hidden bg-muted flex items-center justify-center p-2"
                        >
                          <p className="text-xs text-center line-clamp-2">{dish.name}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Restaurants section */}
                {restaurants.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                      Restaurants
                    </h3>
                    <div className="divide-y divide-border">
                      {restaurants.slice(0, 3).map((restaurant) => (
                        <button
                          key={restaurant.id}
                          onClick={() => navigate(`/restaurants/${restaurant.id}`)}
                          className="w-full flex items-center justify-between py-3 text-left hover:bg-muted transition-colors rounded px-2"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium">{restaurant.name}</p>
                            {restaurant.address && (
                              <p className="text-sm text-muted-foreground truncate">
                                {restaurant.address}
                              </p>
                            )}
                          </div>
                          <BookmarkButton
                            type="restaurant"
                            itemId={restaurant.id}
                            size="icon"
                            variant="ghost"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {users.length === 0 && dishes.length === 0 && restaurants.length === 0 && (
                  <p className="text-center text-muted-foreground py-12">
                    No results found for "{debouncedQuery}"
                  </p>
                )}
              </div>
            </TabsContent>

            {/* Users tab */}
            <TabsContent value="users" className="mt-4">
              <div className="divide-y divide-border px-4">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center gap-3 py-3">
                    <Avatar
                      className="w-12 h-12 cursor-pointer"
                      onClick={() => navigate(`/profile/${user.id}`)}
                    >
                      <AvatarImage src={user.avatarUrl || ""} />
                      <AvatarFallback>
                        {user.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => navigate(`/profile/${user.id}`)}
                    >
                      <p className="font-medium truncate">
                        {user.displayName || user.username}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">
                        @{user.username}
                      </p>
                    </div>
                    <FollowButton userId={user.id} size="sm" />
                  </div>
                ))}
                {users.length === 0 && (
                  <p className="text-center text-muted-foreground py-12">No users found</p>
                )}
              </div>
            </TabsContent>

            {/* Dishes tab */}
            <TabsContent value="dishes" className="mt-4 px-4">
              {dishes.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No dishes found</p>
              ) : (
                <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {dishes.map((dish) => (
                    <button
                      key={dish.id}
                      onClick={() => setSelectedDishId(dish.id)}
                      className="relative aspect-square overflow-hidden bg-muted flex items-center justify-center p-2"
                    >
                      <p className="text-xs text-center line-clamp-2">{dish.name}</p>
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Restaurants tab */}
            <TabsContent value="restaurants" className="mt-4">
              <div className="divide-y divide-border px-4">
                {restaurants.map((restaurant) => (
                  <button
                    key={restaurant.id}
                    onClick={() => navigate(`/restaurants/${restaurant.id}`)}
                    className="w-full flex items-center justify-between py-3 text-left hover:bg-muted transition-colors rounded px-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{restaurant.name}</p>
                      {restaurant.address && (
                        <p className="text-sm text-muted-foreground truncate">
                          {restaurant.address}
                        </p>
                      )}
                    </div>
                    <BookmarkButton
                      type="restaurant"
                      itemId={restaurant.id}
                      size="icon"
                      variant="ghost"
                    />
                  </button>
                ))}
                {restaurants.length === 0 && (
                  <p className="text-center text-muted-foreground py-12">No restaurants found</p>
                )}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Dish detail modal */}
      {selectedDishId && (
        <DishDetailModal
          dishId={selectedDishId}
          open={!!selectedDishId}
          onClose={() => setSelectedDishId(null)}
        />
      )}
    </div>
  );
}
