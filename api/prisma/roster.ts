/**
 * Class roster. The array position + 1 is NOT used for codes; each entry carries its
 * attendance number explicitly, and the student code is derived from that number only.
 */
export interface RosterEntry {
  attendanceNumber: number;
  name: string;
  className?: string | null;
}

const CLASS_NAME = "XII 1";

const NAMES: [number, string][] = [
  [1, "ALFARIZI WIDYADANA BUDIANTORO"],
  [2, "ALMIRAH NABILAH PUTRI TIARA"],
  [3, "ARDIYANTA ATHAYA ATTAR"],
  [4, "ATHAYA HUDA"],
  [5, "AUREL AZKA DARMAWAN"],
  [6, "AURELIA NABILA PUTRI"],
  [7, "BIMA ABYAN NIBROSS MAHDIYYAH"],
  [8, "DAFINA MARVELYAN KHENZA"],
  [9, "DANISH ARA WIDYARAHAYU"],
  [10, "DZAKY AZHAR NUGROHO"],
  [11, "GHEZTA LIBERTO YURISTIO"],
  [12, "HAGAN MOHAMMAD PRATAMA"],
  [13, "HASNINDARWATI"],
  [14, "JUNNATUL KAAMILAH"],
  [15, "KEIRA ALODYA ASSYIFA"],
  [16, "KHAMMAI DONINDRA"],
  [17, "KHANZA NAFISYA DEWI RENGGANIS"],
  [18, "KIN KIN WILMA TABHITA WIJAYA"],
  [19, "KIRANI CHANDRA DEWI RICIYANDI"],
  [20, "MAULANA JALALUDDIN RUMI"],
  [21, "MUHAMMAD AHSANITAQWIIM"],
  [22, "MUHAMMAD ALFATH AKBAR PERMATA"],
  [23, "MUHAMMAD IRZA RAFLY RAHMATULLAH"],
  [24, "MUHAMMAD RIFQI HABIBI"],
  [25, "NADHIRA KHAIRANI MEIZHARRA"],
  [26, "NAILA NARESWARI LARASATI"],
  [27, "NAILA NUR BALA ICHWAN"],
  [28, "NAJWA KHAIRUNNISA PRAMESWARI"],
  [29, "RACHEL OKTAVIA PUTRI PRASETYA"],
  [30, "RAISSA ALMAIRA PUTRI"],
  [31, "RARA RAFEYLA"],
  [32, "SHALIHUL IBAD RAFIF SHOLEHUDDIN"],
  [33, "SULTAN SUFI DZIKRULLAH"],
  [34, "VERISHA VINOLYTA PUTRI"],
  [35, "ZAIMAH VIKA NAFISAH"],
];

/**
 * Special non-roster accounts. They have no attendance number and no class.
 * Replace the placeholder names below with the real ones; `pnpm seed` syncs them.
 */
export const SPECIAL_ACCOUNTS: { studentCode: string; name: string }[] = [
  { studentCode: "VALIDATOR001", name: "Bu Maurish" },
  { studentCode: "VALIDATOR002", name: "Bu Uun" },
  { studentCode: "DUMMY01", name: "Dummy" },
];

export const ROSTER: RosterEntry[] = NAMES.map(([attendanceNumber, name]) => ({
  attendanceNumber,
  name,
  className: CLASS_NAME,
}));
