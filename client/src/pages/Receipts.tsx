import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Receipt, ChevronRight, MapPin, Calendar, DollarSign } from "lucide-react";
import type { ReceiptWithDetails } from "@shared/schema";

export default function Receipts() {
  const { data: receipts = [], isLoading } = useQuery<ReceiptWithDetails[]>({
    queryKey: ["/api/receipts"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="sticky top-0 z-10 p-4 bg-background border-b border-border">
          <h1 className="text-lg font-semibold">My Visits</h1>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 gap-4 p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Receipt className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">No receipts yet</h2>
          <p className="text-muted-foreground max-w-xs">
            Capture a receipt from the Capture tab to start tracking your restaurant visits
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 z-10 p-4 bg-background border-b border-border">
        <h1 className="text-lg font-semibold">My Visits</h1>
      </div>

      <div className="flex-1 overflow-auto pb-20">
        <div className="p-4 space-y-3">
          {receipts.map((receipt) => (
            <Link key={receipt.id} href={`/receipts/${receipt.id}`}>
              <Card className="hover-elevate cursor-pointer">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">
                        {receipt.restaurant.name}
                      </h3>
                      {receipt.restaurant.address && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{receipt.restaurant.address}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(receipt.datetime).toLocaleDateString()}
                        </div>
                        {receipt.totalAmount && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3.5 h-3.5" />
                            {parseFloat(receipt.totalAmount).toFixed(2)}
                          </div>
                        )}
                      </div>
                      {receipt.dishInstances.length > 0 && (
                        <div className="flex items-center gap-2 mt-3">
                          <div className="flex -space-x-2">
                            {receipt.dishInstances.slice(0, 4).map((di) => (
                              di.photo ? (
                                <img
                                  key={di.id}
                                  src={di.photo.imageUrl}
                                  alt={di.dish.name}
                                  className="w-8 h-8 rounded-full border-2 border-background object-cover"
                                />
                              ) : (
                                <div
                                  key={di.id}
                                  className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-xs"
                                >
                                  {di.dish.name[0]}
                                </div>
                              )
                            ))}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {receipt.dishInstances.length} item{receipt.dishInstances.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
