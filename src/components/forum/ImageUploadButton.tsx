import { useRef } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useImageUpload } from '@/hooks/useImageUpload';

interface ImageUploadButtonProps {
  onImageUploaded: (url: string) => void;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'icon';
}

export function ImageUploadButton({ onImageUploaded, variant = 'outline', size = 'sm' }: ImageUploadButtonProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { uploadImage, uploading } = useImageUpload();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await uploadImage(file);
    if (url) {
      onImageUploaded(url);
    }

    // Reset input
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        type="button"
        variant={variant}
        size={size}
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="gap-1.5"
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImagePlus className="h-4 w-4" />
        )}
        {size !== 'icon' && (uploading ? 'Đang tải...' : 'Thêm ảnh')}
      </Button>
    </>
  );
}
