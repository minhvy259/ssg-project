import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { ArrowBigUp, ArrowBigDown, MessageCircle, Bookmark, Eye, Pin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ForumPost, useVotePost, useToggleSavePost } from '@/hooks/useForum';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface PostCardProps {
  post: ForumPost;
  viewMode?: 'card' | 'list';
}

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

export function PostCard({ post, viewMode = 'card' }: PostCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const votePost = useVotePost();
  const toggleSave = useToggleSavePost();

  const score = post.upvotes - post.downvotes;
  const timeAgo = formatDistanceToNow(new Date(post.created_at), {
    addSuffix: true,
    locale: vi,
  });

  const handleVote = (voteType: 1 | -1) => {
    if (!user) {
      toast({
        title: 'Vui lòng đăng nhập',
        description: 'Bạn cần đăng nhập để vote bài viết.',
        variant: 'destructive',
      });
      return;
    }
    votePost.mutate({ postId: post.id, voteType });
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
    toggleSave.mutate(post.id);
  };

  if (viewMode === 'list') {
    return (
      <div className="flex items-start gap-4 p-4 border-b border-border hover:bg-muted/30 transition-colors">
        {/* Vote buttons */}
        <div className="flex flex-col items-center gap-1 min-w-[40px]">
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8', post.user_vote === 1 && 'text-primary')}
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
            className={cn('h-8 w-8', post.user_vote === -1 && 'text-destructive')}
            onClick={() => handleVote(-1)}
          >
            <ArrowBigDown className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {post.is_pinned && (
              <Badge variant="secondary" className="text-xs">
                <Pin className="h-3 w-3 mr-1" /> Ghim
              </Badge>
            )}
            {post.category_name && (
              <Badge
                variant="outline"
                style={{ borderColor: post.category_color || undefined, color: post.category_color || undefined }}
              >
                {post.category_name}
              </Badge>
            )}
            <span className="text-lg">{languageFlags[post.language] || languageFlags.other}</span>
          </div>

          <Link to={`/forum/post/${post.id}`} className="hover:underline">
            <h3 className="font-semibold text-foreground line-clamp-2">{post.title}</h3>
          </Link>

          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{post.excerpt}</p>

          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={post.author_avatar || undefined} />
                <AvatarFallback className="text-xs">
                  {post.author_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <span>{post.author_name || 'Ẩn danh'}</span>
            </div>
            <span>•</span>
            <span>{timeAgo}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MessageCircle className="h-4 w-4" /> {post.comment_count}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" /> {post.view_count}
            </span>
          </div>
        </div>

        {/* Save button */}
        <Button variant="ghost" size="icon" onClick={handleSave}>
          <Bookmark className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="flex">
          {/* Vote sidebar */}
          <div className="flex flex-col items-center gap-1 p-3 bg-muted/30">
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-8 w-8', post.user_vote === 1 && 'text-primary bg-primary/10')}
              onClick={() => handleVote(1)}
            >
              <ArrowBigUp className="h-6 w-6" />
            </Button>
            <span className={cn(
              'text-sm font-bold',
              score > 0 && 'text-primary',
              score < 0 && 'text-destructive'
            )}>
              {score}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className={cn('h-8 w-8', post.user_vote === -1 && 'text-destructive bg-destructive/10')}
              onClick={() => handleVote(-1)}
            >
              <ArrowBigDown className="h-6 w-6" />
            </Button>
          </div>

          {/* Main content */}
          <div className="flex-1 p-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {post.is_pinned && (
                <Badge variant="secondary" className="text-xs">
                  <Pin className="h-3 w-3 mr-1" /> Ghim
                </Badge>
              )}
              {post.category_name && (
                <Badge
                  variant="outline"
                  className="text-xs"
                  style={{ borderColor: post.category_color || undefined, color: post.category_color || undefined }}
                >
                  {post.category_name}
                </Badge>
              )}
              <span className="text-base">{languageFlags[post.language] || languageFlags.other}</span>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={post.author_avatar || undefined} />
                  <AvatarFallback className="text-xs">
                    {post.author_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <span>{post.author_name || 'Ẩn danh'}</span>
                <span>•</span>
                <span>{timeAgo}</span>
              </div>
            </div>

            {/* Title */}
            <Link to={`/forum/post/${post.id}`} className="hover:underline">
              <h3 className="font-semibold text-lg text-foreground mb-2 line-clamp-2">{post.title}</h3>
            </Link>

            {/* Excerpt */}
            <p className="text-sm text-muted-foreground line-clamp-3 mb-3">{post.excerpt}</p>

            {/* Tags */}
            {post.tags && post.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {post.tags.map((tag) => (
                  <Link key={tag.id} to={`/forum?tag=${tag.slug}`}>
                    <Badge variant="secondary" className="text-xs hover:bg-secondary/80">
                      #{tag.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" /> {post.comment_count} bình luận
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" /> {post.view_count}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-muted-foreground hover:text-foreground"
                onClick={handleSave}
              >
                <Bookmark className="h-4 w-4 mr-1" /> Lưu
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
