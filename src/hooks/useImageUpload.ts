import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export function useImageUpload() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) {
      toast({ title: 'Vui lòng đăng nhập', variant: 'destructive' });
      return null;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'Ảnh quá lớn', description: 'Tối đa 5MB', variant: 'destructive' });
      return null;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: 'Định dạng không hỗ trợ', description: 'Chỉ hỗ trợ JPG, PNG, GIF, WebP', variant: 'destructive' });
      return null;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage
        .from('forum-images')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('forum-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      toast({ title: 'Lỗi upload', description: error.message, variant: 'destructive' });
      return null;
    } finally {
      setUploading(false);
    }
  };

  return { uploadImage, uploading };
}
