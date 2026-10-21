import { NavLink } from 'react-router-dom';
import { NAV_GROUPS } from '@/constants/navigation';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/utils/cn';

// Geometry mirrors the prototype's aside (folder-alignment.css): 20px vertical padding,
// brand 20px bold with a 20px gutter and divider, 12px/20px nav items with a 4px left rule.
export function Sidebar() {
  const { can } = useAuth();
  const groups = NAV_GROUPS.filter((g) => g.sections.some((s) => can(s.access)));

  return (
    <aside className="fixed inset-y-0 left-0 z-10 flex w-sidebar flex-col overflow-auto bg-sidebar py-5 leading-[normal] text-sidebar-text max-[650px]:static max-[650px]:w-full">
      <div className="mb-5 border-b border-sidebar-active px-5 pb-5 text-xl font-bold max-[650px]:mb-[5px]">
        Admin Panel
        <span className="mt-2.5 block text-[9px] uppercase tracking-[1.5px] text-[#94a3b8]">Little Legacy</span>
      </div>
      <nav className="flex flex-col max-[650px]:flex-row max-[650px]:overflow-x-auto">
        {groups.map((g) => (
          <NavLink
            key={g.path}
            to={g.path}
            end={g.path === '/'}
            className={({ isActive }) =>
              cn(
                'whitespace-nowrap border-l-4 px-5 py-3 text-sm hover:border-primary hover:bg-sidebar-active hover:text-white',
                isActive ? 'border-primary bg-sidebar-active font-bold text-white' : 'border-transparent',
              )
            }
          >
            {g.label}
          </NavLink>
        ))}
      </nav>
      <footer className="mt-auto px-5 py-[25px] leading-[1.5] text-[#cbd5e1] max-[650px]:hidden">
        A little care.
        <br />
        <em className="font-serif">A lasting difference.</em>      </footer>
    </aside>
  );
}
