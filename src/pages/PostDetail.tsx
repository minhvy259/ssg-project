import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import {
  ArrowBigUp,
  ArrowBigDown,
  Bookmark,
  BookmarkCheck,
  Share2,
  ArrowLeft,
  Eye,
  MessageCircle,
  Pin,
  Lock,
  MoreHorizontal,
  Trash2,
  Edit,
} from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CommentSection } from '@/components/forum/CommentSection';
import { ForumSidebar } from '@/components/forum/ForumSidebar';
import { usePostDetail } from '@/hooks/usePostDetail';
import { useVotePost, useToggleSavePost } from '@/hooks/useForum';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const languageFlags: Record<string, string> = {
  en: '🇺🇸',
  vi: '🇻🇳',
  es: '🇪🇸',
  ja: '🇯🇵',
  ko: '🇰🇷',
  zh: '🇨🇳',
  fr: '🇫🇷',
  de: '🇩🇪',
  other: '🌐',
};

export default function PostDetail() {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const { data: post, isLoading, error } = usePostDetail(postId);
  const votePost = useVotePost();
  const toggleSave = useToggleSavePost();

  const handleVote = (voteType: 1 | -1) => {
    if (!user) {
      toast({
        title: 'Vui lòng đăng nhập',
        description: 'Bạn cần đăng nhập để vote.',
        variant: 'destructive',
      });
      return;
    }
    if (postId) {
      votePost.mutate({ postId, voteType });
    }
  };

  const handleSave = () => {
    if (!user) {
      toast({
        title: 'Vui lòng đăng nhập',
        description: 'Bạn cần đăng nhập để lưu bài viết.',
        variant: 'destructive',
      });
      return;
    }
    if (postId) {
      toggleSave.mutate(postId);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: 'Đã sao chép link!',
      });
    } catch {
      toast({
        title: 'Không thể sao chép',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 min-w-0">
              <Skeleton className="h-8 w-32 mb-6" />
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-3/4" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-6 rounded-full" />
                      <Skeleton className="h-6 w-32" />
                    </div>
                    <Skeleton className="h-48 w-full" />
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="lg:w-80 shrink-0 hidden lg:block">
              <ForumSidebar />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="text-6xl mb-4">😕</div>
            <h1 className="text-2xl font-bold mb-2">Không tìm thấy bài viết</h1>
            <p className="text-muted-foreground mb-6">
              Bài viết có thể đã bị xóa hoặc không tồn tại.
            </p>
            <Button asChild>
              <Link to="/forum">Quay về diễn đàn</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const score = post.upvotes - post.downvotes;
  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: vi,
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Back button */}
            <Button
              variant="ghost"
              className="mb-4"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Quay lại
            </Button>

            {/* Post */}
            <Card className="mb-8">
              <CardContent className="p-0">
                <div className="flex">
                  {/* Vote sidebar */}
                  <div className="flex flex-col items-center gap-1 p-4 bg-muted/30 border-r">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn('h-10 w-10', post.user_vote === 1 && 'text-primary bg-primary/10')}
                      onClick={() => handleVote(1)}
                    >
                      <ArrowBigUp className="h-7 w-7" />
                    </Button>
                    <span className={cn(
                      'text-lg font-bold',
                      score > 0 && 'text-primary',
                      score < 0 && 'text-destructive'
                    )}>
                      {score}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn('h-10 w-10', post.user_vote === -1 && 'text-destructive bg-destructive/10')}
                      onClick={() => handleVote(-1)}
                    >
                      <ArrowBigDown className="h-7 w-7" />
                    </Button>
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-6">
                    {/* Badges */}
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      {post.is_pinned && (
                        <Badge variant="secondary">
                          <Pin className="h-3 w-3 mr-1" /> Ghim
                        </Badge>
                      )}
                      {post.is_locked && (
                        <Badge variant="destructive">
                          <Lock className="h-3 w-3 mr-1" /> Đã khóa
                        </Badge>
                      )}
                      {post.category_name && (
                        <Link to={`/forum?category=${post.category_slug}`}>
                          <Badge
                            variant="outline"
                            style={{ borderColor: post.category_color || undefined, color: post.category_color || undefined }}
                          >
                            {post.category_name}
                          </Badge>
                        </Link>
                      )}
                      <span className="text-lg">{languageFlags[post.language] || languageFlags.other}</span>
                    </div>

                    {/* Title */}
                    <h1 className="text-2xl font-bold text-foreground mb-4">
                      {post.title}
                    </h1>

                    {/* Author info */}
                    <div className="flex items-center gap-3 mb-6">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={post.author_avatar || undefined} />
                        <AvatarFallback>
                          {post.author_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">
                          {post.author_name || 'Ẩn danh'}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-2">
                          <span>{timeAgo}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Eye className="h-3.5 w-3.5" />
                            {post.view_count} lượt xem
                          </span>
                        </div>
                      </div>

                      {/* Post actions dropdown */}
                      {post.is_author && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="ml-auto">
                              <MoreHorizontal className="h-5 w-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Chỉnh sửa
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Xóa bài viết
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    <Separator className="mb-6" />

                    {/* Content */}
                    <div className="prose prose-sm dark:prose-invert max-w-none mb-6">
                      <div className="whitespace-pre-wrap text-foreground">
                        {post.content}
                      </div>
                    </div>

                    {/* Tags */}
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-6">
                        {post.tags.map((tag) => (
                          <Link key={tag.id} to={`/forum?tag=${tag.slug}`}>
                            <Badge variant="secondary" className="hover:bg-secondary/80">
                              #{tag.name}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    )}

                    <Separator className="mb-4" />

                    {/* Footer actions */}
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4" />
                        {post.comment_count} bình luận
                      </span>

                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "text-muted-foreground",
                          post.is_saved && "text-primary"
                        )}
                        onClick={handleSave}
                      >
                        {post.is_saved ? (
                          <BookmarkCheck className="h-4 w-4 mr-1" />
                        ) : (
                          <Bookmark className="h-4 w-4 mr-1" />
                        )}
                        {post.is_saved ? 'Đã lưu' : 'Lưu'}
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                        onClick={handleShare}
                      >
                        <Share2 className="h-4 w-4 mr-1" />
                        Chia sẻ
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Comments Section */}
            <Card>
              <CardContent className="p-6">
                <CommentSection
                  postId={post.id}
                  postAuthorId={post.author_id}
                  commentCount={post.comment_count}
                  isLocked={post.is_locked}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:w-80 shrink-0 hidden lg:block">
            <ForumSidebar />
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
