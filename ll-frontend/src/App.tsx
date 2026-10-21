import type { ComponentType } from 'react';
import { createBrowserRouter, Navigate, RouterProvider, type RouteObject } from 'react-router-dom';
import { NAV_GROUPS } from '@/constants/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { HubPage } from '@/components/HubPage';
import { SectionPlaceholder } from '@/components/SectionPlaceholder';
import { LoginPage } from '@/views/Login';
import { RouteGuard } from '@/hooks/RouteGuard';
import { OverviewPage } from '@/views/overview/OverviewPage';
import { TeamPage } from '@/views/team/TeamPage';
import { AuditPage } from '@/views/audit/AuditPage';
import { DraftApprovalsPage } from '@/views/drafts/DraftApprovalsPage';
import { RegisteredUsersPage } from '@/views/userManagement/registeredUsers/RegisteredUsersPage';
import { ChildrenLearningPage } from '@/views/userManagement/children/ChildrenLearningPage';
import { CommunityPage } from '@/views/userManagement/community/CommunityPage';
import { FeedbackPage } from '@/views/userManagement/feedback/FeedbackPage';
import { ActivityReviewsPage } from '@/views/userManagement/activityReviews/ActivityReviewsPage';
import { EnquiriesPage } from '@/views/userManagement/enquiries/EnquiriesPage';
import { MilestonesPage } from '@/views/activityManagement/milestones/MilestonesPage';
import { RegionsPage } from '@/views/activityManagement/RegionsPage';
import { QuestionnairesPage } from '@/views/activityManagement/questionnaires/QuestionnairesPage';
import { ActivitiesPage } from '@/views/activityManagement/activities/ActivitiesPage';
import { ProgressionPage } from '@/views/activityManagement/progression/ProgressionPage';
import { AssessmentRulesPage } from '@/views/activityManagement/assessment/AssessmentRulesPage';
import { SkillsPage } from '@/views/activityManagement/skills/SkillsPage';
import { RhymesPage, StoriesPage } from '@/views/library/LibraryPage';
import { CommerceHubPage } from '@/views/commerce/CommerceHubPage';
import { SubscriptionsPage } from '@/views/commerce/SubscriptionsPage';
import { MemoriesPage } from '@/views/commerce/MemoriesPage';
import { ShopPage } from '@/views/commerce/ShopPage';
import { NotificationsPage } from '@/views/notifications/NotificationsPage';
import { AppContentPage } from '@/views/appContent/AppContentPage';
import { ChecklistPage } from '@/views/checklist/ChecklistPage';

/**
 * Built pages, keyed by section path. A section without an entry renders SectionPlaceholder,
 * so the whole nav is navigable from day one. Replace placeholders as modules are built.
 */
const PAGES: Record<string, ComponentType> = {
  '/': OverviewPage,
  '/team': TeamPage,
  '/audit': AuditPage,
  '/drafts': DraftApprovalsPage,
  '/users/parents': RegisteredUsersPage,
  '/users/children': ChildrenLearningPage,
  '/users/community': CommunityPage,
  '/users/feedback': FeedbackPage,
  '/users/activity-reviews': ActivityReviewsPage,
  '/users/enquiries': EnquiriesPage,
  '/activity-management/milestones': MilestonesPage,
  '/activity-management/regions': RegionsPage,
  '/activity-management/questionnaires': QuestionnairesPage,
  '/activity-management/activities': ActivitiesPage,
  '/activity-management/progression': ProgressionPage,
  '/activity-management/assessment-rules': AssessmentRulesPage,
  '/activity-management/skills': SkillsPage,
  '/stories': StoriesPage,
  '/rhymes': RhymesPage,
  '/commerce/subscriptions': SubscriptionsPage,
  '/commerce/memories': MemoriesPage,
  '/commerce/shop': ShopPage,
  '/notifications': NotificationsPage,
  '/app-content': AppContentPage,
  '/parent-checklist': ChecklistPage,
};

/** Hub pages with more than the card grid, keyed by group path. */
const HUBS: Record<string, ComponentType> = {
  '/commerce': CommerceHubPage,
};

function sectionRoutes(): RouteObject[] {
  return NAV_GROUPS.flatMap((group) => {
    const isHub = group.sections.length > 1;
    const back = isHub ? { to: group.path, label: group.label } : undefined;

    const routes: RouteObject[] = group.sections.map((section) => {
      const Page = PAGES[section.path];
      return {
        path: section.path,
        element: (
          <RouteGuard access={section.access}>
            {Page ? <Page /> : <SectionPlaceholder section={section} back={back} />}
          </RouteGuard>
        ),
      };
    });

    if (isHub) {
      // A group can have its own hub page (HUBS); otherwise the generic card grid.
      const Hub = HUBS[group.path];
      routes.push({
        path: group.path,
        element: (
          <RouteGuard anyOf={group.sections.map((s) => s.access)}>
            {Hub ? <Hub /> : <HubPage group={group} subtitle={group.hubSubtitle ?? ''} />}
          </RouteGuard>
        ),
      });
    }
    return routes;
  });
}

const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: (
      <RouteGuard>
        <AppShell />
      </RouteGuard>
    ),
    children: [...sectionRoutes(), { path: '*', element: <Navigate to="/" replace /> }],
  },
]);

/** The admin panel: every route, built from constants/navigation.ts + the PAGES map above. */
export default function App() {
  return <RouterProvider router={router} />;
}
