import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useSwipeBack } from '@/shared/hooks/useSwipeBack';

const ease = [0.22, 1, 0.36, 1] as const;

export function ProfileStackLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isCategories = location.pathname.endsWith('/categories');
  const stackKey = isCategories ? 'categories' : 'profile-root';

  useSwipeBack({
    enabled: isCategories,
    onBack: () => navigate('/profile'),
  });

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0, position: 'relative' }}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={stackKey}
          initial={{ opacity: 0, x: isCategories ? 20 : -14 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: isCategories ? -12 : 16 }}
          transition={{ duration: 0.22, ease }}
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            minWidth: 0,
            width: '100%',
          }}
        >
          <Outlet />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
