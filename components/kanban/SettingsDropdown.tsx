type SettingsMenuPosition = {
  top: number;
  left: number;
  minWidth: number;
};

type SettingsDropdownProps = {
  darkMode: boolean;
  settingsOpen: boolean;
  settingsMenuPosition: SettingsMenuPosition | null;
  saveListPanelWidthPreference: () => Promise<void>;
  resetListPanelSize: () => Promise<void>;
  closeSettingsMenu: () => void;
};

export default function SettingsDropdown({
  darkMode,
  settingsOpen,
  settingsMenuPosition,
  saveListPanelWidthPreference,
  resetListPanelSize,
  closeSettingsMenu,
}: SettingsDropdownProps) {
  if (!settingsOpen) return null;

  return (
    <div
      className={`fixed z-[130] rounded-md border p-2 text-sm shadow-2xl ${darkMode ? "bg-[#241c3c] border-[#372a5d] text-slate-100" : "bg-white border-slate-200 text-slate-900"}`}
      style={{
        top: settingsMenuPosition?.top ?? 0,
        left: settingsMenuPosition?.left ?? 0,
        minWidth: settingsMenuPosition?.minWidth ?? 176,
        borderTopRightRadius: 0,
      }}
    >
      <button
        type="button"
        onClick={() => {
          void saveListPanelWidthPreference();
          closeSettingsMenu();
        }}
        className={`w-full rounded-md border px-2 py-1.5 text-left text-sm font-medium transition ${darkMode ? "border-[#423865] bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]" : "border-slate-200 bg-white text-slate-900 hover:bg-slate-100"}`}
      >
        Save list width
      </button>
      <button
        type="button"
        onClick={() => {
          void resetListPanelSize();
          closeSettingsMenu();
        }}
        className={`mt-1 w-full rounded-md border px-2 py-1.5 text-left text-sm font-medium transition ${darkMode ? "border-[#423865] bg-[#2f2640] text-slate-100 hover:bg-[#3b315a]" : "border-slate-200 bg-white text-slate-900 hover:bg-slate-100"}`}
      >
        Reset list sizes
      </button>
    </div>
  );
}
