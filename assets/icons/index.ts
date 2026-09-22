// Imported as React components through @svgr/webpack (see next.config.ts), so
// every glyph inherits `currentColor` and takes Tailwind size classes. Same
// convention as the prepex student app's assets/icons barrel.
export { default as DashboardIcon } from "./DashboardIcon.svg";
export { default as ResourceIcon } from "./ResourceIcon.svg";
export { default as UsersNavIcon } from "./UsersNavIcon.svg";
export { default as UserIcons } from "./UserIcons.svg";
export { default as BookIcon } from "./BookIcon.svg";
export { default as UploadIcon } from "./UploadIcon.svg";
export { default as ClockIcon } from "./ClockIcon.svg";
// Dashboard stat-card glyphs. All four share a 24x24 viewBox, a 2px stroke
// and the same 2px inset, so they read at identical size and weight inside
// the stat card's icon chip — the mixed 16/18/20 viewBoxes elsewhere in this
// folder do not.
export { default as StatStudentsIcon } from "./StatStudentsIcon.svg";
export { default as StatActivityIcon } from "./StatActivityIcon.svg";
export { default as StatLibraryIcon } from "./StatLibraryIcon.svg";
export { default as StatStudyTimeIcon } from "./StatStudyTimeIcon.svg";

// Student profile detail rows — same glyphs the app's own profile page uses.
export { default as QuickIcon } from "./QuickIcon.svg";
export { default as Coaching } from "./Coaching.svg";
export { default as GraduationCapIcon } from "./GraduationCapIcon.svg";
export { default as CalendarIcons } from "./CalendarIcons.svg";
export { default as Location } from "./Location.svg";
export { default as FlameIcon } from "./FlameIcon.svg";
export { default as AtomIcon } from "./AtomIcon.svg";

export { default as MathIcon } from "./MathIcon.svg";
export { default as ListIcon } from "./ListIcon.svg";
export { default as PlayIcon } from "./PlayIcon.svg";
export { default as ArrowLeftIcon } from "./ArrowLeftIcon.svg";

