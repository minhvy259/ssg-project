import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { 
  ArrowBigUp, 
  ArrowBigDown, 
  Reply, 
  Check, 
  Trash2, 
  MoreHorizontal,
  CheckCircle2
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Comment, useVoteComment, useCreateComment, useAcceptComment, useDeleteComment } from '@/hooks/usePostDetail';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface CommentItemProps {
  comment: Comment;
  postId: string;
  postAuthorId: string;
  allComments: Comment[];
}

export function CommentItem({ comment, postId, postAuthorId, allComments }: CommentItemProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const voteComment = useVoteComment();
  const createComment = useCreateComment();
  const acceptComment = useAcceptComment();
  const deleteComment = useDeleteComment();
  
  const score = comment.upvotes - comment.downvotes;
  const timeAgo = formatDistanceToNow(new Date(comment.created_at), {
    addSuffix: true,
    locale: vi,
  });
  
  const isPostAuthor = user?.id === postAuthorId;
  const canAccept = isPostAuthor && comment.depth === 0; // Only top-level comments can be accepted
  
  // Get replies for this comment
  const replies = allComments.filter(c => c.parent_id === comment.id);

  const handleVote = (voteType: 1 | -1) => {
    if (!user) {
      toast({
        title: 'Vui lòng đăng nhập',
        description: 'Bạn cần đăng nhập để vote.',
        variant: 'destructive',
      });
      return;
    }
    voteComment.mutate({ commentId: comment.id, voteType, postId });
  };

  const handleReply = async () => {
    if (!user) {
      toast({
        title: 'Vui lòng đăng nhập',
        description: 'Bạn cần đăng nhập để trả lời.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!replyContent.trim()) return;
    
    await createComment.mutateAsync({
      postId,
      content: replyContent,
      parentId: comment.id,
    });
    
    setReplyContent('');
    setIsReplying(false);
  };

  const handleAccept = () => {
    acceptComment.mutate({ commentId: comment.id, postId });
  };

  const handleDelete = () => {
    deleteComment.mutate({ commentId: comment.id, postId });
    setShowDeleteDialog(false);
  };

  return (
    <div className={cn(
      "relative",
      comment.depth > 0 && "ml-6 pl-4 border-l-2 border-muted"
    )}>
      {/* Accepted badge */}
      {comment.is_accepted && (
        <div className="flex items-center gap-1 mb-2 text-sm text-primary font-medium">
          <CheckCircle2 className="h-4 w-4" />
          Câu trả lời được chấp nhận
        </div>
      )}
      
      <div className={cn(
        "flex gap-3 p-4 rounded-lg",
        comment.is_accepted && "bg-primary/5 border border-primary/20"
      )}>
        {/* Vote buttons */}
        <div className="flex flex-col items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-7 w-7', comment.user_vote === 1 && 'text-primary')}
            onClick={() => handleVote(1)}
          >
            <ArrowBigUp className="h-5 w-5" />
          </Button>
          <span className={cn(
            'text-sm font-semibold',
            score > 0 && 'text-primary',
            score < 0 && 'text-destructive'
          )}>
            {score}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-7 w-7', comment.user_vote === -1 && 'text-destructive')}
            onClick={() => handleVote(-1)}
          >
            <ArrowBigDown className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Author info */}
          <div className="flex items-center gap-2 mb-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={comment.author_avatar || undefined} />
              <AvatarFallback className="text-xs">
                {comment.author_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium text-sm">
              {comment.author_name || 'Ẩn danh'}
            </span>
            {comment.author_id === postAuthorId && (
              <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                OP
              </span>
            )}
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">{timeAgo}</span>
          </div>

          {/* Comment content */}
          <div className="text-sm text-foreground whitespace-pre-wrap mb-3">
            {comment.content}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {comment.depth < 4 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => setIsReplying(!isReplying)}
              >
                <Reply className="h-3.5 w-3.5 mr-1" />
                Trả lời
              </Button>
            )}
            
            {canAccept && (
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 text-xs",
                  comment.is_accepted ? "text-primary" : "text-muted-foreground"
                )}
                onClick={handleAccept}
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                {comment.is_accepted ? 'Bỏ chấp nhận' : 'Chấp nhận'}
              </Button>
            )}

            {comment.is_author && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    className="text-destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Xóa bình luận
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Reply input */}
          {isReplying && (
            <div className="mt-3 space-y-2">
              <Textarea
                placeholder="Viết câu trả lời..."
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value)}
                className="min-h-[80px] resize-none"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleReply}
                  disabled={!replyContent.trim() || createComment.isPending}
                >
                  {createComment.isPending ? 'Đang gửi...' : 'Gửi'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsReplying(false);
                    setReplyContent('');
                  }}
                >
                  Hủy
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {replies.length > 0 && (
        <div className="mt-2 space-y-2">
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              postId={postId}
              postAuthorId={postAuthorId}
              allComments={allComments}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa bình luận?</AlertDialogTitle>
            <AlertDialogDescription>
              Bình luận và tất cả câu trả lời sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
