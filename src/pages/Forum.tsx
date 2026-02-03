import { useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ForumHeader } from '@/components/forum/ForumHeader';
import { ForumSidebar } from '@/components/forum/ForumSidebar';
import { PostCard } from '@/components/forum/PostCard';
import { Skeleton } from '@/components/ui/skeleton';
import { useForumPosts, useSavedPosts, SortType } from '@/hooks/useForum';
import { useAuth } from '@/contexts/AuthContext';
import { useForumCategories } from '@/hooks/useForum';

export default function Forum() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');
  const [search, setSearch] = useState('');
  
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
    search: search || undefined,
    authorId: activeTab === 'my-posts' ? user?.id : undefined,
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
  }, [searchParams, setSearchParams]);

  const handleSortChange = useCallback((sort: SortType) => {
    handleTabChange(sort);
  }, [handleTabChange]);

  const displayPosts = activeTab === 'saved' ? savedPosts : posts;
  const isLoading = activeTab === 'saved' ? loadingSaved : loadingPosts;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
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

            {/* Posts */}
            <div className="mt-6">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-48 w-full rounded-lg" />
                  ))}
                </div>
              ) : displayPosts && displayPosts.length > 0 ? (
                <div className={viewMode === 'card' ? 'space-y-4' : 'divide-y divide-border border rounded-lg'}>
                  {displayPosts.map((post) => (
                    <PostCard key={post.id} post={post} viewMode={viewMode} />
                  ))}
                </div>
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
