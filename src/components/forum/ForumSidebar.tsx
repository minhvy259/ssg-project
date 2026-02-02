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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useForumCategories, useTrendingTags } from '@/hooks/useForum';

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
            <span className="font-medium">--</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Thành viên</span>
            <span className="font-medium">--</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Online hôm nay</span>
            <span className="font-medium text-primary">--</span>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}
