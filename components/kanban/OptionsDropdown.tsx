import type * as React from "react";

type OptionsMenuPosition = {
  top: number;
  left: number;
  minWidth: number;
};

type OptionsDropdownProps = {
  darkMode: boolean;
  optionsOpen: boolean;
  optionsMenuPosition: OptionsMenuPosition | null;
  currentUserId: string | null;
  currentUserEmail: string | null;
  openAuthDialog: (nextAction: "signup" | "signin" | "signout") => void;
  handleImmediateSignOut: () => void;
  closeOptionsMenu: () => void;
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
  setArchivePanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

export default function OptionsDropdown({
  darkMode,
  optionsOpen,
  optionsMenuPosition,
  currentUserId,
  currentUserEmail,
  openAuthDialog,
  handleImmediateSignOut,
  closeOptionsMenu,
  setDarkMode,
  setArchivePanelOpen,
}: OptionsDropdownProps) {
  if (!optionsOpen) return null;

  const isSignedIn = Boolean(currentUserId);
  const signedInLabel = currentUserEmail ? `Signed in as ${currentUserEmail}` : "Signed in";

  return (
    <div
      className={`fixed z-[130] rounded-md border p-2 text-sm shadow-2xl ${darkMode ? "bg-[#241c3c] border-[#372a5d] text-slate-100" : "bg-white border-slate-200 text-slate-900"}`}
      style={{
        top: optionsMenuPosition?.top ?? 0,
        left: optionsMenuPosition?.left ?? 0,
        minWidth: optionsMenuPosition?.minWidth ?? 176,
        borderTopRightRadius: 0,
      }}
    >
      {isSignedIn ? (
        <p className={`mb-2 rounded-md border px-2 py-1.5 text-xs font-medium ${darkMode ? "border-[#423865] bg-[#2f2640] text-slate-200" : "border-slate-200 bg-slate-50 text-slate-700"}`}>
          {signedInLabel}
        </p>
      ) : null}
      <div className="mb-2 grid gap-1">
        {!isSignedIn ? (
          <>
            <button
              type="button"
              onClick={() => openAuthDialog("signup")}
              className={`w-full rounded-md border px-2 py-1.5 text-left text-sm font-medium transition ${darkMode ? "border-[#423865] bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]" : "border-slate-200 bg-white text-slate-900 hover:bg-slate-100"}`}
            >
              Sign Up
            </button>
            <button
              type="button"
              onClick={() => openAuthDialog("signin")}
              className={`w-full rounded-md border px-2 py-1.5 text-left text-sm font-medium transition ${darkMode ? "border-[#423865] bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]" : "border-slate-200 bg-white text-slate-900 hover:bg-slate-100"}`}
            >
              Sign In
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={handleImmediateSignOut}
            className={`w-full rounded-md border px-2 py-1.5 text-left text-sm font-medium transition ${darkMode ? "border-[#423865] bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]" : "border-slate-200 bg-white text-slate-900 hover:bg-slate-100"}`}
          >
            Sign Out
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          setDarkMode((prev) => !prev);
          closeOptionsMenu();
        }}
        className={`w-full rounded-md border px-2 py-1.5 text-left text-sm font-medium transition ${darkMode ? "border-[#423865] bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]" : "border-slate-200 bg-white text-slate-900 hover:bg-slate-100"}`}
      >
        {darkMode ? "Switch to Light" : "Switch to Dark"}
      </button>
      <button
        type="button"
        onClick={() => {
          setArchivePanelOpen(true);
          closeOptionsMenu();
        }}
        className={`mt-1 w-full rounded-md border px-2 py-1.5 text-left text-sm font-medium transition ${darkMode ? "border-[#423865] bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]" : "border-slate-200 bg-white text-slate-900 hover:bg-slate-100"}`}
      >
        Archive
      </button>
    </div>
  );
}
