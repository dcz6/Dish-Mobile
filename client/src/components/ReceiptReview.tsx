import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Trash2, Plus, Loader2, Check, X } from "lucide-react";
import type { ParsedReceipt } from "@shared/schema";

interface ReceiptReviewProps {
  data: ParsedReceipt;
  onConfirm: (data: ParsedReceipt) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  cancelLabel?: string;
}

export function ReceiptReview({ data, onConfirm, onCancel, isSubmitting, cancelLabel = "Cancel" }: ReceiptReviewProps) {
  const [receipt, setReceipt] = useState<ParsedReceipt>(data);

  const updateRestaurantName = (name: string) => {
    setReceipt((prev) => ({ ...prev, restaurantName: name }));
  };

  const updateRestaurantAddress = (address: string) => {
    setReceipt((prev) => ({ ...prev, restaurantAddress: address }));
  };

  const updateLineItem = (index: number, field: "dishName" | "price", value: string) => {
    setReceipt((prev) => ({
      ...prev,
      lineItems: prev.lineItems.map((item, i) =>
        i === index
          ? { ...item, [field]: field === "price" ? (value ? parseFloat(value) : null) : value }
          : item
      ),
    }));
  };

  const removeLineItem = (index: number) => {
    setReceipt((prev) => ({
      ...prev,
      lineItems: prev.lineItems.filter((_, i) => i !== index),
    }));
  };

  const addLineItem = () => {
    setReceipt((prev) => ({
      ...prev,
      lineItems: [...prev.lineItems, { dishName: "", price: null }],
    }));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4 pb-32">
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Restaurant Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="restaurant-name">Restaurant Name</Label>
              <Input
                id="restaurant-name"
                value={receipt.restaurantName}
                onChange={(e) => updateRestaurantName(e.target.value)}
                placeholder="Restaurant name"
                data-testid="input-restaurant-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="restaurant-address">Address (optional)</Label>
              <Input
                id="restaurant-address"
                value={receipt.restaurantAddress || ""}
                onChange={(e) => updateRestaurantAddress(e.target.value)}
                placeholder="Restaurant address"
                data-testid="input-restaurant-address"
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <Label>Date/Time</Label>
                <div className="text-sm text-muted-foreground bg-muted px-3 py-2 rounded-md">
                  {receipt.datetime ? new Date(receipt.datetime).toLocaleString() : "Not detected"}
                </div>
              </div>
              <div className="space-y-2">
                <Label>Total</Label>
                <div className="text-sm font-medium bg-muted px-3 py-2 rounded-md">
                  {receipt.total !== null ? `$${receipt.total.toFixed(2)}` : "—"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
            <CardTitle className="text-lg">Line Items</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={addLineItem}
              data-testid="button-add-item"
              className="gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {receipt.lineItems.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">
                No items detected. Add items manually.
              </p>
            ) : (
              receipt.lineItems.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-2"
                  data-testid={`line-item-${index}`}
                >
                  <Input
                    value={item.dishName}
                    onChange={(e) => updateLineItem(index, "dishName", e.target.value)}
                    placeholder="Dish name"
                    className="flex-1"
                    data-testid={`input-dish-name-${index}`}
                  />
                  <div className="relative w-24">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.price ?? ""}
                      onChange={(e) => updateLineItem(index, "price", e.target.value)}
                      placeholder="0.00"
                      className="pl-6"
                      data-testid={`input-dish-price-${index}`}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLineItem(index)}
                    data-testid={`button-remove-item-${index}`}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="fixed bottom-16 left-0 right-0 p-4 bg-background border-t border-border">
        <div className="flex gap-3 max-w-lg mx-auto">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            data-testid="button-cancel-receipt"
            className="flex-1"
          >
            <X className="w-4 h-4 mr-2" />
            {cancelLabel}
          </Button>
          <Button
            onClick={() => onConfirm(receipt)}
            disabled={isSubmitting || !receipt.restaurantName || receipt.lineItems.length === 0}
            data-testid="button-save-receipt"
            className="flex-1"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Save Receipt
          </Button>
        </div>
      </div>
    </div>
  );
}
