import { useState } from 'react';
import { Flag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam hoặc quảng cáo' },
  { value: 'harassment', label: 'Quấy rối hoặc bắt nạt' },
  { value: 'inappropriate', label: 'Nội dung không phù hợp' },
  { value: 'misinformation', label: 'Thông tin sai lệch' },
  { value: 'other', label: 'Lý do khác' },
];

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId?: string;
  commentId?: string;
}

export function ReportDialog({ open, onOpenChange, postId, commentId }: ReportDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reason, setReason] = useState('spam');
  const [description, setDescription] = useState('');

  const reportMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('report_content', {
        p_post_id: postId || null,
        p_comment_id: commentId || null,
        p_reason: reason,
        p_description: description || null,
      });
      if (error) throw error;
      const result = data as { success: boolean; error?: string };
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast({ title: 'Đã gửi báo cáo', description: 'Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét.' });
      onOpenChange(false);
      setReason('spam');
      setDescription('');
    },
    onError: (error) => {
      toast({
        title: 'Lỗi',
        description: error.message === 'ALREADY_REPORTED'
          ? 'Bạn đã báo cáo nội dung này rồi'
          : 'Không thể gửi báo cáo. Vui lòng thử lại.',
        variant: 'destructive',
      });
    },
  });

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Báo cáo {postId ? 'bài viết' : 'bình luận'}
          </DialogTitle>
          <DialogDescription>
            Cho chúng tôi biết lý do bạn báo cáo nội dung này.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <RadioGroup value={reason} onValueChange={setReason}>
            {REPORT_REASONS.map((r) => (
              <div key={r.value} className="flex items-center space-x-2">
                <RadioGroupItem value={r.value} id={r.value} />
                <Label htmlFor={r.value} className="cursor-pointer">{r.label}</Label>
              </div>
            ))}
          </RadioGroup>

          <div className="space-y-2">
            <Label>Mô tả thêm (tùy chọn)</Label>
            <Textarea
              placeholder="Cung cấp thêm chi tiết..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px] resize-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button
            variant="destructive"
            onClick={() => reportMutation.mutate()}
            disabled={reportMutation.isPending}
          >
            {reportMutation.isPending ? 'Đang gửi...' : 'Gửi báo cáo'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
