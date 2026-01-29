import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BottomNav } from "@/components/BottomNav";
import Capture from "@/pages/Capture";
import Dishes from "@/pages/Dishes";
import Receipts from "@/pages/Receipts";
import ReceiptDetail from "@/pages/ReceiptDetail";
import Stats from "@/pages/Stats";
import Feed from "@/pages/Feed";
import Search from "@/pages/Search";
import Profile from "@/pages/Profile";
import Inbox from "@/pages/Inbox";
import FollowList from "@/pages/FollowList";
import RestaurantDetail from "@/pages/RestaurantDetail";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      {/* Main navigation routes */}
      <Route path="/" component={Capture} />
      <Route path="/feed" component={Feed} />
      <Route path="/search" component={Search} />
      <Route path="/inbox" component={Inbox} />
      <Route path="/profile/:userId?" component={Profile} />

      {/* Legacy routes - keep for backwards compatibility */}
      <Route path="/dishes" component={Dishes} />
      <Route path="/receipts" component={Receipts} />
      <Route path="/receipts/:id" component={ReceiptDetail} />
      <Route path="/stats" component={Stats} />

      {/* Social feature routes */}
      <Route path="/users/:userId/:type" component={FollowList} />
      <Route path="/restaurants/:id" component={RestaurantDetail} />

      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="flex flex-col h-screen bg-background">
          <main className="flex-1 overflow-hidden pb-16">
            <Router />
          </main>
          <BottomNav />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
