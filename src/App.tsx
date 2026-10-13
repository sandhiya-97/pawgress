import { useEffect, useMemo, useRef, useState, type ComponentType, type CSSProperties, type FormEvent, type PointerEvent, type ReactNode } from 'react';
import {
  Activity,
  ArrowRight,
  Bookmark,
  BookOpen,
  Check,
  ChevronRight,
  CircleHelp,
  Clock3,
  ExternalLink,
  Flame,
  FolderKanban,
  Globe2,
  LayoutDashboard,
  LibraryBig,
  Lock,
  Menu,
  MessageCircle,
  Music2,
  MousePointer2,
  Orbit,
  Pause,
  PawPrint,
  Play,
  RotateCcw,
  Search,
  SkipBack,
  SkipForward,
  Sparkles,
  Star,
  Target,
  Trophy,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import { supabase, supabaseRedirectUrl } from './lib/supabase';
import type { FieldNote, PawgressUserData, Project } from './types';

type View = 'today' | 'month' | 'projects' | 'vault' | 'progress';
type IconType = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

type Mission = {
  day: number;
  title: string;
  category: string;
  time: string;
  overview: string;
  prompt: string;
  takeaway: string;
  color: 'rose' | 'aqua' | 'mint' | 'violet';
};

type VaultItem = {
  day: number;
  kind: string;
  title: string;
  excerpt: string;
  duration: string;
};

type AccountState = {
  loading: boolean;
  authenticated: boolean;
  userId?: string;
  email?: string;
};

const MISSIONS: Mission[] = [
  { day: 1, title: 'Big O Notation & Time/Space Complexity', category: 'Arrays & fundamentals', time: '25 min', overview: 'Learn to read the cost of an algorithm before you run it, using time and space complexity as your first problem-solving lens.', prompt: 'Take one familiar loop and describe its time and space complexity in Big O.', takeaway: 'Big O is a map of how an algorithm scales as the input grows.', color: 'rose' },
  { day: 2, title: 'Arrays & Strings', category: 'Arrays & fundamentals', time: '25 min', overview: 'Build fluency with contiguous data, indexing, traversal, and the string operations that power many interview problems.', prompt: 'Implement one array or string operation twice: once clearly, then once with tighter space.', takeaway: 'Strong fundamentals make later patterns feel like combinations instead of magic.', color: 'aqua' },
  { day: 3, title: 'Hash Maps & Hash Sets', category: 'Arrays & fundamentals', time: '25 min', overview: 'Turn repeated searches into constant-time lookups by choosing the right key, value, and membership structure.', prompt: 'Solve a frequency-count or duplicate-detection problem with a hash map or set.', takeaway: 'A good data structure can remove an entire nested loop.', color: 'mint' },
  { day: 4, title: 'Prefix Sums', category: 'Arrays & fundamentals', time: '25 min', overview: 'Precompute running totals so range queries become simple arithmetic instead of repeated traversal.', prompt: 'Build a prefix-sum array and answer three range-sum queries by hand.', takeaway: 'Precomputation trades a little space for much faster repeated questions.', color: 'violet' },
  { day: 5, title: 'Two Pointers', category: 'Arrays & fundamentals', time: '25 min', overview: 'Learn how two moving indices can shrink a search space while preserving a useful invariant.', prompt: 'Trace a two-pointer solution for a sorted pair-sum or palindrome problem.', takeaway: 'The right pointer movement turns brute force into a linear scan.', color: 'rose' },
  { day: 6, title: 'Sliding Window', category: 'Arrays & fundamentals', time: '25 min', overview: 'Maintain a moving range to solve subarray and substring problems without restarting work at every index.', prompt: 'Find the longest valid window in a string or array and state its invariant.', takeaway: 'A window remembers what the previous window already learned.', color: 'aqua' },
  { day: 7, title: 'Revision & Mock Interview', category: 'Week 1 review', time: '35 min', overview: 'Consolidate the first week by explaining core patterns aloud and solving one timed fundamentals problem.', prompt: 'Run a 20-minute mock: clarify, plan, code, test, and explain your complexity.', takeaway: 'Revision turns isolated tricks into a reusable problem-solving toolkit.', color: 'mint' },
  { day: 8, title: 'Binary Search', category: 'Core data structures', time: '25 min', overview: 'Search sorted space by repeatedly discarding half the possibilities while keeping your boundaries precise.', prompt: 'Write binary search with an explicit loop invariant and test edge cases.', takeaway: 'Binary search is disciplined elimination, not just a library call.', color: 'violet' },
  { day: 9, title: 'Binary Search on Answers', category: 'Core data structures', time: '30 min', overview: 'Apply binary search to a possible answer range when feasibility changes monotonically.', prompt: 'Identify the decision function for a capacity or minimum-speed problem.', takeaway: 'When answers are ordered and feasibility is monotonic, search the answer itself.', color: 'rose' },
  { day: 10, title: 'Stacks & Queues', category: 'Core data structures', time: '25 min', overview: 'Use last-in-first-out and first-in-first-out behavior to model parsing, scheduling, and monotonic decisions.', prompt: 'Choose a stack or queue for a problem and explain why the order matters.', takeaway: 'The access rule of a data structure is often the whole solution idea.', color: 'aqua' },
  { day: 11, title: 'Linked Lists', category: 'Core data structures', time: '25 min', overview: 'Practice pointer manipulation, insertion, deletion, and careful handling of heads and tails.', prompt: 'Reverse a linked list on paper, naming every pointer before moving it.', takeaway: 'Pointer problems reward slow, explicit state changes.', color: 'mint' },
  { day: 12, title: 'Fast & Slow Pointers', category: 'Core data structures', time: '25 min', overview: 'Use pointers moving at different speeds to detect cycles, find middles, and split linked structures.', prompt: 'Trace cycle detection and explain why the pointers must eventually meet.', takeaway: 'Different speeds reveal structure without extra memory.', color: 'violet' },
  { day: 13, title: 'Intervals & Merging', category: 'Core data structures', time: '25 min', overview: 'Sort ranges and sweep through them to merge overlaps, schedule events, and track boundaries.', prompt: 'Merge a set of intervals and state the condition that creates an overlap.', takeaway: 'Sorting exposes the order that makes local decisions safe.', color: 'rose' },
  { day: 14, title: 'Weekly Mock Interview', category: 'Week 2 review', time: '35 min', overview: 'Practice a complete data-structures interview under a timer, from clarification to complexity trade-offs.', prompt: 'Solve one medium problem aloud without looking at notes, then review your misses.', takeaway: 'Interview readiness comes from communicating your reasoning, not only reaching code.', color: 'aqua' },
  { day: 15, title: 'Recursion Fundamentals', category: 'Trees, heaps & graphs', time: '25 min', overview: 'Build recursive thinking with base cases, smaller subproblems, and a clear return-value contract.', prompt: 'Draw the call stack for a recursive traversal or factorial-like problem.', takeaway: 'Every recursive solution needs a stopping point and progress toward it.', color: 'mint' },
  { day: 16, title: 'Binary Trees & DFS', category: 'Trees, heaps & graphs', time: '30 min', overview: 'Traverse binary trees depth-first and learn when preorder, inorder, or postorder matches the question.', prompt: 'Choose a DFS order for a tree problem and explain what each return value means.', takeaway: 'Tree recursion becomes simple when each subtree reports one useful fact.', color: 'violet' },
  { day: 17, title: 'BFS & Binary Search Trees', category: 'Trees, heaps & graphs', time: '30 min', overview: 'Explore level-order traversal and the ordering property that makes binary search trees useful.', prompt: 'Traverse a tree by levels and compare its behavior with DFS.', takeaway: 'BFS measures distance in layers; a BST organizes values by direction.', color: 'rose' },
  { day: 18, title: 'Heaps & Priority Queues', category: 'Trees, heaps & graphs', time: '25 min', overview: 'Keep the smallest or largest next item available while processing streams, schedules, and top-k questions.', prompt: 'Decide whether a min-heap or max-heap fits a top-k problem.', takeaway: 'A heap preserves the next priority without fully sorting everything.', color: 'aqua' },
  { day: 19, title: 'Graphs & Graph Traversal', category: 'Trees, heaps & graphs', time: '30 min', overview: 'Represent relationships with adjacency structures and traverse connected components safely.', prompt: 'Convert a small edge list into an adjacency list and mark visited nodes.', takeaway: 'Graphs are the language of relationships, and traversal is their basic grammar.', color: 'mint' },
  { day: 20, title: 'Graph BFS & Topological Sorting', category: 'Trees, heaps & graphs', time: '30 min', overview: 'Use graph breadth-first search for shortest unweighted paths and topological order for dependencies.', prompt: 'Find the indegree changes in a course-schedule style graph.', takeaway: 'Dependencies become actionable when you repeatedly remove what is ready.', color: 'violet' },
  { day: 21, title: 'Weekly Assessment', category: 'Week 3 review', time: '40 min', overview: 'Assess your trees, heaps, and graphs week with a timed problem plus a review of representation and traversal choices.', prompt: 'Complete one graph or tree problem, then write down the first wrong assumption you made.', takeaway: 'Assessment is information about where your pattern recognition needs another rep.', color: 'rose' },
  { day: 22, title: 'Greedy Algorithms', category: 'Advanced patterns', time: '30 min', overview: 'Make locally optimal choices when you can prove they preserve a globally optimal outcome.', prompt: 'Find the exchange argument or invariant behind a classic greedy problem.', takeaway: 'Greedy is powerful only when the local choice has a proof behind it.', color: 'aqua' },
  { day: 23, title: 'Backtracking', category: 'Advanced patterns', time: '30 min', overview: 'Explore a decision tree, undo choices cleanly, and prune branches that cannot lead to a valid answer.', prompt: 'Draw the recursion tree for subsets, permutations, or a constraint puzzle.', takeaway: 'Backtracking is structured exploration with a reliable undo button.', color: 'mint' },
  { day: 24, title: 'Dynamic Programming I: Memoization & Tabulation', category: 'Advanced patterns', time: '35 min', overview: 'Recognize overlapping subproblems and turn repeated recursion into stored results.', prompt: 'Write one DP solution top-down, then translate it into a bottom-up table.', takeaway: 'DP begins by naming the state and the smaller answers it depends on.', color: 'violet' },
  { day: 25, title: 'Dynamic Programming II: State Transitions & Optimisation', category: 'Advanced patterns', time: '35 min', overview: 'Refine dynamic programs by defining transitions, ordering computation, and reducing unnecessary memory.', prompt: 'Take a two-dimensional DP and identify whether the previous row is all you need.', takeaway: 'A compact state is a clearer model, not only a memory optimization.', color: 'rose' },
  { day: 26, title: 'Bit Manipulation & Bitwise Operations', category: 'Advanced patterns', time: '25 min', overview: 'Use binary representation, masks, shifts, and XOR to express compact state and clever invariants.', prompt: 'Trace XOR on a small list and explain which values cancel out.', takeaway: 'Bits are another data structure: tiny, exact, and surprisingly expressive.', color: 'aqua' },
  { day: 27, title: 'Mixed-Pattern Problem Solving', category: 'Advanced patterns', time: '35 min', overview: 'Practice identifying the pattern before coding when a problem combines arrays, graphs, pointers, or dynamic programming.', prompt: 'For three unseen problems, name the likely pattern and reject one tempting wrong approach.', takeaway: 'Pattern selection is the bridge between knowing tools and solving problems.', color: 'mint' },
  { day: 28, title: 'Timed Technical Interview Simulation', category: 'Advanced patterns', time: '45 min', overview: 'Rehearse the full interview loop with a timer, verbal reasoning, tests, trade-offs, and a clean final explanation.', prompt: 'Run a 35-minute simulation without pausing the clock, then score clarity and correctness separately.', takeaway: 'A calm process makes your technical thinking easier to see.', color: 'violet' },
  { day: 29, title: 'Weakness Revision & Failed Problems', category: 'Final review', time: '35 min', overview: 'Return to failed problems, classify the reason for the miss, and repair the exact gap instead of rereading everything.', prompt: 'Choose three failed problems and write the pattern, mistake, and corrected invariant for each.', takeaway: 'Failed problems are a personalized curriculum when you study the failure precisely.', color: 'rose' },
  { day: 30, title: 'Final Assessment & Interview Review', category: 'Final review', time: '45 min', overview: 'Close the roadmap with a final assessment and a review of the patterns, explanations, and habits you want to carry into interviews.', prompt: 'Complete one final problem under interview conditions and write your next 30-day practice plan.', takeaway: 'The roadmap is complete when you can choose a pattern, explain it, and keep improving from evidence.', color: 'aqua' },
];

const VAULT_ITEMS: VaultItem[] = [
  { day: 1, kind: 'Core concept', title: 'Complexity compass', excerpt: 'Use time and space growth to compare algorithms before you optimize.', duration: '5 min read' },
  { day: 6, kind: 'Pattern card', title: 'Window invariants', excerpt: 'A sliding window remembers enough context to move forward without restarting.', duration: '6 min read' },
  { day: 11, kind: 'Data structure', title: 'Pointer choreography', excerpt: 'Linked-list problems become manageable when every pointer move is explicit.', duration: '5 min read' },
  { day: 16, kind: 'Traversal guide', title: 'The tree call stack', excerpt: 'A subtree can report exactly the fact its parent needs next.', duration: '7 min read' },
  { day: 20, kind: 'Graph pattern', title: 'Ready nodes first', excerpt: 'Indegree and queue state reveal a topological order through dependencies.', duration: '7 min read' },
  { day: 25, kind: 'DP field note', title: 'Name the state', excerpt: 'A precise state and transition make dynamic programming less mysterious.', duration: '8 min read' },
  { day: 30, kind: 'Interview review', title: 'Your pattern map', excerpt: 'A compact map of patterns, invariants, and repair notes for future practice.', duration: '10 min read' },
];

const NAV_ITEMS: { id: View; label: string; icon: IconType; hint: string }[] = [
  { id: 'today', label: 'Today', icon: LayoutDashboard, hint: 'Your next move' },
  { id: 'month', label: 'Month 1 — DSA', icon: Orbit, hint: '30-day roadmap' },
  { id: 'projects', label: 'Projects', icon: FolderKanban, hint: 'Build in public' },
  { id: 'vault', label: 'Knowledge Vault', icon: LibraryBig, hint: 'Saved insights' },
  { id: 'progress', label: 'Progress', icon: Activity, hint: 'Your momentum' },
];

const STORAGE_COMPLETED = 'pawgress-month-one-dsa-completed';
const STORAGE_NOTES = 'pawgress-month-one-dsa-notes';
const STORAGE_PROJECTS = 'pawgress-projects';
const STORAGE_NAME = 'pawgress-user-name';
const STORAGE_ACCOUNT_ID = 'pawgress-account-id';
const GUEST_SCOPE = 'guest';

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function scopedStorageKey(key: string, scope: string) {
  return `${key}:${scope || GUEST_SCOPE}`;
}

function clientId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readLocalData(scope: string): PawgressUserData {
  const storedNotes = readStorage<unknown>(scopedStorageKey(STORAGE_NOTES, scope), readStorage(STORAGE_NOTES, {}));
  const now = new Date().toISOString();
  const notes: FieldNote[] = Array.isArray(storedNotes)
    ? storedNotes as FieldNote[]
    : Object.entries((storedNotes ?? {}) as Record<string, string>).map(([day, content]) => ({ id: `local-note-${day}`, day: Number(day), content, createdAt: now, updatedAt: now }));
  const projects = readStorage<Project[]>(scopedStorageKey(STORAGE_PROJECTS, scope), readStorage(STORAGE_PROJECTS, [])).map((project) => ({ ...project, id: project.id.startsWith('project-') ? clientId() : project.id }));
  return {
    nickname: readStorage(scopedStorageKey(STORAGE_NAME, scope), readStorage(STORAGE_NAME, '')),
    completed: readStorage<number[]>(scopedStorageKey(STORAGE_COMPLETED, scope), readStorage(STORAGE_COMPLETED, [])),
    notes,
    projects,
  };
}

function notesByDay(notes: FieldNote[]) {
  return new Map(notes.map((note) => [note.day, note]));
}

function mergeUserData(remote: PawgressUserData, local: PawgressUserData): PawgressUserData {
  const mergedNotes = notesByDay(remote.notes);
  local.notes.forEach((note) => { if (!mergedNotes.has(note.day)) mergedNotes.set(note.day, note); });
  const remoteProjectKeys = new Set(remote.projects.map((project) => `${project.title.trim().toLowerCase()}|${project.link.trim().toLowerCase()}`));
  const mergedProjects = [...remote.projects, ...local.projects.filter((project) => !remoteProjectKeys.has(`${project.title.trim().toLowerCase()}|${project.link.trim().toLowerCase()}`))];
  return {
    nickname: remote.nickname.trim() || local.nickname.trim(),
    completed: [...new Set([...remote.completed, ...local.completed])].sort((a, b) => a - b),
    notes: [...mergedNotes.values()].sort((a, b) => a.day - b.day),
    projects: mergedProjects,
  };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function withTimeout<T>(promise: Promise<T>, milliseconds: number, message: string) {
  return Promise.race([promise, new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error(message)), milliseconds))]);
}

async function loadRemoteData(userId: string): Promise<PawgressUserData> {
  if (!supabase) throw new Error('Supabase is not configured');
  const [profileResult, progressResult, notesResult, projectsResult] = await Promise.all([
    supabase.from('profiles').select('nickname').eq('id', userId).maybeSingle(),
    supabase.from('mission_progress').select('day').eq('user_id', userId).order('day'),
    supabase.from('field_notes').select('id, day, content, created_at, updated_at').eq('user_id', userId).order('day'),
    supabase.from('projects').select('id, title, description, link, category, status').eq('user_id', userId).order('created_at', { ascending: false }),
  ]);
  const firstError = [profileResult.error, progressResult.error, notesResult.error, projectsResult.error].find(Boolean);
  if (firstError) throw new Error(firstError.message);
  return {
    nickname: (profileResult.data as { nickname?: string } | null)?.nickname ?? '',
    completed: ((progressResult.data ?? []) as Array<{ day: number }>).map((row) => row.day),
    notes: ((notesResult.data ?? []) as Array<{ id: string; day: number; content: string; created_at: string; updated_at: string }>).map((row) => ({ id: row.id, day: row.day, content: row.content, createdAt: row.created_at, updatedAt: row.updated_at })),
    projects: (projectsResult.data ?? []) as Project[],
  };
}

async function syncRemoteData(userId: string, data: PawgressUserData) {
  if (!supabase) throw new Error('Supabase is not configured');
  const profileResult = await supabase.from('profiles').upsert({ id: userId, nickname: data.nickname.trim().slice(0, 24) });
  if (profileResult.error) throw new Error(profileResult.error.message);
  if (data.completed.length) {
    const progressResult = await supabase.from('mission_progress').upsert(data.completed.map((day) => ({ user_id: userId, day })), { onConflict: 'user_id,day' });
    if (progressResult.error) throw new Error(progressResult.error.message);
  }
  if (data.notes.length) {
    const notesResult = await supabase.from('field_notes').upsert(data.notes.map((note) => ({ user_id: userId, day: note.day, content: note.content.trim() })), { onConflict: 'user_id,day' });
    if (notesResult.error) throw new Error(notesResult.error.message);
  }
  if (data.projects.length) {
    const projectsResult = await supabase.from('projects').upsert(data.projects.map((project) => ({ ...(isUuid(project.id) ? { id: project.id } : {}), user_id: userId, title: project.title, description: project.description, link: project.link, category: project.category, status: project.status })));
    if (projectsResult.error) throw new Error(projectsResult.error.message);
  }
}

function padDay(day: number) {
  return day.toString().padStart(2, '0');
}

function projectHost(link: string) {
  try {
    return new URL(link).hostname.replace('www.', '');
  } catch {
    return 'saved link';
  }
}

function useAeroSounds() {
  const contextRef = useRef<AudioContext | null>(null);
  const [enabled, setEnabled] = useState(false);
  const getContext = () => {
    if (!contextRef.current) contextRef.current = new AudioContext();
    if (contextRef.current.state === 'suspended') void contextRef.current.resume();
    return contextRef.current;
  };
  const playSequence = (notes: Array<{ frequency: number; duration: number; delay: number; type?: OscillatorType }>, force = false) => {
    if (!enabled && !force) return;
    const context = getContext();
    const start = context.currentTime;
    notes.forEach(({ frequency, duration, delay, type = 'sine' }) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, start + delay);
      gain.gain.setValueAtTime(0.0001, start + delay);
      gain.gain.exponentialRampToValueAtTime(0.045, start + delay + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + delay + duration);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start + delay);
      oscillator.stop(start + delay + duration + 0.03);
    });
  };
  const playStartup = (force = false) => playSequence([{ frequency: 392, duration: .22, delay: 0, type: 'triangle' }, { frequency: 523.25, duration: .24, delay: .13, type: 'triangle' }, { frequency: 659.25, duration: .28, delay: .28, type: 'sine' }, { frequency: 783.99, duration: .5, delay: .43, type: 'sine' }], force);
  const playBubble = () => playSequence([{ frequency: 740, duration: .09, delay: 0, type: 'sine' }, { frequency: 1046, duration: .14, delay: .06, type: 'sine' }]);
  const playClick = () => playSequence([{ frequency: 520, duration: .06, delay: 0, type: 'square' }]);
  const playMessage = () => playSequence([{ frequency: 660, duration: .08, delay: 0, type: 'triangle' }, { frequency: 880, duration: .14, delay: .08, type: 'triangle' }]);
  const playSuccess = () => playSequence([{ frequency: 523.25, duration: .12, delay: 0, type: 'triangle' }, { frequency: 659.25, duration: .12, delay: .1, type: 'triangle' }, { frequency: 783.99, duration: .24, delay: .2, type: 'triangle' }]);
  const toggle = () => { const next = !enabled; setEnabled(next); if (next) playStartup(true); };
  return { enabled, toggle, playBubble, playClick, playMessage, playSuccess };
}

function useAeroMusic() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const tracks = [{ title: 'Ocean Bubbles', artist: 'Pawgress · supplied track' }];
  const trackIndex = 0;
  useEffect(() => {
    const audio = new Audio('/oceanbubbles.mp3');
    audio.loop = true;
    audio.volume = .38;
    audioRef.current = audio;
    const handleEnded = () => setPlaying(false);
    audio.addEventListener('ended', handleEnded);
    return () => { audio.pause(); audio.removeEventListener('ended', handleEnded); audioRef.current = null; };
  }, []);
  const start = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    try { await audio.play(); setPlaying(true); } catch { setPlaying(false); }
  };
  const stop = () => { audioRef.current?.pause(); setPlaying(false); };
  const toggle = () => { if (playing) stop(); else void start(); };
  const selectTrack = (_nextTrack: number) => { if (playing) void start(); };
  const changeTrack = (_direction: number) => { /* The supplied ocean track is the single active atmosphere. */ };
  return { playing, trackIndex, tracks, toggle, changeTrack, selectTrack };
}

function App() {
  const [activeView, setActiveView] = useState<View>('today');
  const [initialGuestData] = useState<PawgressUserData>(() => readLocalData(GUEST_SCOPE));
  const [completed, setCompleted] = useState<number[]>(initialGuestData.completed);
  const [notes, setNotes] = useState<FieldNote[]>(initialGuestData.notes);
  const [projects, setProjects] = useState<Project[]>(initialGuestData.projects);
  const [displayName, setDisplayName] = useState(initialGuestData.nickname);
  const [nameDraft, setNameDraft] = useState(initialGuestData.nickname);
  const [nameEditorOpen, setNameEditorOpen] = useState(() => !initialGuestData.nickname.trim());
  const [account, setAccount] = useState<AccountState>({ loading: false, authenticated: false });
  const [syncReady, setSyncReady] = useState(true);
  const [profileHydrated, setProfileHydrated] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [reflection, setReflection] = useState('');
  const [showReflection, setShowReflection] = useState(false);
  const [previewDay, setPreviewDay] = useState(1);
  const [selectedResource, setSelectedResource] = useState<VaultItem | null>(null);
  const [toast, setToast] = useState('');
  const [celebration, setCelebration] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const hydratedSessionRef = useRef<string | null | undefined>(undefined);
  const sounds = useAeroSounds();
  const music = useAeroMusic();

  const completedSet = useMemo(() => new Set(completed), [completed]);
  const allComplete = completed.length >= MISSIONS.length;
  const currentDay = allComplete ? MISSIONS.length : Math.min(MISSIONS.length, completed.length + 1);
  const currentMission = MISSIONS[currentDay - 1];
  const previewMission = MISSIONS[previewDay - 1] ?? currentMission;
  const completionPercent = Math.round((completed.length / MISSIONS.length) * 100);
  const unlockedCount = Math.min(MISSIONS.length, currentDay);
  const streak = completed.length;
  const workspaceName = account.authenticated ? displayName : (displayName || readStorage(scopedStorageKey(STORAGE_NAME, GUEST_SCOPE), ''));

  useEffect(() => {
    window.localStorage.setItem(scopedStorageKey(STORAGE_COMPLETED, account.userId ?? GUEST_SCOPE), JSON.stringify(completed));
  }, [account.userId, completed]);

  useEffect(() => {
    const legacyNotes = Object.fromEntries(notes.map((note) => [note.day, note.content]));
    window.localStorage.setItem(scopedStorageKey(STORAGE_NOTES, account.userId ?? GUEST_SCOPE), JSON.stringify(legacyNotes));
  }, [account.userId, notes]);

  useEffect(() => {
    window.localStorage.setItem(scopedStorageKey(STORAGE_PROJECTS, account.userId ?? GUEST_SCOPE), JSON.stringify(projects));
  }, [account.userId, projects]);

  useEffect(() => {
    if (!displayName.trim()) return;
    window.localStorage.setItem(scopedStorageKey(STORAGE_NAME, account.userId ?? GUEST_SCOPE), JSON.stringify(displayName));
    if (!account.authenticated) window.localStorage.setItem(STORAGE_NAME, JSON.stringify(displayName));
  }, [account.userId, displayName]);

  useEffect(() => {
    let active = true;
    const applySession = async (session: { user: { id: string; email?: string | null } } | null) => {
      const sessionKey = session?.user.id ?? null;
      if (hydratedSessionRef.current === sessionKey) return;
      hydratedSessionRef.current = sessionKey;
      if (!active) return;
      setAccount({ loading: true, authenticated: Boolean(session), userId: session?.user.id, email: session?.user.email ?? undefined });
      setSyncError('');
      if (!session) {
        const guest = readLocalData(GUEST_SCOPE);
        setAccount({ loading: false, authenticated: false });
        setDisplayName(guest.nickname);
        setNameDraft(guest.nickname);
        setCompleted(guest.completed);
        setNotes(guest.notes);
        setProjects(guest.projects);
        setNameEditorOpen(!guest.nickname.trim());
        setProfileHydrated(true);
        setSyncReady(true);
        return;
      }
      try {
        const remote = await withTimeout(loadRemoteData(session.user.id), 7000, 'Supabase data request timed out. Apply the Pawgress migration and check the project URL.');
        const merged = mergeUserData(remote, readLocalData(GUEST_SCOPE));
        if (!active) return;
        window.localStorage.setItem(STORAGE_ACCOUNT_ID, session.user.id);
        setAccount({ loading: false, authenticated: true, userId: session.user.id, email: session.user.email ?? undefined });
        setDisplayName(merged.nickname);
        setNameDraft(merged.nickname);
        setCompleted(merged.completed);
        setNotes(merged.notes);
        setProjects(merged.projects);
        setNameEditorOpen(!merged.nickname.trim());
        setProfileHydrated(true);
        setSyncReady(true);
        void syncRemoteData(session.user.id, merged).catch((error: unknown) => setSyncError(error instanceof Error ? error.message : 'Unable to migrate local progress'));
      } catch (error) {
        if (!active) return;
        const accountLocal = readLocalData(session.user.id);
        setAccount({ loading: false, authenticated: true, userId: session.user.id, email: session.user.email ?? undefined });
        setDisplayName(accountLocal.nickname);
        setNameDraft(accountLocal.nickname);
        setCompleted(accountLocal.completed);
        setNotes(accountLocal.notes);
        setProjects(accountLocal.projects);
        setNameEditorOpen(!accountLocal.nickname.trim());
        setProfileHydrated(true);
        setSyncReady(false);
        setSyncError(error instanceof Error ? error.message : 'Supabase data could not be loaded. Apply the Pawgress migration first.');
      }
    };
    if (!supabase) {
      setAccount({ loading: false, authenticated: false });
      setProfileHydrated(true);
      setSyncReady(true);
      setSyncError('Supabase is not configured for this environment.');
      return () => { active = false; };
    }
    const sessionTimeout = window.setTimeout(() => {
      if (hydratedSessionRef.current === undefined) {
        setSyncError('Supabase session check timed out; you can continue locally and retry sign-in.');
        void applySession(null);
      }
    }, 5000);
    let authListener: { subscription: { unsubscribe: () => void } } | null = null;
    try {
      const registration = supabase.auth.onAuthStateChange((_event, session) => {
        window.setTimeout(() => void applySession(session ? { user: { id: session.user.id, email: session.user.email } } : null), 0);
      });
      authListener = registration.data;
      void supabase.auth.getSession().then(({ data, error }) => {
        if (error) setSyncError(error.message);
        void applySession(data.session ? { user: { id: data.session.user.id, email: data.session.user.email } } : null);
      }).catch((error: unknown) => {
        if (!active) return;
        setSyncError(error instanceof Error ? error.message : 'Supabase session could not be loaded');
        void applySession(null);
      });
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : 'Supabase Auth could not start');
      void applySession(null);
    }
    return () => { active = false; window.clearTimeout(sessionTimeout); authListener?.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!syncReady || !profileHydrated || !account.authenticated || !account.userId) return;
    const timer = window.setTimeout(() => {
      setSyncing(true);
      void syncRemoteData(account.userId!, { nickname: displayName, completed, notes, projects })
        .then(() => setSyncError(''))
        .catch((error: unknown) => setSyncError(error instanceof Error ? error.message : 'Unable to sync progress'))
        .finally(() => setSyncing(false));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [account.authenticated, account.userId, completed, displayName, notes, profileHydrated, projects, syncReady]);

  useEffect(() => {
    if (account.authenticated || displayName.trim()) return;
    const guest = readLocalData(GUEST_SCOPE);
    if (!guest.nickname.trim()) return;
    setDisplayName(guest.nickname);
    setNameDraft(guest.nickname);
    setNameEditorOpen(false);
  }, [account.authenticated, displayName]);

  useEffect(() => {
    setPreviewDay(currentDay);
  }, [currentDay]);

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(''), 2800);
  };

  const upsertFieldNote = (day: number, content: string) => {
    const now = new Date().toISOString();
    setNotes((previous) => {
      const existing = previous.find((note) => note.day === day);
      const nextNote: FieldNote = { id: existing?.id ?? `local-note-${day}`, day, content, createdAt: existing?.createdAt ?? now, updatedAt: now };
      return existing ? previous.map((note) => note.day === day ? nextNote : note) : [...previous, nextNote].sort((a, b) => a.day - b.day);
    });
  };

  const saveFieldNote = (day: number, content: string, notify = true) => {
    const normalized = content.trim().slice(0, 4000);
    if (!normalized) {
      showToast('Write a sentence before saving your field note');
      return false;
    }
    upsertFieldNote(day, normalized);
    if (notify) showToast(`Field note for Day ${padDay(day)} saved`);
    return true;
  };

  const deleteFieldNote = async (note: FieldNote) => {
    setNotes((previous) => previous.filter((item) => item.id !== note.id));
    if (account.authenticated && account.userId && supabase && isUuid(note.id)) {
      const { error } = await supabase.from('field_notes').delete().eq('id', note.id).eq('user_id', account.userId);
      if (error) setSyncError(error.message);
    }
    showToast('Field note removed');
  };

  const completeCurrentDay = () => {
    if (allComplete || completedSet.has(currentDay)) return;
    setCompleted((previous: number[]) => [...previous, currentDay]);
    if (reflection.trim()) saveFieldNote(currentDay, reflection, false);
    setReflection('');
    setShowReflection(false);
    setCelebration(true);
    sounds.playSuccess();
    showToast(`Day ${padDay(currentDay)} added to your field notes`);
    window.setTimeout(() => setCelebration(false), 3600);
  };

  const navigate = (view: View) => {
    setActiveView(view);
    setSidebarOpen(false);
    sounds.playClick();
  };

  const toggleNavigation = () => {
    if (window.innerWidth <= 780) {
      setSidebarOpen(false);
      return;
    }
    setSidebarCollapsed((current) => !current);
  };

  const addProject = (draft: Omit<Project, 'id'>) => {
    const normalizedLink = /^https?:\/\//i.test(draft.link) ? draft.link : `https://${draft.link}`;
    setProjects((previous) => [{ ...draft, id: clientId(), link: normalizedLink }, ...previous]);
    sounds.playSuccess();
    showToast('Project pinned to your workspace');
  };

  const saveDisplayName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextName = (nameDraft.trim() || workspaceName.trim()).slice(0, 24);
    if (!nextName) return;
    setDisplayName(nextName);
    setNameDraft(nextName);
    setNameEditorOpen(false);
    sounds.playMessage();
    showToast(`Welcome, ${nextName}`);
  };

  const beginLogin = async () => {
    if (!supabase) {
      setSyncError('Supabase is not configured for this environment.');
      return;
    }
    setAuthBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: supabaseRedirectUrl() } });
    if (error) {
      setAuthBusy(false);
      setSyncError(error.message);
    }
  };

  const signOut = async () => {
    setAuthBusy(true);
    if (supabase) await supabase.auth.signOut();
    const guest = readLocalData(GUEST_SCOPE);
    hydratedSessionRef.current = undefined;
    setAccount({ loading: false, authenticated: false });
    setCompleted(guest.completed);
    setNotes(guest.notes);
    setProjects(guest.projects);
    setDisplayName(guest.nickname);
    setNameDraft(guest.nickname);
    setNameEditorOpen(!guest.nickname.trim());
    setProfileHydrated(true);
    setSyncReady(true);
    setAuthBusy(false);
    showToast('Signed out — guest progress is still here on this device');
  };

  const inspectDay = (day: number) => {
    if (day <= currentDay || completedSet.has(day)) {
      setPreviewDay(day);
      navigate('today');
      return;
    }
    showToast(`Day ${padDay(day)} unlocks after you complete today’s focus`);
  };

  const openTodayMission = () => {
    setPreviewDay(currentDay);
    navigate('today');
    window.setTimeout(() => document.querySelector('.mission-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  };

  return (
    <div className="app-shell">
      <AmbientScene />
      <AeroBackdrop />
      <AeroBubbleField onPop={sounds.playBubble} />
      <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''} ${sidebarCollapsed ? 'is-collapsed' : ''}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><PawPrint size={22} strokeWidth={2.4} /></div>
          <div>
            <span className="brand-name">pawgress</span>
            <span className="brand-subtitle">month 1 / DSA roadmap</span>
          </div>
          <button className="icon-button sidebar-close" aria-label={sidebarCollapsed ? 'Open dashboard navigation' : 'Close dashboard navigation'} onClick={toggleNavigation}>{sidebarCollapsed ? <Menu size={18} /> : <X size={18} />}</button>
        </div>

        <div className="sidebar-profile glass-panel">
          <div className="avatar-orb"><PawMascot compact /></div>
          <div className="profile-copy"><strong>{displayName || 'Curious mind'}</strong><span>{account.authenticated ? 'Synced workspace' : 'Local until you sign in'}</span></div>
          <span className="online-dot" aria-label="Active" />
        </div>

        <nav className="primary-nav" aria-label="Primary navigation">
          <span className="nav-kicker">Your workspace</span>
          {NAV_ITEMS.map(({ id, label, icon: Icon, hint }) => (
            <button key={id} className={`nav-item ${activeView === id ? 'is-active' : ''}`} onClick={() => navigate(id)}>
              <span className="nav-icon"><Icon size={18} strokeWidth={2.2} /></span>
              <span className="nav-label"><strong>{label}</strong><small>{hint}</small></span>
              {activeView === id && <span className="nav-active-pip" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-arc glass-panel">
          <div className="arc-heading"><span>Month 1 · DSA arc</span><span>{completionPercent}%</span></div>
          <div className="tiny-progress"><span style={{ width: `${completionPercent}%` }} /></div>
          <p>{allComplete ? 'Field guide complete. You made it.' : `${MISSIONS.length - completed.length} focused days left to explore.`}</p>
          <button className="text-button" onClick={() => navigate('progress')}>See momentum <ArrowRight size={13} /></button>
        </div>

        <div className="sidebar-footer"><span className="footer-orbit"><Orbit size={14} /></span><span>Made for small, bright steps</span></div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button className={`icon-button mobile-menu ${sidebarCollapsed ? 'is-visible' : ''}`} aria-label="Open dashboard navigation" onClick={() => { setSidebarOpen(true); setSidebarCollapsed(false); }}><Menu size={20} /></button>
            <div className="breadcrumb"><button className="breadcrumb-workspace" onClick={() => { setSidebarCollapsed(false); navigate('today'); }}>Workspace</button><ChevronRight size={14} /><strong>{activeView === 'today' ? 'Today' : NAV_ITEMS.find((item) => item.id === activeView)?.label}</strong></div>
          </div>
          <div className="topbar-actions">
            <div className="streak-pill"><Flame size={15} fill="currentColor" /><span>{streak} day streak</span></div>
            <button className="icon-button sound-button" aria-label={sounds.enabled ? 'Mute Aero sounds' : 'Enable Aero startup chime and sounds'} aria-pressed={sounds.enabled} title={sounds.enabled ? 'Mute Aero sounds' : 'Enable Aero startup chime and sounds'} onClick={sounds.toggle}>{sounds.enabled ? <Volume2 size={17} /> : <VolumeX size={17} />}</button>
            <button className="icon-button help-button" aria-label="Help"><CircleHelp size={18} /></button>
            {account.loading || authBusy ? <span className="sync-status"><Globe2 size={12} /> connecting</span> : account.authenticated ? <><span className={`sync-status ${syncing ? '' : 'is-synced'}`}><Globe2 size={12} /> {syncing ? 'saving' : 'synced'}</span><button className="sync-button" onClick={() => void signOut()}>Sign out</button></> : <button className="sync-button" onClick={() => void beginLogin()}><Globe2 size={13} /> Continue with Google</button>}
            <button className="mini-profile" onClick={() => { setNameDraft(workspaceName); setNameEditorOpen(true); }} aria-label="Edit your nickname"><span className="mini-avatar"><PawMascot compact /></span><span className="mini-name">{workspaceName || 'Choose a nickname'}</span><ChevronRight size={14} /></button>
          </div>
        </header>

        <div className="content-scroll">
          {syncError && <div className="sync-error" role="alert"><CircleHelp size={15} /><span>{syncError}</span></div>}
          <AmbientAvatarWorld currentDay={currentDay} completionPercent={completionPercent} />
          {activeView === 'today' && (
            <TodayView
              currentMission={currentMission}
              currentDay={currentDay}
              completed={completedSet}
              completionPercent={completionPercent}
              streak={streak}
              reflection={reflection}
              showReflection={showReflection}
              setReflection={setReflection}
              setShowReflection={setShowReflection}
              onComplete={completeCurrentDay}
              onOpenMission={openTodayMission}
              onNavigate={navigate}
              onInspectDay={inspectDay}
              previewMission={previewMission}
              previewDay={previewDay}
              allComplete={allComplete}
              notes={notes}
              onSaveNote={saveFieldNote}
            />
          )}
          {activeView === 'month' && (
            <MonthView currentDay={currentDay} completed={completedSet} completionPercent={completionPercent} onInspectDay={inspectDay} onNavigate={navigate} />
          )}
          {activeView === 'projects' && (
            <ProjectsView projects={projects} onAddProject={addProject} />
          )}
          {activeView === 'vault' && (
            <VaultView currentDay={currentDay} completed={completedSet} notes={notes} onSelect={setSelectedResource} onSaveNote={saveFieldNote} onDeleteNote={deleteFieldNote} />
          )}
          {activeView === 'progress' && (
            <ProgressView completed={completedSet} completionPercent={completionPercent} currentDay={currentDay} streak={streak} notes={notes} onNavigate={navigate} />
          )}
        </div>
      </main>

      <MusicPlayer music={music} />

      {nameEditorOpen && (
        <div className="name-dialog-backdrop" role="presentation">
          <form className="name-dialog glass-panel" onSubmit={saveDisplayName}>
            <div className="dialog-orb"><PawMascot compact /></div>
            <span className="eyebrow"><Sparkles size={12} /> YOUR LITTLE WORKSPACE</span>
            <h2>{workspaceName ? 'Update your nickname' : 'What should we call you?'}</h2>
            <p>Choose a nickname for your private DSA workspace so each small step feels like yours.</p>
            <label htmlFor="display-name">Your nickname</label>
            <input id="display-name" value={nameDraft || workspaceName} onChange={(event) => setNameDraft(event.target.value)} placeholder="e.g. Alex, Nova, Sam..." maxLength={24} autoFocus />
            <button className="primary-button" type="submit" disabled={!nameDraft.trim()}>Start working <ArrowRight size={14} /></button>
            {account.authenticated && <button className="quiet-button dialog-signout" type="button" onClick={() => { setNameEditorOpen(false); void signOut(); }}>Sign out of this workspace</button>}
          </form>
        </div>
      )}

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => <button key={id} className={activeView === id ? 'is-active' : ''} onClick={() => navigate(id)}><Icon size={18} /><span>{label === 'Knowledge Vault' ? 'Vault' : label}</span></button>)}
      </nav>

      {celebration && <Celebration />}
      {toast && <div className="toast"><span className="toast-icon"><Check size={15} /></span><span>{toast}</span></div>}
      {selectedResource && <ResourceModal resource={selectedResource} onClose={() => setSelectedResource(null)} />}
    </div>
  );
}

function AmbientScene() {
  return <div className="ambient-scene" aria-hidden="true"><span className="aero-sun" /><span className="aero-cloud cloud-one" /><span className="aero-cloud cloud-two" /><span className="aero-hill hill-back" /><span className="aero-hill hill-front" /><span className="aero-waterline" /><span className="aero-fish fish-one">◒</span><span className="aero-fish fish-two">◓</span><span className="aero-butterfly">✦</span><span className="ambient-blob blob-one" /><span className="ambient-blob blob-two" /><span className="ambient-blob blob-three" /><span className="ambient-star star-one">✦</span><span className="ambient-star star-two">✧</span><span className="ambient-star star-three">✦</span></div>;
}

function AeroBackdrop() {
  return <div className="aero-backdrop" aria-hidden="true"><span className="backdrop-sun" /><span className="backdrop-cloud cloud-left" /><span className="backdrop-cloud cloud-right" /><span className="backdrop-horizon" /><span className="backdrop-water" /><span className="backdrop-caustics" /><span className="backdrop-globe globe-left" /><span className="backdrop-globe globe-right" /><span className="surreal-orb orb-left" /><span className="surreal-orb orb-right" /><span className="surreal-ribbon" /><span className="surreal-ring" /></div>;
}

function MusicPlayer({ music }: { music: ReturnType<typeof useAeroMusic> }) {
  const [open, setOpen] = useState(false);
  const track = music.tracks[music.trackIndex];
  if (!open) return <button className={`music-launcher ${music.playing ? 'is-playing' : ''}`} onClick={() => setOpen(true)} aria-label="Open Aero music player" title="Open Aero music player"><Music2 size={18} /><span className="music-launcher-dot" /></button>;
  return <aside className={`music-player glass-panel ${music.playing ? 'is-playing' : ''}`} aria-label="Aero music player"><div className="music-player-top"><span className="music-disc"><span>♪</span></span><div><span className="music-kicker">Aero FM · supplied track</span><strong>{track.title}</strong><small>{track.artist}</small></div><span className="music-eq"><i /><i /><i /><i /></span><button className="music-close" onClick={() => setOpen(false)} aria-label="Close music player"><X size={13} /></button></div><label className="music-playlist-label" htmlFor="aero-playlist">Current background track</label><select id="aero-playlist" className="music-playlist" value={music.trackIndex} onChange={(event) => music.selectTrack(Number(event.target.value))}>{music.tracks.map((item, index) => <option key={item.title} value={index}>{item.title}</option>)}</select><div className="music-progress"><span style={{ width: music.playing ? '62%' : '24%' }} /></div><div className="music-controls"><button onClick={() => music.changeTrack(-1)} aria-label="Previous track"><SkipBack size={13} /></button><button className="music-play" onClick={music.toggle} aria-label={music.playing ? 'Pause music' : 'Play music'}>{music.playing ? <Pause size={15} /> : <Play size={15} />}</button><button onClick={() => music.changeTrack(1)} aria-label="Next track"><SkipForward size={13} /></button><span className="music-status">{music.playing ? 'ocean bubbles playing' : 'ready to float'}</span></div></aside>;
}

function AeroBubbleField({ onPop }: { onPop: () => void }) {
  const [popped, setPopped] = useState<number[]>([]);
  const bubbles = [{ left: '8%', top: '22%', size: 32, delay: '0s' }, { left: '18%', top: '72%', size: 18, delay: '1.8s' }, { left: '39%', top: '12%', size: 22, delay: '.9s' }, { left: '71%', top: '30%', size: 17, delay: '2.2s' }, { left: '87%', top: '63%', size: 38, delay: '1.2s' }, { left: '58%', top: '84%', size: 25, delay: '2.8s' }];
  const pop = (index: number) => { setPopped((current) => [...current, index]); onPop(); window.setTimeout(() => setPopped((current) => current.filter((item) => item !== index)), 720); };
  return <div className="bubble-field" aria-label="Interactive floating glass bubbles">{bubbles.map((bubble, index) => <button key={`${bubble.left}-${bubble.top}`} className={`aero-bubble ${popped.includes(index) ? 'is-popped' : ''}`} style={{ left: bubble.left, top: bubble.top, width: bubble.size, height: bubble.size, animationDelay: bubble.delay }} onClick={() => pop(index)} aria-label="Pop glass bubble"><span /></button>)}</div>;
}

function TodayView({
  currentMission,
  currentDay,
  completed,
  completionPercent,
  streak,
  reflection,
  showReflection,
  setReflection,
  setShowReflection,
  onComplete,
  onOpenMission,
  onNavigate,
  onInspectDay,
  previewMission,
  previewDay,
  allComplete,
  notes,
  onSaveNote,
}: {
  currentMission: Mission;
  currentDay: number;
  completed: Set<number>;
  completionPercent: number;
  streak: number;
  reflection: string;
  showReflection: boolean;
  setReflection: (value: string) => void;
  setShowReflection: (value: boolean) => void;
  onComplete: () => void;
  onOpenMission: () => void;
  onNavigate: (view: View) => void;
  onInspectDay: (day: number) => void;
  previewMission: Mission;
  previewDay: number;
  allComplete: boolean;
  notes: FieldNote[];
  onSaveNote: (day: number, content: string) => boolean;
}) {
  const activePreview = previewDay !== currentDay ? previewMission : currentMission;
  return <div className="view-stack">
    <section className="hero-grid">
      <div className="hero-copy">
        <div className="eyebrow"><span className="eyebrow-dot" /> {allComplete ? 'DSA roadmap complete' : `Day ${padDay(currentDay)} / 30`}</div>
        <h1>Your mind is a <em>pattern</em> engine.</h1>
        <p className="hero-lede">A 30-day DSA roadmap for building reliable problem-solving instincts, one pattern and one interview rep at a time.</p>
        <div className="hero-actions"><button className="primary-button" onClick={onOpenMission}><span>{allComplete ? 'Review field guide' : 'Open today’s mission'}</span><ArrowRight size={16} /></button><button className="quiet-button" onClick={() => onNavigate('month')}><Orbit size={15} /> Explore the arc</button></div>
        <div className="hero-meta"><span><Clock3 size={14} /> 25–45 min / day</span><span><MousePointer2 size={14} /> Tap to interact</span><span><Zap size={14} /> No catch-up guilt</span></div>
      </div>
      <OrbitalScene completionPercent={completionPercent} currentDay={currentDay} />
    </section>

    <section className="stats-row" aria-label="Your progress at a glance">
      <StatCard icon={<Target size={18} />} label="Current focus" value={`Day ${padDay(currentDay)}`} detail={currentMission.category} accent="rose" />
      <StatCard icon={<Flame size={18} />} label="Soft streak" value={`${streak} ${streak === 1 ? 'day' : 'days'}`} detail="Keep the thread warm" accent="aqua" />
      <StatCard icon={<BookOpen size={18} />} label="Arc progress" value={`${completionPercent}%`} detail={`${completed.size} of 30 complete`} accent="mint" />
      <StatCard icon={<Sparkles size={18} />} label="Saved notes" value={`${notes.length}`} detail="Ideas worth reopening" accent="violet" />
    </section>

    <section className="dashboard-grid">
      <article className="mission-card glass-panel">
        <div className="card-topline"><span className="section-label"><span className="label-spark">✦</span> Today’s mission</span><span className="status-chip"><span className="status-pulse" /> {allComplete ? 'Complete' : 'In focus'}</span></div>
        <div className="mission-heading"><span className={`mission-day-badge ${activePreview.color}`}>DAY<br /><strong>{padDay(activePreview.day)}</strong></span><div><div className="category-line"><span>{activePreview.category}</span><i /> <span>{activePreview.time}</span></div><h2>{activePreview.title}</h2></div></div>
        <p className="mission-overview">{activePreview.overview}</p>
        <div className="mission-lens"><span className="lens-icon"><LightbulbIcon /></span><div><span className="lens-label">The lens</span><p>{activePreview.takeaway}</p></div></div>
        {activePreview.day === currentDay && !allComplete ? <>
          <div className="mission-prompt"><span className="prompt-kicker">FIELD NOTE / {padDay(currentDay)}</span><p>{activePreview.prompt}</p></div>
          {showReflection && <><textarea value={reflection} onChange={(event) => setReflection(event.target.value)} placeholder="A sentence is enough. What did this shift for you?" rows={3} aria-label="Add a field note" /><div className="note-save-row"><button className="quiet-button" type="button" onClick={() => onSaveNote(currentDay, reflection)}><Bookmark size={14} /> Save field note</button>{notes.some((note) => note.day === currentDay) && <span className="saved-note-label"><Check size={12} /> saved locally and to your workspace</span>}</div></>}
          <div className="mission-footer"><button className="complete-button" onClick={onComplete}><span className="complete-check"><Check size={14} /></span> Complete this day <ArrowRight size={15} /></button><button className="reflection-button" onClick={() => setShowReflection(!showReflection)}>{showReflection ? 'Hide note' : 'Add a field note'} <Bookmark size={14} /></button></div>
        </> : <div className="review-banner"><Check size={16} /><span>{completed.has(activePreview.day) ? 'You have already completed this focus. Reopen it whenever you want.' : 'Finish your current focus to unlock this mission.'}</span></div>}
      </article>

      <aside className="runway-card glass-panel">
        <div className="card-topline"><span className="section-label"><span className="label-spark">✦</span> The runway</span><button className="small-link" onClick={() => onNavigate('month')}>View all <ArrowRight size={13} /></button></div>
        <div className="runway-header"><div><strong>Month 1 · DSA</strong><span>30-day roadmap</span></div><span className="runway-percent">{completionPercent}%</span></div>
        <div className="runway-progress"><span style={{ width: `${Math.max(4, completionPercent)}%` }} /></div>
        <div className="runway-days">{Array.from({ length: 30 }, (_, index) => { const day = index + 1; return <button key={day} aria-label={`Day ${day}`} onClick={() => onInspectDay(day)} className={`runway-day ${completed.has(day) ? 'is-done' : day === currentDay ? 'is-current' : day < currentDay ? 'is-open' : 'is-locked'}`}>{completed.has(day) ? <Check size={10} /> : day < currentDay ? <span className="dot-mark" /> : day}</button>; })}</div>
        <div className="runway-legend"><span><i className="legend-dot done" /> complete</span><span><i className="legend-dot current" /> current</span><span><i className="legend-dot future" /> future</span></div>
        <div className="runway-quote"><span>“</span><p>Consistency is just returning to the thread.</p></div>
      </aside>
    </section>

    <section className="lower-grid">
      <article className="vault-teaser glass-panel"><div className="card-topline"><span className="section-label"><span className="label-spark">✦</span> Fresh from the vault</span><button className="small-link" onClick={() => onNavigate('vault')}>Open vault <ArrowRight size={13} /></button></div><div className="teaser-content"><div className="teaser-icon"><LibraryBig size={20} /></div><div><h3>{completed.size ? 'Your notes are starting to glow.' : 'Your first note is waiting.'}</h3><p>{completed.size ? 'Reopen a saved lens, connect it to today’s idea, and let the pattern compound.' : 'Complete today’s focus and the first insight will be pinned here for later.'}</p></div></div><div className="teaser-tags"><span>core concepts</span><span>field notes</span><span>mental models</span></div></article>
      <article className="companion-card glass-panel"><div className="companion-scene"><PawMascot /></div><div><span className="section-label">Your companion</span><h3>Orbit is keeping the light on.</h3><p>Small, bright steps count. Especially the ones nobody else sees.</p><button className="text-button" onClick={() => onNavigate('progress')}>See your momentum <ArrowRight size={13} /></button></div></article>
    </section>
  </div>;
}

function LightbulbIcon() { return <Sparkles size={17} strokeWidth={2.2} />; }

function OrbitalScene({ completionPercent, currentDay }: { completionPercent: number; currentDay: number }) {
  const [tilt, setTilt] = useState({ x: -7, y: 12 });
  const style = { '--tilt-x': `${tilt.x}deg`, '--tilt-y': `${tilt.y}deg`, '--orbit-progress': `${completionPercent}%` } as CSSProperties;
  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: -y * 18, y: x * 22 });
  };
  return <div className="orbital-scene" style={style} onPointerMove={handleMove} onPointerLeave={() => setTilt({ x: -7, y: 12 })}>
    <div className="scene-caption"><span className="caption-dot" /> live field map <span className="caption-day">DAY {padDay(currentDay)}</span></div>
    <div className="scene-grid" />
    <div className="orbit-shadow" />
    <div className="orbit-ring ring-back" /><div className="orbit-ring ring-mid" /><div className="orbit-ring ring-front" />
    <div className="orbital-core"><div className="core-glow" /><div className="core-planet"><div className="planet-highlight" /><div className="planet-crater crater-one" /><div className="planet-crater crater-two" /><div className="planet-land land-one" /><div className="planet-land land-two" /></div><div className="core-paw"><PawPrint size={31} fill="currentColor" strokeWidth={1.2} /></div><div className="core-label">mind / in motion</div></div>
    <span className="floating-token token-one"><BookOpen size={14} /></span><span className="floating-token token-two"><Star size={13} fill="currentColor" /></span><span className="floating-token token-three"><Zap size={13} /></span>
    <div className="scene-floor"><span /> <span /> <span /> <span /> <span /></div>
  </div>;
}

function StatCard({ icon, label, value, detail, accent }: { icon: ReactNode; label: string; value: string; detail: string; accent: string }) {
  return <div className={`stat-card ${accent}`}><span className="stat-icon">{icon}</span><div><span className="stat-label">{label}</span><strong>{value}</strong><small>{detail}</small></div></div>;
}

function MonthView({ currentDay, completed, completionPercent, onInspectDay, onNavigate }: { currentDay: number; completed: Set<number>; completionPercent: number; onInspectDay: (day: number) => void; onNavigate: (view: View) => void }) {
  return <div className="view-stack"><PageIntro eyebrow="The 30-day runway" title="Month 1 — DSA: 30-Day Roadmap" description="Thirty focused days from complexity fundamentals to interview review. Take the next open problem; the rest can wait." action={<button className="primary-button small" onClick={() => onNavigate('today')}><Play size={14} fill="currentColor" /> Go to today</button>} />
    <section className="month-overview glass-panel"><div className="overview-copy"><span className="section-label"><span className="label-spark">✦</span> One clear arc</span><h2>DSA is a <em>pattern language</em>, not a pile.</h2><p>Each day is a focused pattern, a problem-solving lens, and a small rep you can carry forward. The sequence moves from fundamentals to interview readiness.</p><div className="overview-pills"><span><Clock3 size={14} /> 25–45 min daily</span><span><MousePointer2 size={14} /> Click any open day</span><span><Sparkles size={14} /> No perfect streak required</span></div></div><div className="overview-ring"><ProgressRing percent={completionPercent} size={148} /><span><strong>{completed.size}</strong><small>days explored</small></span></div></section>
    <section className="curriculum-panel glass-panel"><div className="card-topline"><div><span className="section-label"><span className="label-spark">✦</span> Month 1 · DSA curriculum</span><h2>Build the pattern map</h2></div><div className="curriculum-progress"><span>{completed.size} / 30 complete</span><div className="tiny-progress"><span style={{ width: `${completionPercent}%` }} /></div></div></div><div className="day-grid">{MISSIONS.map((mission) => { const isDone = completed.has(mission.day); const isCurrent = mission.day === currentDay; const isOpen = mission.day <= currentDay; return <button key={mission.day} onClick={() => onInspectDay(mission.day)} className={`day-tile ${isDone ? 'is-done' : isCurrent ? 'is-current' : isOpen ? 'is-open' : 'is-locked'}`}><span className="tile-number">{isDone ? <Check size={13} /> : padDay(mission.day)}</span><span className="tile-title">{mission.title}</span><span className={`tile-category ${mission.color}`}>{mission.category}</span>{isCurrent && <span className="current-badge">current</span>}{!isOpen && <Lock size={13} className="tile-lock" />}</button>; })}</div><div className="curriculum-footer"><span><i className="legend-dot done" /> completed</span><span><i className="legend-dot current" /> current focus</span><span><i className="legend-dot future" /> waiting for you</span></div></section>
  </div>;
}

function VaultView({ currentDay, completed, notes, onSelect, onSaveNote, onDeleteNote }: { currentDay: number; completed: Set<number>; notes: FieldNote[]; onSelect: (item: VaultItem) => void; onSaveNote: (day: number, content: string) => boolean; onDeleteNote: (note: FieldNote) => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'core' | 'field'>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<FieldNote | null>(null);
  const [editorDay, setEditorDay] = useState(currentDay);
  const [draft, setDraft] = useState('');
  const unlockedItems = VAULT_ITEMS.filter((item) => item.day <= currentDay);
  const normalizedQuery = query.trim().toLowerCase();
  const visibleItems = filter === 'field' ? [] : unlockedItems.filter((item) => `${item.kind} ${item.title} ${item.excerpt}`.toLowerCase().includes(normalizedQuery));
  const visibleNotes = filter === 'core' ? [] : notes.filter((note) => `field note day ${note.day} ${note.content}`.toLowerCase().includes(normalizedQuery));
  const openNewNote = () => { setEditingNote(null); setEditorDay(currentDay); setDraft(''); setEditorOpen(true); };
  const openEditNote = (note: FieldNote) => { setEditingNote(note); setEditorDay(note.day); setDraft(note.content); setEditorOpen(true); };
  const submitNote = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (onSaveNote(editorDay, draft)) { setEditorOpen(false); setDraft(''); } };
  return <div className="view-stack"><PageIntro eyebrow="Your idea shelf" title="Knowledge, with a place to land." description="Every completed mission leaves a little more light behind. Reopen a lens, add a note, or follow the thread back to the day it came from." action={<div className="vault-count"><LibraryBig size={16} /><span><strong>{unlockedItems.length}</strong> unlocked resources</span></div>} />
    <div className="vault-toolbar glass-panel"><div className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your vault" aria-label="Search your vault" /></div><div className="vault-filters" role="group" aria-label="Vault filters"><button className={`filter-chip ${filter === 'all' ? 'is-active' : ''}`} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All notes</button><button className={`filter-chip ${filter === 'core' ? 'is-active' : ''}`} aria-pressed={filter === 'core'} onClick={() => setFilter('core')}>Core concepts</button><button className={`filter-chip ${filter === 'field' ? 'is-active' : ''}`} aria-pressed={filter === 'field'} onClick={() => setFilter('field')}>Field notes</button><button className="primary-button small" onClick={openNewNote}><Bookmark size={14} /> New field note</button></div></div>
    {editorOpen && <form className="note-editor glass-panel" onSubmit={submitNote}><div><span className="section-label"><Bookmark size={13} /> {editingNote ? 'Edit field note' : 'Capture a field note'}</span><h3>{editingNote ? `Day ${padDay(editingNote.day)} note` : 'Give the thought a place to land.'}</h3></div><label>Mission day<select value={editorDay} onChange={(event) => setEditorDay(Number(event.target.value))}>{Array.from({ length: currentDay }, (_, index) => index + 1).map((day) => <option key={day} value={day}>Day {padDay(day)} — {MISSIONS[day - 1].title}</option>)}</select></label><label>Your note<textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="What shifted, clicked, or deserves another look?" maxLength={4000} rows={4} autoFocus /></label><div className="note-editor-actions"><button className="quiet-button" type="button" onClick={() => setEditorOpen(false)}>Cancel</button><button className="primary-button small" type="submit"><Check size={14} /> Save field note</button></div></form>}
    <section className="vault-grid">{visibleItems.map((item) => { const isComplete = completed.has(item.day); return <button key={item.title} className="vault-card glass-panel is-unlocked" onClick={() => onSelect(item)}><div className="vault-card-icon unlocked"><Bookmark size={18} /></div><div className="vault-card-copy"><div className="vault-card-meta"><span>{item.kind}</span><i /> <span>Day {padDay(item.day)}</span></div><h3>{item.title}</h3><p>{item.excerpt}</p></div><div className="vault-card-footer"><span>{item.duration}</span>{isComplete && <span className="saved-mark"><Check size={12} /> explored</span>}<ChevronRight size={15} /></div></button>; })}{visibleNotes.map((note) => <article key={note.id} className="vault-card glass-panel is-unlocked field-note-card"><div className="vault-card-icon unlocked"><Bookmark size={18} /></div><div className="vault-card-copy"><div className="vault-card-meta"><span>Field note</span><i /> <span>Day {padDay(note.day)}</span></div><h3>{MISSIONS[note.day - 1]?.title ?? 'Mission note'}</h3><p>{note.content}</p></div><div className="vault-card-footer"><span>Saved</span><button className="note-card-action" onClick={() => openEditNote(note)} aria-label={`Edit Day ${note.day} field note`}>Edit</button><button className="note-card-action danger" onClick={() => onDeleteNote(note)} aria-label={`Delete Day ${note.day} field note`}>Delete</button></div></article>)}</section>
    {!visibleItems.length && !visibleNotes.length && <section className="vault-note glass-panel"><div className="note-orbit"><Search size={23} /></div><div><span className="section-label">Nothing in this view yet</span><h3>{filter === 'field' ? 'Your first field note is waiting.' : 'Try a different search.'}</h3><p>{filter === 'field' ? 'Capture a thought from the current mission and it will stay with your workspace.' : 'Search by a concept, mission title, or note phrase.'}</p></div></section>}
    <section className="vault-note glass-panel"><div className="note-orbit"><Orbit size={23} /></div><div><span className="section-label">A small invitation</span><h3>Don’t just collect the note. Use it.</h3><p>When an idea reappears in a real decision, that is when it becomes part of your operating system.</p></div><Sparkles className="note-sparkle" size={20} /> </section>
  </div>;
}

function ProgressView({ completed, completionPercent, currentDay, streak, notes, onNavigate }: { completed: Set<number>; completionPercent: number; currentDay: number; streak: number; notes: FieldNote[]; onNavigate: (view: View) => void }) {
  const milestoneList = [{ day: 1, title: 'First light', detail: 'Begin the field guide', icon: <Sparkles size={17} /> }, { day: 7, title: 'Keep the thread', detail: 'One week of noticing', icon: <Flame size={17} /> }, { day: 15, title: 'Pattern finder', detail: 'Halfway through the arc', icon: <Orbit size={17} /> }, { day: 30, title: 'Field guide keeper', detail: 'Complete the month', icon: <Trophy size={17} /> }];
  return <div className="view-stack"><PageIntro eyebrow="Momentum, not pressure" title="Look how far the thread reaches." description="Progress is a conversation with your future self. Here is what your small returns are building." action={<button className="quiet-button" onClick={() => onNavigate('today')}><RotateCcw size={15} /> Return to today</button>} />
    <section className="progress-hero glass-panel"><div className="progress-ring-wrap"><ProgressRing percent={completionPercent} size={188} /><div className="ring-center"><strong>{completionPercent}<small>%</small></strong><span>explored</span></div></div><div className="progress-hero-copy"><span className="section-label"><span className="label-spark">✦</span> Month One momentum</span><h2>{completed.size === 0 ? 'The first dot is the beginning of a constellation.' : completed.size < 7 ? 'You are building a very good kind of evidence.' : 'Your attention is beginning to compound.'}</h2><p>{completed.size === 0 ? 'Complete the first focus to give your arc a starting point.' : `${completed.size} focused ${completed.size === 1 ? 'day has' : 'days have'} been added to your field guide. Keep returning to the thread.`}</p><div className="progress-hero-stats"><div><strong>{streak}</strong><span>soft streak</span></div><div><strong>{notes.length}</strong><span>field notes</span></div><div><strong>{30 - completed.size}</strong><span>days to go</span></div></div></div><div className="progress-orbit-art"><PawMascot /><span className="orbit-art-star one">✦</span><span className="orbit-art-star two">✧</span></div></section>
    <section className="milestones-section"><div className="section-header-row"><div><span className="section-label"><span className="label-spark">✦</span> Gentle milestones</span><h2>Little signals of becoming</h2></div><span className="milestone-subtitle">No badges to chase. Just doors opening.</span></div><div className="milestones-grid">{milestoneList.map((milestone) => { const unlocked = completed.has(milestone.day) || completed.size >= milestone.day; return <div key={milestone.day} className={`milestone-card glass-panel ${unlocked ? 'is-unlocked' : ''}`}><div className="milestone-icon">{unlocked ? <Check size={16} /> : milestone.icon}</div><div><span className="milestone-day">DAY {padDay(milestone.day)}</span><h3>{milestone.title}</h3><p>{milestone.detail}</p></div><span className="milestone-state">{unlocked ? 'unlocked' : 'waiting'}</span></div>; })}</div></section>
    <section className="progress-detail-grid"><article className="activity-card glass-panel"><div className="card-topline"><span className="section-label"><span className="label-spark">✦</span> Your rhythm</span><span className="date-note">Last 30 days</span></div><div className="activity-bars">{Array.from({ length: 30 }, (_, index) => { const day = index + 1; const done = completed.has(day); return <span key={day} className={done ? 'is-done' : day === currentDay ? 'is-current' : ''} title={`Day ${day}`} />; })}</div><div className="activity-caption"><span><i className="legend-dot done" /> {completed.size} explored</span><span><i className="legend-dot current" /> next open door</span></div></article><article className="progress-note glass-panel"><div className="note-orbit"><PawPrint size={20} /></div><div><span className="section-label">Orbit’s reminder</span><h3>“A day completed is not a day judged.”</h3><p>The only thing this arc asks is that you keep a gentle relationship with your own attention.</p></div></article></section>
  </div>;
}

function PageIntro({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <section className="page-intro"><div><div className="eyebrow"><span className="eyebrow-dot" /> {eyebrow}</div><h1>{title}</h1><p>{description}</p></div>{action}</section>;
}

function ProgressRing({ percent, size }: { percent: number; size: number }) {
  const radius = 43;
  const circumference = 2 * Math.PI * radius;
  return <svg className="progress-ring" width={size} height={size} viewBox="0 0 100 100" aria-label={`${percent}% progress`}><circle className="ring-track" cx="50" cy="50" r={radius} /><circle className="ring-value" cx="50" cy="50" r={radius} style={{ strokeDasharray: circumference, strokeDashoffset: circumference - (percent / 100) * circumference }} /></svg>;
}

function PawMascot({ compact = false }: { compact?: boolean }) {
  return <div className={`paw-mascot ${compact ? 'is-compact' : ''}`}><div className="mascot-ear ear-left" /><div className="mascot-ear ear-right" /><div className="mascot-head"><span className="mascot-eye eye-left" /><span className="mascot-eye eye-right" /><span className="mascot-cheek cheek-left" /><span className="mascot-cheek cheek-right" /><span className="mascot-nose" /><span className="mascot-mouth" /></div><div className="mascot-scarf" /><div className="mascot-body"><span className="mascot-paw paw-left" /><span className="mascot-paw paw-right" /></div><span className="mascot-sparkle sparkle-a">✦</span><span className="mascot-sparkle sparkle-b">✧</span></div>;
}

function ProjectsView({ projects, onAddProject }: { projects: Project[]; onAddProject: (draft: Omit<Project, 'id'>) => void }) {
  const [formOpen, setFormOpen] = useState(false);
  return <div className="view-stack">
    <PageIntro eyebrow="Your build shelf" title="Projects, made visible." description="Keep the things you are making close to the ideas that sparked them. Add a link, a little context, and let your work have a home." action={<button className="primary-button small" onClick={() => setFormOpen(true)}><FolderKanban size={14} /> Add a project</button>} />
    <section className="projects-hero glass-panel"><div className="projects-hero-copy"><span className="section-label"><span className="label-spark">✦</span> Project garden</span><h2>A soft launchpad for <em>real work.</em></h2><p>Your projects do not need to be finished to be worth seeing. Pin prototypes, experiments, portfolios, and tiny things that are teaching you something.</p><div className="project-hero-pills"><span><Globe2 size={14} /> Share a live link</span><span><Sparkles size={14} /> Track the next step</span><span><PawPrint size={14} /> Keep building gently</span></div></div><div className="project-hero-scene"><div className="project-planet"><FolderKanban size={31} /></div><span className="project-orbit orbit-a" /><span className="project-orbit orbit-b" /><span className="project-star star-a">✦</span><span className="project-star star-b">✧</span></div></section>
    <div className="projects-toolbar"><div><span className="section-label"><span className="label-spark">✦</span> Pinned projects</span><strong>{projects.length ? `${projects.length} ${projects.length === 1 ? 'project' : 'projects'} in orbit` : 'Your first project can start here'}</strong></div><button className="quiet-button" onClick={() => setFormOpen(true)}><Sparkles size={15} /> Pin something new</button></div>
    {projects.length === 0 ? <section className="projects-empty glass-panel"><div className="empty-window-chrome"><span /><span /><span /><small>project-garden.exe</small></div><div className="empty-project-art"><FolderKanban size={29} /><span className="empty-spark">✦</span></div><h2>No projects pinned yet.</h2><p>Add a project link and this space will become your little pink launchpad.</p><button className="primary-button" onClick={() => setFormOpen(true)}><FolderKanban size={15} /> Add your first project</button></section> : <section className="project-grid">{projects.map((project) => <article key={project.id} className="project-card glass-panel"><div className="project-card-top"><span className={`project-status ${project.status.toLowerCase().replace(' ', '-')}`}><span /> {project.status}</span><span className="project-window-dots"><i /><i /><i /></span></div><div className="project-card-icon"><FolderKanban size={20} /></div><span className="project-category">{project.category}</span><h3>{project.title}</h3><p>{project.description}</p><div className="project-card-footer"><a href={project.link} target="_blank" rel="noreferrer">Open live link <ExternalLink size={13} /></a><span className="project-link-host"><Globe2 size={12} /> {projectHost(project.link)}</span></div></article>)}</section>}
    <section className="project-tip glass-panel"><div className="tip-icon"><MessageCircle size={19} /></div><div><span className="section-label">Orbit’s build note</span><h3>Ship the small version first.</h3><p>A project link is a promise to your future self that the idea got to exist somewhere outside your head.</p></div><Zap size={19} className="tip-zap" /></section>
    {formOpen && <ProjectFormModal onClose={() => setFormOpen(false)} onSubmit={(draft) => { onAddProject(draft); setFormOpen(false); }} />}
  </div>;
}

function ProjectFormModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (draft: Omit<Project, 'id'>) => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [category, setCategory] = useState('Web experiment');
  const [status, setStatus] = useState<Project['status']>('In progress');
  const canSubmit = title.trim() && description.trim() && link.trim();
  return <div className="modal-backdrop" role="presentation" onClick={onClose}><div className="project-modal glass-panel" role="dialog" aria-modal="true" aria-labelledby="project-form-title" onClick={(event) => event.stopPropagation()}><div className="project-modal-chrome"><span /><span /><span /><strong>new-project.exe</strong><button className="icon-button" onClick={onClose} aria-label="Close project form"><X size={17} /></button></div><div className="project-form-content"><div className="modal-icon aqua"><FolderKanban size={20} /></div><span className="section-label"><span className="label-spark">✦</span> Add to the garden</span><h2 id="project-form-title">Pin a project</h2><p className="project-form-lede">Give your work a name and a door people can walk through.</p><label>Project name<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. tiny weather station" autoFocus /></label><label>What is it?<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="A short note about what you are making..." rows={3} /></label><div className="form-row"><label>Category<select value={category} onChange={(event) => setCategory(event.target.value)}><option>Web experiment</option><option>Portfolio</option><option>Research</option><option>Creative practice</option><option>Side quest</option></select></label><label>Status<select value={status} onChange={(event) => setStatus(event.target.value as Project['status'])}><option>Idea</option><option>In progress</option><option>Shipped</option></select></label></div><label>Live link<input value={link} onChange={(event) => setLink(event.target.value)} placeholder="https://your-project.com" type="url" /></label><div className="project-form-footer"><span><Sparkles size={14} /> Your projects are saved locally</span><button className="primary-button small" disabled={!canSubmit} onClick={() => canSubmit && onSubmit({ title: title.trim(), description: description.trim(), link: link.trim(), category, status })}>Pin project <ArrowRight size={14} /></button></div></div></div></div>;
}

function SynthAvatar({ tint }: { tint: string }) {
  return <span className={`synth-avatar synth-${tint}`} aria-hidden="true"><span className="synth-caption">Synthesizing...</span><span className="synth-note note-one">♪</span><span className="synth-note note-two">♫</span><span className="synth-note note-three">♪</span><span className="synth-sticker"><PawPrint size={10} /></span><span className="synth-head"><i className="synth-eye eye-left" /><i className="synth-eye eye-right" /><i className="synth-smile" /></span><span className="synth-body"><span className="synth-keyboard"><i /><i /><i /><i /></span></span></span>;
}

function AmbientAvatarWorld({ currentDay, completionPercent }: { currentDay: number; completionPercent: number }) {
  const [done, setDone] = useState<number[]>(() => readStorage('pawgress-avatar-tasks', []));
  const [positions, setPositions] = useState<Record<number, { x: number; y: number }>>({});
  const [dragging, setDragging] = useState<number | null>(null);
  const dragRef = useRef<{ index: number; startX: number; startY: number; originX: number; originY: number; moved: boolean } | null>(null);
  const suppressClickRef = useRef(false);
  const tasks = [{ name: 'Orbit', role: 'field scout', task: `Map Day ${padDay(currentDay)} in your notes`, detail: 'Open the next lens and leave one bright sentence.', tint: 'pink', mood: 'curious', icon: <Orbit size={14} /> }, { name: 'Melody', role: 'bubble keeper', task: 'Wake three glass bubbles', detail: 'Pop a bubble to send a tiny chime through the field.', tint: 'aqua', mood: 'bouncy', icon: <Sparkles size={14} /> }, { name: 'Pip', role: 'project gardener', task: 'Give one idea a home', detail: `${completionPercent}% of your arc is already growing.`, tint: 'lime', mood: 'sunny', icon: <FolderKanban size={14} /> }];
  const toggleTask = (index: number) => setDone((current) => { const next = current.includes(index) ? current.filter((item) => item !== index) : [...current, index]; window.localStorage.setItem('pawgress-avatar-tasks', JSON.stringify(next)); return next; });
  const beginDrag = (event: PointerEvent<HTMLButtonElement>, index: number) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const origin = positions[index] ?? { x: 0, y: 0 };
    dragRef.current = { index, startX: event.clientX, startY: event.clientY, originX: origin.x, originY: origin.y, moved: false };
    setDragging(index);
  };
  const moveDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.index === null) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 5) drag.moved = true;
    setPositions((current) => ({ ...current, [drag.index]: { x: drag.originX + dx, y: drag.originY + dy } }));
  };
  const endDrag = (event: PointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    suppressClickRef.current = drag.moved;
    dragRef.current = null;
    setDragging(null);
    window.setTimeout(() => { suppressClickRef.current = false; }, 0);
  };
  return <div className="ambient-avatar-world" aria-label="Draggable avatar friends in the Aero field">{tasks.map((task, index) => <button key={task.name} className={`ambient-avatar ambient-avatar-${index + 1} ${task.tint} ${done.includes(index) ? 'is-done' : ''} ${dragging === index ? 'is-dragging' : ''}`} style={{ '--drag-x': `${positions[index]?.x ?? 0}px`, '--drag-y': `${positions[index]?.y ?? 0}px` } as CSSProperties} onPointerDown={(event) => beginDrag(event, index)} onPointerMove={moveDrag} onPointerUp={endDrag} onClick={() => { if (suppressClickRef.current) return; toggleTask(index); }} aria-label={`${task.name} task: ${done.includes(index) ? 'complete' : task.task}. Drag to move.`} title={`${task.name}: drag me around the Aero field · ${done.includes(index) ? 'Task complete — lovely!' : task.task}`}><SynthAvatar tint={task.tint} /><span className="ambient-avatar-label"><strong>{task.name}</strong><small>{done.includes(index) ? '✓ task complete' : task.task}</small></span></button>)}</div>;
}

function Celebration() {
  return <div className="celebration-layer" aria-live="polite"><div className="celebration-card glass-panel"><div className="celebration-burst"><Sparkles size={26} /></div><div><span className="section-label">Bright spot unlocked</span><h2>That’s one more lens in your pocket.</h2><p>Keep the thread warm. The next door is already glowing.</p></div><div className="confetti confetti-one" /><div className="confetti confetti-two" /><div className="confetti confetti-three" /></div></div>;
}

function ResourceModal({ resource, onClose }: { resource: VaultItem; onClose: () => void }) {
  const mission = MISSIONS[resource.day - 1];
  return <div className="modal-backdrop" role="presentation" onClick={onClose}><div className="resource-modal glass-panel" role="dialog" aria-modal="true" aria-labelledby="resource-title" onClick={(event) => event.stopPropagation()}><button className="modal-close icon-button" onClick={onClose} aria-label="Close resource"><X size={18} /></button><div className={`modal-icon ${mission?.color ?? 'rose'}`}><Bookmark size={20} /></div><div className="vault-card-meta"><span>{resource.kind}</span><i /> <span>Day {padDay(resource.day)}</span></div><h2 id="resource-title">{resource.title}</h2><p className="modal-lede">{resource.excerpt}</p><div className="modal-divider" /><span className="lens-label">Field guide lens</span><p>{mission?.takeaway}</p><div className="modal-footer"><span><Clock3 size={14} /> {resource.duration}</span><button className="primary-button small" onClick={onClose}>Keep exploring <ArrowRight size={14} /></button></div></div></div>;
}

export default App;
