import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Globe } from 'lucide-react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ForumHeader } from '@/components/forum/ForumHeader';
import { ForumSidebar } from '@/components/forum/ForumSidebar';
import { PostCard } from '@/components/forum/PostCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useForumPosts, useSavedPosts, SortType } from '@/hooks/useForum';
import { useAuth } from '@/contexts/AuthContext';
import { useForumCategories } from '@/hooks/useForum';

const languages = [
  { value: 'all', label: '🌐 Tất cả' },
  { value: 'vi', label: '🇻🇳 Tiếng Việt' },
  { value: 'en', label: '🇺🇸 English' },
  { value: 'ja', label: '🇯🇵 日本語' },
  { value: 'ko', label: '🇰🇷 한국어' },
  { value: 'zh', label: '🇨🇳 中文' },
  { value: 'es', label: '🇪🇸 Español' },
  { value: 'fr', label: '🇫🇷 Français' },
  { value: 'de', label: '🇩🇪 Deutsch' },
];

const POSTS_PER_PAGE = 20;

export default function Forum() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('all');
  const [postLimit, setPostLimit] = useState(POSTS_PER_PAGE);
  
  // Get params from URL
  const activeTab = searchParams.get('tab') || 'hot';
  const categorySlug = searchParams.get('category');
  const tagSlug = searchParams.get('tag');

  // Get category ID from slug
  const { data: categories } = useForumCategories();
  const categoryId = categorySlug
    ? categories?.find((c) => c.slug === categorySlug)?.id
    : null;

  // Determine sort type from activeTab
  const sortType: SortType = ['hot', 'new', 'top'].includes(activeTab)
    ? (activeTab as SortType)
    : 'hot';

  // Fetch posts
  const { data: posts, isLoading: loadingPosts } = useForumPosts({
    sort: activeTab === 'my-posts' ? 'new' : sortType,
    categoryId: categoryId || undefined,
    tagSlug: tagSlug || undefined,
    language: language !== 'all' ? language : undefined,
    search: search || undefined,
    authorId: activeTab === 'my-posts' ? user?.id : undefined,
    limit: postLimit,
  });

  // Fetch saved posts
  const { data: savedPosts, isLoading: loadingSaved } = useSavedPosts();

  const handleTabChange = useCallback((tab: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (tab === 'hot') {
      newParams.delete('tab');
    } else {
      newParams.set('tab', tab);
    }
    setSearchParams(newParams);
    setPostLimit(POSTS_PER_PAGE); // Reset pagination on tab change
  }, [searchParams, setSearchParams]);

  const handleSortChange = useCallback((sort: SortType) => {
    handleTabChange(sort);
  }, [handleTabChange]);

  const handleLoadMore = () => {
    setPostLimit(prev => prev + POSTS_PER_PAGE);
  };

  const displayPosts = activeTab === 'saved' ? savedPosts : posts;
  const isLoading = activeTab === 'saved' ? loadingSaved : loadingPosts;
  const hasMore = displayPosts && displayPosts.length >= postLimit;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 pt-24">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-foreground mb-2">
                📚 Diễn đàn Sinh viên
              </h1>
              <p className="text-muted-foreground">
                Nơi chia sẻ kiến thức, trao đổi kinh nghiệm và kết nối với sinh viên toàn cầu
              </p>
            </div>

            {/* Forum Header */}
            <ForumHeader
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              sortType={sortType}
              onSortChange={handleSortChange}
              onSearchChange={setSearch}
              showSavedTab
              showMyPostsTab
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />

            {/* Language filter */}
            <div className="mt-4 flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="w-[160px] h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {languages.map((lang) => (
                    <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Posts */}
            <div className="mt-4">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-48 w-full rounded-lg" />
                  ))}
                </div>
              ) : displayPosts && displayPosts.length > 0 ? (
                <>
                  <div className={viewMode === 'card' ? 'space-y-4' : 'divide-y divide-border border rounded-lg'}>
                    {displayPosts.map((post) => (
                      <PostCard key={post.id} post={post} viewMode={viewMode} />
                    ))}
                  </div>
                  {hasMore && (
                    <div className="text-center mt-6">
                      <Button variant="outline" onClick={handleLoadMore}>
                        Xem thêm bài viết
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-16">
                  <div className="text-6xl mb-4">📭</div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {activeTab === 'saved'
                      ? 'Chưa có bài viết nào được lưu'
                      : activeTab === 'my-posts'
                      ? 'Bạn chưa đăng bài viết nào'
                      : 'Chưa có bài viết nào'}
                  </h3>
                  <p className="text-muted-foreground">
                    {activeTab === 'saved'
                      ? 'Lưu bài viết để đọc sau!'
                      : activeTab === 'my-posts'
                      ? 'Bắt đầu chia sẻ kiến thức với cộng đồng!'
                      : 'Hãy là người đầu tiên đăng bài!'}
                  </p>
                </div>
              )}
            </div>
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
