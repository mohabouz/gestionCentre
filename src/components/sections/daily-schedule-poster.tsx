"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImageDown, Printer } from "lucide-react";
import { Button } from "@/components/centman-shell";
import { Modal } from "@/components/sections/shared-ui";
import type { Data } from "@/lib/section-data";
import { today } from "@/lib/centman-store";
import { courseLevelLabel } from "@/lib/course-level";
import { resolveSessionCourse } from "@/lib/session-course";

const weekdays = [
  "الأحد",
  "الاثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

type InstitutionSettings = {
  name: string;
  address: string;
  phone: string;
  logo?: string | null;
};

const posterFont = '"Cairo Variable", "Segoe UI", Tahoma, Arial, sans-serif';
let embeddedCairoCssPromise: Promise<string> | null = null;

function blobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function embeddedCairoCss() {
  if (embeddedCairoCssPromise) return embeddedCairoCssPromise;
  embeddedCairoCssPromise = (async () => {
    const faces: string[] = [];
    for (const sheet of Array.from(document.styleSheets)) {
      let rules: CSSRuleList;
      try {
        rules = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of Array.from(rules)) {
        if (rule.type !== CSSRule.FONT_FACE_RULE) continue;
        const face = rule as CSSFontFaceRule;
        if (!face.style.fontFamily.includes("Cairo Variable")) continue;
        const source = face.style.getPropertyValue("src");
        const match = source.match(/url\(["']?([^"')]+)["']?\)/);
        if (!match) continue;
        const fontUrl = new URL(match[1], sheet.href || window.location.href);
        const response = await fetch(fontUrl);
        if (!response.ok) continue;
        const dataUrl = await blobAsDataUrl(await response.blob());
        faces.push(
          `@font-face{font-family:"Cairo Variable";font-style:normal;font-weight:200 1000;src:url("${dataUrl}") format("woff2");unicode-range:${face.style.getPropertyValue("unicode-range")}}`,
        );
      }
    }
    return faces.join("\n");
  })();
  return embeddedCairoCssPromise;
}

function localDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function weekdayForDate(value: string) {
  return weekdays[localDate(value).getDay()];
}

export function DailySchedulePoster({ data }: { data: Data }) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<InstitutionSettings>({
    name: "CentMan",
    address: "",
    phone: "",
    logo: null,
  });
  const poster = useRef<SVGSVGElement>(null);
  const currentDate = localDate(today);
  const currentWeekday = weekdays[currentDate.getDay()];
  const sessions = useMemo(
    () =>
      data.sessions
        .filter(
          (session) =>
            (session.weekday || weekdayForDate(session.date)) === currentWeekday,
        )
        .sort((left, right) => left.time.localeCompare(right.time)),
    [currentWeekday, data.sessions],
  );
  const posterHeight = Math.max(1920, 760 + sessions.length * 150);
  const academicYear =
    currentDate.getMonth() >= 7
      ? `${currentDate.getFullYear()} - ${currentDate.getFullYear() + 1}`
      : `${currentDate.getFullYear() - 1} - ${currentDate.getFullYear()}`;
  const dateLabel = new Intl.DateTimeFormat("ar-MA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(currentDate);

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((response) =>
        response.ok ? response.json() : Promise.reject(new Error("settings")),
      )
      .then((value) =>
        setSettings({
          name: value.name || "CentMan",
          address: value.address || "",
          phone: value.phone || "",
          logo: value.logo || null,
        }),
      )
      .catch(() =>
        setSettings({ name: "CentMan", address: "", phone: "", logo: null }),
      );
  }, []);

  const serializedPoster = async () => {
    if (!poster.current) return "";
    const clone = poster.current.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    const fontCss = await embeddedCairoCss();
    if (fontCss) {
      const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
      style.textContent = fontCss;
      clone.querySelector("defs")?.prepend(style);
    }
    return new XMLSerializer().serializeToString(clone);
  };

  const downloadPng = async () => {
    await document.fonts.ready;
    const source = await serializedPoster();
    if (!source) return;
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = posterHeight;
    const context = canvas.getContext("2d");
    if (!context) return URL.revokeObjectURL(url);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob((png) => {
      if (!png) return;
      const downloadUrl = URL.createObjectURL(png);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `برنامج-${today}.png`;
      link.click();
      URL.revokeObjectURL(downloadUrl);
    }, "image/png");
  };

  const printPoster = async () => {
    await document.fonts.ready;
    const source = await serializedPoster();
    if (!source) return;
    const printWindow = window.open("", "_blank", "width=900,height=1000");
    if (!printWindow) return;
    printWindow.document.write(`<!doctype html><html dir="rtl"><head><title>برنامج ${today}</title><style>@page{size:A4 portrait;margin:0}*{box-sizing:border-box}html,body{margin:0;background:#fff;font-family:${posterFont}}svg{display:block;width:100%;height:auto;max-height:100vh;font-family:${posterFont}}</style></head><body>${source}<script>window.onload=()=>window.print();</script></body></html>`);
    printWindow.document.close();
  };

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <ImageDown size={15} className="ml-2 inline" />
        برنامج اليوم
      </Button>

      {open && (
        <Modal
          title="تصدير برنامج اليوم"
          onClose={() => setOpen(false)}
          footer={
            <>
              <Button variant="outline" onClick={printPoster}>
                <Printer size={15} className="ml-2 inline" />
                طباعة / PDF
              </Button>
              <Button onClick={downloadPng}>
                <ImageDown size={15} className="ml-2 inline" />
                تحميل PNG
              </Button>
            </>
          }
        >
          <p className="mb-3 text-xs text-[#718278]">
            {sessions.length
              ? `${sessions.length} حصص مبرمجة اليوم`
              : "لا توجد حصص مبرمجة اليوم"}
          </p>
          <div className="overflow-hidden rounded-2xl border border-[#dfe6ef] bg-[#eef2ff]">
            <svg
              ref={poster}
              viewBox={`0 0 1080 ${posterHeight}`}
              role="img"
              aria-label={`برنامج حصص ${dateLabel}`}
              className="h-auto w-full"
              style={{ fontFamily: posterFont }}
            >
              <defs>
                <linearGradient id="poster-background" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#f8faff" />
                  <stop offset="0.48" stopColor="#ffffff" />
                  <stop offset="1" stopColor="#eef3ff" />
                </linearGradient>
                <linearGradient id="poster-blue" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#083a9b" />
                  <stop offset="1" stopColor="#001d70" />
                </linearGradient>
                <linearGradient id="poster-yellow" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stopColor="#ffc928" />
                  <stop offset="1" stopColor="#ffad00" />
                </linearGradient>
                <pattern id="poster-pattern" width="72" height="72" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
                  <rect width="18" height="72" fill="#0a3b9b" opacity="0.025" />
                </pattern>
                <filter id="poster-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="8" stdDeviation="10" floodColor="#233876" floodOpacity="0.18" />
                </filter>
                <filter id="logo-shadow" x="-30%" y="-30%" width="160%" height="170%">
                  <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#10245b" floodOpacity="0.3" />
                </filter>
              </defs>

              <rect width="1080" height={posterHeight} fill="url(#poster-background)" />
              <rect width="1080" height={posterHeight} fill="url(#poster-pattern)" />
              <circle cx="30" cy={posterHeight - 20} r="190" fill="#ffc21b" opacity="0.95" />
              <circle cx="1050" cy={posterHeight - 30} r="175" fill="#ff315d" opacity="0.95" />

              <g>
                {settings.logo ? (
                  <image href={settings.logo} x="45" y="16" width="230" height="125" preserveAspectRatio="xMidYMid meet" filter="url(#logo-shadow)" />
                ) : (
                  <text x="160" y="95" textAnchor="middle" fill="#052c9b" fontSize="54" fontWeight="900" filter="url(#logo-shadow)">{settings.name}</text>
                )}
              </g>

              <text x="900" y="70" textAnchor="middle" fill="#042c91" fontSize="45" fontWeight="900">{academicYear}</text>
              <path d="M745 100 Q875 55 1015 94" fill="none" stroke="#ffbd00" strokeWidth="15" strokeLinecap="round" />

              <rect x="300" y="100" width="500" height="125" rx="62" fill="#ff315d" filter="url(#poster-shadow)" />
              <text x="550" y="157" textAnchor="middle" fill="#ffffff" fontSize="35" fontWeight="800">{settings.name}</text>
              <text
                x="550"
                y="204"
                textAnchor="middle"
                fill="#ffffff"
                fontSize="30"
                fontWeight="800"
                textLength={settings.address.length > 28 ? 425 : undefined}
                lengthAdjust="spacingAndGlyphs"
              >
                {settings.address || dateLabel}
              </text>

              <rect x="170" y="270" width="740" height="210" rx="100" fill="url(#poster-blue)" filter="url(#poster-shadow)" />
              <text x="540" y="355" textAnchor="middle" fill="#ffffff" fontSize="72" fontWeight="900">حصص</text>
              <text x="540" y="440" textAnchor="middle" fill="#ffc524" fontSize="78" fontWeight="900">{currentWeekday}</text>

              {sessions.length ? (
                sessions.map((session, index) => {
                  const course = resolveSessionCourse(session, data.courses, data.levels);
                  const level = course ? courseLevelLabel(course, data.levels) || "بدون مستوى" : "بدون مستوى";
                  const y = 535 + index * 150;
                  return (
                    <g key={session.id} filter="url(#poster-shadow)">
                      <rect x="45" y={y} width="990" height="128" rx="30" fill="#ffffff" stroke="#d8e0fb" strokeWidth="4" />
                      <rect x="55" y={y + 8} width="250" height="112" rx="24" fill="#eef1ff" />
                      <line x1="320" y1={y + 20} x2="320" y2={y + 108} stroke="#ffc21b" strokeWidth="4" />
                      <line x1="730" y1={y + 20} x2="730" y2={y + 108} stroke="#ffc21b" strokeWidth="4" />
                      <text x="180" y={y + 76} textAnchor="middle" fill="#052c9b" fontSize="31" fontWeight="900" direction="ltr">
                        {session.time} - {session.endTime || "--:--"}
                      </text>
                      <rect x="350" y={y + 14} width="350" height="50" rx="25" fill="url(#poster-yellow)" />
                      <text x="525" y={y + 51} textAnchor="middle" fill="#052c9b" fontSize="29" fontWeight="900">
                        {course?.name || session.course || session.title}
                      </text>
                      <text x="525" y={y + 103} textAnchor="middle" fill="#092c85" fontSize="25" fontWeight="800">
                        {session.teacher}
                      </text>
                      <text x="875" y={y + 51} textAnchor="middle" fill="#052c9b" fontSize="28" fontWeight="900">
                        {level}
                      </text>
                      <rect x="790" y={y + 73} width="170" height="38" rx="19" fill="#ffc21b" />
                      <text x="875" y={y + 100} textAnchor="middle" fill="#073092" fontSize="19" fontWeight="800">
                        {session.room || "بدون قاعة"}
                      </text>
                    </g>
                  );
                })
              ) : (
                <g>
                  <rect x="130" y="570" width="820" height="170" rx="45" fill="#ffffff" stroke="#d8e0fb" strokeWidth="4" />
                  <text x="540" y="670" textAnchor="middle" fill="#6573a8" fontSize="34" fontWeight="800">لا توجد حصص مبرمجة اليوم</text>
                </g>
              )}

              {settings.phone && (
                <g filter="url(#poster-shadow)">
                  <rect
                    x="330"
                    y={posterHeight - 225}
                    width="420"
                    height="66"
                    rx="33"
                    fill="url(#poster-blue)"
                  />
                  <g
                    transform={`translate(375 ${posterHeight - 207}) scale(1.25)`}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.69 2.8a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.33 1.84.56 2.8.69A2 2 0 0 1 22 16.92z" />
                  </g>
                  <text
                    x="565"
                    y={posterHeight - 180}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="31"
                    fontWeight="800"
                    direction="ltr"
                  >
                    {settings.phone}
                  </text>
                </g>
              )}

              <text x="540" y={posterHeight - 105} textAnchor="middle" fill="#052c9b" fontSize="48" fontWeight="900">تميزكم شغفنا</text>
              <path d={`M370 ${posterHeight - 72} Q540 ${posterHeight - 25} 710 ${posterHeight - 72}`} fill="none" stroke="#ffc21b" strokeWidth="14" strokeLinecap="round" />
            </svg>
          </div>
        </Modal>
      )}
    </>
  );
}
