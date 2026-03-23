import { useState, useEffect } from 'react';
import { MessageCircle, SortAsc } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CommentItem } from './CommentItem';
import { Comment, CommentSortType, usePostComments, useCreateComment } from '@/hooks/usePostDetail';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface CommentSectionProps {
  postId: string;
  postAuthorId: string;
  commentCount: number;
  isLocked?: boolean;
}

export function CommentSection({ postId, postAuthorId, commentCount, isLocked }: CommentSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sortType, setSortType] = useState<CommentSortType>('best');
  const [newComment, setNewComment] = useState('');
  
  const { data: comments, isLoading, error } = usePostComments(postId, sortType);
  const createComment = useCreateComment();
  
  // Log error for debugging
  useEffect(() => {
    if (error) {
      console.error('CommentSection error:', error);
    }
  }, [error]);
  
  // Get only top-level comments for rendering (replies are handled by CommentItem)
  // Handle both null and undefined parent_id for top-level comments
  const topLevelComments = comments?.filter(c => !c.parent_id) || [];

  const handleSubmitComment = async () => {
    if (!user) {
      toast({
        title: 'Vui lòng đăng nhập',
        description: 'Bạn cần đăng nhập để bình luận.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!newComment.trim()) return;
    
    await createComment.mutateAsync({
      postId,
      content: newComment,
    });
    
    setNewComment('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          {commentCount} Bình luận
        </h2>
        
        <Select value={sortType} onValueChange={(v) => setSortType(v as CommentSortType)}>
          <SelectTrigger className="w-[140px]">
            <SortAsc className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="best">Hay nhất</SelectItem>
            <SelectItem value="new">Mới nhất</SelectItem>
            <SelectItem value="old">Cũ nhất</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* New comment input */}
      {isLocked ? (
        <div className="bg-muted/50 rounded-lg p-4 text-center text-muted-foreground">
          🔒 Bài viết đã bị khóa. Không thể thêm bình luận mới.
        </div>
      ) : user ? (
        <div className="space-y-3">
          <Textarea
            placeholder="Viết bình luận của bạn..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[100px] resize-none"
          />
          <div className="flex justify-end">
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || createComment.isPending}
            >
              {createComment.isPending ? 'Đang gửi...' : 'Gửi bình luận'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <p className="text-muted-foreground mb-2">Đăng nhập để tham gia thảo luận</p>
          <Button asChild>
            <Link to="/auth">Đăng nhập</Link>
          </Button>
        </div>
      )}

      {/* Comments list */}
      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex gap-3">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">⚠️</div>
          <p className="text-destructive mb-2">Không thể tải bình luận</p>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
      ) : comments?.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">💬</div>
          <p className="text-muted-foreground">
            Chưa có bình luận nào. Hãy là người đầu tiên!
          </p>
        </div>
      ) : topLevelComments.length > 0 ? (
        <div className="space-y-4">
          {topLevelComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              postId={postId}
              postAuthorId={postAuthorId}
              allComments={comments || []}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">💬</div>
          <p className="text-muted-foreground">
            Chưa có bình luận nào. Hãy là người đầu tiên!
          </p>
        </div>
      )}
    </div>
  );
}
