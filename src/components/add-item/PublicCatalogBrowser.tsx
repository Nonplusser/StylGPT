
'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Folder, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getPublicCatalogFolders } from '@/app/actions';

export default function PublicCatalogBrowser() {
  const [folders, setFolders] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFolders = async () => {
      setLoading(true);
      const folderNames = await getPublicCatalogFolders();
      setFolders(folderNames);
      setLoading(false);
    };
    fetchFolders();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading catalogs...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {folders.map((folderName) => (
          <Link href={`/add-item/${encodeURIComponent(folderName)}`} key={folderName}>
              <Card className="group cursor-pointer aspect-square flex flex-col items-center justify-center text-center p-4 transition-all hover:shadow-lg hover:-translate-y-1">
              <Folder className="w-12 h-12 text-primary mb-4 transition-transform group-hover:scale-110" />
              <h3 className="text-lg font-bold">{folderName.replace(/[-_]/g, ' ')}</h3>
              <p className="text-sm text-muted-foreground">Catalog</p>
              </Card>
          </Link>
        ))}
      </div>
      {folders.length === 0 && !loading && (
        <div className="text-center p-8 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">No public catalogs found.</p>
        </div>
      )}
    </div>
  );
}
