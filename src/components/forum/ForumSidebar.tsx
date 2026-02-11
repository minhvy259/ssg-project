import { Link, useSearchParams } from 'react-router-dom';
import {
  MessageCircle,
  Calculator,
  Code,
  Atom,
  Globe,
  Lightbulb,
  Briefcase,
  BookOpen,
  TrendingUp,
  Hash,
  Trophy,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useForumCategories, useTrendingTags } from '@/hooks/useForum';
import { useForumStats, useLeaderboard } from '@/hooks/useProfile';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  MessageCircle,
  Calculator,
  Code,
  Atom,
  Globe,
  Lightbulb,
  Briefcase,
  BookOpen,
};

export function ForumSidebar() {
  const [searchParams] = useSearchParams();
  const activeCategory = searchParams.get('category');
  const activeTag = searchParams.get('tag');

  const { data: categories, isLoading: loadingCategories } = useForumCategories();
  const { data: tags, isLoading: loadingTags } = useTrendingTags(10);
  const { data: stats } = useForumStats();
  const { data: leaderboard } = useLeaderboard('reputation', 5);

  return (
    <aside className="space-y-6">
      {/* Categories */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Danh mục
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loadingCategories ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : (
            <nav className="space-y-1">
              <Link
                to="/forum"
                className={cn(
                  'flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors',
                  !activeCategory
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                )}
              >
                <span className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  Tất cả
                </span>
              </Link>
              {categories?.map((category) => {
                const Icon = iconMap[category.icon || 'MessageCircle'] || MessageCircle;
                const isActive = activeCategory === category.slug;
                return (
                  <Link
                    key={category.id}
                    to={`/forum?category=${category.slug}`}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4" style={{ color: isActive ? undefined : category.color || undefined }} />
                      {category.name}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {category.post_count}
                    </Badge>
                  </Link>
                );
              })}
            </nav>
          )}
        </CardContent>
      </Card>

      {/* Trending Tags */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Trending Tags
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loadingTags ? (
            <div className="flex flex-wrap gap-2">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="h-6 w-16" />
              ))}
            </div>
          ) : tags && tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Link key={tag.id} to={`/forum?tag=${tag.slug}`}>
                  <Badge
                    variant={activeTag === tag.slug ? 'default' : 'secondary'}
                    className="cursor-pointer hover:bg-primary/80"
                  >
                    #{tag.name}
                  </Badge>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Chưa có tags nào</p>
          )}
        </CardContent>
      </Card>

      {/* Forum Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">📊 Thống kê</CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Tổng bài viết</span>
            <span className="font-medium">{stats?.total_posts ?? '--'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Bình luận</span>
            <span className="font-medium">{stats?.total_comments ?? '--'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Thành viên</span>
            <span className="font-medium">{stats?.total_users ?? '--'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Bài viết hôm nay</span>
            <span className="font-medium text-primary">{stats?.posts_today ?? '--'}</span>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Bảng xếp hạng
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">
          {leaderboard && leaderboard.length > 0 ? (
            leaderboard.map((user: any, i: number) => (
              <Link
                key={user.user_id}
                to={`/profile/${user.user_id}`}
                className="flex items-center gap-2 p-2 rounded-md hover:bg-muted transition-colors"
              >
                <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}</span>
                <Avatar className="w-7 h-7">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className="text-xs">{user.full_name?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-foreground truncate block">{user.full_name || 'Ẩn danh'}</span>
                </div>
                <Badge variant="secondary" className="text-xs">{user.reputation_points} ⭐</Badge>
              </Link>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">Chưa có dữ liệu</p>
          )}
        </CardContent>
      </Card>
    </aside>
  );
}
