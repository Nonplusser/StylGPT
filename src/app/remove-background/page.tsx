
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { removeBackground as removeBackgroundAction, analyzeClothingItem, addMultipleClothingItems } from '@/app/actions';
import Image from 'next/image';
import { Loader2, Wand2, X, Image as ImageIcon, Save } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';

export default function RemoveBackgroundPage() {
  const [file, setFile] = useState<File | null>(null);
  const [originalImagePreview, setOriginalImagePreview] = useState<string | null>(null);
  const [processedImageUrl, setProcessedImageUrl] = useState<string | null>(null);
  const [processedImageStoragePath, setProcessedImageStoragePath] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { withAuth, user } = useAuth();
  const router = useRouter();


  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    
    // Generate preview from the selected file for immediate feedback
    const reader = new FileReader();
    reader.onloadend = () => {
        setOriginalImagePreview(reader.result as string);
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleRemoveBackground = async () => {
    if (!file || !originalImagePreview) {
      toast({ title: 'No File', description: 'Please select an image first.', variant: 'destructive' });
      return;
    }
     if (!user) {
      toast({ title: 'Not Authenticated', description: 'You must be logged in to perform this action.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);
    setProcessedImageUrl(null);
    setProcessedImageStoragePath(null);
    toast({ title: 'Processing...', description: 'Removing background, please wait.' });

    try {
      const result = await withAuth(removeBackgroundAction)(originalImagePreview, file.type);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      setProcessedImageUrl(result.photoUrl);
      setProcessedImageStoragePath(result.storagePath);
      toast({ title: 'Success!', description: 'Background removed successfully.' });

    } catch (error) {
      console.error("Background removal failed:", error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      toast({ title: 'Error', description: `Failed to remove background: ${errorMessage}`, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToCollection = async () => {
    if (!processedImageUrl || !processedImageStoragePath) {
      toast({ title: 'No Processed Image', description: 'Please process an image first.', variant: 'destructive'});
      return;
    }
     if (!user) {
      toast({ title: 'Not Authenticated', description: 'You must be logged in to save items.', variant: 'destructive' });
      return;
    }

    setIsSaving(true);
    toast({ title: 'Analyzing Item...', description: 'Our AI is identifying the clothing item properties.' });

    try {
      // Create a data URI from the processed URL for analysis
      const response = await fetch(processedImageUrl);
      const blob = await response.blob();
      const dataUri = await new Promise<string>(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      const analysisResult = await analyzeClothingItem(dataUri);

      if ('error' in analysisResult) {
        throw new Error(analysisResult.error);
      }

      toast({ title: 'Saving to Wardrobe...', description: 'Almost there...'});

      const itemToSave = {
        photoUrl: processedImageUrl,
        storagePath: processedImageStoragePath,
        ...analysisResult
      };

      const saveResult = await withAuth(addMultipleClothingItems)({ items: [itemToSave]});

      if (saveResult.error) {
        throw new Error(saveResult.error);
      }

      toast({ title: 'Success!', description: 'Your new item has been added to your wardrobe.'});
      router.push('/wardrobe');

    } catch (error) {
       console.error("Failed to save item:", error);
       const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
       toast({ title: 'Save Failed', description: `Could not save item to wardrobe: ${errorMessage}`, variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
  }

  const handleReset = () => {
    setFile(null);
    setOriginalImagePreview(null);
    setProcessedImageUrl(null);
    setProcessedImageStoragePath(null);
    const input = document.getElementById('image-upload') as HTMLInputElement;
    if(input) input.value = '';
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="font-headline text-3xl">Background Remover</CardTitle>
          <CardDescription>
            Upload a photo of a clothing item to automatically remove the background. HEIC files are converted on the server.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="image-upload" className="block text-sm font-medium text-gray-700">
              Upload Image
            </label>
            <div className="flex items-center gap-4">
              <Input
                id="image-upload"
                type="file"
                accept="image/*,.heic,.heif"
                onChange={handleFileChange}
                className="max-w-sm"
                disabled={isLoading}
              />
              <Button onClick={handleRemoveBackground} disabled={!file || isLoading}>
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Wand2 className="mr-2 h-4 w-4" />
                )}
                Remove Background
              </Button>
               {originalImagePreview && (
                 <Button variant="ghost" size="icon" onClick={handleReset} disabled={isLoading || isSaving}>
                    <X />
                    <span className="sr-only">Reset</span>
                </Button>
               )}
            </div>
          </div>

          {(originalImagePreview || processedImageUrl) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <h3 className="font-semibold">Original</h3>
                {originalImagePreview ? (
                    <div className="aspect-square border rounded-lg bg-muted flex items-center justify-center p-4">
                        <Image
                            src={originalImagePreview}
                            alt="Original item"
                            width={400}
                            height={400}
                            className="object-contain max-h-full"
                        />
                    </div>
                ) : <div className="aspect-square border rounded-lg bg-muted flex items-center justify-center"><ImageIcon className="text-muted-foreground w-16 h-16"/></div> }
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Background Removed</h3>
                    {processedImageUrl && (
                        <Button onClick={handleSaveToCollection} disabled={isSaving || isLoading}>
                            {isSaving ? <Loader2 className="mr-2 animate-spin"/> : <Save className="mr-2" />}
                            Save to Wardrobe
                        </Button>
                    )}
                </div>
                <div className="aspect-square border rounded-lg bg-muted flex items-center justify-center p-4">
                    {isLoading && <Loader2 className="w-16 h-16 animate-spin text-primary" />}
                    {!isLoading && processedImageUrl && (
                        <Image
                            src={processedImageUrl}
                            alt="Processed item"
                            width={400}
                            height={400}
                            className="object-contain max-h-full"
                        />
                    )}
                    {!isLoading && !processedImageUrl && <ImageIcon className="text-muted-foreground w-16 h-16"/>}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
