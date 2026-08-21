export type FaqItem = {
  id: string;
  question: string;
  answer: string[];
};

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "how-it-works",
    question: "How does Chalk Passport work?",
    answer: [
      "Chalk Passport is a climbing log that only you can open — your personal passport. Each stamp (the place, date, grade, notes, and any clip) stays on your account. Other climbers cannot browse your visits.",
      "Places themselves are shared so the next person can find the same gym or crag. Your sends are not a social feed.",
    ],
  },
  {
    id: "unverified",
    question: "What does Unverified mean?",
    answer: [
      "Add a missing gym or crag from Log a visit. There is no separate queue and no review inbox.",
      "New places stay searchable as Unverified. Your stamp counts on your passport immediately. When a second climber independently stamps the same place, it publishes for everyone.",
      "If a listing looks fake or wrong, reports can hide it.",
    ],
  },
  {
    id: "add-place",
    question: "How do I add a place that isn’t listed?",
    answer: [
      "In Log a visit, type the name and continue. You’ll set gym vs rock, what it offers, and the grade scale as you stamp.",
      "That’s the only way community places get into the catalog.",
    ],
  },
  {
    id: "grades",
    question: "How do house grades compare to V?",
    answer: [
      "House colours and numbers are what the gym uses. The V-scale next to them is a community approximation — useful for a rough compare, not an official conversion.",
    ],
  },
  {
    id: "clips",
    question: "Can I add a video to a stamp?",
    answer: [
      "Paste a public TikTok, Instagram, or YouTube link. We embed a preview; the file stays on that app. Clips live on your visit, so they stay private with the rest of your passport.",
    ],
  },
  {
    id: "delete",
    question: "How do I delete a stamp or my account?",
    answer: [
      "Open a stamp to edit or delete it. To wipe everything, go to Account → Manage account → Delete account. That removes your login and stamps.",
    ],
  },
];
