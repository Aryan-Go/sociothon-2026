import {
  ArrowRight,
  BrainCircuit,
  CircleHelp,
  Languages,
  LoaderCircle,
  Pause,
  Play,
  Sparkles,
  Volume2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { getPageLabel, ROLE_META } from "../navigation";
import { recycledRate } from "../lib/analytics";
import { formatKg, formatNumber } from "../lib/format";
import { isElevenLabsReady } from "../lib/integrations";
import {
  speakWithBrowser,
  stopBrowserSpeech,
  synthesizeNarration,
} from "../lib/voice";
import { useAppStore } from "../store/AppStore";
import type { Role } from "../types";
import { Badge, cn } from "./ui";

type HelpLanguage = "en" | "hi";

const pageNames: Record<string, { en: string; hi: string }> = {
  "/app/user": { en: "member dashboard", hi: "सदस्य डैशबोर्ड" },
  "/app/scan": { en: "bottle scanner", hi: "बोतल स्कैनर" },
  "/app/leaderboard": { en: "leaderboard", hi: "लीडरबोर्ड" },
  "/app/activity": { en: "impact history", hi: "इम्पैक्ट इतिहास" },
  "/app/admin": { en: "network overview", hi: "नेटवर्क ओवरव्यू" },
  "/app/admin/submissions": { en: "submission queue", hi: "सबमिशन कतार" },
  "/app/admin/collectors": { en: "collector partner desk", hi: "कलेक्टर पार्टनर डेस्क" },
  "/app/admin/users": { en: "member management", hi: "सदस्य प्रबंधन" },
  "/app/admin/analytics": { en: "network analytics", hi: "नेटवर्क एनालिटिक्स" },
  "/app/collector": { en: "collector overview", hi: "कलेक्टर ओवरव्यू" },
  "/app/collector/intake": { en: "intake queue", hi: "इनटेक कतार" },
  "/app/collector/products": { en: "recycled product ledger", hi: "रीसाइकल्ड प्रोडक्ट लेजर" },
  "/app/collector/impact": { en: "impact report", hi: "इम्पैक्ट रिपोर्ट" },
  "/app/settings": { en: "workspace settings", hi: "वर्कस्पेस सेटिंग्स" },
};

interface HelpContent {
  title: string;
  body: string;
  tip: string;
  actionLabel: string;
  actionTo: string;
  pageLabel: string;
  metrics: { label: string; value: string }[];
}

export function HelpWidget({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, currentUser, currentCollector } = useAppStore();
  const { session } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [language, setLanguage] = useState<HelpLanguage>("en");
  const [voiceState, setVoiceState] = useState<"idle" | "loading" | "playing">("idle");
  const [voiceProvider, setVoiceProvider] = useState<"elevenlabs" | "browser" | null>(null);
  const [voiceError, setVoiceError] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const autoPlayedRef = useRef(false);

  const isHi = language === "hi";
  const role = session?.role ?? state?.currentRole ?? "user";
  const roleMeta = ROLE_META[role];
  const pathname = location.pathname;

  const content = useMemo<HelpContent>(() => {
    if (!state || !currentUser || !currentCollector) {
      return {
        title: "Loopr guide",
        body: "Open a workspace to see help for this screen.",
        tip: "",
        actionLabel: "Sign in",
        actionTo: "/login",
        pageLabel: "",
        metrics: [],
      };
    }

    const pageKey =
      Object.keys(pageNames)
        .sort((a, b) => b.length - a.length)
        .find((key) => pathname === key || pathname.startsWith(`${key}/`)) ?? "";
    const page = pageNames[pageKey]?.[language] ?? getPageLabel(pathname);
    const mySubmissions = state.submissions.filter(
      (submission) => submission.userId === currentUser.id,
    );
    const myPending = mySubmissions.filter((submission) => submission.status !== "recycled").length;
    const rank =
      [...state.users].sort((a, b) => b.points - a.points).findIndex(
        (user) => user.id === currentUser.id,
      ) + 1;
    const pendingNetwork = state.submissions.filter(
      (submission) => submission.status === "pending",
    ).length;
    const overdueNetwork = state.submissions.filter(
      (submission) =>
        submission.status === "pending" &&
        Date.now() - +new Date(submission.submittedAt) > 5 * 86400000,
    ).length;
    const queue = state.submissions.filter(
      (submission) =>
        submission.collectorId === currentCollector.id &&
        (submission.status === "assigned" || submission.status === "collected"),
    );
    const collectorProducts = state.products.filter(
      (product) => product.collectorId === currentCollector.id,
    );
    const networkRate = recycledRate(state.submissions);

    let title = "";
    let body = "";
    let tip = "";
    let actionLabel = "";
    let actionTo = roleMeta.dashboard;

    if (role === "user") {
      title = isHi ? "आपकी बोतल, आपका असर" : "Your bottle, your impact";
      const intro = isHi
        ? `आप ${page} पर हैं। आपके ${formatNumber(currentUser.points)} वेरिफाइड पॉइंट्स हैं और आपकी रैंक #${rank} है। आपकी ${myPending} बोतलें अभी वेरिफिकेशन में हैं।`
        : `You are on the ${page}. You have ${formatNumber(currentUser.points)} verified points, rank #${rank}, and ${myPending} bottles waiting for verification.`;

      if (pageKey === "/app/scan") {
        body = isHi
          ? `${intro} बोतल की साफ फोटो अपलोड करें। Gemini उसे पहचानेगा, आप निपटाने का तरीका सुनेंगे, और फिर बोतल लॉग करेंगे। याद रखें: पॉइंट्स तभी जुड़ेंगे जब कलेक्टर उसे रीसाइकल्ड करेगा।`
          : `${intro} Upload a clear bottle photo. Gemini identifies the material, then you can listen to disposal guidance and log the bottle. Important: points are credited only after a collector marks it recycled.`;
        tip = isHi
          ? "फोटो में एक ही बोतल रखें और अच्छी रोशनी रखें।"
          : "Keep one bottle in frame and use natural light.";
        actionLabel = isHi ? "बोतल स्कैन करें" : "Scan a bottle";
        actionTo = "/app/scan";
      } else if (pageKey === "/app/leaderboard") {
        body = isHi
          ? `${intro} लीडरबोर्ड सिर्फ तभी बदलता है जब कोई बोतल रीसाइकल होकर वेरिफाई होती है। केवल स्कैन करने से स्कोर नहीं बढ़ता। अगली रैंक तक पहुँचने के लिए बोतलें जमा करें और कलेक्टर वेरिफिकेशन का इंतज़ार करें।`
          : `${intro} The leaderboard changes only when a bottle is verified recycled, never when it is first scanned. To climb, keep returning bottles and let collection partners verify them.`;
        tip = isHi
          ? "अगली रैंक का अंतर आपकी अगली वेरिफाइड बोतलों से तय होता है।"
          : "Your next verified bottles decide the gap to the next rank.";
        actionLabel = isHi ? "नया स्कैन करें" : "Earn verified points";
        actionTo = "/app/scan";
      } else if (pageKey === "/app/activity") {
        body = isHi
          ? `${intro} यह इतिहास बताता है कि आपकी बोतलें किस चरण में हैं। हर बोतल स्कैन से रीसाइकल तक चलती है। ग्राफ़ और माइलस्टोन बताते हैं कि कौन-सी आदतें आपके असर को बढ़ा रही हैं।`
          : `${intro} This history shows every stage from scan to verified recycling. Use the material mix, heatmap and milestones to see which habits are moving your impact.`;
        tip = isHi
          ? "हर बोतल तभी पूरी होती है जब कलेक्टर प्रोसेसिंग दर्ज करता है।"
          : "A bottle only closes the loop after a collector completes processing.";
        actionLabel = isHi ? "अपना स्कोर बढ़ाएं" : "Add verified impact";
        actionTo = "/app/scan";
      } else if (pageKey === "/app/settings") {
        body = isHi
          ? `${intro} यहाँ आप Gemini, ElevenLabs और लोकल डेटा सेटिंग्स देख सकते हैं। API कुंजियाँ .env फ़ाइल से आती हैं; चाहें तो इस स्क्रीन से बदल सकते हैं। अपना नाम और शहर भी बदलें ताकि सही ड्रॉप-ऑफ दिखें।`
          : `${intro} This screen shows the Gemini and ElevenLabs connections plus local data controls. Keys come from your .env file and can be overridden here. Update your name and city so scanner guidance points to the right drop-offs.`;
        tip = isHi
          ? "डेटा इस ब्राउज़र में IndexedDB में रहता है।"
          : "Your workspace lives in IndexedDB on this browser.";
        actionLabel = isHi ? "डैशबोर्ड पर लौटें" : "Back to dashboard";
        actionTo = "/app/user";
      } else {
        body = isHi
          ? `${intro} अगला सबसे अच्छा कदम बोतल स्कैन करना है। स्कैन के बाद आपको पॉइंट्स, स्थानीय ड्रॉप-ऑफ और सुरक्षित निपटान का मार्गदर्शन मिलेगा। लीडरबोर्ड पर सिर्फ वेरिफाइड रीसाइक्लिंग जुड़ती है।`
          : `${intro} The highest-value next step is to scan a bottle. You will get an identification, local drop-offs and a spoken disposal guide. Remember that only verified recycling reaches the leaderboard.`;
        tip = isHi
          ? "अपनी नज़दीकी ड्रॉप-ऑफ जानने के लिए स्कैनर खोलें।"
          : "Open the scanner to see your closest verified drop-offs.";
        actionLabel = isHi ? "बोतल स्कैन करें" : "Scan a bottle";
        actionTo = "/app/scan";
      }
    } else if (role === "admin") {
      title = isHi ? "नेटवर्क की नब्ज़" : "The network pulse";
      const intro = isHi
        ? `आप ${page} पर हैं। ${pendingNetwork} बोतलें असाइनमेंट का इंतज़ार कर रही हैं, ${overdueNetwork} देर से हैं, और नेटवर्क का ${networkRate.toFixed(1)}% वेरिफाइड रीसाइकल्ड है।`
        : `You are on the ${page}. ${pendingNetwork} bottles await assignment, ${overdueNetwork} are overdue, and ${networkRate.toFixed(1)}% of the network is verified recycled.`;

      if (pageKey === "/app/admin/submissions") {
        body = isHi
          ? `${intro} कतार फ़िल्टर करें, पेंडिंग बोतलें चुनें, कलेक्टर और रेट चुनें, और बैच असाइन करें। असाइनमेंट के बाद कलेक्टर को स्वीकार और प्रोसेस करना होगा। अंत में लीडरबोर्ड पॉइंट्स दिए जाएंगे।`
          : `${intro} Filter the queue, select pending bottles, choose a collector and assign the batch. The collector must receive and process it before verified leaderboard points are awarded.`;
        tip = isHi
          ? "5 दिन से पुरानी पेंडिंग बोतलें पहले साफ करें।"
          : "Clear bottles waiting more than five days first.";
        actionLabel = isHi ? "कलेक्टर डेस्क खोलें" : "Open collector desk";
        actionTo = "/app/admin/collectors";
      } else if (pageKey === "/app/admin/collectors") {
        body = isHi
          ? `${intro} यहाँ पार्टनर की क्षमता, सामग्री रेट, खुली कतार और राजस्व देखें। नए पार्टनर जोड़ें, क्षमता जांचें, और फीडस्टॉक सेटलमेंट दर्ज करें। ऊँची क्षमता वाले कलेक्टर को बैच देना सबसे तेज़ सुधार है।`
          : `${intro} Review each partner's capacity, material rate, open queue and revenue. Add partners, verify them and record feedstock settlements. Routing a batch to a collector with spare capacity is the fastest way to lift throughput.`;
        tip = isHi
          ? "उपलब्ध क्षमता वाले कलेक्टर को बैच भेजें।"
          : "Route new batches to collectors with spare capacity.";
        actionLabel = isHi ? "सबमिशन कतार खोलें" : "Open submission queue";
        actionTo = "/app/admin/submissions";
      } else if (pageKey === "/app/admin/users") {
        body = isHi
          ? `${intro} सदस्यों को खोजें, उनके पॉइंट्स और रैंक देखें, गलत स्कोर सुधारें या खाता रोकें। पॉइंट्स केवल वेरिफाइड रीसाइक्लिंग से मिलते हैं।`
          : `${intro} Search members, inspect points and rank, correct a score manually or pause an account. Member points normally move only through verified recycling.`;
        tip = isHi
          ? "मैन्युअल बदलाव सिर्फ वेरिफाइड सुधार के लिए करें।"
          : "Use manual adjustments only for verified corrections.";
        actionLabel = isHi ? "एनालिटिक्स देखें" : "View analytics";
        actionTo = "/app/admin/analytics";
      } else if (pageKey === "/app/admin/analytics") {
        body = isHi
          ? `${intro} फ़नल देखें: कितनी बोतलें लॉग, असाइन, कलेक्ट और रीसाइकल हुईं। फिर पिकअप एजिंग और मटीरियल रिकवरी देखें। सबसे पहले बड़ी रुकावट ठीक करें।`
          : `${intro} Read the funnel from logged to assigned, collected and recycled. Then compare pickup ageing and material recovery. Fix the biggest drop-off first instead of optimizing everything at once.`;
        tip = isHi
          ? "सबसे कम स्टेप कन्वर्ज़न पहले सुधारें।"
          : "Improve the weakest step conversion first.";
        actionLabel = isHi ? "कतार साफ करें" : "Clear the queue";
        actionTo = "/app/admin/submissions";
      } else if (pageKey === "/app/settings") {
        body = isHi
          ? `${intro} यहाँ Gemini, ElevenLabs, प्रोफ़ाइल और लोकल डेटा सेटिंग्स हैं। .env से कुंजियाँ आती हैं, और आप इस स्क्रीन से अस्थायी ओवरराइड कर सकते हैं।`
          : `${intro} Configure Gemini, ElevenLabs, your profile and local data here. Environment keys load automatically, with optional per-workspace overrides.`;
        tip = isHi
          ? "प्रोडक्शन से पहले API कुंजियाँ सर्वर पर ले जाएं।"
          : "Move API keys behind a server before production.";
        actionLabel = isHi ? "नेटवर्क ओवरव्यू" : "Back to overview";
        actionTo = "/app/admin";
      } else {
        body = isHi
          ? `${intro} ओवरव्यू में सबसे ज़रूरी काम दिखते हैं: असाइनमेंट, ओवरड्यू पिकअप, पार्टनर समीक्षा और मटीरियल फ़्लो। रोज़ सुबह पेंडिंग कतार और ओवरड्यू अलर्ट देखें।`
          : `${intro} The overview surfaces the highest-value work: assignment, overdue pickups, partner review and material flow. Start each day with the pending queue and overdue alerts.`;
        tip = isHi
          ? "ओवरड्यू पिकअप सबसे पहले हल करें।"
          : "Resolve overdue pickups before anything else.";
        actionLabel = isHi ? "पिकअप असाइन करें" : "Assign pickups";
        actionTo = "/app/admin/submissions";
      }
    } else {
      title = isHi ? "आपका फ़ैसिलिटी लूप" : "Your facility loop";
      const intro = isHi
        ? `आप ${page} पर हैं। आपकी कतार में ${queue.length} बोतलें हैं और अब तक ${formatKg(currentCollector.processedKg)} प्रोसेस हुआ है।`
        : `You are on the ${page}. Your queue has ${queue.length} bottles and you have processed ${formatKg(currentCollector.processedKg)} to date.`;

      if (pageKey === "/app/collector/intake") {
        body = isHi
          ? `${intro} पहले गेट पर बोतलों को Mark received करें, फिर Mark processed करें। प्रोसेस करते ही इम्पैक्ट वेरिफाई होता है और सदस्य को लीडरबोर्ड पॉइंट्स मिलते हैं।`
          : `${intro} First mark assigned bottles as received, then mark them processed. Processing is the moment verified impact and member leaderboard points are released.`;
        tip = isHi
          ? "प्रोसेस से पहले बोतल की मात्रा और सामग्री जांचें।"
          : "Confirm material and weight before processing.";
        actionLabel = isHi ? "प्रोडक्ट दर्ज करें" : "Log recycled product";
        actionTo = "/app/collector/products";
      } else if (pageKey === "/app/collector/products") {
        body = isHi
          ? `${intro} हर रीसाइकल्ड प्रोडक्ट के लिए मात्रा, खरीदार, राजस्व, लागत, बचाया कचरा और बोतलों की संख्या दर्ज करें। बिक्री दर्ज करने से आपका मुनाफ़ा और Loopr की 6% फीस अपडेट होती है।`
          : `${intro} Log each output batch with units, buyer, revenue, cost, waste used and bottles embedded. Recording a sale updates your margin and Loopr's 6% circularity fee.`;
        tip = isHi
          ? "हर प्रोडक्ट के लिए सही खरीदार चुनें।"
          : "Attach every product to a real buyer.";
        actionLabel = isHi ? "अपना इम्पैक्ट देखें" : "View impact report";
        actionTo = "/app/collector/impact";
      } else if (pageKey === "/app/collector/impact") {
        body = isHi
          ? `${intro} यह रिपोर्ट कचरा हटाने, CO₂e बचत, प्रोडक्ट और खरीदारों को जोड़ती है। रिपोर्ट निर्यात करें या कमज़ोर महीने की जांच करें।`
          : `${intro} This report ties your diversion, CO₂e estimate, products and buyers into one audit trail. Export it or compare weaker months to plan capacity.`;
        tip = isHi
          ? "हर प्रोडक्ट लॉग करने से रिपोर्ट मजबूत होती है।"
          : "Every logged product strengthens your verified report.";
        actionLabel = isHi ? "अगली खेप लें" : "Open intake";
        actionTo = "/app/collector/intake";
      } else if (pageKey === "/app/settings") {
        body = isHi
          ? `${intro} यहाँ साझा API कुंजियाँ, प्रोफ़ाइल और लोकल डेटा सेटिंग्स हैं। फ़ैसिलिटी विवरण नेटवर्क एडमिन द्वारा प्रबंधित होते हैं।`
          : `${intro} Shared API, profile and data settings live here. Facility identity and rate terms are managed by the network admin.`;
        tip = isHi
          ? "कुंजियाँ .env में रखें, स्क्रीन पर सिर्फ अस्थायी ओवरराइड करें।"
          : "Keep keys in .env and use this screen only for temporary overrides.";
        actionLabel = isHi ? "फ़ैसिलिटी पर लौटें" : "Back to facility";
        actionTo = "/app/collector";
      } else {
        body = isHi
          ? `${intro} अगला कदम इनटेक खोलना है। गेट पर बोतलें स्वीकार करें, फिर प्रोसेसिंग शुरू करें। ${formatNumber(collectorProducts.length)} प्रोडक्ट लॉग हैं जिनसे ${formatNumber(currentCollector.revenue)} रुपये राजस्व आया है।`
          : `${intro} Your next step is the intake queue. Receive bottles at the gate, then process them. ${formatNumber(collectorProducts.length)} products are logged, contributing ₹${formatNumber(currentCollector.revenue)} in revenue.`;
        tip = isHi
          ? "गेट पर स्वीकार करना और प्रोसेसिंग अलग-अलग दर्ज करें।"
          : "Receipt and processing are separate checkpoints.";
        actionLabel = isHi ? "इनटेक खोलें" : "Open intake";
        actionTo = "/app/collector/intake";
      }
    }

    const metrics =
      role === "user"
        ? [
            { label: isHi ? "पॉइंट्स" : "Points", value: formatNumber(currentUser.points) },
            { label: isHi ? "रैंक" : "Rank", value: `#${rank}` },
            {
              label: isHi ? "वेरिफिकेशन में" : "Pending",
              value: formatNumber(myPending),
            },
          ]
        : role === "admin"
          ? [
              {
                label: isHi ? "पेंडिंग" : "Pending",
                value: formatNumber(pendingNetwork),
              },
              { label: isHi ? "ओवरड्यू" : "Overdue", value: formatNumber(overdueNetwork) },
              {
                label: isHi ? "रीसाइकल दर" : "Recycle rate",
                value: `${networkRate.toFixed(1)}%`,
              },
            ]
          : [
              { label: isHi ? "कतार" : "Queue", value: formatNumber(queue.length) },
              {
                label: isHi ? "प्रोसेस्ड" : "Processed",
                value: formatKg(currentCollector.processedKg),
              },
              {
                label: isHi ? "प्रोडक्ट" : "Products",
                value: formatNumber(collectorProducts.length),
              },
            ];

    return {
      title,
      body,
      tip,
      actionLabel,
      actionTo,
      pageLabel: page,
      metrics,
    };
  }, [
    currentCollector,
    currentUser,
    isHi,
    language,
    pathname,
    role,
    roleMeta.dashboard,
    state,
  ]);

  const stopVoice = useCallback(() => {
    stopBrowserSpeech();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    setVoiceState("idle");
  }, []);

  const playHelp = useCallback(async () => {
    if (!state || !content.body) return;
    stopVoice();
    setVoiceError("");
    setVoiceState("loading");
    const narration = `${content.title}. ${content.body} ${content.tip ? `${content.tip}.` : ""} ${
      content.actionLabel
        ? `${isHi ? "अगला कदम" : "Next"}: ${content.actionLabel}.`
        : ""
    }`;
    try {
      const url = await synthesizeNarration(narration, state.settings);
      audioUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => {
        setVoiceState("idle");
        setVoiceProvider(null);
      };
      await audio.play();
      setVoiceProvider("elevenlabs");
      setVoiceState("playing");
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message !== "MISSING_KEY") {
        setVoiceError(
          message.includes("Failed to fetch")
            ? "The browser could not reach ElevenLabs. Add a proxy URL or use the browser voice."
            : message,
        );
      }
      try {
        speakWithBrowser(
          narration,
          () => {
            setVoiceState("idle");
            setVoiceProvider(null);
          },
          isHi ? "hi-IN" : "en-IN",
        );
        setVoiceProvider("browser");
        setVoiceState("playing");
      } catch {
        setVoiceState("idle");
        setVoiceError("Voice playback is not available in this browser.");
      }
    }
  }, [content, isHi, state, stopVoice]);

  useEffect(() => {
    if (!open) {
      stopVoice();
      autoPlayedRef.current = false;
      return;
    }
    if (!autoPlayedRef.current) {
      autoPlayedRef.current = true;
      void playHelp();
    }
    // Auto-play once per opening.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !autoPlayedRef.current) return;
    stopVoice();
    void playHelp();
    // Re-narrate when the language changes while the guide is open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  useEffect(() => {
    return () => stopVoice();
  }, [stopVoice]);

  if (!state) return null;
  const elevenReady = isElevenLabsReady(state.settings);

  return (
    <>
      <button
        className={cn("help-fab", open && "is-open")}
        onClick={() => onOpenChange(!open)}
        aria-label={open ? "Close Loopr help" : "Open Loopr help"}
        aria-expanded={open}
      >
        <CircleHelp size={20} />
        <span>Help</span>
      </button>

      {open ? (
        <aside className="help-panel" role="dialog" aria-label="Loopr help guide">
          <div className="help-panel__head">
            <div className="help-panel__identity">
              <span className="help-panel__icon">
                <Sparkles size={18} />
              </span>
              <div>
                <span className="eyebrow">Site-aware guide</span>
                <strong>Loopr help</strong>
              </div>
            </div>
            <button
              className="help-panel__close"
              onClick={() => onOpenChange(false)}
              aria-label="Close help"
            >
              <X size={17} />
            </button>
          </div>

          <div className="help-panel__language">
            <span>
              <Languages size={14} /> Language
            </span>
            <div>
              <button
                className={cn(language === "en" && "is-active")}
                onClick={() => setLanguage("en")}
                aria-pressed={language === "en"}
              >
                English
              </button>
              <button
                className={cn(language === "hi" && "is-active")}
                onClick={() => setLanguage("hi")}
                aria-pressed={language === "hi"}
              >
                हिन्दी
              </button>
            </div>
          </div>

          <div className="help-panel__context">
            <Badge tone="neutral">{ROLE_META[role].label}</Badge>
            <span>{content.pageLabel}</span>
            <span className="status-pulse" />
            <span>Live screen analysis</span>
          </div>

          <div className="help-panel__response" aria-live="polite">
            <h2>{content.title}</h2>
            <p>{content.body}</p>
            {content.tip ? <div className="help-tip">{content.tip}</div> : null}
            <div className="help-metrics">
              {content.metrics.map((metric) => (
                <div key={metric.label}>
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="help-panel__actions">
            <button
              className="btn btn--primary btn--sm"
              onClick={() => {
                onOpenChange(false);
                navigate(content.actionTo);
              }}
            >
              {content.actionLabel}
              <ArrowRight size={14} />
            </button>
            <button
              className="btn btn--secondary btn--sm"
              onClick={() => {
                if (voiceState === "playing") stopVoice();
                else void playHelp();
              }}
              disabled={voiceState === "loading"}
            >
              {voiceState === "loading" ? (
                <LoaderCircle className="spin" size={14} />
              ) : voiceState === "playing" ? (
                <Pause size={14} />
              ) : (
                <Play size={14} />
              )}
              {voiceState === "loading"
                ? "Preparing voice…"
                : voiceState === "playing"
                  ? "Pause"
                  : "Play guidance"}
            </button>
          </div>

          <div className="help-panel__voice">
            <span className="help-panel__voice-icon">
              <Volume2 size={15} />
            </span>
            <div>
              <strong>
                {voiceProvider === "browser" || !elevenReady
                  ? "Browser voice"
                  : voiceProvider === "elevenlabs"
                    ? "ElevenLabs narration"
                    : "Voice guidance"}
              </strong>
              <span>
                {voiceState === "playing"
                  ? isHi
                    ? "हिन्दी में मार्गदर्शन चल रहा है।"
                    : "Guidance is playing."
                  : isHi
                    ? "इस स्क्रीन की मदद हिन्दी या अंग्रेज़ी में सुनें।"
                    : "Listen to help for this screen in Hindi or English."}
              </span>
            </div>
            <Badge
              tone={voiceProvider === "browser" || !elevenReady ? "amber" : "lime"}
              icon={BrainCircuit}
            >
              {voiceProvider === "browser" || !elevenReady ? "Fallback" : "ElevenLabs"}
            </Badge>
          </div>

          {voiceError ? <p className="help-panel__error">{voiceError}</p> : null}
        </aside>
      ) : null}
    </>
  );
}
