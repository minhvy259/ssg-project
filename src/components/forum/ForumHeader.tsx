import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, LayoutGrid, List, Flame, Clock, TrendingUp, Bookmark, FileText } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { CreatePostDialog } from './CreatePostDialog';
import { useAuth } from '@/contexts/AuthContext';
import { SortType } from '@/hooks/useForum';
import { useDebounce } from '@/hooks/useDebounce';

interface ForumHeaderProps {
  viewMode: 'card' | 'list';
  onViewModeChange: (mode: 'card' | 'list') => void;
  sortType: SortType;
  onSortChange: (sort: SortType) => void;
  onSearchChange: (search: string) => void;
  showSavedTab?: boolean;
  showMyPostsTab?: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function ForumHeader({
  viewMode,
  onViewModeChange,
  sortType,
  onSortChange,
  onSearchChange,
  showSavedTab = false,
  showMyPostsTab = false,
  activeTab,
  onTabChange,
}: ForumHeaderProps) {
  const { user } = useAuth();
  const [searchValue, setSearchValue] = useState('');
  const debouncedSearch = useDebounce(searchValue, 300);

  useEffect(() => {
    onSearchChange(debouncedSearch);
  }, [debouncedSearch, onSearchChange]);

  return (
    <div className="space-y-4">
      {/* Search & Create */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm bài viết..."
            className="pl-10"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </div>
        {user && <CreatePostDialog />}
      </div>

      {/* Tabs & View Mode */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <Tabs value={activeTab} onValueChange={onTabChange}>
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="hot" className="gap-1.5">
              <Flame className="h-4 w-4" />
              <span className="hidden sm:inline">Hot</span>
            </TabsTrigger>
            <TabsTrigger value="new" className="gap-1.5">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Mới nhất</span>
            </TabsTrigger>
            <TabsTrigger value="top" className="gap-1.5">
              <TrendingUp className="h-4 w-4" />
              <span className="hidden sm:inline">Top</span>
            </TabsTrigger>
            {showSavedTab && user && (
              <TabsTrigger value="saved" className="gap-1.5">
                <Bookmark className="h-4 w-4" />
                <span className="hidden sm:inline">Đã lưu</span>
              </TabsTrigger>
            )}
            {showMyPostsTab && user && (
              <TabsTrigger value="my-posts" className="gap-1.5">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Bài của tôi</span>
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>

        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(value) => value && onViewModeChange(value as 'card' | 'list')}
          className="hidden sm:flex"
        >
          <ToggleGroupItem value="card" aria-label="Card view">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}
