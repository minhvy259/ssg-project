import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

function scrollWindowToTop() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

const ScrollToTop = () => {
  const { pathname } = useLocation();

  // useLayoutEffect: chạy trước khi vẽ, tránh nháy scroll
  useLayoutEffect(() => {
    scrollWindowToTop();
    const id = requestAnimationFrame(() => scrollWindowToTop());
    return () => cancelAnimationFrame(id);
  }, [pathname]);

  return null;
};

export default ScrollToTop;
