"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Beaker,
  Boxes,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  Clock3,
  Download,
  FlaskConical,
  History,
  Home,
  LogOut,
  MapPin,
  Menu,
  PackageCheck,
  KeyRound,
  RotateCcw,
  Search,
  ShieldCheck,
  Wrench,
  X,
} from "lucide-react";

type Tab =
  "dashboard" | "equipment" | "chemicals" | "history" | "admin" | "profile";
type Role = "student" | "teacher";
type ReturnRecord = {
  id: string;
  kind: "equipment" | "chemical";
  itemName: string;
  itemCode: string;
  borrowerName: string;
  borrowerId: string;
  borrowedFrom: string;
  borrowedUntil: string;
  location: string;
  purpose: string;
  quantity: string;
  returnedAt: string;
  signature: string;
  note: string;
};
type BorrowInfo = Pick<ReturnRecord, "borrowedFrom" | "borrowedUntil" | "location" | "purpose" | "quantity">;
const studentDirectory: Record<string, string> = {};
const studentYearDirectory: Record<string, string> = {};
function studentDisplayName(id: string) {
  return studentDirectory[id] || "น.ส.ชนกชนม์ ใจดี";
}
function studentYear(id: string) {
  return studentYearDirectory[id] || "รอระบุชั้นปี";
}
type SavedCredential = { salt: string; hash: string };
const initialPassword = "000000";
const maxFailedLogins = 5;
const loginLockMs = 15 * 60 * 1000;
type LoginAttempts = { failures: number; lockedUntil: number };
function credentialKey(role: Role, id: string) {
  return `labtrace-password-${role}-${id}`;
}
function attemptsKey(role: Role, id: string) {
  return `labtrace-login-attempts-${role}-${id.trim()}`;
}
function readLoginAttempts(role: Role, id: string): LoginAttempts {
  if (!id.trim() || typeof window === "undefined") return { failures: 0, lockedUntil: 0 };
  try {
    const saved = JSON.parse(window.localStorage.getItem(attemptsKey(role, id)) || "null");
    if (typeof saved?.failures !== "number" || typeof saved?.lockedUntil !== "number") return { failures: 0, lockedUntil: 0 };
    if (saved.lockedUntil && saved.lockedUntil <= Date.now()) return { failures: 0, lockedUntil: 0 };
    return saved;
  } catch { return { failures: 0, lockedUntil: 0 }; }
}
async function hashPassword(password: string, salt: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: salt as BufferSource, iterations: 150000, hash: "SHA-256" }, key, 256);
  return Array.from(new Uint8Array(bits), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
async function checkSavedPassword(role: Role, id: string, password: string) {
  const raw = window.localStorage.getItem(credentialKey(role, id));
  if (!raw) return password === initialPassword;
  const saved = JSON.parse(raw) as SavedCredential;
  const salt = Uint8Array.from(saved.salt.match(/.{2}/g) || [], (value) => parseInt(value, 16));
  return (await hashPassword(password, salt)) === saved.hash;
}
function readReturnRecords(): ReturnRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const saved = JSON.parse(window.localStorage.getItem("labtrace-return-records") || "[]");
    return Array.isArray(saved) ? saved.filter((row) => typeof row.signature === "string" && row.signature.startsWith("data:image/png;base64,")) : [];
  } catch { return []; }
}
function formatThaiDateTime(value: string) {
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Bangkok" }).format(new Date(value));
}
function formatBorrowedPeriod(record: ReturnRecord) {
  if (record.kind === "chemical") {
    const formatDate = (value: string) => new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" }).format(new Date(value));
    return `${formatDate(record.borrowedFrom)} – ${formatDate(record.borrowedUntil)}`;
  }
  return `${formatThaiDateTime(record.borrowedFrom)} – ${formatThaiDateTime(record.borrowedUntil)}`;
}
const equipment = [
  {
    id: "EQ-HP-001",
    name: "Hot Plate Magnetic Stirrer",
    category: "Heating",
    total: 5,
    ready: 3,
    using: 1,
    broken: 1,
    icon: "HP",
    color: "blue",
  },
  {
    id: "EQ-SP-004",
    name: "UV-Vis Spectrophotometer",
    category: "Analysis",
    total: 2,
    ready: 1,
    using: 1,
    broken: 0,
    icon: "UV",
    color: "violet",
  },
  {
    id: "EQ-CF-002",
    name: "Centrifuge",
    category: "Separation",
    total: 3,
    ready: 3,
    using: 0,
    broken: 0,
    icon: "CF",
    color: "cyan",
  },
  {
    id: "EQ-BA-011",
    name: "Analytical Balance",
    category: "Measurement",
    total: 4,
    ready: 0,
    using: 4,
    broken: 0,
    icon: "AB",
    color: "amber",
  },
];
const chemicals = [
  {
    id: "CH-AC-014",
    name: "Acetic acid 99.8%",
    place: "Cabinet A · Shelf 2",
    status: "พร้อมใช้",
    tone: "ok",
  },
  {
    id: "CH-ET-021",
    name: "Ethanol 95%",
    place: "Flammable C · Shelf 1",
    status: "เหลือน้อย",
    tone: "warn",
  },
  {
    id: "CH-NA-008",
    name: "Sodium hydroxide",
    place: "Cabinet B · Shelf 3",
    status: "รออนุมัติ",
    tone: "wait",
  },
  {
    id: "CH-HC-003",
    name: "Hydrochloric acid 37%",
    place: "Acid cabinet · Shelf 1",
    status: "กำลังสั่งซื้อ",
    tone: "order",
  },
];
const nav = [
  ["dashboard", "ภาพรวม · Overview", Home],
  ["equipment", "อุปกรณ์ · Equipment", Boxes],
  ["chemicals", "สารเคมี · Chemicals", FlaskConical],
  ["history", "ประวัติ · History", History],
] as const;

export default function HomePage() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [role, setRole] = useState<Role>("student");
  const [tab, setTab] = useState<Tab>("dashboard");
  const [loginFields, setLoginFields] = useState<Record<Role, { id: string; password: string }>>({
    student: { id: "", password: "" },
    teacher: { id: "", password: "" },
  });
  const [menu, setMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [booking, setBooking] = useState<(typeof equipment)[number] | null>(
    null,
  );
  const [returning, setReturning] = useState(false);
  const [chemicalReturning, setChemicalReturning] = useState(false);
  const [chemicalBorrow, setChemicalBorrow] = useState<
    (typeof chemicals)[number] | null
  >(null);
  const [damageOpen, setDamageOpen] = useState(false);
  const [damageKind, setDamageKind] = useState<
    "equipment" | "chemical" | "emergency"
  >("equipment");
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRecord | null>(null);
  const [returnRecords, setReturnRecords] = useState<ReturnRecord[]>(readReturnRecords);
  const [equipmentBorrow, setEquipmentBorrow] = useState<BorrowInfo>({ borrowedFrom: "2026-09-05T09:00:00+07:00", borrowedUntil: "2026-09-05T16:30:00+07:00", location: "Lab 3-204", purpose: "การสกัดแอนโทไซยานิน", quantity: "1 เครื่อง" });
  const [chemicalBorrowInfo, setChemicalBorrowInfo] = useState<BorrowInfo>({ borrowedFrom: "2026-09-05T09:00:00+07:00", borrowedUntil: "2026-09-05T16:30:00+07:00", location: "Cabinet A · Shelf 2", purpose: "งานสกัดตัวอย่าง", quantity: "50 mL" });
  const [inventoryDetail, setInventoryDetail] = useState<
    "equipment" | "chemical" | null
  >(null);
  const [equipmentActive, setEquipmentActive] = useState(true);
  const [chemicalActive, setChemicalActive] = useState(true);
  const [notice, setNotice] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginPending, setLoginPending] = useState(false);
  const loginPendingRef = useRef(false);
  const filtered = useMemo(
    () =>
      equipment.filter((e) =>
        (e.name + e.id + e.category)
          .toLowerCase()
          .includes(search.toLowerCase()),
      ),
    [search],
  );
  function toast(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3200);
  }
  function logout() {
    setLoggedIn(false);
    setLoginFields((current) => ({
      ...current,
      [role]: { ...current[role], password: "" },
    }));
  }
  async function signIn() {
    if (loginPendingRef.current) return;
    const { id, password } = loginFields[role];
    const accountId = id.trim();
    const attempts = readLoginAttempts(role, accountId);
    if (attempts.lockedUntil > Date.now()) {
      setLoginError("บัญชีนี้ถูกพักการเข้าสู่ระบบ 15 นาทีหลังกรอกรหัสผ่านผิดครบ 5 ครั้ง");
      return;
    }
    loginPendingRef.current = true;
    setLoginPending(true);
    try {
      if (!(await checkSavedPassword(role, accountId, password))) {
        const failures = attempts.failures + 1;
        if (failures >= maxFailedLogins) {
          window.localStorage.setItem(attemptsKey(role, accountId), JSON.stringify({ failures, lockedUntil: Date.now() + loginLockMs }));
          setLoginError("กรอกรหัสผ่านผิดครบ 5 ครั้ง กรุณารอ 15 นาทีแล้วลองใหม่");
        } else {
          window.localStorage.setItem(attemptsKey(role, accountId), JSON.stringify({ failures, lockedUntil: 0 }));
          setLoginError("รหัสผ่านไม่ถูกต้อง โปรดลองใหม่อีกครั้ง");
        }
        return;
      }
      window.localStorage.removeItem(attemptsKey(role, accountId));
    } catch {
      setLoginError("ตรวจสอบรหัสผ่านไม่สำเร็จ กรุณาลองใหม่");
      return;
    } finally {
      loginPendingRef.current = false;
      setLoginPending(false);
    }
    setLoginError("");
    if (role === "student") {
      const key = `labtrace-active-${id}`;
      try {
        const saved = JSON.parse(window.localStorage.getItem(key) || "null");
        if (saved) { setEquipmentActive(saved.equipment); setChemicalActive(saved.chemical); }
      } catch { /* Retain the example activity if this device has no saved state. */ }
    }
    setLoggedIn(true);
  }
  async function changePassword(oldPassword: string, newPassword: string): Promise<string | null> {
    const { id, password } = loginFields[role];
    if (oldPassword !== password || !(await checkSavedPassword(role, id.trim(), oldPassword))) return "รหัสผ่านเดิมไม่ถูกต้อง";
    try {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const saved: SavedCredential = {
        salt: Array.from(salt, (byte) => byte.toString(16).padStart(2, "0")).join(""),
        hash: await hashPassword(newPassword, salt),
      };
      window.localStorage.setItem(credentialKey(role, id.trim()), JSON.stringify(saved));
      setLoginFields((current) => ({ ...current, [role]: { ...current[role], password: newPassword } }));
      return null;
    } catch { return "บันทึกรหัสผ่านไม่สำเร็จ กรุณาลองใหม่"; }
  }
  function saveReturn(kind: "equipment" | "chemical", signature: string, note: string) {
    const loan = kind === "equipment" ? equipmentBorrow : chemicalBorrowInfo;
    const record: ReturnRecord = {
      id: crypto.randomUUID(), kind,
      itemName: kind === "equipment" ? "Hot Plate Magnetic Stirrer" : "Acetic acid 99.8%",
      itemCode: kind === "equipment" ? "EQ-HP-001" : "CH-AC-014",
      borrowerName: studentDisplayName(loginFields.student.id), borrowerId: loginFields.student.id,
      ...loan, returnedAt: new Date().toISOString(), signature, note,
    };
    try {
      const next = [record, ...returnRecords];
      window.localStorage.setItem("labtrace-return-records", JSON.stringify(next));
      setReturnRecords(next);
      return true;
    } catch {
      toast("บันทึกลายเซ็นไม่สำเร็จ กรุณาลองอีกครั้ง");
      return false;
    }
  }
  if (!loggedIn)
    return (
      <Login
        role={role}
        setRole={(nextRole) => { setRole(nextRole); setLoginError(""); }}
        error={loginError}
        lockedUntil={readLoginAttempts(role, loginFields[role].id).lockedUntil}
        pending={loginPending}
        studentId={loginFields[role].id}
        password={loginFields[role].password}
        setStudentId={(id) => { setLoginFields((current) => ({ ...current, [role]: { ...current[role], id } })); setLoginError(""); }}
        setPassword={(password) => { setLoginFields((current) => ({ ...current, [role]: { ...current[role], password } })); setLoginError(""); }}
        onLogin={signIn}
      />
    );
  if (role === "teacher")
    return (
      <TeacherShell
        onLogout={logout}
        onNotice={toast}
        notice={notice}
        returnRecords={returnRecords}
        teacherId={loginFields.teacher.id}
        onChangePassword={changePassword}
      />
    );
  return (
    <div className="app-shell">
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <div className="brand">
          <div className="brand-mark">
            <FlaskConical size={22} />
          </div>
          <div>
            <strong>LabTrace</strong>
            <span>SCIENCE LAB</span>
          </div>
        </div>
        <button
          className="close-menu"
          onClick={() => setMenu(false)}
          aria-label="ปิดเมนู"
        >
          <X />
        </button>
        <nav>
          {nav.map(([key, label, Icon]) => (
            <button
              key={key}
              className={tab === key ? "active" : ""}
              onClick={() => {
                setTab(key);
                setMenu(false);
              }}
            >
              <Icon size={19} />
              <span>{label}</span>
              {key === "admin" && <em>ADMIN</em>}
            </button>
          ))}
        </nav>
        <button className="side-profile" onClick={() => setTab("profile")}>
          <div className="avatar">ช</div>
          <div>
            <b>{studentDisplayName(loginFields.student.id)}</b>
            <span>{loginFields.student.id}</span>
          </div>
          <ChevronRight size={18} />
        </button>
      </aside>
      <main className="main">
        <header>
          <button className="menu-btn" onClick={() => setMenu(true)}>
            <Menu />
          </button>
          <div className="header-title">
            <span>ห้องปฏิบัติการเคมีอุตสาหกรรม</span>
          </div>
          <div className="header-actions">
            <button className="icon-btn">
              <AlertTriangle size={19} />
              <i />
            </button>
            <button className="logout" onClick={logout}>
              <LogOut size={18} />
              ออกจากระบบ
            </button>
          </div>
        </header>
        <div className="content">
          {tab === "dashboard" && (
            <DashboardV2
              equipmentActive={equipmentActive}
              chemicalActive={chemicalActive}
              setTab={setTab}
              onReturn={() => setReturning(true)}
              onChemicalReturn={() => setChemicalReturning(true)}
              onDamage={() => {
                setDamageKind("emergency");
                setDamageOpen(true);
              }}
              onDetail={() => { setSelectedReturn(null); setDetailOpen(true); }}
              onInventoryDetail={setInventoryDetail}
            />
          )}
          {tab === "equipment" && (
            <EquipmentPage
              items={filtered}
              search={search}
              setSearch={setSearch}
              onBook={setBooking}
              onReport={() => {
                setDamageKind("equipment");
                setDamageOpen(true);
              }}
            />
          )}
          {tab === "chemicals" && (
            <ChemicalsPage
              onBorrow={setChemicalBorrow}
              onReport={() => {
                setDamageKind("chemical");
                setDamageOpen(true);
              }}
            />
          )}
          {tab === "history" && (
            <HistoryPageV2 records={returnRecords.filter((record) => record.borrowerId === loginFields.student.id)} onDetail={(record) => { setSelectedReturn(record); setDetailOpen(true); }} />
          )}
          {tab === "profile" && <ProfilePage studentId={loginFields.student.id} onChangePassword={changePassword} />}
        </div>
      </main>
      {menu && (
        <button
          className="backdrop"
          onClick={() => setMenu(false)}
          aria-label="ปิดเมนู"
        />
      )}
      {booking && (
        <BookingModal
          item={booking}
          onClose={() => setBooking(null)}
          onConfirm={(loan: BorrowInfo) => {
            setEquipmentBorrow(loan);
            setEquipmentActive(true);
            window.localStorage.setItem(`labtrace-active-${loginFields.student.id}`, JSON.stringify({ equipment: true, chemical: chemicalActive }));
            setBooking(null);
            toast("จองอุปกรณ์สำเร็จ · เพิ่มในประวัติแล้ว");
          }}
        />
      )}
      {returning && (
        <ReturnModal
          onClose={() => setReturning(false)}
          onConfirm={(signature: string, note: string) => {
            if (!saveReturn("equipment", signature, note)) return;
            setEquipmentActive(false);
            window.localStorage.setItem(`labtrace-active-${loginFields.student.id}`, JSON.stringify({ equipment: false, chemical: chemicalActive }));
            setReturning(false);
            toast("คืนอุปกรณ์สำเร็จ · สถานะอัปเดตแล้ว");
          }}
        />
      )}
      {chemicalReturning && (
        <ChemicalReturnModal
          onClose={() => setChemicalReturning(false)}
          onConfirm={(signature: string, note: string) => {
            if (!saveReturn("chemical", signature, note)) return;
            setChemicalActive(false);
            window.localStorage.setItem(`labtrace-active-${loginFields.student.id}`, JSON.stringify({ equipment: equipmentActive, chemical: false }));
            setChemicalReturning(false);
            toast("คืนสารเคมีสำเร็จ · สถานะอัปเดตแล้ว");
          }}
        />
      )}
      {chemicalBorrow && (
        <ChemicalBorrowModal
          item={chemicalBorrow}
          onClose={() => setChemicalBorrow(null)}
          onConfirm={(loan: BorrowInfo) => {
            setChemicalBorrowInfo(loan);
            setChemicalActive(true);
            window.localStorage.setItem(`labtrace-active-${loginFields.student.id}`, JSON.stringify({ equipment: equipmentActive, chemical: true }));
            setChemicalBorrow(null);
            toast("ยืมสารสำเร็จ · เพิ่มในประวัติแล้ว");
          }}
        />
      )}
      {damageOpen && (
        <DamageModal
          kind={damageKind}
          onClose={() => setDamageOpen(false)}
          onConfirm={(
            reporter: "witness" | "responsible",
            itemKind: "equipment" | "chemical",
          ) => {
            if (damageKind === "emergency" && reporter === "responsible") {
              if (itemKind === "equipment") setEquipmentActive(false);
              if (itemKind === "chemical") setChemicalActive(false);
            }
            setDamageOpen(false);
            toast(
              damageKind === "emergency" && reporter === "responsible"
                ? "บันทึกเหตุฉุกเฉินและแนบรายการคืนอัตโนมัติแล้ว"
                : "บันทึกชื่อผู้แจ้งพบเห็นแล้ว · ส่งให้อาจารย์ตรวจสอบ",
            );
          }}
        />
      )}
      {detailOpen && <ActivityDetail record={selectedReturn} onClose={() => setDetailOpen(false)} />}
      {inventoryDetail && (
        <InventoryDetailModal
          kind={inventoryDetail}
          onClose={() => setInventoryDetail(null)}
        />
      )}
      {notice && (
        <div className="toast">
          <Check size={18} />
          {notice}
        </div>
      )}
    </div>
  );
}

function Login({
  role,
  setRole,
  error,
  lockedUntil,
  pending,
  studentId,
  password,
  setStudentId,
  setPassword,
  onLogin,
}: {
  role: Role;
  setRole: (r: Role) => void;
  error: string;
  lockedUntil: number;
  pending: boolean;
  studentId: string;
  password: string;
  setStudentId: (v: string) => void;
  setPassword: (v: string) => void;
  onLogin: () => Promise<void>;
}) {
  const [forgotOpen, setForgotOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!lockedUntil) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [lockedUntil]);
  const secondsLeft = Math.max(0, Math.ceil((lockedUntil - now) / 1000));
  const waitTime = `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`;
  return (
    <main className="login-page minimal">
      <section className="login-visual">
        <img src="/lab-hero.png" alt="อุปกรณ์ในห้องปฏิบัติการเคมี" />
        <div className="visual-shade" />
        <div className="visual-brand">
          <div className="brand-mark large">
            <FlaskConical />
          </div>
          <strong>LabTrace</strong>
        </div>
        <div className="visual-copy">
          <span>LABORATORY SYSTEM</span>
          <h1>
            Smart lab.
            <br />
            Clear trace.
          </h1>
          <p>ยืม · ใช้ · คืน</p>
        </div>
      </section>
      <section className="login-form-wrap">
        <form
          className="login-card"
          onSubmit={(e) => {
            e.preventDefault();
            onLogin();
          }}
        >
          <div className="role-switch">
            <button
              type="button"
              className={role === "student" ? "active" : ""}
              onClick={() => setRole("student")}
              disabled={pending}
            >
              นักศึกษา <small>Student</small>
            </button>
            <button
              type="button"
              className={role === "teacher" ? "active" : ""}
              onClick={() => setRole("teacher")}
              disabled={pending}
            >
              อาจารย์ <small>Teacher</small>
            </button>
          </div>
          <span className="eyebrow">
            {role === "student" ? "STUDENT ACCESS" : "TEACHER ACCESS"}
          </span>
          <h2>
            {role === "student" ? "เข้าสู่ระบบนักศึกษา" : "เข้าสู่ระบบอาจารย์"}
          </h2>
          <label>
            {role === "student" ? "รหัสนักศึกษา" : "Teacher ID"}
            <input
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              disabled={pending}
              placeholder={role === "student" ? "กรอกรหัสนักศึกษา" : "กรอกรหัสอาจารย์"}
              required
            />
          </label>
          <label>
            รหัสผ่าน · Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="กรอกรหัสผ่าน"
              aria-invalid={Boolean(error) || secondsLeft > 0}
              disabled={secondsLeft > 0 || pending}
              required
            />
          </label>
          {secondsLeft > 0 ? <p className="form-error" role="status">กรอกรหัสผ่านผิดครบ 5 ครั้ง กรุณารออีก {waitTime} ก่อนลองใหม่</p> : error && <p className="form-error" role="alert">{error}</p>}
          <button className="forgot-link" type="button" onClick={() => setForgotOpen(true)}>ลืมรหัสผ่าน?</button>
          <button className="primary" type="submit" disabled={secondsLeft > 0 || pending}>
            {secondsLeft > 0 ? `ลองใหม่ใน ${waitTime}` : pending ? "กำลังตรวจสอบ..." : <>เข้าสู่ระบบ · Sign in <ArrowRight size={18} /></>}
          </button>
          <p className="login-phase-note">ระบบบัญชีระยะทดลอง การจำกัดครั้งที่กรอกผิดและรหัสผ่านยังผูกกับเบราว์เซอร์นี้</p>
        </form>
      </section>
      {forgotOpen && <div className="modal-wrap">
        <button className="modal-backdrop" onClick={() => setForgotOpen(false)} aria-label="ปิดข้อมูลติดต่อ" />
        <section className="modal contact-modal" role="dialog" aria-modal="true" aria-label="ลืมรหัสผ่าน">
          <div className="modal-title"><div><span>ACCOUNT HELP</span><h2>ลืมรหัสผ่าน</h2></div><button onClick={() => setForgotOpen(false)} aria-label="ปิด"><X /></button></div>
          <p>โปรดติดต่อผู้ดูแลเว็บไซต์เพื่อขอความช่วยเหลือ</p>
          <dl className="detail-list"><div><dt>เบอร์โทร</dt><dd>รอเพิ่มเบอร์ติดต่อ</dd></div><div><dt>Instagram</dt><dd>รอเพิ่มชื่อบัญชี</dd></div></dl>
          <div className="contact-qr"><span>QR Code LINE</span><p>รอเพิ่ม QR Code จากผู้ดูแลเว็บไซต์</p></div>
          <button className="primary" onClick={() => setForgotOpen(false)}>รับทราบ</button>
        </section>
      </div>}
    </main>
  );
}

function DashboardV2({
  equipmentActive,
  chemicalActive,
  setTab,
  onReturn,
  onChemicalReturn,
  onDamage,
  onDetail,
  onInventoryDetail,
}: {
  equipmentActive: boolean;
  chemicalActive: boolean;
  setTab: (t: Tab) => void;
  onReturn: () => void;
  onChemicalReturn: () => void;
  onDamage: () => void;
  onDetail: () => void;
  onInventoryDetail: (kind: "equipment" | "chemical") => void;
}) {
  return (
    <>
      <div className="page-heading dashboard-head">
        <div>
          <p>OVERVIEW</p>
          <h1>สวัสดี ชนกชนม์</h1>
        </div>
        <div className="quick-actions">
          <button
            className="primary compact"
            onClick={() => setTab("equipment")}
          >
            <Boxes />
            ยืมอุปกรณ์
          </button>
          <button
            className="primary compact chemical-btn"
            onClick={() => setTab("chemicals")}
          >
            <FlaskConical />
            ยืมสารเคมี
          </button>
        </div>
      </div>
      <section className="equal-inventory">
        <article>
          <div className="inventory-title">
            <span className="inventory-symbol equipment">
              <Boxes />
            </span>
            <div>
              <h2>อุปกรณ์ · Equipment</h2>
              <p>14 รายการ · รวม 38 ชิ้น</p>
            </div>
          </div>
          <div className="inventory-numbers">
            <div>
              <b>27</b>
              <span>พร้อมใช้</span>
            </div>
            <div>
              <b>8</b>
              <span>กำลังใช้งาน</span>
            </div>
            <div>
              <b>3</b>
              <span>ชำรุด/รอตรวจ</span>
            </div>
          </div>
          <button onClick={() => onInventoryDetail("equipment")}>
            รายละเอียด <ChevronRight />
          </button>
        </article>
        <article>
          <div className="inventory-title">
            <span className="inventory-symbol chemical">
              <FlaskConical />
            </span>
            <div>
              <h2>สารเคมี · Chemicals</h2>
              <p>42 รายการ · รวม 64 ขวด</p>
            </div>
          </div>
          <div className="inventory-numbers">
            <div>
              <b>58</b>
              <span>พร้อมใช้</span>
            </div>
            <div>
              <b>3</b>
              <span>รออนุมัติ</span>
            </div>
            <div>
              <b>3</b>
              <span>หมด/สั่งซื้อ</span>
            </div>
          </div>
          <button onClick={() => onInventoryDetail("chemical")}>
            รายละเอียด <ChevronRight />
          </button>
        </article>
      </section>
      <button className="urgent-damage" onClick={onDamage}>
        <AlertTriangle />
        <div>
          <b>อุปกรณ์หรือสารเคมีเสียหายรุนแรง?</b>
          <span>
            แจ้งทันที ระบบจะบันทึกความเสียหายในชื่อผู้ใช้โดยไม่ต้องกดคืน ·
            โปรดแจ้งอาจารย์ที่ปรึกษาด่วน
          </span>
        </div>
        <ChevronRight />
      </button>
      <section className="two-col">
        <div>
          <div className="section-title">
            <div>
              <h2>กำลังใช้งาน · Active equipment</h2>
            </div>
          </div>
          {equipmentActive ? (
            <article className="active-loan">
              <div className="equip-thumb">HP</div>
              <div className="loan-main">
                <div className="row">
                  <span className="badge blue">กำลังใช้งาน</span>
                  <small>EQ-HP-001</small>
                </div>
                <h3>Hot Plate Magnetic Stirrer</h3>
                <div className="loan-meta">
                  <span>
                    <CalendarDays />5 ก.ย. 2026
                  </span>
                  <span>
                    <Clock3 />
                    09:00–16:30
                  </span>
                </div>
              </div>
              <button className="return-btn" onClick={onReturn}>
                <RotateCcw />
                คืนอุปกรณ์
              </button>
            </article>
          ) : (
            <div className="empty-loan">
              ไม่มีอุปกรณ์ที่กำลังยืม · No active equipment
            </div>
          )}
        </div>
        <aside>
          <div className="section-title">
            <div>
              <h2>สารที่ยืม · Issued chemicals</h2>
            </div>
          </div>
          {chemicalActive ? (
            <article className="active-loan chemical-loan">
              <div className="equip-thumb">
                <Beaker />
              </div>
              <div className="loan-main">
                <span className="badge green">กำลังใช้งาน</span>
                <h3>Acetic acid 99.8%</h3>
                <div className="loan-meta">
                  <span>50 mL</span>
                  <span>5 ก.ย. 2026</span>
                </div>
              </div>
              <button
                className="return-btn chemical-return"
                onClick={onChemicalReturn}
              >
                <RotateCcw />
                คืนสาร
              </button>
            </article>
          ) : (
            <div className="empty-loan">
              ไม่มีสารที่กำลังยืม · No issued chemicals
            </div>
          )}
        </aside>
      </section>
    </>
  );
}

function RecentActivity({ onDetail }: { onDetail: () => void }) {
  return (
    <section className="recent">
      <div className="section-title">
        <div>
          <h2>กิจกรรมล่าสุด · Recent activity</h2>
        </div>
      </div>
      {[
        [
          "คืนอุปกรณ์สำเร็จ",
          "Analytical Balance · EQ-BA-010",
          "4 ก.ย. 2026 · 17:42",
          Check,
          "ok",
        ],
        [
          "แจ้งสารหมดหลังใช้งาน",
          "Ethanol 95% · CH-ET-020",
          "3 ก.ย. 2026 · 14:18",
          Beaker,
          "warn",
        ],
        [
          "ยืมอุปกรณ์",
          "Hot Plate Magnetic Stirrer · EQ-HP-001",
          "3 ก.ย. 2026 · 09:02",
          Activity,
          "info",
        ],
      ].map(([a, b, c, Icon, tone]: any) => (
        <button
          className="activity-row activity-button"
          key={a}
          onClick={onDetail}
        >
          <span className={"activity-icon " + tone}>
            <Icon />
          </span>
          <div>
            <b>{a}</b>
            <span>{b}</span>
          </div>
          <time>{c}</time>
          <ChevronRight />
        </button>
      ))}
    </section>
  );
}

function HistoryPageV2({ records, onDetail }: { records: ReturnRecord[]; onDetail: (record: ReturnRecord | null) => void }) {
  const groups = [
    {
      title: "อุปกรณ์ · Equipment",
      Icon: Boxes,
      tone: "equipment",
      items: [
        [
          "5 ก.ย. 2026",
          "กำลังใช้งาน",
          "Hot Plate Magnetic Stirrer",
          "09:00–16:30",
          "EQ-HP-001",
          "blue",
        ],
      ],
    },
    {
      title: "สารเคมี · Chemicals",
      Icon: FlaskConical,
      tone: "chemical",
      items: [
        [
          "3 ก.ย. 2026",
          "สารหมดหลังใช้",
          "Ethanol 95%",
          "14:18",
          "CH-ET-020",
          "amber",
        ],
        [
          "30 ส.ค. 2026",
          "แจ้งเหลือน้อย",
          "Sodium hydroxide",
          "11:32",
          "CH-NA-008",
          "amber",
        ],
      ],
    },
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <p>AUDIT TRAIL</p>
          <h1>ประวัติ · History</h1>
        </div>
        <button className="outline" onClick={() => exportReturnExcel(records, "LabTrace-my-returns")}>
          <Download />
          Export Excel
        </button>
      </div>
      {records.length > 0 && <section className="return-history-section">
        <div className="section-title"><div><h2>รายการคืนที่ลงชื่อแล้ว</h2><span>แตะรายการเพื่อดูรายละเอียดและลายเซ็นจริง</span></div></div>
        {records.map((record) => <button className="return-history-row" key={record.id} onClick={() => onDetail(record)}>
          <span className="badge green">คืนแล้ว</span><b>{record.itemName}</b><span>{record.itemCode} · {formatThaiDateTime(record.returnedAt)}</span><ChevronRight size={18} />
        </button>)}
      </section>}
      <div className="history-groups">
        {groups.map(({ title, Icon, tone, items }) => (
          <section className="history-group" key={title}>
            <div className="history-group-title">
              <span className={`inventory-symbol ${tone}`}>
                <Icon />
              </span>
              <div>
                <h2>{title}</h2>
                <p>{items.filter((r) => !(r[4] === "EQ-HP-001" && records.some((record) => record.itemCode === "EQ-HP-001"))).length + records.filter((record) => record.kind === (tone === "equipment" ? "equipment" : "chemical")).length} กิจกรรมล่าสุด</p>
              </div>
            </div>
            <div className="history-list">
              {items.filter((r) => !(r[4] === "EQ-HP-001" && records.some((record) => record.itemCode === "EQ-HP-001"))).map((r, i) => (
                <button className="history-card" key={i} onClick={() => onDetail(null)}>
                  <div className="history-card-top">
                    <time>{r[0]}</time>
                    <span className={`badge ${r[5]}`}>{r[1]}</span>
                  </div>
                  <h3>{r[2]}</h3>
                  <div className="history-card-meta">
                    <span>
                      <Clock3 />
                      {r[3]}
                    </span>
                    <span>{r[4]}</span>
                  </div>
                  <ChevronRight />
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function Dashboard({
  setTab,
  onReturn,
}: {
  setTab: (t: Tab) => void;
  onReturn: () => void;
}) {
  const stats = [
    ["อุปกรณ์ทั้งหมด", "14", "38 ชิ้น", Boxes, "navy"],
    ["พร้อมใช้งาน", "27", "71%", PackageCheck, "green"],
    ["กำลังใช้งาน", "8", "3 รายการ", Clock3, "blue"],
    ["ชำรุด / รอตรวจ", "3", "ต้องดำเนินการ", AlertTriangle, "red"],
  ] as const;
  return (
    <>
      <div className="page-heading">
        <div>
          <p>วันเสาร์ที่ 5 กันยายน 2026</p>
          <h1>สวัสดี ชนกชนม์ 👋</h1>
          <span>นี่คือภาพรวมการใช้งานห้องปฏิบัติการของคุณ</span>
        </div>
        <button className="primary compact" onClick={() => setTab("equipment")}>
          <Boxes size={18} />
          ยืมอุปกรณ์
        </button>
      </div>
      <section className="stat-grid">
        {stats.map(([label, val, sub, Icon, tone]) => (
          <article className={"stat " + tone} key={label}>
            <div className="stat-icon">
              <Icon />
            </div>
            <div>
              <span>{label}</span>
              <strong>{val}</strong>
              <small>{sub}</small>
            </div>
          </article>
        ))}
      </section>
      <section className="two-col">
        <div>
          <div className="section-title">
            <div>
              <h2>รายการที่กำลังใช้งาน</h2>
              <span>อุปกรณ์ที่อยู่ในความรับผิดชอบของคุณ</span>
            </div>
            <button onClick={() => setTab("history")}>
              ดูทั้งหมด <ChevronRight />
            </button>
          </div>
          <article className="active-loan">
            <div className="equip-thumb">HP</div>
            <div className="loan-main">
              <div className="row">
                <span className="badge blue">กำลังใช้งาน</span>
                <small>EQ-HP-001</small>
              </div>
              <h3>Hot Plate Magnetic Stirrer</h3>
              <div className="loan-meta">
                <span>
                  <CalendarDays />5 ก.ย. 2026
                </span>
                <span>
                  <Clock3 />
                  09:00–16:30
                </span>
                <span>
                  <MapPin />
                  Lab 3-204
                </span>
              </div>
            </div>
            <button className="return-btn" onClick={onReturn}>
              <RotateCcw />
              คืนอุปกรณ์
            </button>
          </article>
        </div>
        <aside>
          <div className="section-title">
            <div>
              <h2>สถานะสารเคมี</h2>
              <span>รายการที่ต้องติดตาม</span>
            </div>
          </div>
          <div className="chemical-summary">
            <div>
              <i className="dot red" />
              <span>สารหมด</span>
              <b>2</b>
            </div>
            <div>
              <i className="dot amber" />
              <span>รออนุมัติ</span>
              <b>3</b>
            </div>
            <div>
              <i className="dot blue" />
              <span>กำลังสั่งซื้อ</span>
              <b>1</b>
            </div>
            <button onClick={() => setTab("chemicals")}>
              ดูรายการสารเคมี <ChevronRight />
            </button>
          </div>
        </aside>
      </section>
      <section className="recent">
        <div className="section-title">
          <div>
            <h2>กิจกรรมล่าสุด</h2>
            <span>Audit trail ของบัญชีคุณ</span>
          </div>
        </div>
        {[
          [
            "คืนอุปกรณ์สำเร็จ",
            "Analytical Balance · EQ-BA-010",
            "4 ก.ย. 2026 · 17:42",
            Check,
            "ok",
          ],
          [
            "แจ้งสารหมดหลังใช้งาน",
            "Ethanol 95% · CH-ET-020",
            "3 ก.ย. 2026 · 14:18",
            Beaker,
            "warn",
          ],
          [
            "ยืมอุปกรณ์",
            "Hot Plate Magnetic Stirrer · EQ-HP-001",
            "3 ก.ย. 2026 · 09:02",
            Activity,
            "info",
          ],
        ].map(([a, b, c, Icon, tone]: any) => (
          <div className="activity-row" key={a}>
            <span className={"activity-icon " + tone}>
              <Icon />
            </span>
            <div>
              <b>{a}</b>
              <span>{b}</span>
            </div>
            <time>{c}</time>
            <ChevronRight />
          </div>
        ))}
      </section>
    </>
  );
}

function EquipmentPage({ items, search, setSearch, onBook, onReport }: any) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p>INVENTORY</p>
          <h1>อุปกรณ์ · Equipment</h1>
        </div>
      </div>
      <div className="toolbar">
        <label className="search">
          <Search />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาชื่อ รหัส หรือหมวดหมู่"
          />
        </label>
      </div>
      <div className="equipment-grid">
        {items.map((e: any) => (
          <article className="equipment-card" key={e.id}>
            <div className={"equipment-art " + e.color}>
              <span>{e.icon}</span>
              <small>{e.category}</small>
            </div>
            <div className="equipment-body">
              <span className="equipment-id">{e.id}</span>
              <h3>{e.name}</h3>
              <div className="stock">
                <span>
                  <i className="dot green" />
                  พร้อมใช้ <b>{e.ready}</b>
                </span>
                <span>
                  <i className="dot blue" />
                  ใช้งาน <b>{e.using}</b>
                </span>
                <span>
                  <i className="dot red" />
                  ชำรุด <b>{e.broken}</b>
                </span>
              </div>
              <div className="stockbar">
                <i style={{ width: (e.ready / e.total) * 100 + "%" }} />
                <i style={{ width: (e.using / e.total) * 100 + "%" }} />
                <i style={{ width: (e.broken / e.total) * 100 + "%" }} />
              </div>
              <div className="item-actions">
                <button disabled={e.ready === 0} onClick={() => onBook(e)}>
                  {e.ready === 0 ? "ใช้งานทั้งหมด" : "ยืม · Borrow"}
                </button>
                <button className="report-action" onClick={onReport}>
                  แจ้งพบชำรุด · Report
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function ChemicalsPage({
  onBorrow,
  onReport,
}: {
  onBorrow: (c: (typeof chemicals)[number]) => void;
  onReport: () => void;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p>CHEMICALS</p>
          <h1>สารเคมี · Chemicals</h1>
        </div>
      </div>
      <div className="chemical-grid">
        {chemicals.map((c) => (
          <article className="chemical-card" key={c.id}>
            <div className="chem-icon">
              <Beaker />
            </div>
            <div className="chemical-info">
              <span>{c.id}</span>
              <h3>{c.name}</h3>
              <p>
                <MapPin />
                {c.place}
              </p>
              <i className={"badge " + c.tone}>{c.status}</i>
            </div>
            <div className="item-actions">
              <button
                disabled={c.tone === "wait" || c.tone === "order"}
                onClick={() => onBorrow(c)}
              >
                ยืม · Borrow
              </button>
              <button className="report-action" onClick={onReport}>
                แจ้งพบเสียหาย · Report
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

function HistoryPage() {
  return (
    <>
      <div className="page-heading">
        <div>
          <p>AUDIT TRAIL</p>
          <h1>ประวัติการใช้งาน</h1>
          <span>ทุกกิจกรรมถูกบันทึกและตรวจสอบย้อนหลังได้</span>
        </div>
        <button className="outline">
          <Download />
          Export Excel
        </button>
      </div>
      <div className="timeline">
        {[
          [
            "5 ก.ย. 2026",
            "กำลังใช้งาน",
            "Hot Plate Magnetic Stirrer",
            "09:00–16:30 · EQ-HP-001",
            "blue",
          ],
          [
            "4 ก.ย. 2026",
            "คืนสำเร็จ",
            "Analytical Balance",
            "ผู้ยืมลงชื่อและยืนยันว่าเก็บคืนที่เดิมแล้ว",
            "green",
          ],
          [
            "3 ก.ย. 2026",
            "แจ้งสารหมดหลังใช้",
            "Ethanol 95%",
            "14:18 · CH-ET-020",
            "amber",
          ],
          [
            "1 ก.ย. 2026",
            "คืนสำเร็จ",
            "UV-Vis Spectrophotometer",
            "ผู้ยืมลงชื่อและยืนยันว่าเก็บคืนที่เดิมแล้ว",
            "green",
          ],
        ].map((r, i) => (
          <article key={i}>
            <time>{r[0]}</time>
            <i />
            <div>
              <span className={"badge " + r[4]}>{r[1]}</span>
              <h3>{r[2]}</h3>
              <p>{r[3]}</p>
            </div>
            <ChevronRight />
          </article>
        ))}
      </div>
    </>
  );
}

type ApprovalItem = {
  id: number;
  kind: "อุปกรณ์" | "สารเคมี";
  name: string;
  code: string;
  report: string;
  reporter: string;
  reportedAt: string;
  detail: string;
};

type StockItem = {
  name: string;
  code: string;
  quantity: number;
  unit: string;
  summary: string;
  kind: "equipment" | "chemical";
  location?: string;
};

const initialStock: StockItem[] = [
  { name: "Hot Plate Magnetic Stirrer", code: "EQ-HP", quantity: 5, unit: "เครื่อง", summary: "พร้อม 3 · ใช้งาน 1 · ชำรุด 1", kind: "equipment" },
  { name: "UV-Vis Spectrophotometer", code: "EQ-SP", quantity: 2, unit: "เครื่อง", summary: "พร้อม 1 · ใช้งาน 1", kind: "equipment" },
  { name: "Analytical Balance", code: "EQ-BA", quantity: 4, unit: "เครื่อง", summary: "กำลังใช้งาน 4", kind: "equipment" },
  { name: "pH Meter", code: "EQ-PH", quantity: 3, unit: "เครื่อง", summary: "พร้อมใช้ 3", kind: "equipment" },
  { name: "Acetic acid 99.8%", code: "CH-AC", quantity: 4, unit: "ขวด", summary: "พร้อม 3 · ใช้งาน 1", kind: "chemical" },
  { name: "Ethanol 95%", code: "CH-ET", quantity: 6, unit: "ขวด", summary: "พร้อม 4 · เหลือน้อย 2", kind: "chemical" },
  { name: "Sodium hydroxide", code: "CH-NA", quantity: 3, unit: "ขวด", summary: "พร้อม 2 · หมด 1", kind: "chemical" },
  { name: "Hydrochloric acid 37%", code: "CH-HC", quantity: 2, unit: "ขวด", summary: "พร้อมใช้ 2", kind: "chemical" },
];

function exportAuditExcel(rows: Array<ApprovalItem & { status: string; approvedAt: string; quantity?: number }>) {
  const escapeXml = (value: string | number) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char] || char);
  const table = [
    ["ประเภท", "ชื่อรายการ", "รหัส", "รายงาน", "ผู้แจ้ง", "วันที่แจ้ง", "สถานะ", "อาจารย์ดำเนินการ", "จำนวน", "รายละเอียด"],
    ...rows.map((row) => [row.kind, row.name, row.code, row.report, row.reporter, row.reportedAt, row.status, row.approvedAt, row.quantity ?? "", row.detail]),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Audit log"><Table>${table.map((row) => `<Row>${row.map((cell) => `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`).join("")}</Row>`).join("")}</Table></Worksheet></Workbook>`;
  const url = URL.createObjectURL(new Blob(["\ufeff", xml], { type: "application/vnd.ms-excel;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `LabTrace-audit-${new Date().toISOString().slice(0, 10)}.xls`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function weekStartBangkok(iso: string) {
  const shifted = new Date(new Date(iso).getTime() + 7 * 3600000);
  shifted.setUTCDate(shifted.getUTCDate() - (shifted.getUTCDay() + 6) % 7);
  return shifted.toISOString().slice(0, 10);
}
function weekLabel(start: string) {
  const first = new Date(`${start}T00:00:00+07:00`);
  const last = new Date(first.getTime() + 6 * 86400000);
  const display = (value: Date) => new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Bangkok" }).format(value);
  return `${display(first)} – ${display(last)}`;
}
function exportReturnExcel(records: ReturnRecord[], filename: string) {
  const escapeXml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char] || char);
  const rows = [
    ["สัปดาห์", "ชื่อนักศึกษา", "รหัสนักศึกษา", "ชั้นปีนักศึกษา", "ประเภท", "ชื่อรายการ", "รหัสรายการ", "จำนวน", "เริ่มยืม", "สิ้นสุดกำหนดยืม", "คืนจริง", "สถานะ", "สถานที่", "วัตถุประสงค์", "หมายเหตุ", "ลายเซ็น"],
    ...records.map((record) => [weekLabel(weekStartBangkok(record.returnedAt)), studentDisplayName(record.borrowerId), record.borrowerId, studentYear(record.borrowerId), record.kind === "equipment" ? "อุปกรณ์" : "สารเคมี", record.itemName, record.itemCode, record.quantity, record.kind === "equipment" ? formatThaiDateTime(record.borrowedFrom) : new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" }).format(new Date(record.borrowedFrom)), record.kind === "equipment" ? formatThaiDateTime(record.borrowedUntil) : new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" }).format(new Date(record.borrowedUntil)), formatThaiDateTime(record.returnedAt), new Date(record.returnedAt) <= new Date(record.borrowedUntil) ? "ตรงเวลา" : "เกินกำหนด", record.location, record.purpose, record.note, "ลงชื่อแล้ว (เปิดดูภาพใน LabTrace)"]),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Return history"><Table>${rows.map((row) => `<Row>${row.map((cell) => `<Cell><Data ss:Type="String">${escapeXml(cell)}</Data></Cell>`).join("")}</Row>`).join("")}</Table></Worksheet></Workbook>`;
  const url = URL.createObjectURL(new Blob(["\ufeff", xml], { type: "application/vnd.ms-excel;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.xls`;
  document.body.appendChild(link);
  link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function TeacherReturnHistory({ records }: { records: ReturnRecord[] }) {
  const [week, setWeek] = useState("all");
  const [detail, setDetail] = useState<ReturnRecord | null>(null);
  const weeks = Array.from(new Set(records.map((record) => weekStartBangkok(record.returnedAt)))).sort().reverse();
  const filtered = week === "all" ? records : records.filter((record) => weekStartBangkok(record.returnedAt) === week);
  return <>
    <div className="page-heading"><div><p>RETURN HISTORY</p><h1>ประวัติการใช้งาน · Returns</h1><span>รายการคืนที่นักศึกษาลงชื่อ แยกตามสัปดาห์ที่คืน</span></div>
      <button className="outline" disabled={!filtered.length} onClick={() => exportReturnExcel(filtered, "LabTrace-weekly-returns")}><Download size={18} /> Export Excel</button>
    </div>
    <div className="return-filter"><label>เลือกสัปดาห์ <select value={week} onChange={(event) => setWeek(event.target.value)}><option value="all">ทุกสัปดาห์</option>{weeks.map((start) => <option key={start} value={start}>{weekLabel(start)}</option>)}</select></label><span>{filtered.length} รายการคืน</span></div>
    {weeks.length === 0 ? <section className="inventory-admin-section empty-returns"><h2>ยังไม่มีรายการคืนที่ลงชื่อ</h2><p>เมื่อผู้ยืมยืนยันการคืน รายการและลายเซ็นจะปรากฏที่นี่ในเบราว์เซอร์นี้</p></section> :
      weeks.filter((start) => week === "all" || week === start).map((start) => <section className="inventory-admin-section weekly-returns" key={start}>
        <div className="inventory-admin-heading"><div><h2>สัปดาห์ {weekLabel(start)}</h2><p>วันที่ในหัวข้ออ้างอิงจากวันที่คืนจริง</p></div><span>{records.filter((record) => weekStartBangkok(record.returnedAt) === start).length} รายการ</span></div>
        {filtered.filter((record) => weekStartBangkok(record.returnedAt) === start).map((record) => <button className="teacher-return-row" key={record.id} onClick={() => setDetail(record)}>
          <div><b>ชื่อนักศึกษา {studentDisplayName(record.borrowerId)}</b><small>รหัสนักศึกษา {record.borrowerId}</small><small>ชั้นปีนักศึกษา {studentYear(record.borrowerId)}</small></div>
          <div><b>{record.itemName}</b><small>{record.itemCode} · {record.quantity}</small></div>
          <div><small>ยืม {formatBorrowedPeriod(record)}</small><small>คืน {formatThaiDateTime(record.returnedAt)}</small></div>
          <span className={`badge ${new Date(record.returnedAt) <= new Date(record.borrowedUntil) ? "green" : "red"}`}>{new Date(record.returnedAt) <= new Date(record.borrowedUntil) ? "ตรงเวลา" : "เกินกำหนด"}</span><ChevronRight size={18} />
        </button>)}
      </section>)}
    {detail && <ReturnRecordModal record={detail} onClose={() => setDetail(null)} />}
  </>;
}

function AdminPage({
  items,
  onApprove,
}: {
  items: ApprovalItem[];
  onApprove: (item: ApprovalItem, status: string) => void;
}) {
  const [detail, setDetail] = useState<ApprovalItem | null>(null);
  const [statuses, setStatuses] = useState<Record<number, string>>({});
  const groups = ["อุปกรณ์", "สารเคมี"] as const;
  return (
    <>
      <div className="page-heading">
        <div>
          <p>APPROVALS</p>
          <h1>รายการรออนุมัติ</h1>
          <span>รายงานที่นักศึกษาส่งมาเพื่อให้อาจารย์พิจารณา</span>
        </div>
      </div>
      <div className="approval-groups">
        {groups.map((kind) => {
          const groupedItems = items.filter((item) => item.kind === kind);
          const options =
            kind === "อุปกรณ์"
              ? [
                  "รับเรื่อง",
                  "รอตรวจสอบ",
                  "รอส่งซ่อม",
                  "กำลังซ่อม",
                  "ซ่อมเสร็จ/พร้อมใช้",
                  "ซื้อใหม่ทดแทน",
                ]
              : [
                  "รับเรื่อง",
                  "รอตรวจสอบ",
                  "สั่งซื้อ",
                  "กำลังจัดส่ง",
                  "รับเข้าคลัง/พร้อมใช้",
                  "ยกเลิกคำขอ",
                ];
          return (
            <section
              className={`approval-card approval-kind ${kind === "สารเคมี" ? "chemical-kind" : ""}`}
              key={kind}
            >
              <div className="section-title">
                <div>
                  <h2>{kind}</h2>
                  <span>รอดำเนินการ {groupedItems.length} รายการ</span>
                </div>
              </div>
              {groupedItems.length === 0 ? (
                <div className="empty-loan">ไม่มีรายการ{kind}รออนุมัติ</div>
              ) : (
                groupedItems.map((item) => (
                  <div className="approval-row approval-workflow" key={item.id}>
                    <div
                      className={`chem-icon ${item.kind === "สารเคมี" ? "red" : ""}`}
                    >
                      {item.kind === "สารเคมี" ? <Beaker /> : <Wrench />}
                    </div>
                    <div>
                      <b>{item.name}</b>
                      <span>
                        {item.code} · {item.report}
                      </span>
                    </div>
                    <div>
                      <b>{item.reporter}</b>
                      <span>{item.reportedAt}</span>
                    </div>
                    <button className="outline" onClick={() => setDetail(item)}>
                      ดูรายละเอียด
                    </button>
                    <select
                      value={statuses[item.id] || "รับเรื่อง"}
                      onChange={(e) =>
                        setStatuses({ ...statuses, [item.id]: e.target.value })
                      }
                    >
                      {options.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                    <button
                      className="primary compact"
                      onClick={() =>
                        onApprove(item, statuses[item.id] || "รับเรื่อง")
                      }
                    >
                      <Check />
                      อนุมัติ
                    </button>
                  </div>
                ))
              )}
            </section>
          );
        })}
      </div>
      {detail && (
        <ApprovalDetailModal item={detail} onClose={() => setDetail(null)} />
      )}
    </>
  );
}

function ApprovalDetailModal({
  item,
  onClose,
}: {
  item: ApprovalItem;
  onClose: () => void;
}) {
  return (
    <div className="modal-wrap">
      <button
        className="modal-backdrop"
        onClick={onClose}
        aria-label="ปิดรายละเอียด"
      />
      <section className="modal">
        <div className="modal-title">
          <div>
            <span>STUDENT REPORT</span>
            <h2>รายละเอียดรายงาน</h2>
            <p>
              {item.kind} · {item.code}
            </p>
          </div>
          <button onClick={onClose}>
            <X />
          </button>
        </div>
        <dl className="detail-list approval-detail-list">
          <div>
            <dt>รายการ</dt>
            <dd>{item.name}</dd>
          </div>
          <div>
            <dt>ประเภทการแจ้ง</dt>
            <dd>{item.report}</dd>
          </div>
          <div>
            <dt>ผู้แจ้ง</dt>
            <dd>{item.reporter}</dd>
          </div>
          <div>
            <dt>วันและเวลา</dt>
            <dd>{item.reportedAt}</dd>
          </div>
          <div>
            <dt>รายละเอียด</dt>
            <dd>{item.detail}</dd>
          </div>
        </dl>
        <div className="modal-actions">
          <button className="primary" onClick={onClose}>
            ปิด · Close
          </button>
        </div>
      </section>
    </div>
  );
}

function TeacherAuditLog({
  logs,
}: {
  logs: Array<ApprovalItem & { status: string; approvedAt: string; quantity?: number }>;
}) {
  const defaultLogs = [
    {
      id: 101,
      kind: "อุปกรณ์" as const,
      name: "Analytical Balance",
      code: "EQ-BA-010",
      report: "แจ้งอุปกรณ์ผิดปกติ",
      reporter: "อริสา คำดี",
      reportedAt: "4 ก.ย. 2026 · 15:20",
      detail: "ค่าชั่งไม่นิ่ง",
      status: "รอส่งซ่อม",
      approvedAt: "4 ก.ย. 2026 · 17:42",
    },
    {
      id: 102,
      kind: "สารเคมี" as const,
      name: "Hydrochloric acid 37%",
      code: "CH-HC-003",
      report: "แจ้งสารหมด",
      reporter: "ธนกฤต แก้วใจ",
      reportedAt: "3 ก.ย. 2026 · 11:05",
      detail: "ขวดเดิมหมดแล้ว",
      status: "สั่งซื้อใหม่",
      approvedAt: "3 ก.ย. 2026 · 14:18",
    },
  ];
  const rows = [...logs, ...defaultLogs];
  return (
    <>
      <div className="page-heading">
        <div>
          <p>AUDIT LOG</p>
          <h1>บันทึกการดำเนินการของอาจารย์</h1>
          <span>ประวัติการเลือกสถานะและอนุมัติรายงาน</span>
        </div>
        <button className="outline" onClick={() => exportAuditExcel(rows)}>
          <Download size={18} /> ส่งออก Excel
        </button>
      </div>
      <section className="teacher-log-list">
        {rows.map((row) => (
          <article key={`${row.id}-${row.approvedAt}`}>
            <div>
              <span className="badge blue">{row.status}</span>
              <h3>{row.name}</h3>
              <p>
                {row.code} · {row.report}
              </p>
            </div>
            <dl>
              <div>
                <dt>ผู้แจ้ง</dt>
                <dd>{row.reporter}</dd>
              </div>
              <div>
                <dt>อาจารย์ดำเนินการ</dt>
                <dd>{row.approvedAt}</dd>
              </div>
              <div>
                <dt>รายละเอียด</dt>
                <dd>{row.detail}</dd>
              </div>
            </dl>
          </article>
        ))}
      </section>
    </>
  );
}

type TrackingItem = ApprovalItem & { status: string; quantity?: number };

function TeacherInventory({
  tracking,
  stock,
  onUpdate,
  onAdd,
}: {
  tracking: TrackingItem[];
  stock: StockItem[];
  onUpdate: (item: TrackingItem, status: string, quantity?: number) => void;
  onAdd: (item: StockItem, existing: boolean) => void;
}) {
  const [section, setSection] = useState<"equipment" | "chemical">("equipment");
  const [statuses, setStatuses] = useState<Record<number, string>>({});
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [addOpen, setAddOpen] = useState(false);
  const isEquipment = section === "equipment";
  const active = stock.filter((item) => item.kind === section);
  const filteredTracking = tracking.filter(
    (item) => item.kind === (isEquipment ? "อุปกรณ์" : "สารเคมี"),
  );
  const statusOptions = isEquipment
    ? [
        "รับเรื่อง",
        "รอตรวจสอบ",
        "รอส่งซ่อม",
        "กำลังซ่อม",
        "ซ่อมเสร็จ/พร้อมใช้",
        "ซื้อใหม่ทดแทน",
        "รับของแล้ว/พร้อมใช้",
      ]
    : [
        "รับเรื่อง",
        "รอตรวจสอบ",
        "สั่งซื้อ",
        "กำลังจัดส่ง",
        "รับของแล้ว/พร้อมใช้",
        "ยกเลิกคำขอ",
      ];
  return (
    <>
      <div className="page-heading">
        <div>
          <p>INVENTORY CONTROL</p>
          <h1>จัดการคลัง · Inventory</h1>
          <span>แยกของที่ใช้งานหมุนเวียนและรายการที่กำลังติดตามสถานะ</span>
        </div>
        <button className="primary compact" onClick={() => setAddOpen(true)}>+ เพิ่มรายการ · Add item</button>
      </div>
      <div className="inventory-tabs">
        <button
          className={isEquipment ? "active" : ""}
          onClick={() => setSection("equipment")}
        >
          <Boxes />
          อุปกรณ์ · Equipment
        </button>
        <button
          className={!isEquipment ? "active chemical" : ""}
          onClick={() => setSection("chemical")}
        >
          <FlaskConical />
          สารเคมี · Chemicals
        </button>
      </div>
      <section className="inventory-admin-section">
        <div className="inventory-admin-heading">
          <div>
            <h2>คลังที่ใช้งานหมุนเวียน</h2>
            <p>รายการที่มีอยู่ในระบบและยอดพร้อมใช้ปัจจุบัน</p>
          </div>
          <span>{active.length} รายการ</span>
        </div>
        <div className="stock-table">
          {active.map((row) => (
            <article key={row.code}>
              <div>
                <b>{row.name}</b>
                <small>{row.code}{row.location ? ` · ${row.location}` : ""}</small>
              </div>
              <strong>
                {row.quantity} {row.unit}
              </strong>
              <span>{row.summary}</span>
              <button className="outline">ดูรายละเอียด</button>
            </article>
          ))}
        </div>
      </section>
      <section className="inventory-admin-section tracking-section">
        <div className="inventory-admin-heading">
          <div>
            <h2>กำลังอัปเดตและติดตามสถานะ</h2>
            <p>
              {isEquipment
                ? "งานตรวจสอบ ซ่อม หรือจัดซื้อทดแทน"
                : "งานตรวจสอบ สั่งซื้อ และรับสารเข้าคลัง"}
            </p>
          </div>
          <span>{filteredTracking.length} รายการ</span>
        </div>
        {filteredTracking.map((item) => {
          const current = statuses[item.id] || item.status;
          const needsQuantity = current === "รับของแล้ว/พร้อมใช้" || current === "ซื้อใหม่ทดแทน";
          return (
            <article className="tracking-row" key={item.id}>
              <div>
                <b>{item.name}</b>
                <small>
                  {item.code} · {item.report}
                </small>
              </div>
              <span className="badge blue">{item.status}</span>
              <select
                value={current}
                onChange={(e) =>
                  setStatuses({ ...statuses, [item.id]: e.target.value })
                }
              >
                {statusOptions.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
              {needsQuantity && (
                <input
                  type="number"
                  min="1"
                  aria-label={`จำนวนที่รับเข้า ${item.name}`}
                  placeholder={isEquipment ? "จำนวนเครื่อง" : "จำนวนขวด"}
                  value={quantities[item.id] || ""}
                  onChange={(e) =>
                    setQuantities({
                      ...quantities,
                      [item.id]: Number(e.target.value),
                    })
                  }
                />
              )}
              <button
                className="primary compact"
                disabled={needsQuantity && !(quantities[item.id] > 0)}
                onClick={() => onUpdate(item, current, quantities[item.id])}
              >
                อัปเดตสถานะ
              </button>
            </article>
          );
        })}
      </section>
      {addOpen && (
        <AddStockModal
          stock={stock}
          initialKind={section}
          onClose={() => setAddOpen(false)}
          onSave={(item, existing) => {
            onAdd(item, existing);
            setSection(item.kind);
            setAddOpen(false);
          }}
        />
      )}
    </>
  );
}

function AddStockModal({ stock, initialKind, onClose, onSave }: {
  stock: StockItem[];
  initialKind: "equipment" | "chemical";
  onClose: () => void;
  onSave: (item: StockItem, existing: boolean) => void;
}) {
  const [kind, setKind] = useState(initialKind);
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedCode, setSelectedCode] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState(initialKind === "equipment" ? "เครื่อง" : "ขวด");
  const [location, setLocation] = useState("");
  const options = stock.filter((item) => item.kind === kind);
  const selected = options.find((item) => item.code === selectedCode);
  const isExisting = mode === "existing";
  const codeTaken = stock.some((item) => item.code.toLowerCase() === code.trim().toLowerCase());
  const valid = Number.isInteger(Number(quantity)) && Number(quantity) > 0 &&
    (isExisting ? !!selected : !!name.trim() && !!code.trim() && !codeTaken && !!unit.trim());
  return (
    <div className="modal-wrap" role="presentation">
      <button className="modal-backdrop" onClick={onClose} aria-label="ปิดหน้าต่าง" />
      <form className="modal add-stock-modal" role="dialog" aria-modal="true" aria-labelledby="add-stock-title" onSubmit={(event) => {
        event.preventDefault();
        if (!valid) return;
        onSave(isExisting && selected ? { ...selected, quantity: Number(quantity) } : {
          kind, name: name.trim(), code: code.trim(), quantity: Number(quantity), unit: unit.trim(),
          summary: `พร้อมใช้ ${quantity} ${unit.trim()}`, location: location.trim(),
        }, isExisting);
      }}>
        <div className="modal-title">
          <div><span>INVENTORY CONTROL</span><h2 id="add-stock-title">รับรายการเข้าคลัง</h2><p>บันทึกของที่จัดซื้อเพิ่มโดยไม่มีคำร้อง</p></div>
          <button type="button" onClick={onClose} aria-label="ปิด"><X /></button>
        </div>
        <div className="form-grid">
          <label>ประเภท
            <select value={kind} onChange={(event) => {
              const next = event.target.value as typeof kind;
              setKind(next); setSelectedCode(""); setUnit(next === "equipment" ? "เครื่อง" : "ขวด");
            }}><option value="equipment">อุปกรณ์</option><option value="chemical">สารเคมี</option></select>
          </label>
          <label>รายการ
            <select value={mode} onChange={(event) => { setMode(event.target.value as typeof mode); setSelectedCode(""); }}>
              <option value="existing">รายการที่มีอยู่แล้ว</option><option value="new">เพิ่มรายการใหม่</option>
            </select>
          </label>
          {isExisting ? (
            <label className="full-field">เลือกรายการที่ซื้อเพิ่ม
              <select value={selectedCode} onChange={(event) => setSelectedCode(event.target.value)} required>
                <option value="">เลือก{kind === "equipment" ? "อุปกรณ์" : "สารเคมี"}</option>
                {options.map((item) => <option value={item.code} key={item.code}>{item.name} · {item.code}</option>)}
              </select>
            </label>
          ) : <>
            <label>ชื่อ{kind === "equipment" ? "อุปกรณ์" : "สารเคมี"}<input value={name} onChange={(event) => setName(event.target.value)} placeholder="ชื่อรายการ" required /></label>
            <label>รหัสรายการ<input value={code} onChange={(event) => setCode(event.target.value)} placeholder={kind === "equipment" ? "EQ-..." : "CH-..."} required /></label>
            {codeTaken && <p className="form-error full-field">รหัสนี้มีอยู่แล้ว กรุณาเลือกรายการเดิมหรือใช้รหัสใหม่</p>}
            <label className="full-field">ที่เก็บ / ตำแหน่ง<input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="เช่น Cabinet A · Shelf 2" /></label>
          </>}
          <label>จำนวนที่รับเข้า<input type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} placeholder="ระบุจำนวน" required /></label>
          <label>หน่วย
            {isExisting ? <input value={selected?.unit || ""} readOnly placeholder="เลือกชื่อรายการก่อน" /> :
              <input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="เช่น ขวด, กรัม, เครื่อง" required />}
          </label>
        </div>
        <div className="modal-actions"><button type="button" className="outline" onClick={onClose}>ยกเลิก</button><button type="submit" className="primary" disabled={!valid}>บันทึกรับเข้าคลัง</button></div>
      </form>
    </div>
  );
}

function TeacherUsageModal({
  kind,
  onClose,
}: {
  kind: "equipment" | "chemical";
  onClose: () => void;
}) {
  const rows =
    kind === "equipment"
      ? [
          [
            "ชนกชนม์ ใจดี",
            "6501234567",
            "Hot Plate Magnetic Stirrer",
            "5 ก.ย. 2026 · 09:00–16:30",
          ],
          [
            "ปาริชาติ แสงดี",
            "6501234581",
            "UV-Vis Spectrophotometer",
            "5 ก.ย. 2026 · 10:00–12:00",
          ],
        ]
      : [
          [
            "ชนกชนม์ ใจดี",
            "6501234567",
            "Acetic acid 99.8% · 50 mL",
            "5 ก.ย. 2026 · 09:00",
          ],
        ];
  return (
    <div className="modal-wrap">
      <button className="modal-backdrop" onClick={onClose} />
      <section className="modal usage-modal">
        <div className="modal-title">
          <div>
            <span>ACTIVE USAGE</span>
            <h2>
              รายละเอียดการใช้งาน{kind === "equipment" ? "อุปกรณ์" : "สารเคมี"}
            </h2>
            <p>ผู้ใช้งานและช่วงเวลาปัจจุบัน</p>
          </div>
          <button onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="usage-list">
          {rows.map((row) => (
            <article key={row[1]}>
              <div className="avatar">{row[0][0]}</div>
              <div>
                <b>ชื่อนักศึกษา {row[0]}</b>
                <small>รหัสนักศึกษา {row[1]}</small>
                <small>ชั้นปีนักศึกษา {studentYear(row[1])}</small>
                <h3>{row[2]}</h3>
                <p>{row[3]}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="modal-actions">
          <button className="primary" onClick={onClose}>
            ปิด · Close
          </button>
        </div>
      </section>
    </div>
  );
}

function TeacherShell({
  onLogout,
  onNotice,
  notice,
  returnRecords,
  teacherId,
  onChangePassword,
}: {
  onLogout: () => void;
  onNotice: (message: string) => void;
  notice: string;
  returnRecords: ReturnRecord[];
  teacherId: string;
  onChangePassword: (oldPassword: string, newPassword: string) => Promise<string | null>;
}) {
  const [view, setView] = useState("overview");
  const [teacherDetail, setTeacherDetail] = useState<
    "equipment" | "chemical" | null
  >(null);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalItem[]>([
    {
      id: 1,
      kind: "สารเคมี",
      name: "Sodium hydroxide",
      code: "CH-NA-008",
      report: "แจ้งสารใกล้หมด",
      reporter: "ชนกชนม์ ใจดี",
      reportedAt: "5 ก.ย. 2026 · 08:46",
      detail: "ปริมาณคงเหลือโดยประมาณน้อยกว่า 10% ต้องการใช้ในการปรับค่า pH",
    },
    {
      id: 2,
      kind: "อุปกรณ์",
      name: "Hot Plate Magnetic Stirrer",
      code: "EQ-HP-001",
      report: "แจ้งอุปกรณ์ชำรุด",
      reporter: "ปาริชาติ แสงดี",
      reportedAt: "5 ก.ย. 2026 · 10:15",
      detail: "เครื่องไม่ทำความร้อนและไฟแสดงสถานะไม่ติด พบก่อนเริ่มใช้งาน",
    },
    {
      id: 3,
      kind: "สารเคมี",
      name: "Ethanol 95%",
      code: "CH-ET-021",
      report: "แจ้งสารเหลือน้อย",
      reporter: "กิตติภพ วงศ์คำ",
      reportedAt: "5 ก.ย. 2026 · 13:22",
      detail: "เหลือประมาณหนึ่งในสี่ขวด สำหรับงานสกัดตัวอย่าง",
    },
  ]);
  const [approvalLogs, setApprovalLogs] = useState<
    Array<ApprovalItem & { status: string; approvedAt: string; quantity?: number }>
  >(() => {
    try { return JSON.parse(window.localStorage.getItem("labtrace-teacher-audit") || "[]"); }
    catch { return []; }
  });
  const [trackingItems, setTrackingItems] = useState<TrackingItem[]>([
    {
      id: 201,
      kind: "อุปกรณ์",
      name: "pH Meter",
      code: "EQ-PH-003",
      report: "ค่าการวัดคลาดเคลื่อน",
      reporter: "ชลธิชา บุญมี",
      reportedAt: "4 ก.ย. 2026 · 13:10",
      detail: "สอบเทียบแล้วค่ายังไม่นิ่ง",
      status: "รอส่งซ่อม",
    },
    {
      id: 202,
      kind: "สารเคมี",
      name: "Hydrochloric acid 37%",
      code: "CH-HC-003",
      report: "สารหมด",
      reporter: "ธนกฤต แก้วใจ",
      reportedAt: "3 ก.ย. 2026 · 11:05",
      detail: "ขวดเดิมหมดแล้ว",
      status: "กำลังจัดส่ง",
    },
  ]);
  const [stock, setStock] = useState<StockItem[]>(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem("labtrace-teacher-stock") || "null");
      return Array.isArray(saved) ? saved : initialStock;
    } catch { return initialStock; }
  });
  useEffect(() => { window.localStorage.setItem("labtrace-teacher-stock", JSON.stringify(stock)); }, [stock]);
  useEffect(() => { window.localStorage.setItem("labtrace-teacher-audit", JSON.stringify(approvalLogs)); }, [approvalLogs]);
  function addStock(item: StockItem, existing: boolean) {
    setStock((current) => existing
      ? current.map((entry) => entry.code === item.code ? { ...entry, quantity: entry.quantity + item.quantity, summary: `${entry.summary} · รับเพิ่ม ${item.quantity} ${entry.unit}` } : entry)
      : [...current, item]);
    setApprovalLogs((current) => [{
      id: Date.now(), kind: item.kind === "equipment" ? "อุปกรณ์" : "สารเคมี",
      name: item.name, code: item.code, report: existing ? "ซื้อเพิ่มเข้าคลัง" : "เพิ่มรายการใหม่เข้าคลัง",
      reporter: "อาจารย์ผู้ดูแล Lab", reportedAt: new Date().toLocaleString("th-TH"),
      detail: `รับเข้า ${item.quantity} ${item.unit}${item.location ? ` · ${item.location}` : ""}`,
      status: "รับเข้าคลัง/พร้อมใช้", approvedAt: new Date().toLocaleString("th-TH"), quantity: item.quantity,
    }, ...current]);
    onNotice(`รับ ${item.name} เข้าคลัง ${item.quantity} ${item.unit} แล้ว`);
  }
  function approveItem(item: ApprovalItem, status: string) {
    setPendingApprovals((current) =>
      current.filter((entry) => entry.id !== item.id),
    );
    setApprovalLogs((current) => [
      { ...item, status, approvedAt: "6 ก.ย. 2026 · 09:30" },
      ...current,
    ]);
    setTrackingItems((current) => [{ ...item, status }, ...current]);
    onNotice(`อนุมัติแล้ว · เปลี่ยนสถานะเป็น “${status}” และเพิ่มในบันทึก`);
  }
  function updateTracking(
    item: TrackingItem,
    status: string,
    quantity?: number,
  ) {
    const returnedToStock =
      status === "ซ่อมเสร็จ/พร้อมใช้" || status === "รับของแล้ว/พร้อมใช้" || status === "ซื้อใหม่ทดแทน";
    const closed =
      returnedToStock || status === "ยกเลิกคำขอ";
    setTrackingItems((current) =>
      closed
        ? current.filter((entry) => entry.id !== item.id)
        : current.map((entry) =>
            entry.id === item.id ? { ...entry, status, quantity } : entry,
          ),
    );
    if (returnedToStock) {
      const added = status === "ซ่อมเสร็จ/พร้อมใช้" ? 1 : quantity || 0;
      setStock((current) => current.map((entry) => entry.name === item.name && entry.kind === (item.kind === "อุปกรณ์" ? "equipment" : "chemical")
        ? { ...entry, quantity: entry.quantity + added, summary: `${entry.summary} · รับเพิ่ม ${added} ${entry.unit}` }
        : entry));
    }
    setApprovalLogs((current) => [
      { ...item, status, quantity, approvedAt: "6 ก.ย. 2026 · 10:15" },
      ...current,
    ]);
    onNotice(
      returnedToStock
        ? `ดำเนินการเสร็จแล้ว · เพิ่ม ${status === "ซ่อมเสร็จ/พร้อมใช้" ? 1 : quantity} รายการกลับเข้าคลัง`
        : closed
          ? `ปิดรายการเป็น “${status}” และนำออกจากรายการติดตามแล้ว`
          : `อัปเดตสถานะเป็น “${status}” แล้ว`,
    );
  }
  return (
    <div className="teacher-shell">
      <aside className="teacher-side">
        <div className="brand">
          <div className="brand-mark">
            <FlaskConical />
          </div>
          <div>
            <strong>LabTrace</strong>
            <span>TEACHER PORTAL</span>
          </div>
        </div>
        <nav>
          <button
            className={view === "overview" ? "active" : ""}
            onClick={() => setView("overview")}
          >
            <Home />
            ภาพรวม · Overview
          </button>
          <button
            className={view === "approval" ? "active" : ""}
            onClick={() => setView("approval")}
          >
            <ClipboardList />
            อนุมัติ · Approvals
          </button>
          <button
            className={view === "inventory" ? "active" : ""}
            onClick={() => setView("inventory")}
          >
            <Boxes />
            จัดการคลัง · Inventory
          </button>
          <button className={view === "returns" ? "active" : ""} onClick={() => setView("returns")}>
            <RotateCcw /> ประวัติการใช้งาน · Returns
          </button>
          <button
            className={view === "logs" ? "active" : ""}
            onClick={() => setView("logs")}
          >
            <History />
            บันทึก · Audit log
          </button>
          <button className={view === "account" ? "active" : ""} onClick={() => setView("account")}>
            <KeyRound /> บัญชี · Account
          </button>
        </nav>
        <button className="teacher-logout" onClick={onLogout}>
          <LogOut />
          ออกจากระบบ · Sign out
        </button>
      </aside>
      <main className="teacher-main">
        <header>
          <span>TEACHER PORTAL</span>
          <div>
            <div className="avatar">อ</div>
            <b>อาจารย์ผู้ดูแล Lab</b>
          </div>
        </header>
        <div className="content">
          {view === "overview" ? (
            <TeacherOverview onDetail={setTeacherDetail} />
          ) : view === "approval" ? (
            <AdminPage items={pendingApprovals} onApprove={approveItem} />
          ) : view === "inventory" ? (
            <TeacherInventory
              tracking={trackingItems}
              stock={stock}
              onUpdate={updateTracking}
              onAdd={addStock}
            />
          ) : view === "returns" ? (
            <TeacherReturnHistory records={returnRecords} />
          ) : view === "account" ? (
            <TeacherAccountPage teacherId={teacherId} onChangePassword={onChangePassword} />
          ) : (
            <TeacherAuditLog logs={approvalLogs} />
          )}
        </div>
      </main>
      {notice && (
        <div className="toast">
          <Check />
          {notice}
        </div>
      )}
      {teacherDetail && (
        <TeacherUsageModal
          kind={teacherDetail}
          onClose={() => setTeacherDetail(null)}
        />
      )}
    </div>
  );
}

function TeacherOverview({
  onDetail,
}: {
  onDetail: (kind: "equipment" | "chemical") => void;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p>LAB OVERVIEW</p>
          <h1>ภาพรวมการใช้งาน · Overview</h1>
        </div>
      </div>
      <section className="teacher-category-overview">
        <article className="overview-category equipment-overview">
          <div className="overview-category-title">
            <span className="inventory-symbol equipment">
              <Boxes />
            </span>
            <div>
              <h2>อุปกรณ์ · Equipment</h2>
              <p>14 รายการ · รวม 38 เครื่อง</p>
            </div>
          </div>
          <div className="overview-status-grid">
            <div>
              <b>38</b>
              <span>ทั้งหมด</span>
            </div>
            <div>
              <b>27</b>
              <span>พร้อมใช้</span>
            </div>
            <button onClick={() => onDetail("equipment")}>
              <b>8</b>
              <span>กำลังใช้งาน</span>
              <small>ดูผู้ใช้งาน</small>
            </button>
            <div>
              <b>1</b>
              <span>ชำรุด</span>
            </div>
            <div>
              <b>2</b>
              <span>รอซ่อม</span>
            </div>
          </div>
        </article>
        <article className="overview-category chemical-overview">
          <div className="overview-category-title">
            <span className="inventory-symbol chemical">
              <FlaskConical />
            </span>
            <div>
              <h2>สารเคมี · Chemicals</h2>
              <p>42 รายการ · รวม 64 ขวด</p>
            </div>
          </div>
          <div className="overview-status-grid chemical-statuses">
            <div>
              <b>64</b>
              <span>ทั้งหมด</span>
            </div>
            <div>
              <b>58</b>
              <span>พร้อมใช้</span>
            </div>
            <button onClick={() => onDetail("chemical")}>
              <b>1</b>
              <span>กำลังใช้งาน</span>
              <small>ดูผู้ใช้งาน</small>
            </button>
            <div>
              <b>2</b>
              <span>เหลือน้อย</span>
            </div>
            <div>
              <b>3</b>
              <span>กำลังสั่งซื้อ</span>
            </div>
          </div>
        </article>
      </section>
    </>
  );
}

function ProfilePage({ studentId, onChangePassword }: { studentId: string; onChangePassword: (oldPassword: string, newPassword: string) => Promise<string | null> }) {
  return (
    <>
      <div className="page-heading">
        <div>
          <p>MY PROFILE</p>
          <h1>ข้อมูลผู้ใช้งาน</h1>
          <span>ข้อมูลประจำตัวและสรุปประวัติการใช้งาน</span>
        </div>
      </div>
      <section className="profile-card">
        <div className="avatar large-avatar">ช</div>
        <div>
          <h2>{studentDisplayName(studentId)}</h2>
          <p>รหัสนักศึกษา {studentId}</p>
          <p>ชั้นปีนักศึกษา {studentYear(studentId)}</p>
          <span>นักศึกษา · นวัตกรรมเคมีอุตสาหกรรม</span>
        </div>
      </section>
      <div className="profile-stats">
        <div>
          <b>18</b>
          <span>ยืมอุปกรณ์</span>
        </div>
        <div>
          <b>17</b>
          <span>คืนสำเร็จ</span>
        </div>
        <div>
          <b>1</b>
          <span>กำลังใช้งาน</span>
        </div>
        <div>
          <b>0</b>
          <span>คืนล่าช้า</span>
        </div>
      </div>
      <ChangePasswordPanel onChangePassword={onChangePassword} />
    </>
  );
}

function TeacherAccountPage({ teacherId, onChangePassword }: { teacherId: string; onChangePassword: (oldPassword: string, newPassword: string) => Promise<string | null> }) {
  return <>
    <div className="page-heading"><div><p>MY ACCOUNT</p><h1>บัญชีอาจารย์</h1><span>ข้อมูลบัญชีและรหัสผ่าน</span></div></div>
    <section className="profile-card"><div className="avatar large-avatar">อ</div><div><h2>อาจารย์ผู้ดูแล Lab</h2><p>รหัสอาจารย์ {teacherId}</p></div></section>
    <ChangePasswordPanel onChangePassword={onChangePassword} />
  </>;
}

function ChangePasswordPanel({ onChangePassword }: { onChangePassword: (oldPassword: string, newPassword: string) => Promise<string | null> }) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    if (newPassword.length < 8) { setMessage("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร"); return; }
    if (newPassword !== confirmPassword) { setMessage("ยืนยันรหัสผ่านใหม่ไม่ตรงกัน"); return; }
    if (oldPassword === newPassword) { setMessage("รหัสผ่านใหม่ต้องต่างจากรหัสผ่านเดิม"); return; }
    setPending(true);
    const error = await onChangePassword(oldPassword, newPassword);
    setPending(false);
    if (error) { setMessage(error); return; }
    setOldPassword(""); setNewPassword(""); setConfirmPassword("");
    setMessage("เปลี่ยนรหัสผ่านบนอุปกรณ์นี้แล้ว"); setSaved(true);
  }
  return <section className="password-section">
    <div><h2>เปลี่ยนรหัสผ่าน</h2><p>ระยะทดลอง: รหัสผ่านที่เปลี่ยนมีผลเฉพาะเบราว์เซอร์นี้ ยังไม่เชื่อมกับบัญชีส่วนกลาง</p></div>
    <form className="password-form" onSubmit={submit}>
      <label>รหัสผ่านเดิม<input type="password" autoComplete="current-password" value={oldPassword} onChange={(event) => setOldPassword(event.target.value)} required /></label>
      <label>รหัสผ่านใหม่<input type="password" autoComplete="new-password" minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required /></label>
      <label>ยืนยันรหัสผ่านใหม่<input type="password" autoComplete="new-password" minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required /></label>
      {message && <p className={saved ? "form-success" : "form-error"} role="status">{message}</p>}
      <button className="primary" type="submit" disabled={pending}>{pending ? "กำลังบันทึก..." : "ยืนยันการเปลี่ยนรหัสผ่าน"}</button>
    </form>
  </section>;
}

const inventoryStatusDetails = {
  equipment: [
    {
      status: "พร้อมใช้",
      total: 27,
      tone: "green",
      items: [
        "Hot Plate Magnetic Stirrer — 3 เครื่อง",
        "UV-Vis Spectrophotometer — 1 เครื่อง",
        "Centrifuge — 3 เครื่อง",
        "อุปกรณ์อื่น — 20 เครื่อง",
      ],
    },
    {
      status: "กำลังใช้งาน",
      total: 8,
      tone: "blue",
      items: [
        "Hot Plate Magnetic Stirrer — 1 เครื่อง",
        "UV-Vis Spectrophotometer — 1 เครื่อง",
        "Analytical Balance — 4 เครื่อง",
        "อุปกรณ์อื่น — 2 เครื่อง",
      ],
    },
    {
      status: "ชำรุด",
      total: 1,
      tone: "red",
      items: ["Hot Plate Magnetic Stirrer — 1 เครื่อง"],
    },
    {
      status: "รอซ่อม",
      total: 2,
      tone: "amber",
      items: ["pH Meter — 1 เครื่อง", "Laboratory Oven — 1 เครื่อง"],
    },
    { status: "รอซื้อใหม่", total: 0, tone: "gray", items: ["ไม่มีรายการ"] },
  ],
  chemical: [
    {
      status: "พร้อมใช้",
      total: 58,
      tone: "green",
      items: [
        "Acetic acid 99.8% — 3 ขวด",
        "Ethanol 95% — 4 ขวด",
        "สารเคมีอื่น — 51 ขวด",
      ],
    },
    {
      status: "กำลังใช้งาน",
      total: 1,
      tone: "blue",
      items: ["Acetic acid 99.8% — 1 ขวด"],
    },
    {
      status: "เหลือน้อย",
      total: 2,
      tone: "amber",
      items: ["Ethanol 95% — 2 ขวด"],
    },
    {
      status: "หมด",
      total: 1,
      tone: "red",
      items: ["Sodium hydroxide — 1 ขวด"],
    },
    {
      status: "รออนุมัติ",
      total: 3,
      tone: "violet",
      items: [
        "Sodium hydroxide — 1 ขวด",
        "Methanol — 1 ขวด",
        "Acetone — 1 ขวด",
      ],
    },
    {
      status: "รอซื้อใหม่",
      total: 3,
      tone: "gray",
      items: ["Hydrochloric acid 37% — 1 ขวด", "สารเคมีอื่น — 2 ขวด"],
    },
  ],
};

function InventoryDetailModal({
  kind,
  onClose,
}: {
  kind: "equipment" | "chemical";
  onClose: () => void;
}) {
  const isEquipment = kind === "equipment";
  const [openStatus, setOpenStatus] = useState<string | null>("กำลังใช้งาน");
  const [selectedItem, setSelectedItem] = useState<{
    name: string;
    status: string;
  } | null>(null);
  const itemDetail = selectedItem
    ? selectedItem.status === "กำลังใช้งาน"
      ? [
          ["ชื่อนักศึกษา", "น.ส.ชนกชนม์ ใจดี"],
          ["รหัสนักศึกษา", "6501234567"],
          ["ชั้นปีนักศึกษา", studentYear("6501234567")],
          ["ช่วงเวลา", "5 ก.ย. 2026 · 09:00–16:30"],
          ["สถานที่", "Lab 3-204"],
          [
            "วัตถุประสงค์",
            isEquipment ? "การสกัดแอนโทไซยานิน" : "ใช้เป็นตัวทำละลายในการสกัด",
          ],
        ]
      : selectedItem.status === "ชำรุด" || selectedItem.status === "รอซ่อม"
        ? [
            ["อาการ", "เครื่องไม่ทำความร้อนและไฟสถานะไม่ติด"],
            ["ผู้แจ้ง", "น.ส.ชนกชนม์ ใจดี · 5 ก.ย. 2026"],
            [
              "การดำเนินการ",
              selectedItem.status === "รอซ่อม"
                ? "ส่งคำขอซ่อมแล้ว รอนัดหมายช่าง"
                : "งดใช้งานและรออาจารย์ตรวจสอบ",
            ],
          ]
        : [
            ["สถานะปัจจุบัน", selectedItem.status],
            [
              "ตำแหน่ง",
              isEquipment ? "ห้องเครื่องมือ Lab 3-204" : "ตู้สารเคมี Cabinet A",
            ],
            ["อัปเดตล่าสุด", "5 ก.ย. 2026 · 16:42"],
          ]
    : [];
  return (
    <div className="modal-wrap">
      <button
        className="modal-backdrop"
        onClick={onClose}
        aria-label="ปิดรายละเอียด"
      />
      <section className="modal inventory-detail-modal">
        <div className="modal-title">
          <div>
            <span>INVENTORY DETAIL</span>
            <h2>รายละเอียด{isEquipment ? "อุปกรณ์" : "สารเคมี"}</h2>
            <p>แยกรายการตามสถานะ พร้อมชื่อและจำนวน</p>
          </div>
          <button onClick={onClose} aria-label="ปิด">
            <X />
          </button>
        </div>
        <div className="status-sections">
          {inventoryStatusDetails[kind].map((group) => (
            <section className="status-section" key={group.status}>
              <button
                className="status-section-head"
                onClick={() =>
                  setOpenStatus(
                    openStatus === group.status ? null : group.status,
                  )
                }
              >
                <span className={`status-dot ${group.tone}`} />
                <h3>{group.status}</h3>
                <b>
                  {group.total} {isEquipment ? "เครื่อง" : "ขวด"}
                </b>
                <ChevronRight
                  className={openStatus === group.status ? "expanded" : ""}
                />
              </button>
              {openStatus === group.status && (
                <ul>
                  {group.items.map((item) => (
                    <li key={item}>
                      <button
                        onClick={() =>
                          setSelectedItem({ name: item, status: group.status })
                        }
                      >
                        {item}
                        <ChevronRight />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
        {selectedItem && (
          <section className="inventory-item-detail">
            <div>
              <h3>{selectedItem.name}</h3>
              <span className="badge blue">{selectedItem.status}</span>
            </div>
            <dl>
              {itemDetail.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
        <div className="modal-actions">
          <button className="primary" onClick={onClose}>
            ปิด · Close
          </button>
        </div>
      </section>
    </div>
  );
}

function PickerInput({ type, value, onChange, min, max }: {
  type: "date" | "time";
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
}) {
  let display = "เลือกวันที่";
  if (value) {
    if (type === "date") {
      const parsed = new Date(`${value}T12:00:00`);
      display = Number.isNaN(parsed.getTime()) ? value :
        new Intl.DateTimeFormat("en-GB-u-ca-buddhist", { day: "numeric", month: "short", year: "numeric" }).format(parsed);
    } else {
      const parsed = new Date(`1970-01-01T${value}:00`);
      display = Number.isNaN(parsed.getTime()) ? value :
        new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(parsed);
    }
  }
  return <span className="picker-control">
    <span aria-hidden="true">{display}</span>
    <input type={type} value={value} min={min} max={max} onChange={(event) => onChange(event.target.value)} required />
  </span>;
}

function BookingModal({ item, onClose, onConfirm }: any) {
  const [date, setDate] = useState("2026-09-08");
  const [endDate, setEndDate] = useState("2026-09-08");
  const [amount, setAmount] = useState("1");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("12:00");
  const [purpose, setPurpose] = useState("");
  const [location, setLocation] = useState("");
  const maxEndDate = date
    ? new Date(new Date(`${date}T00:00:00Z`).getTime() + 6 * 86400000)
        .toISOString()
        .slice(0, 10)
    : "";
  const validRange =
    date && endDate && endDate >= date && endDate <= maxEndDate;
  const complete =
    validRange && amount && start && end && purpose.trim() && location.trim();
  return (
    <div className="modal-wrap">
      <button className="modal-backdrop" onClick={onClose} />
      <section className="modal">
        <div className="modal-title">
          <div>
            <span>จองอุปกรณ์ · EQUIPMENT BOOKING</span>
            <h2>{item.name}</h2>
            <p>
              {item.id} · พร้อมใช้ {item.ready} จากทั้งหมด {item.total} ชิ้น
            </p>
          </div>
          <button onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="form-grid">
          <label>
            วันที่เริ่มยืม
            <PickerInput type="date" value={date} onChange={setDate} />
          </label>
          <label>
            วันที่สิ้นสุด (สูงสุด 7 วัน)
            <PickerInput type="date" value={endDate} min={date} max={maxEndDate} onChange={setEndDate} />
          </label>
          <label>
            เวลาเริ่ม
            <PickerInput type="time" value={start} onChange={setStart} />
          </label>
          <label>
            เวลาสิ้นสุด
            <PickerInput type="time" value={end} onChange={setEnd} />
          </label>
          <label>
            จำนวน
            <select
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            >
              {Array.from({ length: item.ready }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1} ชิ้น
                </option>
              ))}
            </select>
          </label>
          <label>
            สถานที่ใช้งาน · Location
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="เช่น Lab 3-204"
              required
            />
          </label>
        </div>
        <label className="field-label">
          วัตถุประสงค์ · Purpose
          <input
            className="purpose-input"
            placeholder="ระบุว่าจะนำไปทำอะไร"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            required
          />
        </label>
        <p className="form-hint">
          ยืมได้สูงสุดครั้งละ 7 วัน หากต้องการใช้ต่อให้ทำรายการยืมต่อ
        </p>
        <div className="availability">
          <Check />
          <div>
            <b>พร้อมใช้งาน {item.ready} ชิ้น</b>
            <span>เลือกยืมได้ตั้งแต่ 1–{item.ready} ชิ้นในช่วงเวลานี้</span>
          </div>
        </div>
        <div className="modal-actions">
          <button className="outline" onClick={onClose}>
            ยกเลิก
          </button>
          <button className="primary" disabled={!complete} onClick={() => onConfirm({ borrowedFrom: `${date}T${start}:00+07:00`, borrowedUntil: `${endDate}T${end}:00+07:00`, location: location.trim(), purpose: purpose.trim(), quantity: `${amount} เครื่อง` })}>
            ยืนยันการจอง <ArrowRight />
          </button>
        </div>
      </section>
    </div>
  );
}

function ChemicalBorrowModal({ item, onClose, onConfirm }: any) {
  const [amount, setAmount] = useState("50");
  const [unit, setUnit] = useState("mL");
  const [date, setDate] = useState("2026-09-08");
  const [endDate, setEndDate] = useState("2026-09-08");
  const [purpose, setPurpose] = useState("");
  const [location, setLocation] = useState("");
  const maxEndDate = date
    ? new Date(new Date(`${date}T00:00:00Z`).getTime() + 6 * 86400000)
        .toISOString()
        .slice(0, 10)
    : "";
  const validRange =
    date && endDate && endDate >= date && endDate <= maxEndDate;
  const complete =
    Number(amount) > 0 &&
    unit &&
    validRange &&
    purpose.trim() &&
    location.trim();
  return (
    <div className="modal-wrap">
      <button className="modal-backdrop" onClick={onClose} />
      <section className="modal">
        <div className="modal-title">
          <div>
            <span>CHEMICAL ISSUE</span>
            <h2>ยืมสาร · Borrow chemical</h2>
            <p>
              {item.name} · {item.id}
            </p>
          </div>
          <button onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="chemical-selected">
          <div className="chem-icon">
            <Beaker />
          </div>
          <div>
            <b>{item.name}</b>
            <span>{item.place}</span>
          </div>
          <i className={"badge " + item.tone}>{item.status}</i>
        </div>
        <div className="form-grid">
          <label>
            ปริมาณ · Amount
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="1"
              required
            />
          </label>
          <label>
            หน่วย · Unit
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              required
            >
              <option>mL</option>
              <option>g</option>
              <option>ขวด · bottle</option>
            </select>
          </label>
          <label>
            วันที่เริ่มยืม · Start date
            <PickerInput type="date" value={date} onChange={setDate} />
          </label>
          <label>
            วันที่สิ้นสุด · End date (สูงสุด 7 วัน)
            <PickerInput type="date" value={endDate} min={date} max={maxEndDate} onChange={setEndDate} />
          </label>
          <label>
            วัตถุประสงค์ · Purpose
            <input
              placeholder="เช่น Extraction"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              required
            />
          </label>
          <label>
            สถานที่ใช้งาน · Location
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="เช่น Lab 3-204"
              required
            />
          </label>
        </div>
        <p className="form-hint">
          ยืมได้สูงสุดครั้งละ 7 วัน หากต้องการใช้ต่อให้ทำรายการยืมต่อ
        </p>
        <div className="modal-actions">
          <button className="outline" onClick={onClose}>
            ยกเลิก · Cancel
          </button>
          <button className="primary" disabled={!complete} onClick={() => onConfirm({ borrowedFrom: `${date}T00:00:00+07:00`, borrowedUntil: `${endDate}T23:59:00+07:00`, location: location.trim(), purpose: purpose.trim(), quantity: `${amount} ${unit}` })}>
            ยืนยัน · Confirm <ArrowRight />
          </button>
        </div>
      </section>
    </div>
  );
}

function ReturnSignature({ onSignedChange }: { onSignedChange: (signature: string | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const hasStroke = useRef(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * scale);
    canvas.height = Math.round(rect.height * scale);
    const context = canvas.getContext("2d");
    if (context) {
      context.scale(scale, scale);
      context.strokeStyle = "#28256d";
      context.lineWidth = 2.5;
      context.lineCap = "round";
      context.lineJoin = "round";
    }
  }, []);
  function position(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }
  return <div className="return-signature">
    <div className="signature-heading"><b>ลงชื่อผู้คืน · Signature</b><button type="button" onClick={() => {
      const canvas = canvasRef.current;
      canvas?.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
      hasStroke.current = false;
      onSignedChange(null);
    }}>ล้างลายเซ็น</button></div>
    <canvas ref={canvasRef} aria-label="ช่องลงลายเซ็นผู้คืน" onPointerDown={(event) => {
      drawing.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      const point = position(event);
      const context = event.currentTarget.getContext("2d");
      context?.beginPath();
      context?.moveTo(point.x, point.y);
    }} onPointerMove={(event) => {
      if (!drawing.current) return;
      const point = position(event);
      const context = event.currentTarget.getContext("2d");
      context?.lineTo(point.x, point.y);
      context?.stroke();
      hasStroke.current = true;
    }} onPointerUp={(event) => {
      if (drawing.current && hasStroke.current) onSignedChange(event.currentTarget.toDataURL("image/png"));
      drawing.current = false;
    }} onPointerCancel={() => { drawing.current = false; }} />
    <small>ใช้นิ้วหรือปากกาเขียนลายเซ็นในกรอบ</small>
  </div>;
}

function ReturnModal({ onClose, onConfirm }: any) {
  const [confirmedPlacement, setConfirmedPlacement] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [damaged, setDamaged] = useState(false);
  const [reason, setReason] = useState("");
  return (
    <div className="modal-wrap">
      <button className="modal-backdrop" onClick={onClose} />
      <section className="modal return-modal">
        <div className="modal-title">
          <div>
            <span>คืนอุปกรณ์ · RETURN</span>
            <h2>ยืนยันการคืนอุปกรณ์</h2>
            <p>Hot Plate Magnetic Stirrer · EQ-HP-001</p>
          </div>
          <button onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="return-instruction"><PackageCheck size={24} /><div><b>นำอุปกรณ์กลับไปไว้ที่เดิมด้วยตนเอง</b><span>ตรวจความเรียบร้อยของอุปกรณ์และจุดจัดเก็บก่อนลงชื่อคืน</span></div></div>
        <label className="check-line danger-check">
          <input
            type="checkbox"
            checked={damaged}
            onChange={(e) => setDamaged(e.target.checked)}
          />{" "}
          อุปกรณ์ชำรุดหรือเสียหาย · Equipment damaged
        </label>
        {damaged && (
          <>
            <textarea
              className="reason-box"
              placeholder="ระบุอาการและเหตุผลความเสียหาย · Describe the damage"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
            <p className="urgent-note">
              ระบบจะบันทึกความชำรุดในชื่อผู้ใช้ทันที ·
              โปรดแจ้งอาจารย์ที่ปรึกษาด่วน
            </p>
          </>
        )}
        <label className="check-line return-placement"><input type="checkbox" checked={confirmedPlacement} onChange={(event) => setConfirmedPlacement(event.target.checked)} />
          {damaged ? "ฉันแยกอุปกรณ์ชำรุดไว้ในจุดที่กำหนดและแจ้งอาจารย์แล้ว" : "ฉันนำอุปกรณ์กลับไปไว้ที่เดิมและตรวจความเรียบร้อยแล้ว"}
        </label>
        <ReturnSignature onSignedChange={setSignature} />
        <div className="modal-actions">
          <button className="outline" onClick={onClose}>
            ยกเลิก
          </button>
          <button
            className="primary"
            disabled={!confirmedPlacement || !signature || (damaged && !reason.trim())}
            onClick={() => onConfirm(signature, damaged ? `แจ้งชำรุด: ${reason.trim()}` : "ยืนยันเก็บคืนที่เดิม")}
          >
            {damaged ? "แจ้งความชำรุด" : "ยืนยันการคืน"} <Check />
          </button>
        </div>
      </section>
    </div>
  );
}

function ChemicalReturnModal({ onClose, onConfirm }: any) {
  const [confirmedPlacement, setConfirmedPlacement] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);
  const [damaged, setDamaged] = useState(false);
  const [remaining, setRemaining] = useState("half");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const complete = confirmedPlacement && !!signature && (empty || remaining) && (!damaged || reason.trim());
  return (
    <div className="modal-wrap">
      <button className="modal-backdrop" onClick={onClose} />
      <section className="modal">
        <div className="modal-title">
          <div>
            <span>CHEMICAL RETURN</span>
            <h2>คืนสาร · Return chemical</h2>
            <p>Acetic acid 99.8% · CH-AC-014</p>
          </div>
          <button onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="chemical-selected">
          <div className="chem-icon">
            <Beaker />
          </div>
          <div>
            <b>ปริมาณที่ยืม · Issued</b>
            <span>50 mL · 5 ก.ย. 2026</span>
          </div>
          <i className="badge green">กำลังใช้งาน</i>
        </div>
        <div className="form-grid single-row">
          <label>
            ปริมาณสารคงเหลือโดยประมาณ · Estimated remaining
            <select
              value={remaining}
              onChange={(e) => setRemaining(e.target.value)}
              disabled={empty}
              required={!empty}
            >
              <option value="unknown">ไม่ทราบ · Unknown</option>
              <option value="low">เหลือน้อย · Low</option>
              <option value="half">ประมาณครึ่งหนึ่ง · About half</option>
              <option value="high">เหลือมาก · High</option>
            </select>
          </label>
          <label>
            ปริมาณโดยประมาณ (ถ้าทราบ)
            <input
              type="number"
              min="0.01"
              placeholder="เช่น 20 mL"
              disabled={empty}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </label>
        </div>
        <label className="check-line">
          <input
            type="checkbox"
            checked={empty}
            onChange={(e) => setEmpty(e.target.checked)}
          />{" "}
          ใช้แล้วสารหมด · Empty after use
        </label>
        <label className="check-line danger-check">
          <input
            type="checkbox"
            checked={damaged}
            onChange={(e) => setDamaged(e.target.checked)}
          />{" "}
          สารหรือภาชนะเสียหาย · Chemical/container damaged
        </label>
        {damaged && (
          <>
            <textarea
              className="reason-box"
              placeholder="ระบุเหตุผลและรายละเอียดความเสียหาย"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
            <p className="urgent-note">
              ระบบจะบันทึกความเสียหายในชื่อผู้ใช้ทันที ·
              โปรดแจ้งอาจารย์ที่ปรึกษาด่วน
            </p>
          </>
        )}
        <div className="return-instruction"><PackageCheck size={24} /><div><b>นำสารหรือภาชนะกลับไปไว้ที่จุดจัดเก็บเดิมด้วยตนเอง</b><span>ตรวจชื่อสาร ปิดฝาให้เรียบร้อย และแจ้งอาจารย์หากภาชนะเสียหาย</span></div></div>
        <label className="check-line return-placement"><input type="checkbox" checked={confirmedPlacement} onChange={(event) => setConfirmedPlacement(event.target.checked)} />
          {damaged ? "ฉันแยกสารหรือภาชนะที่เสียหายไว้ในจุดที่กำหนดและแจ้งอาจารย์แล้ว" : "ฉันนำสารหรือภาชนะกลับไปไว้ที่เดิมและตรวจความเรียบร้อยแล้ว"}
        </label>
        <ReturnSignature onSignedChange={setSignature} />
        <div className="modal-actions">
          <button className="outline" onClick={onClose}>
            ยกเลิก
          </button>
          <button className="primary" disabled={!complete} onClick={() => onConfirm(signature, `${empty ? "ใช้หมด" : `คงเหลือ ${remaining}${amount ? ` · ประมาณ ${amount} mL` : ""}`} · ${damaged ? `แจ้งเสียหาย: ${reason.trim()}` : "ยืนยันเก็บคืนที่เดิม"}`)}>
            ยืนยันการคืน · Confirm <Check />
          </button>
        </div>
      </section>
    </div>
  );
}

function DamageModal({ onClose, onConfirm, kind }: any) {
  const emergency = kind === "emergency";
  const [reporter, setReporter] = useState<"witness" | "responsible">(
    "witness",
  );
  const [itemKind, setItemKind] = useState<"equipment" | "chemical">(
    "equipment",
  );
  const selectedKind = emergency ? itemKind : kind;
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  return (
    <div className="modal-wrap">
      <button className="modal-backdrop" onClick={onClose} />
      <section className="modal">
        <div className="modal-title">
          <div>
            <span>DAMAGE REPORT</span>
            <h2>
              {emergency ? "บันทึกเหตุฉุกเฉินย้อนหลัง" : "แจ้งความเสียหาย"}
            </h2>
            <p>
              {emergency
                ? "บันทึกเหตุชำรุดหรือเสียหายรุนแรง หลังแจ้งอาจารย์แล้ว"
                : kind === "equipment"
                  ? "แจ้งพบอุปกรณ์ชำรุดก่อนใช้งาน"
                  : "แจ้งพบสารเคมีหรือภาชนะเสียหายก่อนใช้งาน"}
            </p>
          </div>
          <button onClick={onClose}>
            <X />
          </button>
        </div>
        {emergency ? (
          <>
            <div className="reporter-choice">
              <label>
                <input
                  type="radio"
                  checked={reporter === "witness"}
                  onChange={() => setReporter("witness")}
                />
                <span>
                  <b>ผู้พบเห็นเหตุการณ์</b>
                  <small>Witness / Reporter</small>
                </span>
              </label>
              <label>
                <input
                  type="radio"
                  checked={reporter === "responsible"}
                  onChange={() => setReporter("responsible")}
                />
                <span>
                  <b>ผู้ทำให้เกิดความเสียหาย</b>
                  <small>Responsible person</small>
                </span>
              </label>
            </div>
            <div className="damage-choice">
              <label>
                <input
                  type="radio"
                  checked={itemKind === "equipment"}
                  onChange={() => setItemKind("equipment")}
                />
                <Boxes />
                <span>
                  <b>อุปกรณ์</b>
                  <small>Equipment</small>
                </span>
              </label>
              <label>
                <input
                  type="radio"
                  checked={itemKind === "chemical"}
                  onChange={() => setItemKind("chemical")}
                />
                <FlaskConical />
                <span>
                  <b>สารเคมี</b>
                  <small>Chemical</small>
                </span>
              </label>
            </div>
          </>
        ) : (
          <div className="witness-label">
            <ShieldCheck />
            <span>
              <b>สถานะผู้แจ้ง: ผู้พบเห็น</b>
              <small>Reporter status: Witness</small>
            </span>
          </div>
        )}
        <label className="field-label">
          เลือกรายการ · Select item
          <select>
            <option>
              {selectedKind === "equipment"
                ? "Hot Plate Magnetic Stirrer · EQ-HP-001"
                : "Acetic acid 99.8% · CH-AC-014"}
            </option>
          </select>
        </label>
        <label className="field-label">
          เหตุผลและรายละเอียด · Reason
          <textarea
            className="reason-box"
            placeholder="อธิบายอาการ สภาพ และเหตุการณ์ที่เกิดขึ้น"
            required
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <label className="check-line danger-check">
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            required
          />{" "}
          ยืนยันว่าเกิดความชำรุดหรือเสียหาย
        </label>
        <p className="urgent-note">
          {emergency && reporter === "responsible"
            ? `ระบบจะบันทึกว่าเป็นผู้ทำให้เกิดความเสียหาย และแนบรายงานพร้อมคืน${selectedKind === "equipment" ? "อุปกรณ์" : "สารเคมี"}อัตโนมัติ`
            : "ระบบจะบันทึกชื่อผู้ใช้เป็นผู้แจ้งพบเห็น โดยไม่ระบุว่าเป็นผู้ทำให้เสียหาย"}
        </p>
        <div className="modal-actions">
          <button className="outline" onClick={onClose}>
            ยกเลิก
          </button>
          <button
            className="primary damage-submit"
            disabled={!reason.trim() || !confirmed}
            onClick={() => onConfirm(reporter, selectedKind)}
          >
            {emergency ? "บันทึกเหตุการณ์" : "ยืนยันความเสียหาย"}{" "}
            <AlertTriangle />
          </button>
        </div>
      </section>
    </div>
  );
}

function ActivityDetail({ onClose, status = "returned", record }: { onClose: () => void; status?: string; record?: ReturnRecord | null }) {
  if (record) return <ReturnRecordModal record={record} onClose={onClose} />;
  return (
    <div className="modal-wrap">
      <button className="modal-backdrop" onClick={onClose} />
      <section className="modal detail-modal">
        <div className="modal-title">
          <div>
            <span>ACTIVITY DETAIL</span>
            <h2>รายละเอียดการใช้งาน</h2>
          </div>
          <button onClick={onClose}>
            <X />
          </button>
        </div>
        <div className="detail-title">
          <div className="equip-thumb">HP</div>
          <div>
            <span
              className={"badge " + (status === "active" ? "blue" : "green")}
            >
              {status === "active" ? "กำลังใช้งาน" : "คืนสำเร็จ"}
            </span>
            <h3>Hot Plate Magnetic Stirrer</h3>
            <p>EQ-HP-001 · จำนวน 1 ชิ้น</p>
          </div>
        </div>
        <dl className="detail-list">
          <div>
            <dt>ผู้ยืม · Borrower</dt>
            <dd>น.ส.ชนกชนม์ ใจดี · 6501234567</dd>
          </div>
          <div>
            <dt>วันที่ใช้งาน · Date</dt>
            <dd>5 กันยายน 2026</dd>
          </div>
          <div>
            <dt>เวลา · Time</dt>
            <dd>09:00–16:30</dd>
          </div>
          <div>
            <dt>สถานที่ · Location</dt>
            <dd>Lab 3-204</dd>
          </div>
          <div>
            <dt>วัตถุประสงค์ · Purpose</dt>
            <dd>การสกัดแอนโทไซยานิน</dd>
          </div>
          <div>
            <dt>สถานะ · Status</dt>
            <dd>
              {status === "active"
                ? "กำลังใช้งาน · Active"
                : "คืนสำเร็จ · Returned"}
            </dd>
          </div>
        </dl>
        <div className="modal-actions">
          <button className="primary" onClick={onClose}>
            ปิด · Close
          </button>
        </div>
      </section>
    </div>
  );
}

function ReturnRecordModal({ record, onClose }: { record: ReturnRecord; onClose: () => void }) {
  return <div className="modal-wrap">
    <button className="modal-backdrop" onClick={onClose} aria-label="ปิดรายละเอียด" />
    <section className="modal return-record-modal" role="dialog" aria-modal="true" aria-label="รายละเอียดการคืน">
      <div className="modal-title"><div><span>RETURN RECORD</span><h2>{record.itemName}</h2><p>{record.itemCode} · {record.kind === "equipment" ? "อุปกรณ์" : "สารเคมี"}</p></div><button onClick={onClose} aria-label="ปิด"><X /></button></div>
      <dl className="detail-list">
        <div><dt>ชื่อนักศึกษา</dt><dd>{studentDisplayName(record.borrowerId)}</dd></div>
        <div><dt>รหัสนักศึกษา</dt><dd>{record.borrowerId}</dd></div>
        <div><dt>ชั้นปีนักศึกษา</dt><dd>{studentYear(record.borrowerId)}</dd></div>
        <div><dt>ช่วงเวลาที่ยืม</dt><dd>{formatBorrowedPeriod(record)}</dd></div>
        <div><dt>จำนวน</dt><dd>{record.quantity}</dd></div>
        <div><dt>สถานที่ใช้งาน</dt><dd>{record.location}</dd></div>
        <div><dt>วัตถุประสงค์</dt><dd>{record.purpose}</dd></div>
        <div><dt>วันที่และเวลาคืน</dt><dd>{formatThaiDateTime(record.returnedAt)}</dd></div>
        <div><dt>สถานะ</dt><dd>{new Date(record.returnedAt) <= new Date(record.borrowedUntil) ? "คืนตรงเวลา" : "คืนหลังเวลาที่กำหนด"}</dd></div>
        <div><dt>หมายเหตุ</dt><dd>{record.note}</dd></div>
      </dl>
      <div className="signature-evidence"><b>ลายเซ็นผู้คืน</b><img src={record.signature} alt={`ลายเซ็นของผู้ยืมรหัส ${record.borrowerId} เมื่อคืน ${record.itemName}`} /><small>ลงชื่อเมื่อ {formatThaiDateTime(record.returnedAt)}</small></div>
      <div className="modal-actions"><button className="primary" onClick={onClose}>ปิด · Close</button></div>
    </section>
  </div>;
}
