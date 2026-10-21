/**
 * App Content starting text (API_REQUESTS #24): Terms, Privacy, Help / enquiry and 2 FAQs per parent
 * page, from the client prototype with its prototype-only wording removed (the same list as
 * ll-frontend/src/views/appContent/seed.ts; 17 FAQs that only described the prototype are left out).
 * It is sample wording, not client-approved text:
 * - base seed: fills the WORKING DRAFT only, when it is empty; staff review it and publish themselves;
 * - demo seed: also publishes it as version 1 (dev only).
 * Keys follow the prototype: faq.{page}.{n}.
 */
import type { PrismaClient } from '@prisma/client';

type Surface = 'TERMS' | 'PRIVACY' | 'HELP' | 'PAGE_FAQ';
export interface SeedEntry {
  key: string;
  surface: Surface;
  page: string | null;
  title: string;
  body: string;
}

const FAQS: [page: string, question: string, answer: string][] = [
  ["community", "How do I share a moment?", "Use the message box or attachment button, then send your post for review."],
  ["community", "Will my post appear straight away?", "Posts go through admin review before appearing."],
  ["signin", "How do I sign in?", "Enter your email and password, then choose Sign in."],
  ["signin", "Forgot your password?", "Choose Forgot password to open the recovery flow."],
  ["signup", "Whose details should I enter?", "Use the parent or caregiver details on this form. Child profiles are managed separately."],
  ["forgot", "Which email should I use?", "Use the email associated with your parent account."],
  ["otp", "What is this code for?", "This screen represents the verification step in account recovery."],
  ["reset", "What password should I choose?", "Use a new password you have not used before."],
  ["reset", "Will this change a real password?", "No."],
  ["children", "How do I choose a child?", "Select the child's profile to continue with that child."],
  ["children", "How do I add another child?", "Use Add a little one to open the child profile form."],
  ["addChild", "What is this profile for?", "The child's details help personalise the activity and story experience."],
  ["addChild", "Can I change the details later?", "Open the child's profile menu and choose the edit option."],
  ["editChild", "What can I update here?", "Change the available child details and save your changes."],
  ["editChild", "How do I leave without saving?", "Use the back button before saving the form."],
  ["removeChild", "Does it delete a real account?", "No."],
  ["hook", "What do the four cards explain?", "They introduce activities, personalised stories, parent prompts, and memories. Tap a card for details."],
  ["hook", "Where does Explore our plans take me?", "It opens the subscription comparison chart."],
  ["home", "How do I start an activity?", "Choose a development area. The first visit may ask you to complete a short questionnaire."],
  ["home", "How do I change the selected child?", "Tap the child's name to return to child profiles."],
  ["level", "Where can I find activities for this level?", "Continue to the activity list for this development area."],
  ["activities", "How do I choose an activity?", "Tap an activity to see its preview and instructions."],
  ["activityPreview", "What is guided mode?", "Guided mode presents the activity instructions one step at a time."],
  ["activityPreview", "What is individual mode?", "Individual mode offers an activity timer so you can explore at your own pace."],
  ["individual", "Can I pause the timer?", "Yes. Use Pause timer while it is running, then start it again when ready."],
  ["individual", "What happens when I finish?", "You will be asked whether your child did the activity independently, with help, or did not do it, then continue to feedback."],
  ["activityOutcome", "What does independently mean?", "Choose Independently if your child did the activity without help completing it."],
  ["activityOutcome", "Which answer should I choose if we did not do it?", "Choose Did not do the activity. If you helped your child complete it, choose With help instead."],
  ["growth", "Is this shown after Finish activity?", "No. Finish activity now opens the participation question before feedback."],
  ["feedback", "What is the rating about?", "It asks how satisfied you were with the activity overall."],
  ["feedback", "Do I have to leave feedback?", "No. Use Skip in the header, or add a rating, optional comment and attachment before saving."],
  ["stories", "How do I find a story?", "Browse the shelf or choose a category such as Nature, Kindness, or Bedtime."],
  ["stories", "How do I open a story?", "Tap a cover to view its details and chapters."],
  ["storyDetail", "How do I begin reading?", "Select a chapter from the chapter list."],
  ["chapterComplete", "How do I continue the story?", "Choose Go to next chapter."],
  ["chapterComplete", "Can I return to the chapter list?", "Yes. Choose Go back to chapters, or Back to stories to visit the library."],
  ["storyComplete", "Can I read this story again?", "Choose Go back to chapters and select a chapter."],
  ["storyComplete", "How do I find another story?", "Choose Back to stories to return to the library."],
  ["subscription", "How do I compare plans?", "Read each feature row across the Free, Plus, and Premium columns."],
  ["subscription", "Does choosing a plan charge me?", "No. Choose a plan to review it first."],
  ["reviewSubscription", "What should I review?", "Check the selected plan, monthly billing period, and displayed amount."],
  ["reviewSubscription", "Can I choose a different plan?", "Use Change plan to return to the comparison chart."],
  ["subscriptionPayment", "Will this payment be processed?", "No."],
  ["subscriptionPayment", "Should I enter real card details?", "No."],
  ["notifications", "Are these live notifications?", "No."],
  ["settings", "What can I access from settings?", "Use the options on this screen to open profile, preferences, help, and other account pages."],
  ["settings", "How do I return to the app?", "Use the back control to return to the previous screen."],
  ["profile", "Whose profile is this?", "This is the parent account profile. Child profiles are managed separately."],
  ["profile", "Are changes sent to a server?", "No."],
  ["help", "How do I ask for help?", "Use the enquiry option to open the message form."],
  ["help", "Will my enquiry be sent?", "No."],
  ["terms", "Are these the final terms?", "No."],
  ["terms", "Where can I read about privacy?", "Open the Privacy policy link on this page."],
  ["privacy", "Is this the final privacy policy?", "No."],
  ["qCognitive", "What does this questionnaire cover?", "These questions focus on thinking and noticing. Answer based on what you have observed in your child."],
  ["qCognitive", "Is the thinking and noticing questionnaire a test?", "No. It helps describe your child's current experience; choose the answers that fit best."],
  ["qPhysical", "What does this questionnaire cover?", "These questions focus on movement and coordination. Answer based on what you have observed in your child."],
  ["qPhysical", "Is the movement and coordination questionnaire a test?", "No. It helps describe your child's current experience; choose the answers that fit best."],
  ["qEmotional", "What does this questionnaire cover?", "These questions focus on recognising and expressing feelings. Answer based on what you have observed in your child."],
  ["qEmotional", "Is the recognising and expressing feelings questionnaire a test?", "No. It helps describe your child's current experience; choose the answers that fit best."],
  ["qSocial", "What does this questionnaire cover?", "These questions focus on sharing and connecting. Answer based on what you have observed in your child."],
  ["qSocial", "Is the sharing and connecting questionnaire a test?", "No. It helps describe your child's current experience; choose the answers that fit best."],
  ["qCreative", "What does this questionnaire cover?", "These questions focus on imagination and making. Answer based on what you have observed in your child."],
  ["qCreative", "Is the imagination and making questionnaire a test?", "No. It helps describe your child's current experience; choose the answers that fit best."],
  ["qLanguage", "What does this questionnaire cover?", "These questions focus on listening, understanding and communicating. Answer based on what you have observed in your child."],
  ["qLanguage", "Is the listening, understanding and communicating questionnaire a test?", "No. It helps describe your child's current experience; choose the answers that fit best."],
  ["step1", "What should I do in step 1?", "Follow the instruction shown on this page and give your child time to explore."],
  ["step1", "What happens after step 1?", "Continue to the next guided instruction when ready."],
  ["reader1", "How do I navigate from page 1?", "Swipe the image cards, use the arrow buttons, or choose a page dot. Keyboard users can use left and right arrows in the carousel."],
  ["step2", "What should I do in step 2?", "Follow the instruction shown on this page and give your child time to explore."],
  ["step2", "What happens after step 2?", "Continue to the next guided instruction when ready."],
  ["reader2", "How do I navigate from page 2?", "Swipe the image cards, use the arrow buttons, or choose a page dot. Keyboard users can use left and right arrows in the carousel."],
  ["step3", "What should I do in step 3?", "Follow the instruction shown on this page and give your child time to explore."],
  ["step3", "What happens after step 3?", "Continue to the participation question, then give feedback."],
  ["reader3", "How do I navigate from page 3?", "Swipe the image cards, use the arrow buttons, or choose a page dot. Keyboard users can use left and right arrows in the carousel."],
];

const number = new Map<string, number>();
export const APP_CONTENT_ENTRIES: SeedEntry[] = [
  { key: 'terms', surface: 'TERMS', page: null, title: 'Terms of use', body: 'Approved terms will appear here.' },
  {
    key: 'privacy',
    surface: 'PRIVACY',
    page: null,
    title: "Your family's privacy",
    body: 'Approved privacy wording will describe how parent and child information is collected, used, stored and protected.',
  },
  { key: 'help', surface: 'HELP', page: null, title: 'A little help', body: 'Find answers or talk to our team.' },
  { key: 'enquiry', surface: 'HELP', page: null, title: 'Enquiry?', body: 'Send your question to the Little Legacy team.' },
  ...FAQS.map(([page, title, body]): SeedEntry => {
    const n = (number.get(page) ?? 0) + 1;
    number.set(page, n);
    return { key: `faq.${page}.${n}`, surface: 'PAGE_FAQ', page, title, body };
  }),
];

/** Base seed: the working draft, only when it is empty (staff edits are never overwritten). */
export async function seedAppContentDraft(prisma: PrismaClient) {
  if (await prisma.appContentEntry.count()) return;
  await prisma.appContentEntry.createMany({ data: APP_CONTENT_ENTRIES });
  console.log(`✔ App Content working draft: ${APP_CONTENT_ENTRIES.length} entries (not published)`);
}

/** Demo seed: version 1 = the working draft, when nothing is published yet. */
export async function seedDemoAppContentVersion(prisma: PrismaClient) {
  if (await prisma.appContentVersion.count()) return;
  const entries = await prisma.appContentEntry.findMany({ orderBy: { key: 'asc' } });
  if (!entries.length) return;
  const snapshot = Object.fromEntries(entries.map((e) => [e.key, { surface: e.surface, page: e.page, title: e.title, body: e.body }]));
  await prisma.appContentVersion.create({ data: { version: 1, entries: snapshot, publishedAt: new Date('2026-10-01T09:00:00Z') } });
  await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('app_content_versions', 'version'), (SELECT MAX(version) FROM app_content_versions))`);
  console.log(`✔ Demo App Content: version 1 published (${entries.length} entries)`);
}
