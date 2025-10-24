'use client';

import { useState } from 'react';
import BulkAddItemForm from '@/components/add-item/BulkAddItemForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PublicCatalogBrowser from '@/components/add-item/PublicCatalogBrowser';

export default function AddItemPage() {

  return (
    <div className="max-w-4xl mx-auto space-y-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-headline">Add Multiple Clothing Items</CardTitle>
            <CardDescription>
              Upload multiple photos at once. Drag and drop your files, let AI analyze them, and save them to your wardrobe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BulkAddItemForm />
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-headline">Add from Public Catalog</CardTitle>
            <CardDescription>
              Browse a public collection of clothing items and add them directly to your wardrobe.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PublicCatalogBrowser />
          </CardContent>
        </Card>
    </div>
  );
}
