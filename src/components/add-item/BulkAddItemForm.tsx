
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Upload, Loader2, Save, XCircle, Wand2, AlertTriangle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAuth } from '@/hooks/use-auth';
import { storage } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { addMultipleClothingItems, analyzeClothingItem } from '@/app/actions';
import type { ClothingItem } from '@/types';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

type AnalyzedClothingData = Omit<ClothingItem, 'id' | 'photoUrl' | 'userId' | 'storagePath'>;

type FileState = {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'analyzing' | 'uploading' | 'success' | 'error';
  data?: Partial<AnalyzedClothingData>;
  photoUrl?: string;
  storagePath?: string;
  error?: string;
};

const fileToDataUri = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
});

export default function BulkAddItemForm() {
  const [files, setFiles] = useState<FileState[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const { user, loading: authLoading, withAuth } = useAuth();

  const handleFileProcessing = (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => file.type.startsWith('image/'));
    
    if (validFiles.length !== newFiles.length) {
      toast({
        title: 'Invalid File Type',
        description: 'Some files were not images and have been ignored.',
        variant: 'destructive',
      });
    }

    const fileStates: FileState[] = validFiles.map(file => {
      const id = `${file.name}-${file.lastModified}-${Math.random()}`;
      return {
        id,
        file,
        preview: URL.createObjectURL(file),
        status: 'pending',
      };
    });

    setFiles(prev => [...fileStates, ...prev]);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileProcessing(Array.from(e.target.files));
      e.target.value = ''; // Reset input
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFileProcessing(Array.from(e.dataTransfer.files));
    }
  };

  const updateFileState = (id: string, update: Partial<FileState>) => {
    setFiles(prev => prev.map(f => (f.id === id ? { ...f, ...update } : f)));
  };

  const handleAnalyzeAndUploadAll = async () => {
    if (authLoading) {
        toast({ title: 'Please wait', description: 'Authentication is still loading.', variant: 'destructive'});
        return;
    }
    if (!user) {
        toast({ title: 'Not Authenticated', description: 'You must be logged in to upload items.', variant: 'destructive'});
        console.error("User not authenticated for upload.");
        return;
    }

    const pendingFiles = files.filter(f => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setIsProcessing(true);
    toast({ title: 'Starting processing...', description: `Analyzing and uploading ${pendingFiles.length} items.`});
    console.log(`Starting processing for ${pendingFiles.length} files.`);

    for (const fileState of pendingFiles) {
        console.log(`Processing file: ${fileState.file.name}`);
        try {
            updateFileState(fileState.id, { status: 'analyzing' });
            console.log(`[${fileState.file.name}] State updated to 'analyzing'. Converting to data URI.`);
            const photoDataUri = await fileToDataUri(fileState.file);
            console.log(`[${fileState.file.name}] Converted to data URI. Starting AI analysis.`);

            const analysisResult = await analyzeClothingItem(photoDataUri);
            if ('error' in analysisResult) {
                const errorMessage = analysisResult.error || 'An unknown AI error occurred.';
                console.error(`[${fileState.file.name}] AI analysis failed: ${errorMessage}`);
                updateFileState(fileState.id, { status: 'error', error: errorMessage });
                continue; // Move to the next file
            }
            console.log(`[${fileState.file.name}] Analysis successful. Result:`, analysisResult);
            
            updateFileState(fileState.id, { status: 'uploading', data: { ...analysisResult, brand: analysisResult.brand || '' } });
            console.log(`[${fileState.file.name}] State updated to 'uploading'. Preparing to upload to Firebase Storage.`);
            
            const storagePath = `wardrobe-items/${user.uid}/${uuidv4()}-${fileState.file.name}`;
            const storageRef = ref(storage, storagePath);
            console.log(`[${fileState.file.name}] Uploading to path: ${storagePath}`);

            await uploadBytes(storageRef, fileState.file);
            console.log(`[${fileState.file.name}] Upload successful. Getting download URL.`);
            
            const downloadURL = await getDownloadURL(storageRef);
            console.log(`[${fileState.file.name}] Got download URL: ${downloadURL}`);

            updateFileState(fileState.id, {
                status: 'success',
                photoUrl: downloadURL,
                storagePath: storagePath
            });
            console.log(`[${fileState.file.name}] State updated to 'success'.`);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
            console.error(`Error processing file ${fileState.file.name}:`, error);
            updateFileState(fileState.id, { status: 'error', error: errorMessage });
        }
    }
    setIsProcessing(false);
    toast({ title: 'Processing Complete', description: 'Review your items and save them to your wardrobe.'});
    console.log('Finished processing all files.');
  };

  const handleSaveAll = async () => {
    if (!user) {
        toast({ title: 'Not Authenticated', description: 'You must be logged in to save items.', variant: 'destructive'});
        return;
    }
    setIsSaving(true);
    const itemsToSave = files
      .filter(f => f.status === 'success' && f.data?.type && f.photoUrl && f.storagePath)
      .map(f => {
          const { type, color, texture, fit, season, brand } = f.data as AnalyzedClothingData;
          return { photoUrl: f.photoUrl!, storagePath: f.storagePath!, type, color, texture, fit, season, brand: brand || '' };
      });

    if (itemsToSave.length === 0) {
      toast({ title: 'No items to save', description: 'Analyze and upload some items successfully before saving.', variant: 'destructive' });
      setIsSaving(false);
      return;
    }
    
    console.log(`Saving ${itemsToSave.length} items to the database.`);
    const result = await withAuth(addMultipleClothingItems)({ items: itemsToSave });

    if (result.error) {
      toast({ title: 'Error saving items', description: result.error, variant: 'destructive' });
      console.error('Error saving items:', result.error);
    } else {
      toast({ title: 'Success!', description: `${result.count} items have been added to your wardrobe.` });
      console.log('Successfully saved items.');
      setFiles([]); // Clear the list after saving
      router.push('/wardrobe');
    }
    setIsSaving(false);
  };
  
  const handleRemoveFile = (id: string) => {
      setFiles(prev => prev.filter(f => f.id !== id));
  }

  const handleDataChange = (id: string, field: keyof AnalyzedClothingData, value: any) => {
    setFiles(prev =>
      prev.map(f => {
        if (f.id === id && f.data) {
          return { ...f, data: { ...f.data, [field]: value } };
        }
        return f;
      })
    );
  };

  const pendingCount = files.filter(f => f.status === 'pending').length;
  const successCount = files.filter(f => f.status === 'success').length;

  return (
    <div className="space-y-6">
      <div
        className={cn(
          "p-6 rounded-lg border-2 border-dashed transition-colors text-center",
          isDragging ? 'border-primary bg-primary/10' : 'border-border'
        )}
        onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); }}
        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onDrop={handleDrop}
      >
        <Upload className="w-12 h-12 mx-auto mb-2 text-muted-foreground" />
        <h3 className="font-semibold">Drag & drop files here</h3>
        <p className="text-muted-foreground">or</p>
        <Input id="photo-upload-bulk" type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
        <Button type="button" variant = "outline" onClick={() => document.getElementById('photo-upload-bulk')?.click()}>
          Browse Files
        </Button>
      </div>

      {files.length > 0 && (
        <div className="space-y-4">
            <h3 className="text-xl font-headline">Uploaded Items ({files.length})</h3>
            <div className="flex gap-4 flex-wrap">
                <Button onClick={handleAnalyzeAndUploadAll} disabled={pendingCount === 0 || isProcessing || authLoading}>
                    {isProcessing || authLoading ? <Loader2 className="mr-2 animate-spin" /> : <Wand2 className="mr-2" />}
                     {authLoading ? 'Authenticating...' : isProcessing ? 'Processing...' : `Process All (${pendingCount})`}
                </Button>
                <Button onClick={handleSaveAll} disabled={isSaving || successCount === 0}>
                    {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <Save className="mr-2" />}
                    Save All ({successCount})
                </Button>
            </div>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            {files.map(file => (
              <div key={file.id} className="flex gap-4 p-4 border rounded-lg items-start relative">
                <div className="w-32 h-32 flex-shrink-0 relative">
                    <Image src={file.preview} alt={file.file.name} width={128} height={128} className="w-full h-full object-contain rounded-md" />
                </div>
                <div className="flex-grow">
                  {file.status === 'pending' && <p className="text-muted-foreground">Waiting for processing...</p>}
                  {file.status === 'analyzing' && <div className="flex items-center gap-2 text-primary"><Loader2 className="animate-spin" /> Analyzing with AI...</div>}
                  {file.status === 'uploading' && <div className="flex items-center gap-2 text-primary"><Loader2 className="animate-spin" /> Uploading to storage...</div>}
                  
                  {file.status === 'success' && file.data && (
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <Label>Type</Label>
                            <Input value={file.data.type || ''} onChange={(e) => handleDataChange(file.id, 'type', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Color</Label>
                            <Input value={file.data.color || ''} onChange={(e) => handleDataChange(file.id, 'color', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Texture</Label>
                            <Input value={file.data.texture || ''} onChange={(e) => handleDataChange(file.id, 'texture', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Brand</Label>
                            <Input value={file.data.brand || ''} onChange={(e) => handleDataChange(file.id, 'brand', e.target.value)} />
                        </div>
                        <div className="space-y-1">
                            <Label>Fit</Label>
                            <Input value={file.data.fit || ''} onChange={(e) => handleDataChange(file.id, 'fit', e.target.value)} />
                        </div>
                         <div className="space-y-1">
                            <Label>Season</Label>
                            <Select value={file.data.season || 'all'} onValueChange={(val) => handleDataChange(file.id, 'season', val)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="spring">Spring</SelectItem>
                                    <SelectItem value="summer">Summer</SelectItem>
                                    <SelectItem value="fall">Fall</SelectItem>
                                    <SelectItem value="winter">Winter</SelectItem>
                                    <SelectItem value="all">All Seasons</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                  )}

                  {file.status === 'error' && (
                    <div className="flex items-start gap-3 text-destructive bg-destructive/10 p-3 rounded-md">
                        <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold">Processing Failed</p>
                            <p className="text-sm break-all">{file.error}</p>
                        </div>
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="icon" className="absolute top-2 right-2" onClick={() => handleRemoveFile(file.id)}>
                  <XCircle className="w-5 h-5 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))}
            </div>
        </div>
      )}
    </div>
  );
}
